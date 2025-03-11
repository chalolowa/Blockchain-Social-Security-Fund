mod ckbtc;
mod fund;
mod loans;
mod stake;
mod governance;

use candid::Principal;
use ic_cdk_macros::{init, query, update};

#[init]
fn init() {
    fund::initialize_fund();
}

/// Get the fund's current status, including total balance and reserves
#[query]
fn get_fund_info() -> fund::FundInfo {
    fund::get_fund_info()
}

/// Employee contributes to the fund (80% in ckBTC, 20% in stable reserve)
#[update]
fn contribute(amount: u64, user: Principal) {
    fund::contribute(amount, user);
}

/// Request withdrawal (only allowed if fund is above the threshold)
#[update]
fn request_withdrawal(amount: u64, user: Principal) -> Result<String, String> {
    fund::request_withdrawal(amount, user)
}

/// Borrow ckBTC from the fund (decentralized Bitcoin loan)
#[update]
fn borrow_ckbtc(amount: u64, user: Principal) -> Result<String, String> {
    ckbtc::borrow_ckbtc(amount, user)
}

/// Apply for a loan (loan is insured using stable reserves)
#[update]
fn apply_for_loan(amount: u64, user: Principal) -> Result<String, String> {
    loans::apply_for_loan(amount, user)
}

/// Employers can match contributions (optional)
#[update]
fn employer_match(employee: Principal, amount: u64) {
    fund::employer_match(employee, amount);
}

/// Fund managers vote on governance proposals
#[update]
fn vote_on_proposal(proposal_id: u64, approve: bool, voter: Principal) -> Result<String, String> {
    governance::vote_on_proposal(proposal_id, approve, voter)
}

/// Fund managers check their governance rewards
#[query]
fn check_rewards(user: Principal) -> u64 {
    governance::check_rewards(user)
}

/// Fund managers redeem their rewards
#[update]
fn redeem_rewards(user: Principal) -> Result<String, String> {
    governance::redeem_rewards(user)
}

/// Stake stable assets to generate yield
#[update]
fn stake_stable_assets(amount: u64) -> Result<String, String> {
    stake::stake_stable_assets(amount)
}

/// Collect yield from staked assets
#[update]
fn collect_yield() {
    stake::collect_yield();
}

/// Apply monthly interest to contributions
#[update]
fn apply_interest() {
    fund::apply_interest();
}

/// Repay a loan
#[update]
fn repay_loan(amount: u64, user: Principal) -> Result<String, String> {
    loans::repay_loan(amount, user)
}

///repay ckBTC loan
#[update]
fn repay_ckbtc(amount: u64, user: Principal) -> Result<String, String> {
    ckbtc::repay_ckbtc(amount, user)
}
