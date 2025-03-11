use candid::{Principal, CandidType};
use std::collections::HashMap;
use std::cell::RefCell;
use ic_cdk_macros::update;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Clone, CandidType)]
pub struct FundInfo {
    pub total_fund: u64,
    pub stable_reserve: u64,
    pub threshold: u64,
    pub contributors: HashMap<Principal, u64>,
}

thread_local! {
    pub static FUND: RefCell<FundInfo> = RefCell::new(FundInfo {
        total_fund: 0,
        stable_reserve: 0,
        threshold: 100_000,  // Set withdrawal threshold
        contributors: HashMap::new(),
    });
}

pub fn initialize_fund() {
    FUND.with(|f| {
        let mut fund = f.borrow_mut();
        fund.total_fund = 0;
        fund.stable_reserve = 0;
    });
}

pub fn get_fund_info() -> FundInfo {
    FUND.with(|f| f.borrow().clone())
}

pub fn contribute(amount: u64, user: Principal) {
    let reserve_amount = amount * 20 / 100;
    let user_contribution = amount - reserve_amount;

    FUND.with(|f| {
        let mut fund = f.borrow_mut();
        *fund.contributors.entry(user).or_insert(0) += user_contribution;
        fund.total_fund += amount;
        fund.stable_reserve += reserve_amount;
    });

    ic_cdk::println!(
        "Contribution: {} by {:?} ({} to reserve)",
        user_contribution, user, reserve_amount
    );
}

pub fn request_withdrawal(amount: u64, user: Principal) -> Result<String, String> {
    FUND.with(|f| {
        let mut fund = f.borrow_mut();
        let user_balance = *fund.contributors.get(&user).unwrap_or(&0);
        
        if fund.total_fund < fund.threshold {
            return Err("Fund threshold not met for withdrawals.".to_string());
        }

        if user_balance < amount {
            return Err("Insufficient balance.".to_string());
        }

        fund.contributors.insert(user, user_balance - amount);
        fund.total_fund -= amount;

        Ok("Withdrawal successful.".to_string())
    })
}

// Monthly interest calculation (5% annually)
const INTEREST_RATE: f64 = 0.05;

pub fn apply_interest() {
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();

    FUND.with(|f| {
        let mut fund = f.borrow_mut();
        let mut total_interest = 0;

        for (_user, balance) in fund.contributors.iter_mut() {
            let interest = (*balance as f64 * INTEREST_RATE / 12.0) as u64;
            *balance += interest;
            total_interest += interest;
        }
        
        fund.total_fund += total_interest;
    });

    ic_cdk::println!("Interest applied at {}", now);
}

// Employer match system (50% match)
const MATCH_PERCENTAGE: u8 = 50;

pub fn employer_match(employee: Principal, amount: u64) {
    let match_amount = amount * MATCH_PERCENTAGE as u64 / 100;

    FUND.with(|f| {
        let mut fund = f.borrow_mut();
        *fund.contributors.entry(employee).or_insert(0) += match_amount;
        fund.total_fund += match_amount;
    });

    ic_cdk::println!(
        "Employer matched {} for employee {:?}",
        match_amount,
        employee
    );
}
