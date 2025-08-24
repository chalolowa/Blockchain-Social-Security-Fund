use crate::{types::*, vaults::{ckbtc::{CkBtcVault, VaultMetrics}, ckusdt::CkUsdtVault, icp::IcpVault}};
use candid::{CandidType, Principal};
use serde::{Deserialize, Serialize};
use std::{cell::RefCell, collections::HashMap};
use thiserror::Error;

pub mod ckbtc;
pub mod ckusdt;
pub mod icp;

// Enhanced vault manager with comprehensive features
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct VaultManager {
    owner: Principal,
    created_at: u64,
    last_updated: u64,
    // Configuration
    config: VaultConfiguration,
    // Metrics and monitoring
    metrics: VaultManagerMetrics,
    // Security features
    security_settings: SecuritySettings,
    // Rate limiting
    rate_limiters: HashMap<VaultType, RateLimiter>,
}

impl Default for VaultManager {
    fn default() -> Self {
        Self {
            owner: Principal::anonymous(),
            created_at: 0,
            last_updated: 0,
            config: VaultConfiguration::default(),
            metrics: VaultManagerMetrics::default(),
            security_settings: SecuritySettings::default(),
            rate_limiters: HashMap::new(),
        }
    }
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct VaultConfiguration {
    pub auto_update_balance: bool,
    pub balance_update_interval_seconds: u64,
    pub cache_ttl_seconds: u64,
    pub max_concurrent_operations: u32,
    pub enable_transaction_logging: bool,
    pub cleanup_old_data_days: u64,
}

impl Default for VaultConfiguration {
    fn default() -> Self {
        Self {
            auto_update_balance: true,
            balance_update_interval_seconds: 300, // 5 minutes
            cache_ttl_seconds: 60,
            max_concurrent_operations: 5,
            enable_transaction_logging: true,
            cleanup_old_data_days: 30,
        }
    }
}

#[derive(CandidType, Serialize, Deserialize, Default, Clone, Debug)]
pub struct VaultManagerMetrics {
    pub total_operations: u64,
    pub successful_operations: u64,
    pub failed_operations: u64,
    pub total_volume_by_type: HashMap<VaultType, u64>,
    pub average_response_times: HashMap<String, u64>,
    pub last_metrics_reset: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct RateLimiter {
    requests_per_minute: HashMap<String, Vec<u64>>,
    max_requests_per_minute: u32,
}

impl RateLimiter {
    pub fn new(max_requests: u32) -> Self {
        Self {
            requests_per_minute: HashMap::new(),
            max_requests_per_minute: max_requests,
        }
    }
    
    pub fn check_limit(&mut self, operation: &str) -> Result<(), WalletError> {
        let current_time = ic_cdk::api::time();
        let one_minute_ago = current_time.saturating_sub(60_000_000_000);
        
        let requests = self.requests_per_minute.entry(operation.to_string()).or_default();
        requests.retain(|&timestamp| timestamp > one_minute_ago);
        
        if requests.len() as u32 >= self.max_requests_per_minute {
            return Err(WalletError::RateLimitExceeded {
                retry_after: 60,
            });
        }
        
        requests.push(current_time);
        Ok(())
    }
}

// Thread-local storage for vault instances
thread_local! {
    static ICP_VAULTS: RefCell<HashMap<Principal, IcpVault>> = RefCell::new(HashMap::new());
    static CKBTC_VAULTS: RefCell<HashMap<Principal, CkBtcVault>> = RefCell::new(HashMap::new());
    static CKUSDT_VAULTS: RefCell<HashMap<Principal, CkUsdtVault>> = RefCell::new(HashMap::new());
    static VAULT_MANAGERS: RefCell<HashMap<Principal, VaultManager>> = RefCell::new(HashMap::new());
}

impl VaultManager {
    pub fn new(owner: Principal) -> Self {
        let current_time = ic_cdk::api::time();
        
        Self {
            owner,
            created_at: current_time,
            last_updated: current_time,
            config: VaultConfiguration::default(),
            metrics: VaultManagerMetrics::default(),
            security_settings: SecuritySettings::default(),
            rate_limiters: HashMap::new(),
        }
    }
    
    pub fn configure(&mut self, config: VaultConfiguration) {
        self.config = config;
        self.last_updated = ic_cdk::api::time();
    }
    
    pub fn get_metrics(&self) -> &VaultManagerMetrics {
        &self.metrics
    }
    
    fn record_operation(&mut self, operation: &str, success: bool, duration_ns: u64) {
        self.metrics.total_operations += 1;
        
        if success {
            self.metrics.successful_operations += 1;
        } else {
            self.metrics.failed_operations += 1;
        }
        
        // Update average response time
        let current_avg = self.metrics.average_response_times
            .get(operation)
            .copied()
            .unwrap_or(0);
        
        let new_avg = if current_avg == 0 {
            duration_ns
        } else {
            (current_avg + duration_ns) / 2
        };
        
        self.metrics.average_response_times.insert(operation.to_string(), new_avg);
        self.last_updated = ic_cdk::api::time();
    }
}

// Production canister IDs
fn get_production_config() -> ProductionConfig {
    ProductionConfig {
        canister_ids: CanisterIds {
            ckbtc_minter: principal_from_text("mqygn-kiaaa-aaaar-qaadq-cai"),
            ckbtc_ledger: principal_from_text("mxzaz-hqaaa-aaaar-qaada-cai"),
            ckusdt_ledger: principal_from_text("cngnf-vqaaa-aaaar-qag4q-cai"),
            cketh_minter: principal_from_text("sv3dd-oaaaa-aaaar-qacoa-cai"),
            icp_ledger: principal_from_text("ryjl3-tyaaa-aaaaa-aaaba-cai"),
            identity_broker: principal_from_text("rrkah-fqaaa-aaaaa-aaaaq-cai"),
        },
        network_settings: NetworkSettings {
            request_timeout_seconds: 30,
            max_retries: 3,
            backoff_multiplier: 2.0,
            max_concurrent_requests: 10,
        },
        security_settings: SecuritySettings {
            min_confirmations: 6,
            max_transaction_amount: 100_000_000_000,
            require_two_factor: false,
            session_timeout_seconds: 3600,
        },
        rate_limits: RateLimits {
            transfers_per_minute: 10,
            balance_updates_per_minute: 20,
            wallet_creation_per_hour: 5,
            withdrawal_requests_per_day: 50,
        },
        fee_settings: FeeSettings {
            btc_network_fee: 10_000,
            icp_transfer_fee: 10_000,
            ckbtc_transfer_fee: 0,
            ckusdt_transfer_fee: 0,
            service_fee_percentage: 0.001,
        },
    }
}

// Helper function to create Principal from text at compile time
fn principal_from_text(text: &str) -> Principal {
    Principal::from_text(text).unwrap_or(Principal::anonymous())
}

// Public interface functions with enhanced error handling and monitoring

pub async fn initialize_vault_system(owner: Principal) -> Result<(), WalletError> {
    let start_time = ic_cdk::api::time();
    
    let result = async {
        // Initialize vault manager
        let vault_manager = VaultManager::new(owner);
        
        VAULT_MANAGERS.with(|managers| {
            managers.borrow_mut().insert(owner, vault_manager);
        });
        
        // Initialize individual vaults
        initialize_icp_vault(owner).await?;
        initialize_ckbtc_vault(owner).await?;
        initialize_ckusdt_vault(owner).await?;
        
        Ok(())
    }.await;
    
    let duration = ic_cdk::api::time() - start_time;
    
    // Record metrics
    VAULT_MANAGERS.with(|managers| {
        if let Some(manager) = managers.borrow_mut().get_mut(&owner) {
            manager.record_operation("initialize_vault_system", result.is_ok(), duration);
        }
    });
    
    result
}

async fn initialize_icp_vault(owner: Principal) -> Result<(), WalletError> {
    let config = get_production_config();
    let vault = IcpVault::new(owner, &config.canister_ids.icp_ledger.to_text());
    
    ICP_VAULTS.with(|vaults| {
        vaults.borrow_mut().insert(owner, vault);
    });
    
    Ok(())
}

async fn initialize_ckbtc_vault(owner: Principal) -> Result<(), WalletError> {
    let config = get_production_config();
    let vault = CkBtcVault::new(
        owner,
        &config.canister_ids.ckbtc_minter.to_text(),
        &config.canister_ids.ckbtc_ledger.to_text(),
    )?;
    
    CKBTC_VAULTS.with(|vaults| {
        vaults.borrow_mut().insert(owner, vault);
    });
    
    Ok(())
}

async fn initialize_ckusdt_vault(owner: Principal) -> Result<(), WalletError> {
    let config = get_production_config();
    let vault = CkUsdtVault::new(
        owner,
        &config.canister_ids.ckusdt_ledger.to_text(),
        &config.canister_ids.cketh_minter.to_text(),
        "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    )?;
    
    CKUSDT_VAULTS.with(|vaults| {
        vaults.borrow_mut().insert(owner, vault);
    });
    
    Ok(())
}

pub async fn batch_update_balances(owner: Principal) -> Result<HashMap<VaultType, u64>, WalletError> {
    let start_time = ic_cdk::api::time();
    
    let result = async {
        let mut balances = HashMap::new();
        
        // Update ICP balance
        if let Ok(balance) = update_icp_balance(owner).await {
            balances.insert(VaultType::Icp, balance);
        }
        
        // Update ckBTC balance
        if let Ok(balance) = update_ckbtc_balance(owner).await {
            balances.insert(VaultType::CkBtc, balance);
        }
        
        // Update ckUSDT balance
        if let Ok(balance) = update_ckusdt_balance(owner).await {
            balances.insert(VaultType::CkUsdt, balance);
        }
        
        if balances.is_empty() {
            return Err(WalletError::VaultError {
                operation: "batch_update_balances".to_string(),
                details: "Failed to update any vault balances".to_string(),
            });
        }
        
        Ok(balances)
    }.await;
    
    let duration = ic_cdk::api::time() - start_time;
    
    // Record metrics
    VAULT_MANAGERS.with(|managers| {
        if let Some(manager) = managers.borrow_mut().get_mut(&owner) {
            manager.record_operation("batch_update_balances", result.is_ok(), duration);
        }
    });
    
    result
}

pub async fn update_ckbtc_balance(owner: Principal) -> Result<u64, WalletError> {
    let start_time = ic_cdk::api::time();
    
    // Check rate limit
    VAULT_MANAGERS.with(|managers| {
        if let Some(manager) = managers.borrow_mut().get_mut(&owner) {
            let rate_limiter = manager.rate_limiters
                .entry(VaultType::CkBtc)
                .or_insert_with(|| RateLimiter::new(get_production_config().rate_limits.balance_updates_per_minute));
            rate_limiter.check_limit("update_balance")
        } else {
            Err(WalletError::WalletNotFound {
                principal: owner.to_string(),
            })
        }
    })?;
    
    let result = CKBTC_VAULTS.with(|vaults| {
        let mut vaults = vaults.borrow_mut();
        match vaults.get_mut(&owner) {
            Some(vault) => {
                // Await the future inside the closure to avoid lifetime issues
                futures::executor::block_on(vault.update_balance())
            },
            None => Err(WalletError::VaultError {
                operation: "update_ckbtc_balance".to_string(),
                details: "ckBTC vault not found".to_string(),
            }),
        }
    });
    
    let duration = ic_cdk::api::time() - start_time;
    
    // Record metrics
    VAULT_MANAGERS.with(|managers| {
        if let Some(manager) = managers.borrow_mut().get_mut(&owner) {
            manager.record_operation("update_ckbtc_balance", result.is_ok(), duration);
        }
    });
    
    result
}

pub async fn update_icp_balance(owner: Principal) -> Result<u64, WalletError> {
    let start_time = ic_cdk::api::time();

    // Extract the vault out of the RefCell borrow so the future does not borrow local data
    let vault_opt = ICP_VAULTS.with(|vaults| {
        let mut vaults = vaults.borrow_mut();
        vaults.get_mut(&owner).map(|vault| vault as *mut IcpVault)
    });

    let result = if let Some(vault_ptr) = vault_opt {
        // SAFETY: We only use this pointer here and RefCell borrow is dropped
        let vault = unsafe { &mut *vault_ptr };
        vault.update_balance().await
    } else {
        Err(WalletError::VaultError {
            operation: "update_icp_balance".to_string(),
            details: "ICP vault not found".to_string(),
        })
    };

    let duration = ic_cdk::api::time() - start_time;

    // Record metrics
    VAULT_MANAGERS.with(|managers| {
        if let Some(manager) = managers.borrow_mut().get_mut(&owner) {
            manager.record_operation("update_icp_balance", result.is_ok(), duration);
        }
    });

    result
}

pub async fn update_ckusdt_balance(owner: Principal) -> Result<u64, WalletError> {
    let start_time = ic_cdk::api::time();
    
    let result = {
        let vault_opt = CKUSDT_VAULTS.with(|vaults| {
            let mut vaults = vaults.borrow_mut();
            vaults.get_mut(&owner).map(|vault| vault as *mut CkUsdtVault)
        });

        if let Some(vault_ptr) = vault_opt {
            // SAFETY: Only used here, RefCell borrow is dropped
            let vault = unsafe { &mut *vault_ptr };
            vault.update_balance().await
        } else {
            Err(WalletError::VaultError {
                operation: "update_ckusdt_balance".to_string(),
                details: "ckUSDT vault not found".to_string(),
            })
        }
    };
    
    let duration = ic_cdk::api::time() - start_time;
    
    // Record metrics  
    VAULT_MANAGERS.with(|managers| {
        if let Some(manager) = managers.borrow_mut().get_mut(&owner) {
            manager.record_operation("update_ckusdt_balance", result.is_ok(), duration);
        }
    });
    
    result
}

pub async fn transfer_tokens(
    owner: Principal,
    vault_type: VaultType,
    amount: u64,
    recipient: Principal,
) -> Result<BlockIndex, WalletError> {
    let start_time = ic_cdk::api::time();
    let validated_amount = ValidatedAmount::new(amount, 1000)?;

    // Check rate limit
    VAULT_MANAGERS.with(|managers| {
        if let Some(manager) = managers.borrow_mut().get_mut(&owner) {
            let rate_limiter = manager.rate_limiters
                .entry(vault_type)
                .or_insert_with(|| RateLimiter::new(get_production_config().rate_limits.transfers_per_minute));
            rate_limiter.check_limit("transfer")
        } else {
            Err(WalletError::WalletNotFound {
                principal: owner.to_string(),
            })
        }
    })?;
    
    let result = match vault_type {
        VaultType::Icp => {
            let vault_ptr_opt = ICP_VAULTS.with(|vaults| {
                let mut vaults = vaults.borrow_mut();
                vaults.get_mut(&owner).map(|vault| vault as *mut IcpVault)
            });
            if let Some(vault_ptr) = vault_ptr_opt {
                // SAFETY: Only used here, RefCell borrow is dropped
                let vault = unsafe { &mut *vault_ptr };
                vault.transfer(validated_amount.value(), recipient).await
            } else {
                Err(WalletError::VaultError {
                    operation: "icp_transfer".to_string(),
                    details: "ICP vault not found".to_string(),
                })
            }
        }
        VaultType::CkBtc => {
            let vault_ptr_opt = CKBTC_VAULTS.with(|vaults| {
                let mut vaults = vaults.borrow_mut();
                vaults.get_mut(&owner).map(|vault| vault as *mut CkBtcVault)
            });
            if let Some(vault_ptr) = vault_ptr_opt {
                // SAFETY: Only used here, RefCell borrow is dropped
                let vault = unsafe { &mut *vault_ptr };
                vault.transfer(validated_amount.value(), recipient).await
            } else {
                Err(WalletError::VaultError {
                    operation: "ckbtc_transfer".to_string(),
                    details: "ckBTC vault not found".to_string(),
                })
            }
        }
        VaultType::CkUsdt => {
            let vault_ptr_opt = CKUSDT_VAULTS.with(|vaults| {
                let mut vaults = vaults.borrow_mut();
                vaults.get_mut(&owner).map(|vault| vault as *mut CkUsdtVault)
            });
            if let Some(vault_ptr) = vault_ptr_opt {
                // SAFETY: Only used here, RefCell borrow is dropped
                let vault = unsafe { &mut *vault_ptr };
                vault.transfer(validated_amount.value(), recipient).await.map(|_| 0)
            } else {
                Err(WalletError::VaultError {
                    operation: "ckusdt_transfer".to_string(),
                    details: "ckUSDT vault not found".to_string(),
                })
            }
        }
    };
    
    let duration = ic_cdk::api::time() - start_time;
    
    // Record metrics and update volume
    VAULT_MANAGERS.with(|managers| {
        if let Some(manager) = managers.borrow_mut().get_mut(&owner) {
            manager.record_operation("transfer", result.is_ok(), duration);
            
            if result.is_ok() {
                let current_volume = manager.metrics.total_volume_by_type
                    .entry(vault_type)
                    .or_insert(0);
                *current_volume += validated_amount.value();
            }
        }
    });
    
    result
}

pub async fn retrieve_btc(
    owner: Principal,
    amount: u64,
    btc_address: String,
) -> Result<u64, WalletError> {
    let start_time = ic_cdk::api::time();
    
    // Validate inputs
    let validated_amount = ValidatedAmount::new(amount, 10_000)?; // Min 0.0001 BTC
    let validated_address = ValidatedBtcAddress::new(btc_address)?;
    
    // Check rate limit
    VAULT_MANAGERS.with(|managers| {
        if let Some(manager) = managers.borrow_mut().get_mut(&owner) {
            let rate_limiter = manager.rate_limiters
                .entry(VaultType::CkBtc)
                .or_insert_with(|| RateLimiter::new(10)); // Max 10 BTC withdrawals per minute
            rate_limiter.check_limit("retrieve_btc")
        } else {
            Err(WalletError::WalletNotFound {
                principal: owner.to_string(),
            })
        }
    })?;
    
    let result = async {
        let vault_opt = CKBTC_VAULTS.with(|vaults| {
            let mut vaults = vaults.borrow_mut();
            vaults.get_mut(&owner).map(|vault| vault as *mut CkBtcVault)
        });
        
        if let Some(vault_ptr) = vault_opt {
            let vault = unsafe { &mut *vault_ptr };
            vault.retrieve_btc(validated_amount.value(), validated_address.as_str().to_string()).await
        } else {
            Err(WalletError::VaultError {
                operation: "retrieve_btc".to_string(),
                details: "ckBTC vault not found".to_string(),
            })
        }
    }.await;
    
    let duration = ic_cdk::api::time() - start_time;
    
    // Record metrics
    VAULT_MANAGERS.with(|managers| {
        if let Some(manager) = managers.borrow_mut().get_mut(&owner) {
            manager.record_operation("retrieve_btc", result.is_ok(), duration);
        }
    });
    
    result
}

pub async fn withdraw_usdt(
    owner: Principal,
    amount: u64,
    ethereum_address: String,
) -> Result<WithdrawalId, WalletError> {
    let start_time = ic_cdk::api::time();
    
    // Validate inputs
    let validated_amount = ValidatedAmount::new(amount, 1_000_000)?; // Min 1 USDT (6 decimals)
    
    // Basic Ethereum address validation
    if !ethereum_address.starts_with("0x") || ethereum_address.len() != 42 {
        return Err(WalletError::InvalidAddress {
            address: ethereum_address,
            reason: "Invalid Ethereum address format".to_string(),
        });
    }
    
    // Check rate limit
    VAULT_MANAGERS.with(|managers| {
        if let Some(manager) = managers.borrow_mut().get_mut(&owner) {
            let rate_limiter = manager.rate_limiters
                .entry(VaultType::CkUsdt)
                .or_insert_with(|| RateLimiter::new(5));
            rate_limiter.check_limit("withdraw_usdt")
        } else {
            Err(WalletError::WalletNotFound {
                principal: owner.to_string(),
            })
        }
    })?;
    
    let result = async {
        let vault_opt = CKUSDT_VAULTS.with(|vaults| {
            let mut vaults = vaults.borrow_mut();
            vaults.get_mut(&owner).map(|vault| vault as *mut CkUsdtVault)
        });
        
        if let Some(vault_ptr) = vault_opt {
            let vault = unsafe { &mut *vault_ptr };
            vault.withdraw_usdt(validated_amount.value(), ethereum_address).await
        } else {
            Err(WalletError::VaultError {
                operation: "withdraw_usdt".to_string(),
                details: "ckUSDT vault not found".to_string(),
            })
        }
    }.await;
    
    let duration = ic_cdk::api::time() - start_time;
    
    // Record metrics
    VAULT_MANAGERS.with(|managers| {
        if let Some(manager) = managers.borrow_mut().get_mut(&owner) {
            manager.record_operation("withdraw_usdt", result.is_ok(), duration);
        }
    });
    
    result
}

pub fn get_balance(owner: Principal, vault_type: VaultType) -> Result<u64, WalletError> {
    match vault_type {
        VaultType::Icp => {
            ICP_VAULTS.with(|vaults| {
                let vaults = vaults.borrow();
                let vault = vaults.get(&owner).ok_or(WalletError::VaultError {
                    operation: "get_icp_balance".to_string(),
                    details: "ICP vault not found".to_string(),
                })?;
                Ok(vault.balance())
            })
        }
        VaultType::CkBtc => {
            CKBTC_VAULTS.with(|vaults| {
                let vaults = vaults.borrow();
                let vault = vaults.get(&owner).ok_or(WalletError::VaultError {
                    operation: "get_ckbtc_balance".to_string(),
                    details: "ckBTC vault not found".to_string(),
                })?;
                Ok(vault.balance())
            })
        }
        VaultType::CkUsdt => {
            CKUSDT_VAULTS.with(|vaults| {
                let vaults = vaults.borrow();
                let vault = vaults.get(&owner).ok_or(WalletError::VaultError {
                    operation: "get_ckusdt_balance".to_string(),
                    details: "ckUSDT vault not found".to_string(),
                })?;
                Ok(vault.balance())
            })
        }
    }
}

pub fn get_all_balances(owner: Principal) -> Result<HashMap<VaultType, u64>, WalletError> {
    let mut balances = HashMap::new();
    
    // Get ICP balance
    if let Ok(balance) = get_balance(owner, VaultType::Icp) {
        balances.insert(VaultType::Icp, balance);
    }
    
    // Get ckBTC balance
    if let Ok(balance) = get_balance(owner, VaultType::CkBtc) {
        balances.insert(VaultType::CkBtc, balance);
    }
    
    // Get ckUSDT balance
    if let Ok(balance) = get_balance(owner, VaultType::CkUsdt) {
        balances.insert(VaultType::CkUsdt, balance);
    }
    
    if balances.is_empty() {
        return Err(WalletError::WalletNotFound {
            principal: owner.to_string(),
        });
    }
    
    Ok(balances)
}

pub async fn get_btc_address(owner: Principal) -> Result<String, WalletError> {
    let vault_opt = CKBTC_VAULTS.with(|vaults| {
        let mut vaults = vaults.borrow_mut();
        vaults.get_mut(&owner).map(|vault| vault as *mut CkBtcVault)
    });
    
    if let Some(vault_ptr) = vault_opt {
        let vault = unsafe { &mut *vault_ptr };
        vault.get_btc_address().await
    } else {
        Err(WalletError::VaultError {
            operation: "get_btc_address".to_string(),
            details: "ckBTC vault not found".to_string(),
        })
    }
}

pub fn get_transaction_history(
    owner: Principal,
    vault_type: VaultType,
    limit: Option<usize>,
) -> Result<Vec<Transaction>, WalletError> {
    match vault_type {
        VaultType::CkBtc => {
            CKBTC_VAULTS.with(|vaults| {
                let vaults = vaults.borrow();
                let vault = vaults.get(&owner).ok_or(WalletError::VaultError {
                    operation: "get_ckbtc_history".to_string(),
                    details: "ckBTC vault not found".to_string(),
                })?;
                Ok(vault.get_transaction_history(limit))
            })
        }
        VaultType::CkUsdt => {
            CKUSDT_VAULTS.with(|vaults| {
                let vaults = vaults.borrow();
                let vault = vaults.get(&owner).ok_or(WalletError::VaultError {
                    operation: "get_ckusdt_history".to_string(),
                    details: "ckUSDT vault not found".to_string(),
                })?;
                Ok(vault.get_transaction_history(limit))
            })
        }
        VaultType::Icp => {
            ICP_VAULTS.with(|vaults| {
                let vaults = vaults.borrow();
                let vault = vaults.get(&owner).ok_or(WalletError::VaultError {
                    operation: "get_icp_history".to_string(),
                    details: "ICP vault not found".to_string(),
                })?;
                Ok(vault.get_transaction_history(limit))
            })
        }
    }
}

pub async fn check_usdt_withdrawal_status(
    owner: Principal,
    withdrawal_id: WithdrawalId,
) -> Result<WithdrawalStatus, WalletError> {
    let vault_opt = CKUSDT_VAULTS.with(|vaults| {
        let mut vaults = vaults.borrow_mut();
        vaults.get_mut(&owner).map(|vault| vault as *mut CkUsdtVault)
    });
    
    if let Some(vault_ptr) = vault_opt {
        let vault = unsafe { &mut *vault_ptr };
        vault.check_withdrawal_status(withdrawal_id).await
    } else {
        Err(WalletError::VaultError {
            operation: "check_withdrawal_status".to_string(),
            details: "ckUSDT vault not found".to_string(),
        })
    }
}

pub fn get_vault_metrics(owner: Principal) -> Result<HashMap<VaultType, VaultMetrics>, WalletError> {
    let mut metrics = HashMap::new();
    
    // Get ckBTC metrics
    CKBTC_VAULTS.with(|vaults| {
        let vaults = vaults.borrow();
        if let Some(vault) = vaults.get(&owner) {
            metrics.insert(VaultType::CkBtc, vault.get_vault_metrics());
        }
    });
    
    // Get ckUSDT metrics
    CKUSDT_VAULTS.with(|vaults| {
        let vaults = vaults.borrow();
        if let Some(vault) = vaults.get(&owner) {
            metrics.insert(VaultType::CkUsdt, vault.get_vault_metrics());
        }
    });
    
    // ICP metrics would be added here when implemented
    
    if metrics.is_empty() {
        return Err(WalletError::WalletNotFound {
            principal: owner.to_string(),
        });
    }
    
    Ok(metrics)
}

pub fn get_vault_manager_metrics(owner: Principal) -> Result<VaultManagerMetrics, WalletError> {
    VAULT_MANAGERS.with(|managers| {
        let managers = managers.borrow();
        let manager = managers.get(&owner).ok_or(WalletError::WalletNotFound {
            principal: owner.to_string(),
        })?;
        Ok(manager.metrics.clone())
    })
}

// System maintenance functions

pub fn cleanup_expired_data() -> HashMap<VaultType, u32> {
    let mut cleanup_results = HashMap::new();
    
    // Cleanup ckBTC vaults
    CKBTC_VAULTS.with(|vaults| {
        let mut vaults = vaults.borrow_mut();
        let mut total_cleaned = 0u32;
        
        for vault in vaults.values_mut() {
            total_cleaned += vault.cleanup_old_transactions(30); // 30 days
        }
        
        if total_cleaned > 0 {
            cleanup_results.insert(VaultType::CkBtc, total_cleaned);
        }
    });
    
    // Cleanup ckUSDT vaults
    CKUSDT_VAULTS.with(|vaults| {
        let mut vaults = vaults.borrow_mut();
        let mut total_cleaned = 0u32;
        
        for vault in vaults.values_mut() {
            total_cleaned += vault.cleanup_old_transactions(30);
        }
        
        if total_cleaned > 0 {
            cleanup_results.insert(VaultType::CkUsdt, total_cleaned);
        }
    });
    
    cleanup_results
}

pub fn reset_rate_limiters(owner: Principal) -> Result<(), WalletError> {
    VAULT_MANAGERS.with(|managers| {
        let mut managers = managers.borrow_mut();
        let manager = managers.get_mut(&owner).ok_or(WalletError::WalletNotFound {
            principal: owner.to_string(),
        })?;
        
        manager.rate_limiters.clear();
        Ok(())
    })
}

// Health check functions

pub fn health_check() -> SystemHealth {
    let mut vault_counts = HashMap::new();
    let mut total_operations = 0u64;
    let mut total_errors = 0u64;
    
    // Count active vaults
    ICP_VAULTS.with(|vaults| {
        vault_counts.insert(VaultType::Icp, vaults.borrow().len() as u64);
    });
    
    CKBTC_VAULTS.with(|vaults| {
        vault_counts.insert(VaultType::CkBtc, vaults.borrow().len() as u64);
    });
    
    CKUSDT_VAULTS.with(|vaults| {
        vault_counts.insert(VaultType::CkUsdt, vaults.borrow().len() as u64);
    });
    
    // Aggregate metrics from all vault managers
    VAULT_MANAGERS.with(|managers| {
        for manager in managers.borrow().values() {
            total_operations += manager.metrics.total_operations;
            total_errors += manager.metrics.failed_operations;
        }
    });
    
    let error_rate = if total_operations > 0 {
        (total_errors as f64 / total_operations as f64) * 100.0
    } else {
        0.0
    };
    
    SystemHealth {
        active_vaults: vault_counts,
        total_operations,
        error_rate,
        last_check: ic_cdk::api::time(),
        status: if error_rate < 5.0 { "healthy".to_string() } else { "degraded".to_string() },
    }
}

#[derive(CandidType, Debug, Clone, Serialize, Deserialize)]
pub struct SystemHealth {
    pub active_vaults: HashMap<VaultType, u64>,
    pub total_operations: u64,
    pub error_rate: f64,
    pub last_check: u64,
    pub status: String,
}

// Backup and restore functions for canister upgrades

pub fn backup_vault_state() -> VaultBackup {
    let icp_vaults = ICP_VAULTS.with(|vaults| vaults.borrow().clone());
    let ckbtc_vaults = CKBTC_VAULTS.with(|vaults| vaults.borrow().clone());
    let ckusdt_vaults = CKUSDT_VAULTS.with(|vaults| vaults.borrow().clone());
    let managers = VAULT_MANAGERS.with(|managers| managers.borrow().clone());
    
    VaultBackup {
        icp_vaults,
        ckbtc_vaults,
        ckusdt_vaults,
        managers,
        backup_timestamp: ic_cdk::api::time(),
    }
}

pub fn restore_vault_state(backup: VaultBackup) -> Result<(), WalletError> {
    // Validate backup integrity
    if backup.backup_timestamp == 0 {
        return Err(WalletError::ValidationError {
            field: "backup".to_string(),
            message: "Invalid backup timestamp".to_string(),
        });
    }
    
    ICP_VAULTS.with(|vaults| {
        *vaults.borrow_mut() = backup.icp_vaults;
    });
    
    CKBTC_VAULTS.with(|vaults| {
        *vaults.borrow_mut() = backup.ckbtc_vaults;
    });
    
    CKUSDT_VAULTS.with(|vaults| {
        *vaults.borrow_mut() = backup.ckusdt_vaults;
    });
    
    VAULT_MANAGERS.with(|managers| {
        *managers.borrow_mut() = backup.managers;
    });
    
    ic_cdk::println!("Vault state restored from backup at {}", backup.backup_timestamp);
    Ok(())
}

#[derive(CandidType, Serialize, Deserialize, Clone)]
pub struct VaultBackup {
    pub icp_vaults: HashMap<Principal, IcpVault>,
    pub ckbtc_vaults: HashMap<Principal, CkBtcVault>,
    pub ckusdt_vaults: HashMap<Principal, CkUsdtVault>,
    pub managers: HashMap<Principal, VaultManager>,
    pub backup_timestamp: u64,
}