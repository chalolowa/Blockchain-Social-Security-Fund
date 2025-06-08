use candid::Principal;
use ic_stable_structures::{memory_manager::MemoryManager, BTreeMap, DefaultMemoryImpl, StableBTreeMap};

type Mem = DefaultMemoryImpl;

thread_local! {
    pub static GOV_TOKENS: StableBTreeMap<Principal, u64, Mem> = {
        let memory = MemoryManager::init(DefaultMemoryImpl::default()).get(ic_stable_structures::memory_manager::MemoryId::new(2));
        StableBTreeMap::init(memory)
    };
}

pub fn mint_governance(user: Principal, amount: u64) {
    GOV_TOKENS.with(|m| {
        let current = m.get(&user).unwrap_or(0);
        m.insert(user, current.saturating_add(amount));
    });
}

pub fn get_governance_balance(user: Principal) -> u64 {
    GOV_TOKENS.with(|m| m.get(&user).unwrap_or(0))
}

pub fn burn_governance(user: Principal, amount: u64) -> Result<(), String> {
    GOV_TOKENS.with(|m| {
        let current = m.get(&user).unwrap_or(0);
        if current < amount {
            return Err("Insufficient governance balance".into());
        }
        m.insert(user, current - amount);
        Ok(())
    })
}

pub fn transfer_governance(from: Principal, to: Principal, amount: u64) -> Result<(), String> {
    GOV_TOKENS.with(|m| {
        let from_balance = m.get(&from).unwrap_or(0);
        if from_balance < amount {
            return Err("Insufficient governance balance".into());
        }
        let to_balance = m.get(&to).unwrap_or(0);
        m.insert(from, from_balance - amount);
        m.insert(to, to_balance + amount);
        Ok(())
    })
}