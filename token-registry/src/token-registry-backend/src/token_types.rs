#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct TokenMetadata {
    pub symbol: String,
    pub name: String,
    pub decimals: u8,
    pub ledger_canister: Principal,
    pub is_active: bool,
}