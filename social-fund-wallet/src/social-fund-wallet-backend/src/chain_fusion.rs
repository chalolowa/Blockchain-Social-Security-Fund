use candid::{CandidType, Principal};
use serde::Deserialize;


#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct FusionToken {
    pub symbol: &'static str,
    pub decimals: u8,
    pub ledger_canister: Principal,
}

pub fn ckbtc() -> FusionToken {
    FusionToken {
        symbol: "ckBTC",
        decimals: 8,
        ledger_canister: Principal::from_text("qcg3w-tyaaa-aaaah-qakea-cai").unwrap(),
    }
}

pub fn ckusdc() -> FusionToken {
    FusionToken {
        symbol: "ckUSDC",
        decimals: 6,
        ledger_canister: Principal::from_text("replace-with-ckusdc-id").unwrap(),
    }
}
