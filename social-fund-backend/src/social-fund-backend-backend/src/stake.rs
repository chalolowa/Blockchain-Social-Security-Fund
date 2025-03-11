use ic_cdk_macros::update;
use std::cell::RefCell;

thread_local! {
    static STABLE_YIELD_POOL: RefCell<u64> = RefCell::new(0); // Pool of stable assets for staking
}

/// Stake stable reserves to generate yield
pub fn stake_stable_assets(amount: u64) -> Result<String, String> {
    crate::fund::FUND.with(|f| {
        let mut fund = f.borrow_mut();
        
        if fund.stable_reserve < amount {
            return Err("Not enough stable reserve available for staking.".to_string());
        }

        fund.stable_reserve -= amount;
        STABLE_YIELD_POOL.with(|pool| *pool.borrow_mut() += amount);

        ic_cdk::println!("Staked {} stable assets for yield.", amount);
        Ok("Stable assets staked successfully.".to_string())
    })
}

/// Collect yield generated from staking
pub fn collect_yield() {
    let yield_generated = STABLE_YIELD_POOL.with(|pool| {
        let amount = *pool.borrow();
        (amount as f64 * 0.05) as u64 // Simulated 5% annual yield
    });

    STABLE_YIELD_POOL.with(|pool| *pool.borrow_mut() += yield_generated);

    crate::fund::FUND.with(|f| {
        let mut fund = f.borrow_mut();
        fund.stable_reserve += yield_generated;
        fund.total_fund += yield_generated;
    });

    ic_cdk::println!("Reinvested {} into stable reserve.", yield_generated);
}
