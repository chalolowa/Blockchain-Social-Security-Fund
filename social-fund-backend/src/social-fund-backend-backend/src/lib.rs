mod fund;
mod stake;
mod transactions;
mod token_registry;
mod governance;
mod utils;

use ic_cdk_macros::*;
use candid::Principal;

#[update]
async fn contribute_to_employee(employee: Principal, amount: u128) -> Result<(), String> {
    let employer = ic_cdk::caller();
    transactions::log_event(employer, "contribute", Some(amount));
    fund::split_and_contribute(employer, employee, amount).await
}

#[update]
async fn stake(mode: String) -> Result<(), String> {
    let user = ic_cdk::caller();
    transactions::log_event(user, "stake", None);
    stake::request_staking(user, mode).await
}

#[update]
fn create_governance_proposal(token: String) -> usize {
    let user = ic_cdk::caller();
    governance::create_proposal(user, token)
}

#[update]
fn vote_on_proposal(index: usize, approve: bool) -> Result<(), String> {
    let user = ic_cdk::caller();
    governance::vote(index, user, approve)
}
