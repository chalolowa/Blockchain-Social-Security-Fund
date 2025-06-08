mod wallet_types;

use ic_cdk::{api::time, caller, trap};
use ic_cdk_macros::*;
use ic_stable_structures::{StableBTreeMap, memory_manager::MemoryManager, DefaultMemoryImpl};
use candid::{Principal, CandidType, Deserialize};
use wallet_types::WalletInfo;

static wallet_wasm: Vec<u8> = include_bytes!("../wallet-canister/target/wasm32-unknown-unknown/release/wallet_canister.wasm").to_vec();

type Mem = DefaultMemoryImpl;

thread_local! {
    static WALLETS: StableBTreeMap<Principal, WalletInfo, Mem> = {
        let memory = MemoryManager::init(DefaultMemoryImpl::default()).get(0);
        StableBTreeMap::init(memory)
    };
}

#[update]
fn create_wallet_for(user: Principal) -> Result<Principal, String> {
    let existing = WALLETS.with(|m| m.get(&user));
    if existing.is_some() {
        return Err("Wallet already exists".into());
    }

    // Create a new wallet canister
    let wallet_id = match ic_cdk::api::management_canister::main::create_canister(
        Some(user.into()),
        None,
    ) {
        Ok((canister_id,)) => canister_id,
        Err((code, msg)) => trap(&format!("Create wallet failed: {code:?} {msg}")),
    };

    let wallet_info = WalletInfo {
        wallet_canister: wallet_id,
        owner: user,
        created_at: time(),
    };

    WALLETS.with(|m| m.insert(user, wallet_info.clone()));
    Ok(wallet_id)

    //install wallet WASM
    install_code(InstallCodeArgs {
        mode: CanisterInstallMode::Install,
        canister_id: wallet_id,
        wasm_module: wallet_wasm,
        arg: vec![]
    });
}

#[query]
fn get_wallet_of(user: Principal) -> Option<WalletInfo> {
    WALLETS.with(|m| m.get(&user).cloned())
}
