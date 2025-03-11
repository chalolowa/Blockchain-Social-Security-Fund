use ic_cdk_macros::update;
use candid::Principal;
use std::collections::HashMap;
use std::cell::RefCell;

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
            return Err("User already has an active loan.".to_string());
        }

        let insurance_cut = amount * INSURANCE_FEE as u64 / 100;
        let loan_amount = amount - insurance_cut;

        let new_loan = Loan {
            user,
            amount: loan_amount,
            status: "Active".to_string(),
        };

        loans.insert(user, new_loan);

        crate::fund::FUND.with(|f| {
            let mut fund = f.borrow_mut();
            fund.stable_reserve += insurance_cut;
        });

        Ok("Loan approved with insurance protection.".to_string())
    })
}

//repay loan
pub fn repay_loan(amount: u64, user: Principal) -> Result<String, String> {
    LOANS.with(|l| {
        let mut loans = l.borrow_mut();
        
        if let Some(loan) = loans.get_mut(&user) {
            if loan.amount < amount {
                return Err("Repayment amount exceeds loan amount.".to_string());
            }
            
            loan.amount -= amount;
            
            if loan.amount == 0 {
                loans.remove(&user);
            }
            
            Ok("Loan repayment successful.".to_string())
        } else {
            Err("No active loan found.".to_string())
        }
    })
}