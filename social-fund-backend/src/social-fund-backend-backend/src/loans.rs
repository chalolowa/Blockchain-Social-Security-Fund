use candid::Principal;
use std::collections::HashMap;
use std::cell::RefCell;
use crate::transactions::log_transaction;

#[derive(Clone)]
pub struct Loan {
    pub user: Principal,
    pub amount: u64,
    pub status: String,
}

thread_local! {
    static LOANS: RefCell<HashMap<Principal, Loan>> = RefCell::new(HashMap::new());
}

// 2% Insurance Fee
const INSURANCE_FEE: u8 = 2;

pub fn apply_for_loan(amount: u64, user: Principal) -> Result<String, String> {
    LOANS.with(|l| {
        let mut loans = l.borrow_mut();
        if loans.contains_key(&user) {
            return Err("Active loan exists.".to_string());
        }

        let insurance = amount * INSURANCE_FEE as u64 / 100;
        let loan_amount = amount - insurance;

        // Check stable reserve
        let _ = crate::fund::FUND.with(|f| {
            let fund = f.borrow();
            Ok(if fund.stable_reserve < loan_amount {
                return Err("Insufficient stable reserve.".to_string());
            })
        });

        // Update reserves
        crate::fund::FUND.with(|f| {
            let mut fund = f.borrow_mut();
            fund.stable_reserve -= loan_amount;
            fund.stable_reserve += insurance; // Add insurance
            fund.total_fund = fund.ckbtc_reserve + fund.stable_reserve;
        });

        loans.insert(user, Loan {
            user,
            amount: loan_amount,
            status: "Active".to_string(),
        });

        log_transaction(user, "Loan", loan_amount);
        Ok("Loan approved.".to_string())
    })
}

pub fn repay_loan(amount: u64, user: Principal) -> Result<String, String> {
    LOANS.with(|l| {
        let mut loans = l.borrow_mut();
        match loans.get_mut(&user) {
            Some(loan) => {
                if loan.amount < amount {
                    return Err("Overpayment.".to_string());
                }
                loan.amount -= amount;
                // Add repayment to stable reserve
                crate::fund::FUND.with(|f| {
                    let mut fund = f.borrow_mut();
                    fund.stable_reserve += amount;
                    fund.total_fund = fund.ckbtc_reserve + fund.stable_reserve;
                });
                if loan.amount == 0 {
                    loans.remove(&user);
                }
                log_transaction(user, "Loan Repayment", amount);
                Ok("Repayment successful.".to_string())
            }
            None => Err("No active loan.".to_string()),
        }
    })
}