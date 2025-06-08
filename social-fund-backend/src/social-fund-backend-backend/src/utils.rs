use candid::{Principal, CandidType};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct TokenMetadata {
    pub symbol: String,
    pub name: String,
    pub decimals: u8,
    pub ledger_canister: Principal,
    pub is_active: bool,
}

#[import(canister = "wallet_factory")]
extern "C" {
    #[query]
    fn get_wallet_of(user: Principal) -> Option<Principal>;
}

pub async fn transfer_to_wallet(
    from: Principal,
    to_wallet: Principal,
    token: &TokenMetadata,
    amount: u128,
) -> Result<(), String> {
    ic_cdk::call::<_, ()>(
        from,
        &format!("transfer_{}", token.symbol.to_lowercase()),
        (amount, to_wallet),
    )
    .await
    .map_err(|(_, e)| format!("Transfer failed: {}", e))
}
