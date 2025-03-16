use serde::{Deserialize, Serialize};
use std::{cell::RefCell, collections::HashMap};
use candid::{Principal, CandidType};

#[derive(Serialize, Deserialize, Clone, CandidType)] // Derive CandidType here
pub struct NextOfKin {
    pub name: String,
    pub relationship: String,
    pub contact_info: String,
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

pub fn set_user_role(user: Principal, role: String) -> Result<String, String> {
    USER_ROLES.with(|roles| {
        let mut roles_map = roles.borrow_mut();
        roles_map.insert(user, role.clone());
    });
    Ok(format!("User role updated to: {}", role))
}

pub fn get_user_role(user: Principal) -> String {
    USER_ROLES.with(|roles| {
        roles.borrow().get(&user).cloned().unwrap_or("employee".to_string())
    })
}

pub fn get_next_of_kin(user: Principal) -> Option<NextOfKin> {
    NEXT_OF_KIN_REGISTRY.with(|registry| {
        registry.borrow().get(&user).cloned()
    })
}


