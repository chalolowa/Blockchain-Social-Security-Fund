use serde::{Deserialize, Serialize};
use std::{cell::RefCell, collections::HashMap};
use candid::{Principal, CandidType};

#[derive(Serialize, Deserialize, Clone, CandidType)] // Derive CandidType here
pub struct NextOfKin {
    pub name: String,
    pub relationship: String,
    pub email: String,
    pub address: String,
    pub phone_number: String,
}

thread_local! {
    pub static NEXT_OF_KIN_REGISTRY: std::cell::RefCell<HashMap<Principal, NextOfKin>> = std::cell::RefCell::new(HashMap::new());
    pub static USER_ROLES: RefCell<HashMap<Principal, String>> = RefCell::new(HashMap::new());
}

pub fn add_next_of_kin(user: Principal, next_of_kin: NextOfKin) {
    NEXT_OF_KIN_REGISTRY.with(|registry| {
        registry.borrow_mut().insert(user, next_of_kin);
    });
}

pub fn get_next_of_kin(user: Principal) -> Option<NextOfKin> {
    NEXT_OF_KIN_REGISTRY.with(|registry| {
        registry.borrow().get(&user).cloned()
    })
}


