use candid::{Principal, CandidType};
use std::collections::HashMap;
use std::cell::RefCell;
use std::time::{SystemTime, UNIX_EPOCH};
use crate::transactions::log_transaction;
#[derive(Clone, CandidType)]
pub struct FundInfo {
    pub total_fund: u64,
    pub ckbtc_reserve: u64, 
    pub stable_reserve: u64,
    pub threshold: u64,
    pub contributors: HashMap<Principal, u64>, // Tracks user's ckBTC balance
    pub total_contributions: HashMap<Principal, u64>, // Tracks total lifetime contributions
    pub withdrawal_records: HashMap<Principal, (u64, u64)>, // (last_withdrawal_time, withdrawn_this_year)
}

const WITHDRAWAL_PERCENTAGE: u64 = 30; // Users can withdraw up to 30% per year
const ONE_YEAR_SECONDS: u64 = 31536000; // 1 year in seconds

thread_local! {
    pub static FUND: RefCell<FundInfo> = RefCell::new(FundInfo {
        total_fund: 0,
        ckbtc_reserve: 0,
        stable_reserve: 0,
        threshold: 100_000,
        contributors: HashMap::new(),
        total_contributions: HashMap::new(),
        withdrawal_records: HashMap::new(),
    });
}

pub fn initialize_fund() {
    FUND.with(|f| {
        let mut fund = f.borrow_mut();
        *fund = FundInfo {
            total_fund: 0,
            ckbtc_reserve: 0,
            stable_reserve: 0,
            threshold: 100_000,
            contributors: HashMap::new(),
            total_contributions: HashMap::new(),
            withdrawal_records: HashMap::new(),
        };
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
        *fund.total_contributions.entry(user).or_insert(0) += amount;
        fund.ckbtc_reserve += ckbtc_amount;
        fund.stable_reserve += stable_amount;
        fund.total_fund = fund.ckbtc_reserve + fund.stable_reserve;
        log_transaction(user, "Contribute", amount);
    });
}

pub fn request_withdrawal(amount: u64, user: Principal) -> Result<String, String> {
    let current_time = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| "System time error")?
        .as_secs();


    FUND.with(|f| {
        let mut fund = f.borrow_mut();
        let user_balance = fund.contributors.get(&user).cloned().unwrap_or(0);
        let total_contributed = fund.total_contributions.get(&user).cloned().unwrap_or(0);
        log_transaction(user, "Request Withdrawal", amount);
        if fund.total_fund < fund.threshold {
            return Err("Fund threshold not met for withdrawals.".to_string());
        }
        if fund.ckbtc_reserve < amount {
            return Err("Insufficient ckBTC reserve.".to_string());
        }
        if user_balance < amount {
            return Err("Insufficient user balance.".to_string());
        }

        // Withdrawal limit calculation
        let (last_withdrawal, withdrawn_this_year) = fund.withdrawal_records.get(&user).copied().unwrap_or((0, 0));

        // Reset yearly limit if more than 1 year passed
        let (time_since_last, yearly_limit) = if current_time - last_withdrawal > ONE_YEAR_SECONDS {
            (0, (total_contributed * WITHDRAWAL_PERCENTAGE) / 100)
        } else {
            (current_time - last_withdrawal, (total_contributed * WITHDRAWAL_PERCENTAGE) / 100 - withdrawn_this_year)
        };

        if amount > yearly_limit {
            return Err(format!(
                "Yearly withdrawal limit exceeded. Available: {} ckBTC",
                yearly_limit
            ));
        }

        //Update user balance, records and fund reserves
        fund.contributors.insert(user, user_balance - amount);
        fund.ckbtc_reserve -= amount;
        fund.total_fund = fund.ckbtc_reserve + fund.stable_reserve;
        fund.withdrawal_records.insert(
            user,
            (current_time, withdrawn_this_year + amount)
        );

        log_transaction(user, "Withdrawal", amount);
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
        log_transaction(Principal::anonymous(), "Apply Interest", total_interest);
    });
}

// Employer match system (30% match)
const MATCH_PERCENTAGE: u8 = 30;

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
        log_transaction(employee, "Employer Match", match_amount);
        Ok("Match successful.".to_string())
    })
}
