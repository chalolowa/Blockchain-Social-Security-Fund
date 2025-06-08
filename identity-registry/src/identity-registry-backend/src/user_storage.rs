use ic_stable_structures::{StableBTreeMap, memory_manager::MemoryManager, DefaultMemoryImpl, StableCell};
use crate::model::IdentityProfile;
use candid::Principal;

type Mem = DefaultMemoryImpl;
type Key = Principal;

#[derive(candid::CandidType, serde::Deserialize, serde::Serialize, Clone)]
pub struct IdentityIndex {
    pub principal_to_profile: StableBTreeMap<Key, IdentityProfile, Mem>,
    pub google_id_to_principal: StableBTreeMap<String, Principal, Mem>,
}

thread_local! {
    pub static STORAGE: StableCell<IdentityIndex, Mem> = {
        let memory = ic_stable_structures::memory_manager::MemoryManager::init(DefaultMemoryImpl::default())
            .get(0);
        StableCell::init(memory, IdentityIndex {
            principal_to_profile: StableBTreeMap::init(ic_stable_structures::memory_manager::MemoryManager::init(DefaultMemoryImpl::default()).get(1)),
            google_id_to_principal: StableBTreeMap::init(ic_stable_structures::memory_manager::MemoryManager::init(DefaultMemoryImpl::default()).get(2)),
        }).expect("StableCell init failed")
    };
}
