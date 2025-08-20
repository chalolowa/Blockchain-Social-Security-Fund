use candid::{CandidType, Principal};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;

pub type Satoshi = u64;
pub type BlockIndex = u64;
pub type WithdrawalId = u64;
pub type TransactionId = [u8; 32];

// Enhanced error types with specific context
#[derive(Error, Debug, CandidType, Deserialize, Serialize, Clone)]
pub enum WalletError {
    #[error("Authentication failed: {reason}")]
    AuthenticationFailed { reason: String },
    
    #[error("Wallet not found for principal {principal}")]
    WalletNotFound { principal: String },
    
    #[error("Insufficient funds: required {required}, available {available}")]
    InsufficientFunds { required: u64, available: u64 },
    
    #[error("ECDSA operation failed: {operation} - {details}")]
    EcdsaError { operation: String, details: String },
    
    #[error("Canister creation failed: {reason}")]
    CanisterCreationFailed { reason: String },
    
    #[error("Vault operation failed: {operation} - {details}")]
    VaultError { operation: String, details: String },
    
    #[error("Identity broker error: {details}")]
    IdentityBrokerError { details: String },
    
    #[error("Invalid address format: {address} - {reason}")]
    InvalidAddress { address: String, reason: String },
    
    #[error("Network timeout after {seconds}s for operation: {operation}")]
    NetworkTimeout { seconds: u64, operation: String },
    
    #[error("Rate limit exceeded: try again in {retry_after}s")]
    RateLimitExceeded { retry_after: u64 },
    
    #[error("Transaction failed: {transaction_id} - {reason}")]
    TransactionFailed { transaction_id: String, reason: String },
    
    #[error("Validation error: {field} - {message}")]
    ValidationError { field: String, message: String },
}

// Validated types for secure operations
#[derive(Debug, Clone, Serialize, Deserialize, CandidType)]
pub struct ValidatedBtcAddress(String);

impl ValidatedBtcAddress {
    pub fn new(address: String) -> Result<Self, WalletError> {
        Self::validate_btc_address(&address)?;
        Ok(ValidatedBtcAddress(address))
    }
    
    pub fn as_str(&self) -> &str {
        &self.0
    }
    
    fn validate_btc_address(address: &str) -> Result<(), WalletError> {
        if address.is_empty() {
            return Err(WalletError::ValidationError {
                field: "btc_address".to_string(),
                message: "Address cannot be empty".to_string(),
            });
        }
        
        // Basic Bitcoin address validation
        if address.len() < 26 || address.len() > 62 {
            return Err(WalletError::InvalidAddress {
                address: address.to_string(),
                reason: "Invalid length".to_string(),
            });
        }
        
        // Check for valid characters and prefixes
        if !address.starts_with('1') && !address.starts_with('3') && !address.starts_with("bc1") {
            return Err(WalletError::InvalidAddress {
                address: address.to_string(),
                reason: "Invalid prefix".to_string(),
            });
        }
        
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, CandidType)]
pub struct ValidatedAmount(u64);

impl ValidatedAmount {
    pub fn new(amount: u64, min_amount: u64) -> Result<Self, WalletError> {
        if amount < min_amount {
            return Err(WalletError::ValidationError {
                field: "amount".to_string(),
                message: format!("Amount {} is below minimum {}", amount, min_amount),
            });
        }
        
        if amount == 0 {
            return Err(WalletError::ValidationError {
                field: "amount".to_string(),
                message: "Amount cannot be zero".to_string(),
            });
        }
        
        Ok(ValidatedAmount(amount))
    }
    
    pub fn value(&self) -> u64 {
        self.0
    }
}

// Enhanced UTXO with validation
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct Utxo {
    pub outpoint: Outpoint,
    pub value: Satoshi,
    pub height: u32,
    pub confirmations: u32,
    pub is_mature: bool,
}

impl Utxo {
    pub fn new(outpoint: Outpoint, value: Satoshi, height: u32, current_height: u32) -> Self {
        let confirmations = current_height.saturating_sub(height);
        Self {
            outpoint,
            value,
            height,
            confirmations,
            is_mature: confirmations >= 6, // Consider mature after 6 confirmations
        }
    }
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq, Eq, Hash)]
pub struct Outpoint {
    pub txid: Vec<u8>,
    pub vout: u32,
}

impl Outpoint {
    pub fn new(txid: Vec<u8>, vout: u32) -> Result<Self, WalletError> {
        if txid.len() != 32 {
            return Err(WalletError::ValidationError {
                field: "txid".to_string(),
                message: "Transaction ID must be 32 bytes".to_string(),
            });
        }
        
        Ok(Outpoint { txid, vout })
    }
}

// Enhanced error types for specific operations
#[derive(CandidType, Deserialize, Debug, Clone)]
pub enum UpdateBalanceError {
    NoNewUtxos,
    TemporarilyUnavailable(String),
    NetworkError { code: u64, message: String },
    InvalidResponse(String),
    Timeout,
}

#[derive(CandidType, Deserialize, Debug)]
pub struct UpdateBalanceResult {
    pub balance: Satoshi,
    pub new_utxos: Vec<Utxo>,
    pub updated_at: u64,
    pub block_height: u32,
}

// Transaction tracking
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct Transaction {
    pub id: TransactionId,
    pub from: Principal,
    pub to: Account,
    pub amount: u64,
    pub fee: u64,
    pub status: TransactionStatus,
    pub created_at: u64,
    pub completed_at: Option<u64>,
    pub block_index: Option<BlockIndex>,
    pub retry_count: u32,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub enum TransactionStatus {
    Pending,
    Processing,
    Completed,
    Failed { reason: String },
    Cancelled,
}

// Enhanced Account with validation
#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq, Eq, Hash)]
pub struct Account {
    pub owner: Principal,
    pub subaccount: Option<[u8; 32]>,
}

impl Account {
    pub fn new(owner: Principal, subaccount: Option<[u8; 32]>) -> Self {
        Self { owner, subaccount }
    }
    
    pub fn principal_only(owner: Principal) -> Self {
        Self { owner, subaccount: None }
    }
}

// Configuration management
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ProductionConfig {
    pub canister_ids: CanisterIds,
    pub network_settings: NetworkSettings,
    pub security_settings: SecuritySettings,
    pub rate_limits: RateLimits,
    pub fee_settings: FeeSettings,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CanisterIds {
    pub ckbtc_minter: Principal,
    pub ckbtc_ledger: Principal,
    pub ckusdt_ledger: Principal,
    pub cketh_minter: Principal,
    pub icp_ledger: Principal,
    pub identity_broker: Principal,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct NetworkSettings {
    pub request_timeout_seconds: u64,
    pub max_retries: u32,
    pub backoff_multiplier: f64,
    pub max_concurrent_requests: u32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SecuritySettings {
    pub min_confirmations: u32,
    pub max_transaction_amount: u64,
    pub require_two_factor: bool,
    pub session_timeout_seconds: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RateLimits {
    pub transfers_per_minute: u32,
    pub balance_updates_per_minute: u32,
    pub wallet_creation_per_hour: u32,
    pub withdrawal_requests_per_day: u32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FeeSettings {
    pub btc_network_fee: u64,
    pub icp_transfer_fee: u64,
    pub ckbtc_transfer_fee: u64,
    pub ckusdt_transfer_fee: u64,
    pub service_fee_percentage: f64,
}

// Metrics and monitoring
#[derive(Serialize, Deserialize, Default, Clone, Debug)]
pub struct Metrics {
    pub total_transactions: u64,
    pub failed_transactions: u64,
    pub successful_transactions: u64,
    pub average_response_time_ms: u64,
    pub active_wallets: u64,
    pub total_volume: HashMap<VaultType, u64>,
    pub error_counts: HashMap<String, u64>,
    pub last_updated: u64,
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum VaultType {
    Icp,
    CkBtc,
    CkUsdt,
}

// Cache structures
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CachedBalance {
    pub value: u64,
    pub timestamp: u64,
    pub ttl_seconds: u64,
}

impl CachedBalance {
    pub fn new(value: u64, ttl_seconds: u64) -> Self {
        Self {
            value,
            timestamp: ic_cdk::api::time(),
            ttl_seconds,
        }
    }
    
    pub fn is_valid(&self) -> bool {
        let current_time = ic_cdk::api::time();
        current_time < self.timestamp + (self.ttl_seconds * 1_000_000_000) // Convert to nanoseconds
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CachedAddress {
    pub address: String,
    pub timestamp: u64,
    pub ttl_seconds: u64,
}

impl CachedAddress {
    pub fn new(address: String, ttl_seconds: u64) -> Self {
        Self {
            address,
            timestamp: ic_cdk::api::time(),
            ttl_seconds,
        }
    }
    
    pub fn is_valid(&self) -> bool {
        let current_time = ic_cdk::api::time();
        current_time < self.timestamp + (self.ttl_seconds * 1_000_000_000)
    }
}

// Enhanced withdrawal status with more details
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub enum WithdrawalStatus {
    Pending {
        amount: u64,
        created_at: u64,
        estimated_completion: u64,
    },
    Processing {
        amount: u64,
        transaction_hash: Option<String>,
        confirmations: u32,
        required_confirmations: u32,
    },
    Completed {
        amount: u64,
        transaction_hash: String,
        completed_at: u64,
        final_fee: u64,
    },
    Failed {
        amount: u64,
        reason: String,
        failed_at: u64,
        refunded: bool,
    },
    Cancelled {
        amount: u64,
        cancelled_at: u64,
        refunded: bool,
    },
}

// Helper traits for better error handling
pub trait ResultExt<T> {
    fn map_wallet_error<F>(self, f: F) -> Result<T, WalletError>
    where
        F: FnOnce() -> WalletError;
}

impl<T, E> ResultExt<T> for Result<T, E> {
    fn map_wallet_error<F>(self, f: F) -> Result<T, WalletError>
    where
        F: FnOnce() -> WalletError,
    {
        self.map_err(|_| f())
    }
}