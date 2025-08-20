pub mod types;
pub mod vaults;
pub mod ecdsa_manager;
pub mod hd_wallet;

const IDENTITY_BROKER_CANISTER_ID: &str = "rrkah-fqaaa-aaaaa-aaaaq-cai"; // Replace with prod ID
const CKBTC_MINTER_CANISTER_ID: &str = "mqygn-kiaaa-aaaar-qaadq-cai";
const CKBTC_LEDGER_CANISTER_ID: &str = "mxzaz-hqaaa-aaaar-qaada-cai";
const CKETH_MINTER_CANISTER_ID: &str = "sv3dd-oaaaa-aaaar-qacoa-cai";
const CKUSDT_LEDGER_CANISTER_ID: &str = "cngnf-vqaaa-aaaar-qag4q-cai";
const ICP_LEDGER_CANISTER_ID: &str = "ryjl3-tyaaa-aaaaa-aaaba-cai";

thread_local! {
    static STATE: RefCell<State> = RefCell::new(State::default());
}

#[derive(Serialize, Deserialize, Default)]
struct State {
    user_wallets: HashMap<Principal, Principal>,
    wallets: HashMap<Principal, WalletData>,
    ecdsa_key_name: String,
    cycles_balance: u64,
    identity_broker_id: Principal,
}

#[derive(Serialize, Deserialize)]
struct WalletData {
    owner: Principal,
    created_at: u64,
    hd_path: String,
    vaults: VaultManager,
}

#[derive(Error, Debug, Serialize, Deserialize)]
pub enum WalletError {
    #[error("Authentication failed")]
    AuthError,
    #[error("Wallet not found")]
    WalletNotFound,
    #[error("Insufficient funds")]
    InsufficientFunds,
    #[error("ECDSA error: {0}")]
    EcdsaError(String),
    #[error("Canister creation failed")]
    CanisterCreationFailed,
    #[error("Vault operation failed: {0}")]
    VaultError(String),
    #[error("Identity broker error: {0}")]
    IdentityBrokerError(String),
}

#[init]
fn init(init_args: InitArgs) {
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        state.ecdsa_key_name = init_args.ecdsa_key_name;
        state.identity_broker_id = init_args.identity_broker_id;
    });
}

#[pre_upgrade]
fn pre_upgrade() {
    STATE.with(|s| {
        let state = s.borrow();
        ic_cdk::storage::stable_save((state,)).unwrap();
    });
}

#[post_upgrade]
fn post_upgrade() {
    let (old_state,): (State,) = ic_cdk::storage::stable_restore().unwrap();
    STATE.with(|s| {
        *s.borrow_mut() = old_state;
    });
}

#[derive(CandidType, Deserialize)]
struct InitArgs {
    ecdsa_key_name: String,
    identity_broker_id: Principal,
}

#[update]
#[candid_method(update)]
async fn get_or_create_wallet(user_principal: Principal) -> Result<Principal, WalletError> {
    // Verify user with identity broker
    let is_authenticated: Result<(bool,), (ic_cdk::api::call::RejectionCode, String)> = 
        ic_cdk::call(
            STATE.with(|s| s.borrow().identity_broker_id),
            "is_authenticated",
            (user_principal,),
        )
        .await;

    match is_authenticated {
        Ok((true,)) => (),
        _ => return Err(WalletError::AuthError),
    }

    STATE.with(|s| {
        let state = s.borrow();
        if let Some(wallet_id) = state.user_wallets.get(&user_principal) {
            return Ok(*wallet_id);
        }
        Err(WalletError::WalletNotFound)
    })
    .or_else(|_| create_wallet_canister(user_principal))
}

async fn create_wallet_canister(user_principal: Principal) -> Result<Principal, WalletError> {
    let wallet_id = create_new_canister().await?;
    
    let hd_path = format!("m/44'/223'/0'/0/{}", time());
    let vault_manager = VaultManager::new(user_principal);
    
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        state.user_wallets.insert(user_principal, wallet_id);
        state.wallets.insert(wallet_id, WalletData {
            owner: user_principal,
            created_at: time(),
            hd_path: hd_path.clone(),
            vaults: vault_manager,
        });
    });
    
    // Initialize vaults with production canister IDs
    vaults::initialize_production_vaults(wallet_id).await?;
    
    Ok(wallet_id)
}

async fn create_new_canister() -> Result<Principal, WalletError> {
    // In production: use management canister to create new canister
    // This is a simplified version for demonstration
    let seed = time().to_be_bytes();
    let principal = Principal::self_authenticating(&seed);
    Ok(principal)
}

#[update]
#[candid_method(update)]
async fn update_ckbtc_balance(wallet_id: Principal) -> Result<u64, WalletError> {
    vaults::update_ckbtc_balance(wallet_id).await
}

#[update]
#[candid_method(update)]
async fn retrieve_btc(
    wallet_id: Principal,
    amount: u64,
    btc_address: String,
) -> Result<u64, WalletError> {
    vaults::retrieve_btc(wallet_id, amount, btc_address).await
}

// Export the Candid interface
ic_cdk::export_candid!();