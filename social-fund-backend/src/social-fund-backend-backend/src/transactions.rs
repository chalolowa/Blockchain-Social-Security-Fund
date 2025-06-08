use std::cell::RefCell;
use candid::Principal;

#[derive(Clone, Debug)]
pub struct TxLog {
    pub user: Principal,
    pub action: String,
    pub amount: Option<u128>,
    pub timestamp: u64,
}

thread_local! {
    pub static TRANSACTIONS: RefCell<Vec<TxLog>> = RefCell::new(Vec::new());
}

pub fn log_event(user: Principal, action: &str, amount: Option<u128>) {
    TRANSACTIONS.with(|txs| {
        txs.borrow_mut().push(TxLog {
            user,
            action: action.to_string(),
            amount,
            timestamp: ic_cdk::api::time(),
        });
    });
}
