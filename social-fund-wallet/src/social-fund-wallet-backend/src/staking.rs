use candid::{CandidType, Principal};
use ic_stable_structures::{memory_manager::MemoryManager, BTreeMap, StableBTreeMap, DefaultMemoryImpl};
use serde::{Deserialize, Serialize};

type Mem = DefaultMemoryImpl;

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub enum StakingPreference {
    Passive,
    Active,
    Disabled,
}

thread_local! {
    pub static STAKING_PREFS: StableBTreeMap<Principal, StakingPreference, Mem> = {
        let memory = MemoryManager::init(DefaultMemoryImpl::default()).get(ic_stable_structures::memory_manager::MemoryId::new(1));
        StableBTreeMap::init(memory)
    };
}

pub fn set_user_staking_pref(user: Principal, pref: StakingPreference) {
    STAKING_PREFS.with(|m| {
        m.insert(user, pref);
    });
}

pub fn get_user_staking_pref(user: Principal) -> StakingPreference {
    STAKING_PREFS.with(|m| {
        m.get(&user).unwrap_or(StakingPreference::Disabled)
    })
}
