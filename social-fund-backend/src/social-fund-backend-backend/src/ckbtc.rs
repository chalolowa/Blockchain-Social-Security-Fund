use candid::Principal;
use ic_cdk_macros::update;

pub fn borrow_ckbtc(amount: u64, user: Principal) -> Result<String, String> {
    let fund_balance = crate::fund::get_fund_info().stable_reserve;

    if fund_balance < amount {
        return Err("Insufficient stable reserve for borrowing.".to_string());
    }

    // Simulate ckBTC integration
    ic_cdk::println!("Borrow request: {} ckBTC for user {:?}", amount, user);

    Ok("ckBTC Loan issued successfully.".to_string())
}

//repay loan