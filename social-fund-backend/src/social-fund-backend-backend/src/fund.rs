use candid::{Principal, CandidType};
use std::collections::HashMap;
use std::cell::RefCell;

#[derive(Clone, CandidType)]
pub struct FundInfo {
    pub total_fund: u64,
    pub ckbtc_reserve: u64, 
    pub stable_reserve: u64,
    pub threshold: u64,
    pub contributors: HashMap<Principal, u64>, // Tracks user's ckBTC balance
}

thread_local! {
    pub static FUND: RefCell<FundInfo> = RefCell::new(FundInfo {
        total_fund: 0,
        ckbtc_reserve: 0,
        stable_reserve: 0,
        threshold: 100_000,
        contributors: HashMap::new(),
    });
}

pub fn initialize_fund() {
    FUND.with(|f| {
        let mut fund = f.borrow_mut();
        fund.total_fund = 0;
        fund.stable_reserve = 0;
        fund.ckbtc_reserve = 0;
    });
}

pub fn get_fund_info() -> FundInfo {
    FUND.with(|f| f.borrow().clone())
}

pub fn contribute(amount: u64, user: Principal) {
    let stable_amount = amount * 50 / 100;
    let ckbtc_amount = amount - stable_amount;

    FUND.with(|f| {
        let mut fund = f.borrow_mut();
        *fund.contributors.entry(user).or_insert(0) += ckbtc_amount;
        fund.ckbtc_reserve += ckbtc_amount;
        fund.stable_reserve += stable_amount;
        fund.total_fund = fund.ckbtc_reserve + fund.stable_reserve;
    });
}

pub fn request_withdrawal(amount: u64, user: Principal) -> Result<String, String> {
    FUND.with(|f| {
        let mut fund = f.borrow_mut();
        let user_balance = fund.contributors.get(&user).cloned().unwrap_or(0);
        
        if fund.total_fund < fund.threshold {
            return Err("Fund threshold not met for withdrawals.".to_string());
        }
        if fund.ckbtc_reserve < amount {
            return Err("Insufficient ckBTC reserve.".to_string());
        }
        if user_balance < amount {
            return Err("Insufficient user balance.".to_string());
        }

        fund.contributors.insert(user, user_balance - amount);
        fund.ckbtc_reserve -= amount;
        fund.total_fund = fund.ckbtc_reserve + fund.stable_reserve;

        Ok("Withdrawal successful.".to_string())
    })
}

// Monthly interest calculation (5% annually)
const INTEREST_RATE: f64 = 0.05;

pub fn apply_interest() {
    FUND.with(|f| {
        let mut fund = f.borrow_mut();
        let mut total_interest = 0;
        for (_, balance) in fund.contributors.iter_mut() {
            let interest = (*balance as f64 * INTEREST_RATE / 12.0) as u64;
            *balance += interest;
            total_interest += interest;
        }
        fund.ckbtc_reserve += total_interest;
        fund.total_fund = fund.ckbtc_reserve + fund.stable_reserve;
    });
}

// Employer match system (50% match)
const MATCH_PERCENTAGE: u8 = 50;

pub fn employer_match(employee: Principal, amount: u64) -> Result<String, String> {
    let match_amount = amount * MATCH_PERCENTAGE as u64 / 100;
    FUND.with(|f| {
        let mut fund = f.borrow_mut();
        if fund.stable_reserve < match_amount {
            return Err("Insufficient stable reserve.".to_string());
        }
        fund.stable_reserve -= match_amount;
        *fund.contributors.entry(employee).or_insert(0) += match_amount;
        fund.total_fund = fund.ckbtc_reserve + fund.stable_reserve;
        Ok("Match successful.".to_string())
    })
}
