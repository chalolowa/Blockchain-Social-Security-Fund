use std::{cell::RefCell, collections::HashMap};

use candid::{CandidType, Principal};
use ic_cdk::{api::time, caller, id, init, post_upgrade, pre_upgrade, query, update};
use serde::{Deserialize as SerdeDeserialize, Serialize};

use crate::{ecdsa_manager::{backup_ecdsa_state, initialize_ecdsa_manager, restore_ecdsa_state, EcdsaManager}, types::{BlockIndex, CanisterIds, FeeSettings, NetworkSettings, RateLimits, SecuritySettings, Transaction, VaultType, WalletError, WithdrawalId}, vaults::{backup_vault_state, health_check, initialize_vault_system, restore_vault_state, SystemHealth, VaultBackup, VaultManager}};

pub mod types;
pub mod vaults;
pub mod ecdsa_manager;
pub mod hd_wallet;

#[derive(CandidType, Serialize, SerdeDeserialize, Default, Clone)]
struct ApplicationState {
    // Core wallet data
    user_wallets: HashMap<Principal, Principal>,
    wallets: HashMap<Principal, WalletData>,
    
    // System configuration
    system_config: SystemConfiguration,
    
    // Authentication and security
    authenticated_users: HashMap<Principal, AuthenticationSession>,
    admin_principals: Vec<Principal>,
    
    // System metrics and monitoring
    system_metrics: SystemMetrics,
    
    // Feature flags and configuration
    feature_flags: FeatureFlags,
    
    // Emergency controls
    emergency_state: EmergencyState,
}

#[derive(CandidType, Serialize, SerdeDeserialize, Clone, Debug)]
struct SystemConfiguration {
    ecdsa_key_name: String,
    identity_broker_id: Principal,
    canister_ids: CanisterIds,
    network_settings: NetworkSettings,
    security_settings: SecuritySettings,
    rate_limits: RateLimits,
    fee_settings: FeeSettings,
    maintenance_window: Option<MaintenanceWindow>,
}

#[derive(CandidType, Serialize, SerdeDeserialize, Clone, Debug)]
struct AuthenticationSession {
    principal: Principal,
    created_at: u64,
    last_activity: u64,
    session_type: SessionType,
    permissions: Vec<Permission>,
    expires_at: u64,
}

#[derive(CandidType, Serialize, SerdeDeserialize, Clone, Debug)]
enum SessionType {
    User,
    Admin,
    Service,
}

#[derive(CandidType, Serialize, SerdeDeserialize, Clone, Debug, PartialEq)]
enum Permission {
    CreateWallet,
    Transfer,
    UpdateBalance,
    ViewTransactions,
    ManageSystem,
    EmergencyControl,
}

#[derive(CandidType, Serialize, SerdeDeserialize, Default, Clone, Debug)]
struct SystemMetrics {
    total_wallets_created: u64,
    total_transactions: u64,
    total_volume_by_token: HashMap<VaultType, u64>,
    uptime_start: u64,
    last_upgrade: u64,
    error_counts: HashMap<String, u64>,
    performance_metrics: PerformanceMetrics,
}

#[derive(CandidType, Serialize, SerdeDeserialize, Default, Clone, Debug)]
struct PerformanceMetrics {
    average_response_times: HashMap<String, u64>,
    peak_concurrent_operations: u32,
    memory_usage_mb: u64,
    instruction_count: u64,
}

#[derive(CandidType, Serialize, SerdeDeserialize, Default, Clone, Debug)]
struct FeatureFlags {
    enable_new_user_registration: bool,
    enable_cross_chain_transfers: bool,
    enable_advanced_analytics: bool,
    enable_multi_signature: bool,
    maintenance_mode: bool,
}

#[derive(CandidType, Serialize, SerdeDeserialize, Default, Clone, Debug)]
struct EmergencyState {
    is_paused: bool,
    pause_reason: Option<String>,
    paused_at: Option<u64>,
    paused_by: Option<Principal>,
    allowed_operations: Vec<String>,
}

#[derive(CandidType, Serialize, SerdeDeserialize, Clone, Debug)]
struct MaintenanceWindow {
    start_time: u64,
    end_time: u64,
    description: String,
    affected_operations: Vec<String>,
}

#[derive(CandidType, Serialize, SerdeDeserialize, Clone, Debug)]
struct WalletData {
    owner: Principal,
    created_at: u64,
    last_accessed: u64,
    hd_path: String,
    vault_manager: VaultManager,
    security_settings: WalletSecuritySettings,
    usage_statistics: WalletUsageStatistics,
}

#[derive(CandidType, Serialize, SerdeDeserialize, Clone, Debug)]
struct WalletSecuritySettings {
    two_factor_enabled: bool,
    daily_transfer_limit: HashMap<VaultType, u64>,
    requires_confirmation: bool,
    ip_whitelist: Vec<String>,
    last_security_update: u64,
}

#[derive(CandidType, Serialize, SerdeDeserialize, Default, Clone, Debug)]
struct WalletUsageStatistics {
    total_transactions: u64,
    total_volume: u64,
    last_transaction: u64,
    favorite_tokens: Vec<VaultType>,
    average_transaction_amount: u64,
}

impl Default for SystemConfiguration {
    fn default() -> Self {
        Self {
            ecdsa_key_name: "key_1".to_string(),
            identity_broker_id: Principal::anonymous(),
            canister_ids: CanisterIds {
                ckbtc_minter: Principal::from_text("mqygn-kiaaa-aaaar-qaadq-cai").unwrap(),
                ckbtc_ledger: Principal::from_text("mxzaz-hqaaa-aaaar-qaada-cai").unwrap(),
                ckusdt_ledger: Principal::from_text("cngnf-vqaaa-aaaar-qag4q-cai").unwrap(),
                cketh_minter: Principal::from_text("sv3dd-oaaaa-aaaar-qacoa-cai").unwrap(),
                icp_ledger: Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
                identity_broker: Principal::from_text("rrkah-fqaaa-aaaaa-aaaaq-cai").unwrap(),
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
            maintenance_window: None,
        }
    }
}

thread_local! {
    static STATE: RefCell<ApplicationState> = RefCell::new(ApplicationState::default());
}

// Initialization and upgrade functions

#[derive(CandidType, SerdeDeserialize)]
struct InitArgs {
    ecdsa_key_name: String,
    identity_broker_id: Principal,
    admin_principals: Vec<Principal>,
    initial_config: Option<SystemConfiguration>,
}

#[init]
fn init(init_args: InitArgs) {
    let current_time = time();
    
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        
        // Initialize system configuration
        if let Some(config) = init_args.initial_config {
            state.system_config = config;
        } else {
            state.system_config = SystemConfiguration::default();
        }
        
        state.system_config.ecdsa_key_name = init_args.ecdsa_key_name.clone();
        state.system_config.identity_broker_id = init_args.identity_broker_id;
        
        // Set admin principals
        state.admin_principals = init_args.admin_principals;
        
        // Initialize system metrics
        state.system_metrics.uptime_start = current_time;
        
        // Initialize feature flags
        state.feature_flags = FeatureFlags {
            enable_new_user_registration: true,
            enable_cross_chain_transfers: true,
            enable_advanced_analytics: false,
            enable_multi_signature: false,
            maintenance_mode: false,
        };
    });
    
    // Initialize ECDSA manager
    if let Err(e) = initialize_ecdsa_manager(init_args.ecdsa_key_name, 100) {
        ic_cdk::println!("Failed to initialize ECDSA manager: {:?}", e);
    }
    
    ic_cdk::println!("Wallet system initialized successfully");
}

#[pre_upgrade]
fn pre_upgrade() {
    STATE.with(|s| {
        let state = s.borrow();
        
        // Backup ECDSA state
        let ecdsa_backup = backup_ecdsa_state();
        
        // Backup vault state
        let vault_backup = backup_vault_state();
        
        // Create comprehensive backup
        let full_backup = ((*state).clone(), ecdsa_backup, vault_backup);
        
        if let Err(e) = ic_cdk::storage::stable_save(full_backup) {
            ic_cdk::println!("Failed to save state during upgrade: {:?}", e);
        }
    });
    
    ic_cdk::println!("Pre-upgrade backup completed");
}

#[post_upgrade]
fn post_upgrade() {
    match ic_cdk::storage::stable_restore::<(ApplicationState, EcdsaManager, VaultBackup)>() {
        Ok((app_state, ecdsa_state, vault_backup)) => {
            STATE.with(|s| {
                *s.borrow_mut() = app_state;
            });
            
            // Restore ECDSA state
            restore_ecdsa_state(ecdsa_state);
            
            // Restore vault state
            if let Err(e) = restore_vault_state(vault_backup) {
                ic_cdk::println!("Failed to restore vault state: {:?}", e);
            }
            
            // Update last upgrade timestamp
            STATE.with(|s| {
                s.borrow_mut().system_metrics.last_upgrade = time();
            });
            
            ic_cdk::println!("Post-upgrade restore completed successfully");
        }
        Err(e) => {
            ic_cdk::println!("Failed to restore state after upgrade: {:?}", e);
            // Initialize with default state
            STATE.with(|s| {
                *s.borrow_mut() = ApplicationState::default();
            });
        }
    }
}

// Authentication and authorization

fn authenticate_user() -> Result<AuthenticationSession, WalletError> {
    let caller = caller();
    
    if caller == Principal::anonymous() {
        return Err(WalletError::AuthenticationFailed {
            reason: "Anonymous principal not allowed".to_string(),
        });
    }
    
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        
        // Check if user has active session
        if let Some(session) = state.authenticated_users.get_mut(&caller) {
            let current_time = time();
            
            // Check if session is expired
            if current_time > session.expires_at {
                state.authenticated_users.remove(&caller);
                return Err(WalletError::AuthenticationFailed {
                    reason: "Session expired".to_string(),
                });
            }
            
            // Update last activity
            session.last_activity = current_time;
            return Ok(session.clone());
        }
        
        // Create new session for existing user
        if state.user_wallets.contains_key(&caller) {
            let session = AuthenticationSession {
                principal: caller,
                created_at: time(),
                last_activity: time(),
                session_type: SessionType::User,
                permissions: vec![
                    Permission::CreateWallet,
                    Permission::Transfer,
                    Permission::UpdateBalance,
                    Permission::ViewTransactions,
                ],
                expires_at: time() + (state.system_config.security_settings.session_timeout_seconds * 1_000_000_000),
            };
            
            state.authenticated_users.insert(caller, session.clone());
            Ok(session)
        } else {
            Err(WalletError::AuthenticationFailed {
                reason: "User not found".to_string(),
            })
        }
    })
}

fn check_permission(session: &AuthenticationSession, required_permission: Permission) -> Result<(), WalletError> {
    if session.permissions.contains(&required_permission) {
        Ok(())
    } else {
        Err(WalletError::AuthenticationFailed {
            reason: format!("Missing permission: {:?}", required_permission),
        })
    }
}

fn is_admin(principal: Principal) -> bool {
    STATE.with(|s| {
        s.borrow().admin_principals.contains(&principal)
    })
}

fn check_emergency_state() -> Result<(), WalletError> {
    STATE.with(|s| {
        let state = s.borrow();
        if state.emergency_state.is_paused {
            Err(WalletError::VaultError {
                operation: "emergency_pause".to_string(),
                details: state.emergency_state.pause_reason.clone()
                    .unwrap_or_else(|| "System paused for maintenance".to_string()),
            })
        } else {
            Ok(())
        }
    })
}

// Main API functions

#[update]
async fn get_or_create_wallet(user_principal: Option<Principal>) -> Result<Principal, WalletError> {
    check_emergency_state()?;
    
    let caller = caller();
    let target_principal = user_principal.unwrap_or(caller);
    
    // Authenticate user
    let session = authenticate_user()?;
    check_permission(&session, Permission::CreateWallet)?;
    
    // Check if caller is trying to create wallet for another user (admin only)
    if target_principal != caller && !is_admin(caller) {
        return Err(WalletError::AuthenticationFailed {
            reason: "Only admins can create wallets for other users".to_string(),
        });
    }
    
    let start_time = time();
    
    // Check if wallet already exists
    let existing_wallet = STATE.with(|s| {
        s.borrow().user_wallets.get(&target_principal).copied()
    });
    
    if let Some(wallet_id) = existing_wallet {
        // Update last accessed time
        STATE.with(|s| {
            let mut state = s.borrow_mut();
            if let Some(wallet) = state.wallets.get_mut(&wallet_id) {
                wallet.last_accessed = time();
            }
        });
        
        return Ok(wallet_id);
    }
    
    // Check feature flag for new user registration
    let registration_enabled = STATE.with(|s| {
        s.borrow().feature_flags.enable_new_user_registration
    });
    
    if !registration_enabled && !is_admin(caller) {
        return Err(WalletError::VaultError {
            operation: "create_wallet".to_string(),
            details: "New user registration is currently disabled".to_string(),
        });
    }
    
    // Create new wallet
    let wallet_id = create_wallet_internal(target_principal).await?;
    
    let duration = time() - start_time;
    
    // Record metrics
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        state.system_metrics.total_wallets_created += 1;
        state.system_metrics.performance_metrics.average_response_times
            .insert("create_wallet".to_string(), duration);
    });
    
    ic_cdk::println!("Wallet created successfully for {} in {}ns", target_principal, duration);
    Ok(wallet_id)
}

async fn create_wallet_internal(user_principal: Principal) -> Result<Principal, WalletError> {
    // Generate deterministic wallet ID
    let wallet_id = generate_wallet_id(user_principal)?;
    
    // Generate HD path
    let hd_path = generate_hd_path_for_principal(user_principal);
    
    // Initialize vault system
    initialize_vault_system(user_principal).await?;
    
    // Create wallet data
    let wallet_data = WalletData {
        owner: user_principal,
        created_at: time(),
        last_accessed: time(),
        hd_path,
        vault_manager: VaultManager::new(user_principal),
        security_settings: WalletSecuritySettings {
            two_factor_enabled: false,
            daily_transfer_limit: create_default_transfer_limits(),
            requires_confirmation: false,
            ip_whitelist: Vec::new(),
            last_security_update: time(),
        },
        usage_statistics: WalletUsageStatistics::default(),
    };
    
    // Store wallet data
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        state.user_wallets.insert(user_principal, wallet_id);
        state.wallets.insert(wallet_id, wallet_data);
    });
    
    Ok(wallet_id)
}

fn generate_wallet_id(user_principal: Principal) -> Result<Principal, WalletError> {
    use sha2::{Digest, Sha256};
    
    let mut hasher = Sha256::new();
    hasher.update(b"IC_WALLET_ID_V1");
    hasher.update(user_principal.as_slice());
    hasher.update(&time().to_be_bytes());
    hasher.update(id().as_slice());
    
    let hash = hasher.finalize();
    let wallet_id = Principal::self_authenticating(&hash[..29]);
    
    Ok(wallet_id)
}

fn generate_hd_path_for_principal(principal: Principal) -> String {
    use sha2::{Digest, Sha256};
    
    let hash = Sha256::digest(principal.as_slice());
    let account_index = u32::from_be_bytes([hash[0], hash[1], hash[2], hash[3]]) % 1000;
    
    format!("m/44'/223'/{}'/0", account_index)
}

fn create_default_transfer_limits() -> HashMap<VaultType, u64> {
    let mut limits = HashMap::new();
    limits.insert(VaultType::Icp, 1_000_000_000_000); // 10,000 ICP
    limits.insert(VaultType::CkBtc, 100_000_000);     // 1 BTC
    limits.insert(VaultType::CkUsdt, 10_000_000_000); // 10,000 USDT
    limits
}

#[update]
async fn update_balance(wallet_id: Principal, vault_type: VaultType) -> Result<u64, WalletError> {
    check_emergency_state()?;
    
    let session = authenticate_user()?;
    check_permission(&session, Permission::UpdateBalance)?;
    
    // Verify wallet ownership
    verify_wallet_ownership(wallet_id, session.principal)?;
    
    let start_time = time();
    
    let result = match vault_type {
        VaultType::Icp => crate::vaults::update_icp_balance(session.principal).await,
        VaultType::CkBtc => crate::vaults::update_ckbtc_balance(session.principal).await,
        VaultType::CkUsdt => crate::vaults::update_ckusdt_balance(session.principal).await,
    };
    
    let duration = time() - start_time;
    
    // Record metrics
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        let operation_name = format!("update_{:?}_balance", vault_type);
        state.system_metrics.performance_metrics.average_response_times
            .insert(operation_name, duration);
            
        if result.is_err() {
            let error_key = format!("{:?}_balance_update_error", vault_type);
            *state.system_metrics.error_counts.entry(error_key).or_insert(0) += 1;
        }
    });
    
    result
}

#[update]
async fn batch_update_balances(wallet_id: Principal) -> Result<HashMap<VaultType, u64>, WalletError> {
    check_emergency_state()?;
    
    let session = authenticate_user()?;
    check_permission(&session, Permission::UpdateBalance)?;
    
    verify_wallet_ownership(wallet_id, session.principal)?;
    
    crate::vaults::batch_update_balances(session.principal).await
}

#[update]
async fn transfer_tokens(
    wallet_id: Principal,
    vault_type: VaultType,
    amount: u64,
    recipient: Principal,
) -> Result<BlockIndex, WalletError> {
    check_emergency_state()?;
    
    let session = authenticate_user()?;
    check_permission(&session, Permission::Transfer)?;
    
    verify_wallet_ownership(wallet_id, session.principal)?;
    
    // Check daily transfer limits
    check_daily_transfer_limit(wallet_id, vault_type, amount)?;
    
    let start_time = time();
    
    let result = crate::vaults::transfer_tokens(session.principal, vault_type, amount, recipient).await;
    
    let duration = time() - start_time;
    
    // Update usage statistics
    if result.is_ok() {
        STATE.with(|s| {
            let mut state = s.borrow_mut();
            
            // Update wallet statistics
            if let Some(wallet) = state.wallets.get_mut(&wallet_id) {
                wallet.usage_statistics.total_transactions += 1;
                wallet.usage_statistics.total_volume += amount;
                wallet.usage_statistics.last_transaction = time();
                
                // Update average transaction amount
                let current_avg = wallet.usage_statistics.average_transaction_amount;
                wallet.usage_statistics.average_transaction_amount = 
                    if current_avg == 0 { amount } else { (current_avg + amount) / 2 };
            }
            
            // Update system metrics
            state.system_metrics.total_transactions += 1;
            *state.system_metrics.total_volume_by_token.entry(vault_type).or_insert(0) += amount;
            
            let operation_name = format!("transfer_{:?}", vault_type);
            state.system_metrics.performance_metrics.average_response_times
                .insert(operation_name, duration);
        });
    }
    
    result
}

#[update]
async fn retrieve_btc(
    wallet_id: Principal,
    amount: u64,
    btc_address: String,
) -> Result<u64, WalletError> {
    check_emergency_state()?;
    
    let session = authenticate_user()?;
    check_permission(&session, Permission::Transfer)?;
    
    verify_wallet_ownership(wallet_id, session.principal)?;
    check_daily_transfer_limit(wallet_id, VaultType::CkBtc, amount)?;
    
    crate::vaults::retrieve_btc(session.principal, amount, btc_address).await
}

#[update]
async fn withdraw_usdt(
    wallet_id: Principal,
    amount: u64,
    ethereum_address: String,
) -> Result<WithdrawalId, WalletError> {
    check_emergency_state()?;
    
    let session = authenticate_user()?;
    check_permission(&session, Permission::Transfer)?;
    
    verify_wallet_ownership(wallet_id, session.principal)?;
    check_daily_transfer_limit(wallet_id, VaultType::CkUsdt, amount)?;
    
    crate::vaults::withdraw_usdt(session.principal, amount, ethereum_address).await
}

// Query functions

#[query]
fn get_balance(wallet_id: Principal, vault_type: VaultType) -> Result<u64, WalletError> {
    let session = authenticate_user()?;
    verify_wallet_ownership(wallet_id, session.principal)?;
    
    crate::vaults::get_balance(session.principal, vault_type)
}

#[query]
fn get_all_balances(wallet_id: Principal) -> Result<HashMap<VaultType, u64>, WalletError> {
    let session = authenticate_user()?;
    verify_wallet_ownership(wallet_id, session.principal)?;
    
    crate::vaults::get_all_balances(session.principal)
}

#[update]
async fn get_btc_address(wallet_id: Principal) -> Result<String, WalletError> {
    let session = authenticate_user()?;
    verify_wallet_ownership(wallet_id, session.principal)?;
    
    crate::vaults::get_btc_address(session.principal).await
}

#[query]
fn get_transaction_history(
    wallet_id: Principal,
    vault_type: VaultType,
    limit: Option<usize>,
) -> Result<Vec<Transaction>, WalletError> {
    let session = authenticate_user()?;
    check_permission(&session, Permission::ViewTransactions)?;
    verify_wallet_ownership(wallet_id, session.principal)?;
    
    crate::vaults::get_transaction_history(session.principal, vault_type, limit)
}

#[query]
fn get_wallet_info(wallet_id: Principal) -> Result<WalletInfo, WalletError> {
    let session = authenticate_user()?;
    verify_wallet_ownership(wallet_id, session.principal)?;
    
    STATE.with(|s| {
        let state = s.borrow();
        let wallet = state.wallets.get(&wallet_id).ok_or(WalletError::WalletNotFound {
            principal: wallet_id.to_string(),
        })?;
        
        Ok(WalletInfo {
            id: wallet_id,
            owner: wallet.owner,
            created_at: wallet.created_at,
            last_accessed: wallet.last_accessed,
            security_settings: wallet.security_settings.clone(),
            usage_statistics: wallet.usage_statistics.clone(),
        })
    })
}

// Admin functions

#[update]
fn set_emergency_pause(pause: bool, reason: Option<String>) -> Result<(), WalletError> {
    let caller = caller();
    
    if !is_admin(caller) {
        return Err(WalletError::AuthenticationFailed {
            reason: "Admin privileges required".to_string(),
        });
    }
    
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        state.emergency_state.is_paused = pause;
        state.emergency_state.pause_reason = reason;
        state.emergency_state.paused_at = if pause { Some(time()) } else { None };
        state.emergency_state.paused_by = if pause { Some(caller) } else { None };
    });
    
    ic_cdk::println!("Emergency pause set to {} by {}", pause, caller);
    Ok(())
}

#[update]
fn update_system_config(config: SystemConfiguration) -> Result<(), WalletError> {
    let caller = caller();
    
    if !is_admin(caller) {
        return Err(WalletError::AuthenticationFailed {
            reason: "Admin privileges required".to_string(),
        });
    }
    
    STATE.with(|s| {
        s.borrow_mut().system_config = config;
    });
    
    Ok(())
}

#[query]
fn get_system_metrics() -> Result<SystemMetrics, WalletError> {
    let caller = caller();
    
    if !is_admin(caller) {
        return Err(WalletError::AuthenticationFailed {
            reason: "Admin privileges required".to_string(),
        });
    }
    
    STATE.with(|s| {
        Ok(s.borrow().system_metrics.clone())
    })
}

#[query]
fn get_system_health() -> SystemHealth {
    health_check()
}

// Helper functions

fn verify_wallet_ownership(wallet_id: Principal, user_principal: Principal) -> Result<(), WalletError> {
    STATE.with(|s| {
        let state = s.borrow();
        let wallet = state.wallets.get(&wallet_id).ok_or(WalletError::WalletNotFound {
            principal: wallet_id.to_string(),
        })?;
        
        if wallet.owner != user_principal && !is_admin(user_principal) {
            return Err(WalletError::AuthenticationFailed {
                reason: "Wallet access denied".to_string(),
            });
        }
        
        Ok(())
    })
}

fn check_daily_transfer_limit(
    wallet_id: Principal,
    vault_type: VaultType,
    amount: u64,
) -> Result<(), WalletError> {
    STATE.with(|s| {
        let state = s.borrow();
        let wallet = state.wallets.get(&wallet_id).ok_or(WalletError::WalletNotFound {
            principal: wallet_id.to_string(),
        })?;
        
        if let Some(&limit) = wallet.security_settings.daily_transfer_limit.get(&vault_type) {
            if amount > limit {
                return Err(WalletError::ValidationError {
                    field: "amount".to_string(),
                    message: format!("Amount {} exceeds daily limit {}", amount, limit),
                });
            }
        }
        
        Ok(())
    })
}

#[derive(CandidType, SerdeDeserialize, Clone, Debug)]
pub struct WalletInfo {
    pub id: Principal,
    pub owner: Principal,
    pub created_at: u64,
    pub last_accessed: u64,
    pub security_settings: WalletSecuritySettings,
    pub usage_statistics: WalletUsageStatistics,
}

// Export the Candid interface
ic_cdk::export_candid!();
