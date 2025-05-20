use ic_cdk::update;
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

#[derive(Clone, CandidType, Deserialize)]
pub struct Employee {
    pub name: String,
    pub email: String,
    pub wallet_address: String,
    pub position: String,
    pub salary: String,
    pub principal: Principal
}

thread_local! {
    pub static NEXT_OF_KIN_REGISTRY: std::cell::RefCell<HashMap<Principal, NextOfKin>> = std::cell::RefCell::new(HashMap::new());
    pub static USER_ROLES: RefCell<HashMap<Principal, String>> = RefCell::new(HashMap::new());
    pub static EMPLOYEE_REGISTRY: RefCell<HashMap<Principal, Employee>> = RefCell::new(HashMap::new());
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

pub fn add_employee(user: Principal, employee: Employee) {
    EMPLOYEE_REGISTRY.with(|registry| {
        registry.borrow_mut().insert(user, employee);
    });
}

#[update]
fn register_employee(name: String, email: String, wallet: String, position: String, salary: String) {
    let caller = ic_cdk::caller();
    let employee = Employee {
        name,
        email,
        wallet_address: wallet,
        position,
        salary,
        principal: caller, // <- assign here
    };
    add_employee(caller, employee);
}

pub fn get_employee(user: Principal) -> Option<Employee> {
    EMPLOYEE_REGISTRY.with(|registry| {
        registry.borrow().get(&user).cloned()
    })
}

pub fn get_all_employees() -> Vec<Employee> {
    EMPLOYEE_REGISTRY.with(|registry| {
        registry.borrow().values().cloned().collect()
    })
}

