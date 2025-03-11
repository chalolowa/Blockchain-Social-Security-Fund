use std::collections::HashMap;
use std::cell::RefCell;
use candid::Principal;

thread_local! {
    static CKBTC_LOANS: RefCell<HashMap<Principal, u64>> = RefCell::new(HashMap::new());
}

pub fn borrow_ckbtc(amount: u64, user: Principal) -> Result<String, String> {
    let ckbtc_balance = crate::fund::get_fund_info().ckbtc_reserve;
    if ckbtc_balance < amount {
        return Err("Insufficient ckBTC reserve.".to_string());
    }

    // Check for existing loan
    if CKBTC_LOANS.with(|l| l.borrow().contains_key(&user)) {
        return Err("Existing ckBTC loan found.".to_string());
    }

    // Update reserves
    crate::fund::FUND.with(|f| {
        let mut fund = f.borrow_mut();
        fund.ckbtc_reserve -= amount;
        fund.total_fund = fund.ckbtc_reserve + fund.stable_reserve;
    });

    CKBTC_LOANS.with(|l| {
        l.borrow_mut().insert(user, amount);
    });

    Ok("ckBTC loan issued.".to_string())
}

pub fn repay_ckbtc(amount: u64, user: Principal) -> Result<String, String> {
    CKBTC_LOANS.with(|l| {
        let mut loans = l.borrow_mut();
        match loans.get_mut(&user) {
            Some(loan) => {
                if *loan < amount {
                    return Err("Overpayment not allowed.".to_string());
                }
                *loan -= amount;
                if *loan == 0 {
                    loans.remove(&user);
                }
                // Return ckBTC to reserve
                crate::fund::FUND.with(|f| {
                    let mut fund = f.borrow_mut();
                    fund.ckbtc_reserve += amount;
                    fund.total_fund = fund.ckbtc_reserve + fund.stable_reserve;
                });
                Ok("Repayment successful.".to_string())
            }
            None => Err("No active loan.".to_string()),
        }
    })
}