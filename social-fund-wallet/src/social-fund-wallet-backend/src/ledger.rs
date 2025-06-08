use candid::Principal;
use ic_stable_structures::{memory_manager::MemoryManager, BTreeMap, StableBTreeMap, DefaultMemoryImpl};
use crate::chain_fusion::FusionToken;

type Mem = DefaultMemoryImpl;
type LedgerKey = (Principal, String); // (user, token_symbol)

#[derive(Clone, Debug, candid::CandidType, serde::Deserialize, serde::Serialize)]
pub struct LedgerEntry {
    pub amount: u128,
    pub decimals: u8,
}

thread_local! {
    pub static LEDGER: StableBTreeMap<LedgerKey, LedgerEntry, Mem> = {
        let memory = MemoryManager::init(DefaultMemoryImpl::default()).get(0);
        StableBTreeMap::init(memory)
    };
}

pub fn deposit(user: Principal, token: &FusionToken, amount: u128) -> Result<(), String> {
    LEDGER.with(|map| {
        let key = (user, token.symbol.clone());
        let entry = map.get(&key).unwrap_or(LedgerEntry { amount: 0, decimals: token.decimals });

        let new_amount = entry.amount.checked_add(amount).ok_or("Overflow")?;
        map.insert(key, LedgerEntry { amount: new_amount, decimals: token.decimals });
        Ok(())
    })
}

pub fn transfer(sender: Principal, recipient: Principal, token: &FusionToken, amount: u128) -> Result<(), String> {
    LEDGER.with(|map| {
        let from_key = (sender, token.symbol.clone());
        let to_key = (recipient, token.symbol.clone());

        let from_entry = map.get(&from_key).ok_or("No sender balance")?;
        if from_entry.amount < amount {
            return Err("Insufficient balance".into());
        }

        let to_entry = map.get(&to_key).unwrap_or(LedgerEntry { amount: 0, decimals: token.decimals });

        map.insert(from_key, LedgerEntry {
            amount: from_entry.amount.checked_sub(amount).ok_or("Underflow")?,
            decimals: token.decimals,
        });

        map.insert(to_key, LedgerEntry {
            amount: to_entry.amount.checked_add(amount).ok_or("Overflow")?,
            decimals: token.decimals,
        });

        Ok(())
    })
}

pub fn get_balance(user: Principal, symbol: &str) -> u128 {
    LEDGER.with(|map| {
        map.get(&(user, symbol.to_string())).map(|entry| entry.amount).unwrap_or(0)
    })
}
