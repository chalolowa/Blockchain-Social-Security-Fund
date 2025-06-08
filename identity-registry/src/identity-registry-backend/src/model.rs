use candid::{CandidType, Deserialize, Principal};

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct IdentityProfile {
    pub google_id: String,
    pub email: String,
    pub display_name: String,
    pub icp_principal: Principal,
    pub wallet_canister: Option<Principal>,
    pub created_at: u64,
}
