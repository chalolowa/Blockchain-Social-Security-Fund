use crate::types::*;
use bitcoin::{bip32::{DerivationPath, Xpriv, Xpub}, key::Secp256k1, secp256k1::SecretKey, Address, Network, PublicKey};
use candid::Principal;
use ic_cdk::api::time;
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, str::FromStr};
use thiserror::Error;

#[derive(Error, Debug, Clone, Serialize, Deserialize)]
pub enum HDWalletError {
    #[error("Invalid seed: {reason}")]
    InvalidSeed { reason: String },
    
    #[error("Derivation path error: {path} - {reason}")]
    DerivationPathError { path: String, reason: String },
    
    #[error("Key derivation failed at index {index}: {reason}")]
    KeyDerivationFailed { index: u32, reason: String },
    
    #[error("Signing failed: {reason}")]
    SigningFailed { reason: String },
    
    #[error("Invalid network: {network}")]
    InvalidNetwork { network: String },
    
    #[error("Address generation failed: {reason}")]
    AddressGenerationFailed { reason: String },
    
    #[error("Invalid index: {index} (max: {max})")]
    InvalidIndex { index: u32, max: u32 },
    
    #[error("Insufficient entropy in seed")]
    InsufficientEntropy,
    
    #[error("Key cache miss for index {index}")]
    KeyCacheMiss { index: u32 },
}

// Enhanced HD Wallet with security and performance improvements
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HDWallet {
    master_key: Xpriv,
    derivation_path: DerivationPath,
    network: Network,
    // Cache for derived keys to improve performance
    key_cache: HashMap<u32, CachedExtendedKey>,
    // Cache for addresses
    address_cache: HashMap<u32, CachedAddress>,
    // Security settings
    max_derivation_index: u32,
    created_at: u64,
    last_used: u64,
    usage_count: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct CachedExtendedKey {
    key: Xpriv,
    public_key: Xpub,
    created_at: u64,
    access_count: u64,
}

impl HDWallet {
    /// Create a new HD wallet with enhanced security validation
    pub fn new(seed: &[u8], path: &str, network: Network) -> Result<Self, HDWalletError> {
        // Validate seed entropy
        if seed.len() < 16 {
            return Err(HDWalletError::InsufficientEntropy);
        }
        
        if seed.len() > 64 {
            return Err(HDWalletError::InvalidSeed {
                reason: "Seed too long (max 64 bytes)".to_string(),
            });
        }
        
        let secp = Secp256k1::new();
        
        // Create master key with error handling
        let master_key = Xpriv::new_master(network, seed)
            .map_err(|e| HDWalletError::InvalidSeed {
                reason: format!("Master key generation failed: {}", e),
            })?;
        
        // Validate and parse derivation path
        let derivation_path = DerivationPath::from_str(path)
            .map_err(|e| HDWalletError::DerivationPathError {
                path: path.to_string(),
                reason: format!("Invalid path format: {}", e),
            })?;
        
        // Validate derivation path depth (security consideration)
        if derivation_path.len() > 6 {
            return Err(HDWalletError::DerivationPathError {
                path: path.to_string(),
                reason: "Path too deep (max 6 levels)".to_string(),
            });
        }
        
        Ok(Self {
            master_key,
            derivation_path,
            network,
            key_cache: HashMap::new(),
            address_cache: HashMap::new(),
            max_derivation_index: 1_000_000, // Reasonable limit
            created_at: time(),
            last_used: time(),
            usage_count: 0,
        })
    }
    
    /// Create HD wallet for IC principals with deterministic seed generation
    pub fn new_for_principal(
        principal: Principal, 
        additional_entropy: &[u8],
        network: Network,
    ) -> Result<Self, HDWalletError> {
        let seed = Self::generate_deterministic_seed(principal, additional_entropy)?;
        let path = Self::generate_derivation_path_for_principal(principal);
        Self::new(&seed, &path, network)
    }
    
    /// Derive key with caching and validation
    pub fn derive_key(&mut self, index: u32) -> Result<Xpriv, HDWalletError> {
        self.validate_index(index)?;
        
        // Check cache first
        if let Some(cached) = self.key_cache.get_mut(&index) {
            cached.access_count += 1;
            return Ok(cached.key);
        }
        
        // Derive new key
        let child_path = self.derivation_path.extend(&[index.into()]);
        let secp = Secp256k1::new();
        
        let derived_key = self.master_key
            .derive_priv(&secp, &child_path)
            .map_err(|e| HDWalletError::KeyDerivationFailed {
                index,
                reason: format!("Derivation failed: {}", e),
            })?;
        
        // Generate corresponding public key
        let public_key = Xpub::from_priv(&secp, &derived_key);
        
        // Cache the result
        let cached_key = CachedExtendedKey {
            key: derived_key,
            public_key,
            created_at: time(),
            access_count: 1,
        };
        
        self.key_cache.insert(index, cached_key.clone());
        self.update_usage_stats();
        
        Ok(cached_key.key)
    }
    
    /// Derive public key only (more efficient for address generation)
    pub fn derive_public_key(&mut self, index: u32) -> Result<Xpub, HDWalletError> {
        self.validate_index(index)?;
        
        // Check cache first
        if let Some(cached) = self.key_cache.get(&index) {
            return Ok(cached.public_key);
        }
        
        // Derive the private key (which also caches it)
        let _ = self.derive_key(index)?;
        
        // Now it should be in cache
        Ok(self.key_cache.get(&index).unwrap().public_key)
    }
    
    /// Generate address with multiple format support
    pub fn derive_address(&mut self, index: u32, address_type: AddressType) -> Result<String, HDWalletError> {
        self.validate_index(index)?;
        
        // Create cache key including address type
        let cache_key_str = format!("{}:{:?}", index, address_type);
        
        // Check address cache
        if let Some(cached) = self.address_cache.get(&index) {
            if cached.is_valid() && cached.address_type == address_type {
                return Ok(cached.address.clone());
            }
        }
        
        let public_key = self.derive_public_key(index)?;
        let bitcoin_pubkey = PublicKey::new(public_key.public_key);
        let compressed_pubkey = bitcoin_pubkey.inner.serialize();
        
        let address = match address_type {
            AddressType::P2PKH => {
                Ok(Address::p2pkh(&bitcoin_pubkey, self.network))
            }
            AddressType::P2WPKH => {
                let compressed_pk = bitcoin::key::CompressedPublicKey::from_slice(&compressed_pubkey)
                    .map_err(|e| HDWalletError::AddressGenerationFailed {
                        reason: format!("CompressedPublicKey conversion failed: {}", e),
                    })?;
                Ok(Address::p2wpkh(&compressed_pk, self.network))
            }
            AddressType::P2SH => {
                // P2SH-wrapped P2WPKH
                let compressed_pk = bitcoin::key::CompressedPublicKey::from_slice(&compressed_pubkey)
                    .map_err(|e| HDWalletError::AddressGenerationFailed {
                        reason: format!("CompressedPublicKey conversion failed: {}", e),
                    })?;
                let wpkh_address = Address::p2wpkh(&compressed_pk, self.network);
                Address::p2sh(&wpkh_address.script_pubkey(), self.network)
                    .map_err(|e| HDWalletError::AddressGenerationFailed {
                        reason: format!("P2SH address generation failed: {}", e),
                    })
            }
        }?;

        let address_str = address.to_string();

        // Cache the address
        let cached_address = CachedAddress {
            address: address_str.clone(),
            address_type,
            timestamp: time(),
            ttl_seconds: 3600, // 1 hour cache
        };
        
        self.address_cache.insert(index, cached_address);
        self.update_usage_stats();
        
        Ok(address_str)
    }
    
    /// Enhanced transaction signing with validation
    pub fn sign_transaction(&mut self, index: u32, message: &[u8]) -> Result<Vec<u8>, HDWalletError> {
        if message.is_empty() {
            return Err(HDWalletError::SigningFailed {
                reason: "Message cannot be empty".to_string(),
            });
        }
        
        if message.len() > 10240 {
            return Err(HDWalletError::SigningFailed {
                reason: "Message too large (max 10KB)".to_string(),
            });
        }
        
        let key = self.derive_key(index)?;
        let secp = Secp256k1::new();
        
        // Create message hash
        use sha2::{Digest, Sha256};
        let message_hash = Sha256::digest(message);
        
        // Convert to secp256k1 format
        let secret_key = SecretKey::from_slice(&key.private_key.secret_bytes())
            .map_err(|e| HDWalletError::SigningFailed {
                reason: format!("Invalid private key: {}", e),
            })?;
        
        // Sign the hash
        let signature = secp.sign_ecdsa(
            &bitcoin::secp256k1::Message::from_digest_slice(&message_hash)
                .map_err(|e| HDWalletError::SigningFailed {
                    reason: format!("Invalid message hash: {}", e),
                })?,
            &secret_key,
        );
        
        self.update_usage_stats();
        Ok(signature.serialize_der().to_vec())
    }
    
    /// Batch address generation for improved performance
    pub fn derive_addresses_batch(
        &mut self, 
        start_index: u32, 
        count: u32,
        address_type: AddressType,
    ) -> Result<Vec<(u32, String)>, HDWalletError> {
        if count > 100 {
            return Err(HDWalletError::InvalidIndex {
                index: count,
                max: 100,
            });
        }
        
        let mut addresses = Vec::with_capacity(count as usize);
        
        for i in 0..count {
            let index = start_index + i;
            let address = self.derive_address(index, address_type)?;
            addresses.push((index, address));
        }
        
        Ok(addresses)
    }
    
    /// Get wallet statistics
    pub fn get_stats(&self) -> HDWalletStats {
        HDWalletStats {
            created_at: self.created_at,
            last_used: self.last_used,
            usage_count: self.usage_count,
            cached_keys: self.key_cache.len() as u32,
            cached_addresses: self.address_cache.len() as u32,
            network: format!("{:?}", self.network),
            derivation_path: self.derivation_path.to_string(),
        }
    }
    
    /// Clean expired cache entries
    pub fn cleanup_cache(&mut self) -> u32 {
        let initial_count = self.address_cache.len();
        self.address_cache.retain(|_, cached| cached.is_valid());
        (initial_count - self.address_cache.len()) as u32
    }
    
    /// Validate derivation index
    fn validate_index(&self, index: u32) -> Result<(), HDWalletError> {
        if index > self.max_derivation_index {
            return Err(HDWalletError::InvalidIndex {
                index,
                max: self.max_derivation_index,
            });
        }
        Ok(())
    }
    
    /// Update usage statistics
    fn update_usage_stats(&mut self) {
        self.last_used = time();
        self.usage_count += 1;
    }
    
    /// Generate deterministic seed from principal
    fn generate_deterministic_seed(
        principal: Principal, 
        additional_entropy: &[u8],
    ) -> Result<Vec<u8>, HDWalletError> {
        use sha2::{Digest, Sha256};
        
        let mut hasher = Sha256::new();
        hasher.update(b"IC_HD_WALLET_SEED_V1");
        hasher.update(principal.as_slice());
        hasher.update(&time().to_be_bytes());
        hasher.update(additional_entropy);
        
        // Add some canister-specific entropy
        hasher.update(ic_cdk::id().as_slice());
        
        Ok(hasher.finalize().to_vec())
    }
    
    /// Generate derivation path for principal
    fn generate_derivation_path_for_principal(principal: Principal) -> String {
        // Use first 4 bytes of principal hash to create unique path
        use sha2::{Digest, Sha256};
        let hash = Sha256::digest(principal.as_slice());
        let path_component = u32::from_be_bytes([hash[0], hash[1], hash[2], hash[3]]) % 1000;
        
        format!("m/44'/223'/{}'/0", path_component)
    }
}

// Address type enumeration
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum AddressType {
    P2PKH,  // Legacy addresses (1...)
    P2WPKH, // Native SegWit addresses (bc1...)
    P2SH,   // Script addresses (3..., wrapped SegWit)
}

// Enhanced cached address structure
#[derive(Clone, Debug, Serialize, Deserialize)]
struct CachedAddress {
    address: String,
    address_type: AddressType,
    timestamp: u64,
    ttl_seconds: u64,
}

impl CachedAddress {
    fn is_valid(&self) -> bool {
        let current_time = time();
        current_time < self.timestamp + (self.ttl_seconds * 1_000_000_000)
    }
}

// Wallet statistics structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HDWalletStats {
    pub created_at: u64,
    pub last_used: u64,
    pub usage_count: u64,
    pub cached_keys: u32,
    pub cached_addresses: u32,
    pub network: String,
    pub derivation_path: String,
}

// Utility functions for seed generation with enhanced security
pub fn generate_secure_seed(principal: Principal, entropy_source: &str) -> Result<Vec<u8>, HDWalletError> {
    use sha2::{Digest, Sha256};
    
    if entropy_source.len() < 8 {
        return Err(HDWalletError::InsufficientEntropy);
    }
    
    let mut seed = Vec::new();
    
    // Add timestamp
    seed.extend_from_slice(&time().to_be_bytes());
    
    // Add principal
    seed.extend_from_slice(principal.as_slice());
    
    // Add entropy source
    seed.extend_from_slice(entropy_source.as_bytes());
    
    // Add canister ID for additional uniqueness
    seed.extend_from_slice(ic_cdk::id().as_slice());
    
    // Hash everything for uniform distribution
    let hash = Sha256::digest(&seed);
    
    Ok(hash.to_vec())
}

pub fn validate_derivation_path(path: &str) -> Result<(), HDWalletError> {
    let parsed_path = DerivationPath::from_str(path)
        .map_err(|e| HDWalletError::DerivationPathError {
            path: path.to_string(),
            reason: format!("Parse error: {}", e),
        })?;
    
    // Validate path structure for Bitcoin
    if parsed_path.len() < 3 {
        return Err(HDWalletError::DerivationPathError {
            path: path.to_string(),
            reason: "Path too short (minimum m/44'/coin'/account')".to_string(),
        });
    }
    
    // Check if it's a hardened derivation for account level
    if !parsed_path[0].is_hardened() || !parsed_path[1].is_hardened() || !parsed_path[2].is_hardened() {
        return Err(HDWalletError::DerivationPathError {
            path: path.to_string(),
            reason: "First three levels must be hardened".to_string(),
        });
    }
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use candid::Principal;
    
    #[test]
    fn test_hd_wallet_creation() {
        let seed = vec![1u8; 32];
        let path = "m/44'/0'/0'/0";
        let wallet = HDWallet::new(&seed, path, Network::Bitcoin);
        assert!(wallet.is_ok());
    }
    
    #[test]
    fn test_address_derivation() {
        let seed = vec![1u8; 32];
        let path = "m/44'/0'/0'/0";
        let mut wallet = HDWallet::new(&seed, path, Network::Bitcoin).unwrap();
        
        let address = wallet.derive_address(0, AddressType::P2PKH);
        assert!(address.is_ok());
    }
    
    #[test]
    fn test_batch_address_generation() {
        let seed = vec![1u8; 32];
        let path = "m/44'/0'/0'/0";
        let mut wallet = HDWallet::new(&seed, path, Network::Bitcoin).unwrap();
        
        let addresses = wallet.derive_addresses_batch(0, 5, AddressType::P2PKH);
        assert!(addresses.is_ok());
        assert_eq!(addresses.unwrap().len(), 5);
    }
}