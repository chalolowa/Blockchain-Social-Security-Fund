use crate::token_types::TokenMetadata;
use ic_stable_structures::{StableBTreeMap, memory_manager::MemoryManager, DefaultMemoryImpl, StableCell};

type Mem = DefaultMemoryImpl;

thread_local! {
    static TOKENS: StableBTreeMap<String, TokenMetadata, Mem> = {
        let memory = MemoryManager::init(DefaultMemoryImpl::default()).get(0);
        StableBTreeMap::init(memory)
    };
}

#[update]
fn add_token(token: TokenMetadata) -> Result<(), String> {
    let symbol = token.symbol.to_uppercase();
    TOKENS.with(|m| {
        if m.contains_key(&symbol) {
            return Err("Token already exists".into());
        }
        m.insert(symbol.clone(), token);
        Ok(())
    })
}

#[query]
fn get_token(symbol: String) -> Option<TokenMetadata> {
    TOKENS.with(|m| m.get(&symbol.to_uppercase()).cloned())
}

#[query]
fn list_tokens() -> Vec<TokenMetadata> {
    TOKENS.with(|m| m.iter().map(|(_, v)| v.clone()).collect())
}