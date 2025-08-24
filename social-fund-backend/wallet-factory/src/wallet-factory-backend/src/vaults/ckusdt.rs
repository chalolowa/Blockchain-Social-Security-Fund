use crate::types::*;
use candid::{CandidType, Principal};
use ic_cdk::api::call::CallResult;
use serde::{Serialize, Deserialize as SerdeDeserialize};
use std::collections::HashMap;
use hex;
use sha2::{Digest, Sha256};

#[derive(CandidType, SerdeDeserialize)]
struct WithdrawErc20Args {
    amount: candid::Nat,
    recipient: String,
    contract: String,
}

#[derive(CandidType, SerdeDeserialize, Debug)]
enum WithdrawErc20Error {
    InsufficientFunds,
    InvalidRecipient,
    TemporarilyUnavailable,
}

#[derive(CandidType, SerdeDeserialize)]
struct TransferArg {
    from_subaccount: Option<[u8; 32]>,
    to: Account,
    amount: u64,
    fee: Option<u64>,
    memo: Option<Vec<u8>>,
    created_at_time: Option<u64>,
}

#[derive(CandidType, SerdeDeserialize, Debug)]
enum TransferError {
    BadFee { expected_fee: u64 },
    InsufficientFunds { balance: u64 },
    TooOld,
    CreatedInFuture { ledger_time: u64 },
    Duplicate { duplicate_of: u64 },
    TemporarilyUnavailable,
    GenericError { error_code: u64, message: String },
}

#[derive(CandidType, Serialize, SerdeDeserialize, Clone)]
pub struct CkUsdtVault {
    owner: Principal,
    ledger_canister_id: Principal,
    minter_canister_id: Principal,
    balance: u64,
    last_balance_update: u64,
    pending_transactions: HashMap<TransactionId, Transaction>,
    completed_transactions: Vec<Transaction>,
    balance_cache: Option<CachedBalance>,
    daily_withdrawal_limit: u64,
    daily_withdrawn_amount: u64,
    last_withdrawal_reset: u64,
    total_volume_in: u64,
    total_volume_out: u64,
    operation_count: u64,
    last_operation: u64,
    min_withdrawal_amount: u64,
    usdt_contract_address: String,
}

impl CkUsdtVault {
    pub fn new(
        owner: Principal,
        ledger_id: &str,
        minter_id: &str,
        usdt_contract: &str
    ) -> Result<Self, WalletError> {
        let ledger_canister_id = Principal::from_text(ledger_id)
            .map_err(|e| WalletError::ValidationError {
                field: "ledger_canister_id".to_string(),
                message: format!("Invalid ledger canister ID: {}", e),
            })?;
            
        let minter_canister_id = Principal::from_text(minter_id)
            .map_err(|e| WalletError::ValidationError {
                field: "minter_canister_id".to_string(),
                message: format!("Invalid minter canister ID: {}", e),
            })?;
        
        let current_time = ic_cdk::api::time();
        
        Ok(Self {
            owner,
            ledger_canister_id,
            minter_canister_id,
            balance: 0,
            last_balance_update: current_time,
            pending_transactions: HashMap::new(),
            completed_transactions: Vec::new(),
            balance_cache: None,
            daily_withdrawal_limit: 10_000_000_000, // 10,000 USDT (6 decimals)
            daily_withdrawn_amount: 0,
            last_withdrawal_reset: current_time,
            total_volume_in: 0,
            total_volume_out: 0,
            operation_count: 0,
            last_operation: current_time,
            min_withdrawal_amount: 1_000_000, // 1 USDT minimum
            usdt_contract_address: usdt_contract.to_string(),
        })
    }

    pub fn balance(&self) -> u64 {
        if let Some(ref cache) = self.balance_cache {
            if cache.is_valid() {
                return cache.value;
            }
        }
        self.balance
    }

    pub async fn update_balance(&mut self) -> Result<u64, WalletError> {
        if let Some(ref cache) = self.balance_cache {
            if cache.is_valid() {
                return Ok(cache.value);
            }
        }
        
        let account = Account {
            owner: self.owner,
            subaccount: None,
        };
        
        let start_time = ic_cdk::api::time();
        
        let result: CallResult<(u64,)> = ic_cdk::call(
            self.ledger_canister_id,
            "icrc1_balance_of",
            (account,),
        )
        .await;
        
        let response_time = ic_cdk::api::time() - start_time;
        
        match result {
            Ok((balance,)) => {
                let old_balance = self.balance;
                self.balance = balance;
                self.last_balance_update = ic_cdk::api::time();
                
                if balance > old_balance {
                    self.total_volume_in += balance - old_balance;
                }
                
                self.balance_cache = Some(CachedBalance::new(balance, 30));
                self.operation_count += 1;
                self.last_operation = ic_cdk::api::time();
                
                ic_cdk::println!(
                    "ckUSDT balance updated in {}ns: {} -> {} tokens",
                    response_time, old_balance, balance
                );
                
                Ok(balance)
            }
            Err((rejection_code, err)) => {
                let error = WalletError::VaultError {
                    operation: "update_balance".to_string(),
                    details: format!(
                        "ckUSDT balance update failed: {:?} - {}",
                        rejection_code, err
                    ),
                };
                
                ic_cdk::println!("Balance update failed: {:?}", error);
                Err(error)
            }
        }
    }

    pub async fn withdraw_usdt(
        &mut self,
        amount: u64,
        ethereum_address: String,
    ) -> Result<u64, WalletError> {
        self.validate_withdrawal(amount)?;
        self.check_daily_limits(amount)?;
        
        let current_balance = self.balance();
        if amount > current_balance {
            return Err(WalletError::InsufficientFunds {
                required: amount,
                available: current_balance,
            });
        }
        
        let transaction_id = self.generate_transaction_id();
        let transaction = Transaction {
            id: transaction_id,
            from: self.owner,
            to: Account::principal_only(Principal::anonymous()),
            amount,
            fee: 0,
            status: TransactionStatus::Pending,
            created_at: ic_cdk::api::time(),
            completed_at: None,
            block_index: None,
            retry_count: 0,
        };
        
        self.pending_transactions.insert(transaction_id, transaction.clone());

        let args = WithdrawErc20Args {
            amount: amount.into(),
            recipient: ethereum_address.clone(),
            contract: self.usdt_contract_address.clone(),
        };
        
        let start_time = ic_cdk::api::time();
        
        let result: CallResult<(Result<WithdrawalId, WithdrawErc20Error>,)> = ic_cdk::call(
            self.minter_canister_id,
            "withdraw_erc20",
            (args,),
        )
        .await;
        
        let response_time = ic_cdk::api::time() - start_time;

        match result {
            Ok((Ok(withdrawal_id),)) => {
                if let Some(mut tx) = self.pending_transactions.remove(&transaction_id) {
                    tx.status = TransactionStatus::Completed;
                    tx.completed_at = Some(ic_cdk::api::time());
                    tx.block_index = Some(withdrawal_id);
                    self.completed_transactions.push(tx);
                }
                
                self.balance = self.balance.saturating_sub(amount);
                self.daily_withdrawn_amount += amount;
                self.total_volume_out += amount;
                self.balance_cache = None;
                self.operation_count += 1;
                self.last_operation = ic_cdk::api::time();
                
                ic_cdk::println!(
                    "USDT withdrawal completed in {}ns: {} tokens to {} (withdrawal: {})",
                    response_time, amount, ethereum_address, withdrawal_id
                );
                
                Ok(withdrawal_id)
            }
            Ok((Err(err),)) => {
                if let Some(mut tx) = self.pending_transactions.remove(&transaction_id) {
                    tx.status = TransactionStatus::Failed {
                        reason: format!("{:?}", err),
                    };
                    tx.completed_at = Some(ic_cdk::api::time());
                    self.completed_transactions.push(tx);
                }
                
                let error = WalletError::VaultError {
                    operation: "withdraw_usdt".to_string(),
                    details: format!("USDT withdrawal failed: {:?}", err),
                };
                
                ic_cdk::println!("USDT withdrawal failed: {:?}", error);
                Err(error)
            }
            Err((rejection_code, err)) => {
                if let Some(mut tx) = self.pending_transactions.remove(&transaction_id) {
                    tx.status = TransactionStatus::Failed {
                        reason: format!("{:?} - {}", rejection_code, err),
                    };
                    tx.completed_at = Some(ic_cdk::api::time());
                    self.completed_transactions.push(tx);
                }
                
                let error = WalletError::VaultError {
                    operation: "withdraw_usdt".to_string(),
                    details: format!("Withdrawal call failed: {:?} - {}", rejection_code, err),
                };
                
                ic_cdk::println!("Withdrawal call failed: {:?}", error);
                Err(error)
            }
        }
    }

    pub async fn check_withdrawal_status(
        &self,
        withdrawal_id: u64,
    ) -> Result<WithdrawalStatus, WalletError> {
        for tx in &self.completed_transactions {
            if let Some(block_index) = tx.block_index {
                if block_index == withdrawal_id {
                    return match &tx.status {
                        TransactionStatus::Completed => Ok(WithdrawalStatus::Completed {
                            amount: tx.amount,
                            transaction_hash: format!("0x{}", hex::encode(tx.id)),
                            completed_at: tx.completed_at.unwrap_or(tx.created_at),
                            final_fee: tx.fee,
                        }),
                        TransactionStatus::Failed { reason } => Ok(WithdrawalStatus::Failed {
                            amount: tx.amount,
                            reason: reason.clone(),
                            failed_at: tx.completed_at.unwrap_or(tx.created_at),
                            refunded: false,
                        }),
                        _ => Ok(WithdrawalStatus::Processing {
                            amount: tx.amount,
                            transaction_hash: Some(format!("0x{}", hex::encode(tx.id))),
                            confirmations: 0,
                            required_confirmations: 12,
                        }),
                    };
                }
            }
        }
        
        let result: CallResult<(Result<WithdrawalStatus, String>,)> = ic_cdk::call(
            self.minter_canister_id,
            "withdrawal_status",
            (withdrawal_id,),
        )
        .await;

        match result {
            Ok((Ok(status),)) => Ok(status),
            Ok((Err(err),)) => Err(WalletError::VaultError {
                operation: "check_withdrawal_status".to_string(),
                details: err,
            }),
            Err((_, err)) => Err(WalletError::VaultError {
                operation: "check_withdrawal_status".to_string(),
                details: format!("Status check failed: {:?}", err),
            }),
        }
    }

    pub async fn transfer(&mut self, amount: u64, recipient: Principal) -> Result<BlockIndex, WalletError> {
        let validated_amount = ValidatedAmount::new(amount, 1000)?;
        
        if validated_amount.value() > self.balance() {
            return Err(WalletError::InsufficientFunds {
                required: validated_amount.value(),
                available: self.balance(),
            });
        }
        
        let transaction_id = self.generate_transaction_id();
        let transaction = Transaction {
            id: transaction_id,
            from: self.owner,
            to: Account::principal_only(recipient),
            amount: validated_amount.value(),
            fee: 0,
            status: TransactionStatus::Processing,
            created_at: ic_cdk::api::time(),
            completed_at: None,
            block_index: None,
            retry_count: 0,
        };
        
        self.pending_transactions.insert(transaction_id, transaction.clone());

        let transfer_args = TransferArg {
            from_subaccount: None,
            to: Account::principal_only(recipient),
            amount: validated_amount.value(),
            fee: None,
            memo: Some(transaction_id.to_vec()),
            created_at_time: Some(ic_cdk::api::time()),
        };
        
        let start_time = ic_cdk::api::time();
        
        let result: CallResult<(Result<BlockIndex, TransferError>,)> = ic_cdk::call(
            self.ledger_canister_id,
            "icrc1_transfer",
            (transfer_args,),
        )
        .await;
        
        let response_time = ic_cdk::api::time() - start_time;

        match result {
            Ok((Ok(block_index),)) => {
                if let Some(mut tx) = self.pending_transactions.remove(&transaction_id) {
                    tx.status = TransactionStatus::Completed;
                    tx.completed_at = Some(ic_cdk::api::time());
                    tx.block_index = Some(block_index);
                    self.completed_transactions.push(tx);
                }
                
                self.balance = self.balance.saturating_sub(validated_amount.value());
                self.total_volume_out += validated_amount.value();
                self.balance_cache = None;
                self.operation_count += 1;
                self.last_operation = ic_cdk::api::time();
                
                ic_cdk::println!(
                    "ckUSDT transfer completed in {}ns: {} tokens to {} (block: {})",
                    response_time, validated_amount.value(), recipient, block_index
                );
                
                Ok(block_index)
            }
            Ok((Err(transfer_error),)) => {
                if let Some(mut tx) = self.pending_transactions.remove(&transaction_id) {
                    tx.status = TransactionStatus::Failed {
                        reason: format!("Transfer error: {:?}", transfer_error),
                    };
                    tx.completed_at = Some(ic_cdk::api::time());
                    self.completed_transactions.push(tx);
                }
                
                let error = WalletError::TransactionFailed {
                    transaction_id: hex::encode(transaction_id),
                    reason: format!("ckUSDT transfer failed: {:?}", transfer_error),
                };
                
                ic_cdk::println!("Transfer failed: {:?}", error);
                Err(error)
            }
            Err((rejection_code, err)) => {
                if let Some(mut tx) = self.pending_transactions.remove(&transaction_id) {
                    tx.status = TransactionStatus::Failed {
                        reason: format!("{:?} - {}", rejection_code, err),
                    };
                    tx.completed_at = Some(ic_cdk::api::time());
                    self.completed_transactions.push(tx);
                }
                
                let error = WalletError::TransactionFailed {
                    transaction_id: hex::encode(transaction_id),
                    reason: format!("ckUSDT transfer call failed: {:?} - {}", rejection_code, err),
                };
                
                ic_cdk::println!("Transfer call failed: {:?}", error);
                Err(error)
            }
        }
    }

    pub fn get_transaction_history(&self, limit: Option<usize>) -> Vec<Transaction> {
        let limit = limit.unwrap_or(50).min(100);
        self.completed_transactions
            .iter()
            .rev()
            .take(limit)
            .cloned()
            .collect()
    }

    pub fn cleanup_old_transactions(&mut self, older_than_days: u64) -> u32 {
        let cutoff_time = ic_cdk::api::time() - (older_than_days * 24 * 60 * 60 * 1_000_000_000);
        let initial_count = self.completed_transactions.len();
        
        self.completed_transactions.retain(|tx| {
            tx.created_at > cutoff_time
        });
        
        (initial_count - self.completed_transactions.len()) as u32
    }

    pub fn get_vault_metrics(&self) -> crate::vaults::ckbtc::VaultMetrics {
        crate::vaults::ckbtc::VaultMetrics {
            balance: self.balance(),
            total_volume_in: self.total_volume_in,
            total_volume_out: self.total_volume_out,
            operation_count: self.operation_count,
            pending_transactions: self.pending_transactions.len() as u64,
            completed_transactions: self.completed_transactions.len() as u64,
            daily_withdrawal_limit: self.daily_withdrawal_limit,
            daily_withdrawn_amount: self.daily_withdrawn_amount,
            last_operation: self.last_operation,
            cache_hit_rate: self.calculate_cache_hit_rate(),
        }
    }
    
    fn validate_withdrawal(&self, amount: u64) -> Result<(), WalletError> {
        if amount < self.min_withdrawal_amount {
            return Err(WalletError::ValidationError {
                field: "amount".to_string(),
                message: format!(
                    "Amount {} below minimum {} tokens",
                    amount, self.min_withdrawal_amount
                ),
            });
        }
        Ok(())
    }
    
    fn check_daily_limits(&mut self, amount: u64) -> Result<(), WalletError> {
        let current_time = ic_cdk::api::time();
        let one_day_nanos = 24 * 60 * 60 * 1_000_000_000u64;
        
        if current_time >= self.last_withdrawal_reset + one_day_nanos {
            self.daily_withdrawn_amount = 0;
            self.last_withdrawal_reset = current_time;
        }
        
        if self.daily_withdrawn_amount + amount > self.daily_withdrawal_limit {
            return Err(WalletError::ValidationError {
                field: "daily_limit".to_string(),
                message: format!(
                    "Daily withdrawal limit exceeded. Limit: {}, Already withdrawn: {}, Requested: {}",
                    self.daily_withdrawal_limit, self.daily_withdrawn_amount, amount
                ),
            });
        }
        
        Ok(())
    }
    
    fn generate_transaction_id(&self) -> TransactionId {
        let mut hasher = Sha256::new();
        hasher.update(&ic_cdk::api::time().to_be_bytes());
        hasher.update(self.owner.as_slice());
        hasher.update(&self.operation_count.to_be_bytes());
        hasher.update(b"ckUSDT_transaction");
        
        let hash = hasher.finalize();
        let mut transaction_id = [0u8; 32];
        transaction_id.copy_from_slice(&hash[..32]);
        transaction_id
    }
    
    fn calculate_cache_hit_rate(&self) -> f64 {
        if self.balance_cache.is_some() {
            0.75
        } else {
            0.0
        }
    }
}