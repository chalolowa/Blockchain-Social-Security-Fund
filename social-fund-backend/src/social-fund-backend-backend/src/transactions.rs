use candid::{CandidType, Principal};
use std::collections::HashMap;
use std::cell::RefCell;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Clone, CandidType)]
pub struct Transaction {
    pub tx_id: u64,
    pub user: Principal,
    pub tx_type: String,
    pub amount: u64,
    pub timestamp: u64,
}

thread_local! {
    static TRANSACTIONS: RefCell<HashMap<u64, Transaction>> = RefCell::new(HashMap::new());
    static TX_COUNTER: RefCell<u64> = RefCell::new(0);
}

// Helper function to create a transaction log
pub fn log_transaction(user: Principal, tx_type: &str, amount: u64) {
    let timestamp = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
    let tx_id = TX_COUNTER.with(|c| {
        let mut count = c.borrow_mut();
        *count += 1;
        *count
    });

    let transaction = Transaction {
        tx_id,
        user,
        tx_type: tx_type.to_string(),
        amount,
        timestamp,
    };

    TRANSACTIONS.with(|t| {
        let mut transactions = t.borrow_mut();
        transactions.insert(tx_id, transaction);
    });

    ic_cdk::println!("Transaction logged: {} - {} ckBTC", tx_type, amount);
}

// Query all transactions
pub fn get_transactions() -> Vec<Transaction> {
    TRANSACTIONS.with(|t| t.borrow().values().cloned().collect())
}
