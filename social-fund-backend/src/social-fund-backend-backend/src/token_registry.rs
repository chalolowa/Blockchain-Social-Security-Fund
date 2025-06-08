use candid::Principal;
use crate::utils::TokenMetadata;

#[import(canister = "token_registry")]
extern "C" {
    #[query]
    fn get_token(symbol: String) -> Option<TokenMetadata>;
}

pub async fn get_token_metadata(symbol: &str) -> Result<TokenMetadata, String> {
    let res = get_token(symbol.to_string()).await;
    res.ok_or(format!("Token not found: {}", symbol))
}
