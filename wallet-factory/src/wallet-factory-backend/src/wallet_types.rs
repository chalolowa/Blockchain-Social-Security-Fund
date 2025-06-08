use candid::{CandidType, Principal};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct WalletInfo {
    pub wallet_canister: Principal,
    pub owner: Principal,
    pub created_at: u64,
}