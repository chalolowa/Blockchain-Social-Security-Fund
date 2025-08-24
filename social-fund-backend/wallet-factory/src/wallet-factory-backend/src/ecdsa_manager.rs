use crate::types::*;
use candid::{CandidType, Deserialize, Principal};
use ic_cdk::api::management_canister::ecdsa::*;
use serde::{Deserialize as SerdeDeserialize, Serialize};
use std::cell::{Ref, RefCell};
use std::collections::HashMap;
use thiserror::Error;
use hex;
use sha2::Digest;

#[derive(Error, Debug, CandidType, SerdeDeserialize, Serialize, Clone)]
pub enum EcdsaError {
    #[error("ECDSA public key error: {operation} failed - {details}")]
    PublicKeyError { operation: String, details: String },
    
    #[error("ECDSA signing error: {operation} failed - {details}")]
    SigningError { operation: String, details: String },
    
    #[error("Key not initialized: {key_name}")]
    KeyNotInitialized { key_name: String },
    
    #[error("Invalid derivation path: {path}")]
    InvalidDerivationPath { path: String },
    
    #[error("Key rotation in progress, try again later")]
    KeyRotationInProgress,
    
    #[error("Rate limit exceeded for key operations")]
    RateLimitExceeded,
    
    #[error("Network timeout during ECDSA operation: {operation}")]
    NetworkTimeout { operation: String },
}

// Secure ECDSA configuration stored in stable memory
#[derive(CandidType, Serialize, SerdeDeserialize, Clone, Debug)]
pub struct EcdsaConfig {
    pub key_name: String,
    pub curve: EcdsaCurve,
    pub derivation_paths: HashMap<Principal, Vec<Vec<u8>>>,
    pub key_rotation_schedule: Option<u64>, // Next rotation timestamp
    pub max_requests_per_minute: u32,
    pub created_at: u64,
    pub last_updated: u64,
}

impl Default for EcdsaConfig {
    fn default() -> Self {
        Self {
            key_name: "key_1".to_string(),
            curve: EcdsaCurve::Secp256k1,
            derivation_paths: HashMap::new(),
            key_rotation_schedule: None,
            max_requests_per_minute: 60,
            created_at: ic_cdk::api::time(),
            last_updated: ic_cdk::api::time(),
        }
    }
}

// Rate limiting for ECDSA operations
#[derive(CandidType, Serialize, SerdeDeserialize, Default, Clone)]
pub struct RateLimiter {
    requests: HashMap<String, Vec<u64>>, // operation -> timestamps
    max_requests_per_minute: u32,
}

impl RateLimiter {
    pub fn check_rate_limit(&mut self, operation: &str) -> Result<(), EcdsaError> {
        let current_time = ic_cdk::api::time();
        let one_minute_ago = current_time.saturating_sub(60_000_000_000); // 60 seconds in nanoseconds
        
        let requests = self.requests.entry(operation.to_string()).or_default();
        
        // Remove old requests
        requests.retain(|&timestamp| timestamp > one_minute_ago);
        
        if requests.len() as u32 >= self.max_requests_per_minute {
            return Err(EcdsaError::RateLimitExceeded);
        }
        
        requests.push(current_time);
        Ok(())
    }
}

// Enhanced ECDSA manager with caching and security
#[derive(CandidType,Serialize, SerdeDeserialize, Default, Clone)]
pub struct EcdsaManager {
    config: EcdsaConfig,
    rate_limiter: RateLimiter,
    public_key_cache: HashMap<String, CachedPublicKey>,
    signature_cache: HashMap<String, CachedSignature>,
    request_counter: u64,
}

#[derive(CandidType, Serialize, SerdeDeserialize, Clone, Debug)]
pub struct CachedPublicKey {
    pub key: Vec<u8>,
    pub derivation_path: Vec<Vec<u8>>,
    pub timestamp: u64,
    pub ttl_seconds: u64,
}

#[derive(CandidType, Serialize, SerdeDeserialize, Clone, Debug)]
pub struct CachedSignature {
    pub signature: Vec<u8>,
    pub message_hash: Vec<u8>,
    pub timestamp: u64,
    pub ttl_seconds: u64,
}

impl CachedPublicKey {
    pub fn is_valid(&self) -> bool {
        let current_time = ic_cdk::api::time();
        current_time < self.timestamp + (self.ttl_seconds * 1_000_000_000)
    }
}

impl CachedSignature {
    pub fn is_valid(&self) -> bool {
        let current_time = ic_cdk::api::time();
        current_time < self.timestamp + (self.ttl_seconds * 1_000_000_000)
    }
}

thread_local! {
    static ECDSA_MANAGER: RefCell<EcdsaManager> = RefCell::new(EcdsaManager::default());
}

// Public interface functions
pub fn initialize_ecdsa_manager(key_name: String, max_requests_per_minute: u32) -> Result<(), EcdsaError> {
    ECDSA_MANAGER.with(|manager| {
        let mut manager = manager.borrow_mut();
        manager.config.key_name = key_name;
        manager.config.max_requests_per_minute = max_requests_per_minute;
        manager.config.last_updated = ic_cdk::api::time();
        manager.rate_limiter.max_requests_per_minute = max_requests_per_minute;
        Ok(())
    })
}

pub fn set_derivation_path(principal: Principal, path: Vec<Vec<u8>>) -> Result<(), EcdsaError> {
    // Validate derivation path
    validate_derivation_path(&path)?;
    
    ECDSA_MANAGER.with(|manager| {
        let mut manager = manager.borrow_mut();
        manager.config.derivation_paths.insert(principal, path);
        manager.config.last_updated = ic_cdk::api::time();
        Ok(())
    })
}

pub async fn public_key_for_principal(principal: Principal) -> Result<Vec<u8>, EcdsaError> {
    let (derivation_path, cache_key) = ECDSA_MANAGER.with(|manager| {
        let manager = manager.borrow();
        let derivation_path = manager.config.derivation_paths
            .get(&principal)
            .cloned()
            .unwrap_or_default();
        
        let cache_key = format!("{}:{}", principal.to_text(), 
            derivation_path.iter().map(|p| hex::encode(p)).collect::<Vec<_>>().join("-"));
        
        (derivation_path, cache_key)
    });
    
    // Check cache first
    if let Some(cached_key) = ECDSA_MANAGER.with(|manager| {
        manager.borrow().public_key_cache.get(&cache_key).cloned()
    }) {
        if cached_key.is_valid() {
            return Ok(cached_key.key);
        }
    }
    
    // Rate limiting
    ECDSA_MANAGER.with(|manager| {
        manager.borrow_mut().rate_limiter.check_rate_limit("public_key")
    })?;
    
    let (key_name, curve) = ECDSA_MANAGER.with(|manager| {
        let manager = manager.borrow();
        (manager.config.key_name.clone(), manager.config.curve)
    });
    
    let args = EcdsaPublicKeyArgument {
        canister_id: None,
        derivation_path: derivation_path.clone(),
        key_id: EcdsaKeyId {
            curve,
            name: key_name.clone(),
        },
    };

    let start_time = ic_cdk::api::time();
    
    match ecdsa_public_key(args).await {
        Ok((key,)) => {
            let response_time = ic_cdk::api::time() - start_time;
            
            // Cache the result
            let cached_key = CachedPublicKey {
                key: key.public_key.clone(),
                derivation_path,
                timestamp: ic_cdk::api::time(),
                ttl_seconds: 300, // 5 minutes cache
            };
            
            ECDSA_MANAGER.with(|manager| {
                let mut manager = manager.borrow_mut();
                manager.public_key_cache.insert(cache_key, cached_key);
                manager.request_counter += 1;
            });
            
            // Log metrics
            ic_cdk::println!("ECDSA public_key operation completed in {}ns for principal {}", 
                response_time, principal.to_text());
            
            Ok(key.public_key)
        }
        Err((code, msg)) => {
            let error = EcdsaError::PublicKeyError {
                operation: "ecdsa_public_key".to_string(),
                details: format!("Code: {}, Message: {}, Principal: {}", 
                    code as u8, msg, principal.to_text()),
            };
            
            ic_cdk::println!("ECDSA public_key failed: {:?}", error);
            Err(error)
        }
    }
}

pub async fn sign_with_principal(principal: Principal, message: Vec<u8>) -> Result<Vec<u8>, EcdsaError> {
    // Input validation
    if message.is_empty() {
        return Err(EcdsaError::SigningError {
            operation: "sign_with_ecdsa".to_string(),
            details: "Message cannot be empty".to_string(),
        });
    }
    
    if message.len() > 1024 {
        return Err(EcdsaError::SigningError {
            operation: "sign_with_ecdsa".to_string(),
            details: "Message too large (max 1024 bytes)".to_string(),
        });
    }
    
    let derivation_path = ECDSA_MANAGER.with(|manager| {
        manager.borrow().config.derivation_paths
            .get(&principal)
            .cloned()
            .unwrap_or_default()
    });
    
    // Rate limiting
    ECDSA_MANAGER.with(|manager| {
        manager.borrow_mut().rate_limiter.check_rate_limit("sign")
    })?;
    
    let (key_name, curve) = ECDSA_MANAGER.with(|manager| {
        let manager = manager.borrow();
        (manager.config.key_name.clone(), manager.config.curve)
    });
    
    // Create message hash for signing
    let message_hash = sha2::Sha256::digest(&message).to_vec();
    
    let args = SignWithEcdsaArgument {
        message_hash: message_hash.clone(),
        derivation_path,
        key_id: EcdsaKeyId {
            curve,
            name: key_name,
        },
    };

    let start_time = ic_cdk::api::time();
    
    match sign_with_ecdsa(args).await {
        Ok((signature_response,)) => {
            let response_time = ic_cdk::api::time() - start_time;
            
            // Update metrics
            ECDSA_MANAGER.with(|manager| {
                manager.borrow_mut().request_counter += 1;
            });
            
            ic_cdk::println!("ECDSA sign operation completed in {}ns for principal {}", 
                response_time, principal.to_text());
            
            Ok(signature_response.signature)
        }
        Err((code, msg)) => {
            let error = EcdsaError::SigningError {
                operation: "sign_with_ecdsa".to_string(),
                details: format!("Code: {}, Message: {}, Principal: {}", 
                    code as u8, msg, principal.to_text()),
            };
            
            ic_cdk::println!("ECDSA sign failed: {:?}", error);
            Err(error)
        }
    }
}

pub fn get_ecdsa_metrics() -> EcdsaMetrics {
    ECDSA_MANAGER.with(|manager| {
        let manager = manager.borrow();
        EcdsaMetrics {
            total_requests: manager.request_counter,
            cached_public_keys: manager.public_key_cache.len() as u64,
            cached_signatures: manager.signature_cache.len() as u64,
            active_principals: manager.config.derivation_paths.len() as u64,
            last_key_rotation: manager.config.key_rotation_schedule,
            rate_limit_violations: 0, // Could track this
        }
    })
}

pub fn cleanup_expired_cache() -> u64 {
    ECDSA_MANAGER.with(|manager| {
        let mut manager = manager.borrow_mut();
        let initial_count = manager.public_key_cache.len() + manager.signature_cache.len();
        
        // Clean expired public keys
        manager.public_key_cache.retain(|_, cached_key| cached_key.is_valid());
        
        // Clean expired signatures
        manager.signature_cache.retain(|_, cached_sig| cached_sig.is_valid());
        
        let final_count = manager.public_key_cache.len() + manager.signature_cache.len();
        (initial_count - final_count) as u64
    })
}

// Backup and restore functions for upgrades
pub fn backup_ecdsa_state() -> EcdsaManager {
    ECDSA_MANAGER.with(|manager| (*manager.borrow()).clone())
}

pub fn restore_ecdsa_state(state: EcdsaManager) {
    ECDSA_MANAGER.with(|manager| {
        *manager.borrow_mut() = state;
    });
}

// Validation functions
fn validate_derivation_path(path: &[Vec<u8>]) -> Result<(), EcdsaError> {
    if path.len() > 10 {
        return Err(EcdsaError::InvalidDerivationPath {
            path: "Path too long (max 10 components)".to_string(),
        });
    }
    
    for component in path {
        if component.len() != 4 {
            return Err(EcdsaError::InvalidDerivationPath {
                path: "Each path component must be 4 bytes".to_string(),
            });
        }
    }
    
    Ok(())
}

// Metrics structure
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct EcdsaMetrics {
    pub total_requests: u64,
    pub cached_public_keys: u64,
    pub cached_signatures: u64,
    pub active_principals: u64,
    pub last_key_rotation: Option<u64>,
    pub rate_limit_violations: u64,
}

// Legacy compatibility functions (marked deprecated)
#[deprecated(note = "Use initialize_ecdsa_manager instead")]
pub fn set_key_name(name: String) {
    let _ = initialize_ecdsa_manager(name, 60);
}

#[deprecated(note = "Use public_key_for_principal instead")]
pub async fn public_key() -> Result<Vec<u8>, EcdsaError> {
    public_key_for_principal(ic_cdk::caller()).await
}

#[deprecated(note = "Use sign_with_principal instead")]
pub async fn sign(message: Vec<u8>) -> Result<Vec<u8>, EcdsaError> {
    sign_with_principal(ic_cdk::caller(), message).await
}
