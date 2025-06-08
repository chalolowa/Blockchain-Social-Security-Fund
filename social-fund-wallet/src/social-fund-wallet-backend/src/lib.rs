use candid::Principal;
use crate::{chain_fusion::{ckbtc, ckusdc}, staking::StakingPreference};
use ic_cdk::{query, update};
mod ledger;
mod chain_fusion;
mod governance;
mod staking;

#[update]
fn deposit_ckbtc(amount: u128) {
    let user = ic_cdk::caller();
    ledger::deposit(user, &ckbtc(), amount);
}

#[update]
fn deposit_ckusdc(amount: u128) {
    let user = ic_cdk::caller();
    ledger::deposit(user, &ckusdc(), amount);
}

#[update]
fn transfer_ckbtc(amount: u128, to: Principal) {
    let user = ic_cdk::caller();
    ledger::transfer(user, to, &ckbtc(), amount);
}

#[update]
fn transfer_ckusdc(amount: u128, to: Principal) {
    let user = ic_cdk::caller();
    ledger::transfer(user, to, &ckusdc(), amount);
}

#[query]
fn get_balances() -> Vec<(String, u128)> {
    let user = ic_cdk::caller();
    let mut balances = Vec::new();
    
    for token in &[ckbtc(), ckusdc()] {
        let balance = ledger::get_balance(user, token.symbol);
        if balance > 0 {
            balances.push((token.symbol.to_string(), balance));
        }
    }
    
    balances
}

#[update]
fn set_user_staking_mode(mode: StakingPreference) {
    let user = ic_cdk::caller();
    staking::set_user_staking_pref(user, mode);
}

#[query]
fn get_user_staking_mode() -> StakingPreference {
    let user = ic_cdk::caller();
    staking::get_user_staking_pref(user)
}

#[update]
fn mint_gov(amount: u64) {
    let user = ic_cdk::caller();
    governance::mint_governance(user, amount);
}

#[query]
fn get_gov_tokens() -> u64 {
    let user = ic_cdk::caller();
    governance::get_governance_balance(user)
}

#[update]
fn burn_gov(amount: u64) {
    let user = ic_cdk::caller();
    governance::burn_governance(user, amount);
}

#[update]
fn transfer_gov(amount: u64, to: Principal) {
    let user = ic_cdk::caller();
    governance::transfer_governance(user, to, amount);
}