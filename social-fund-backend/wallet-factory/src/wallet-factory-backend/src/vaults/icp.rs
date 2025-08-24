use crate::types::*;
use candid::{CandidType, Principal};
use ic_cdk::api::call::CallResult;
use serde::{Serialize, Deserialize};
use sha2::{Digest, Sha224};

const ICP_LEDGER_CANISTER_ID: &str = "ryjl3-tyaaa-aaaaa-aaaba-cai";

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct IcpVault {
    owner: Principal,
    ledger_canister_id: Principal,
    balance: u64,
    last_balance_update: u64,
    completed_transactions: Vec<Transaction>,
}

impl IcpVault {
    pub fn new(owner: Principal, ledger_id: &str) -> Self {
        Self {
            owner,
            ledger_canister_id: Principal::from_text(ledger_id).unwrap_or(Principal::anonymous()),
            balance: 0,
            last_balance_update: 0,
            completed_transactions: Vec::new(),
        }
    }

    pub fn balance(&self) -> u64 {
        self.balance
    }

    pub async fn update_balance(&mut self) -> Result<u64, WalletError> {
        let account = self.account_identifier();
        let result: CallResult<(Tokens,)> = ic_cdk::call(
            self.ledger_canister_id,
            "account_balance",
            (AccountBalanceArgs { account },),
        ).await;

        match result {
            Ok((tokens,)) => {
                self.balance = tokens.e8s;
                self.last_balance_update = ic_cdk::api::time();
                Ok(tokens.e8s)
            }
            Err((_, err)) => Err(WalletError::VaultError {
                operation: "update_balance".to_string(),
                details: format!("ICP balance update failed: {:?}", err),
            }),
        }
    }

    pub async fn transfer(&mut self, amount: u64, recipient: Principal) -> Result<BlockIndex, WalletError> {
        if amount > self.balance {
            return Err(WalletError::InsufficientFunds {
                required: amount,
                available: self.balance,
            });
        }

        let to_account = AccountIdentifier::from(recipient);
        let transfer_args = TransferArgs {
            memo: 0,
            amount: Tokens::from_e8s(amount),
            fee: Tokens::from_e8s(10_000),
            from_subaccount: None,
            to: to_account,
            created_at_time: Some(ic_cdk::api::time()),
        };

        let result: CallResult<(Result<BlockIndex, TransferError>,)> = ic_cdk::call(
            self.ledger_canister_id,
            "transfer",
            (transfer_args,),
        ).await;

        match result {
            Ok((Ok(block_index),)) => {
                self.balance -= amount;
                // Optionally record transaction
                self.completed_transactions.push(Transaction {
                    id: [0u8; 32], // You may want to generate a real txid
                    from: self.owner,
                    to: Account::principal_only(recipient),
                    amount,
                    fee: 10_000,
                    status: TransactionStatus::Completed,
                    created_at: ic_cdk::api::time(),
                    completed_at: Some(ic_cdk::api::time()),
                    block_index: Some(block_index),
                    retry_count: 0,
                });
                Ok(block_index)
            }
            Ok((Err(err),)) => Err(WalletError::TransactionFailed {
                transaction_id: "unknown".to_string(),
                reason: format!("ICP transfer failed: {:?}", err),
            }),
            Err((_, err)) => Err(WalletError::TransactionFailed {
                transaction_id: "unknown".to_string(),
                reason: format!("ICP transfer call failed: {:?}", err),
            }),
        }
    }

    fn account_identifier(&self) -> AccountIdentifier {
        AccountIdentifier::from(self.owner)
    }

    pub fn get_transaction_history(&self, limit: Option<usize>) -> Vec<Transaction> {
        let limit = limit.unwrap_or(50).min(100);
        self.completed_transactions.iter().rev().take(limit).cloned().collect()
    }
}

// ICP Ledger Types
#[derive(CandidType, Deserialize)]
struct AccountBalanceArgs {
    account: AccountIdentifier,
}

#[derive(CandidType, Deserialize)]
struct TransferArgs {
    memo: u64,
    amount: Tokens,
    fee: Tokens,
    from_subaccount: Option<Subaccount>,
    to: AccountIdentifier,
    created_at_time: Option<u64>,
}

#[derive(CandidType, Deserialize, Debug)]
enum TransferError {
    BadFee { expected_fee: Tokens },
    InsufficientFunds { balance: Tokens },
    TxTooOld { allowed_window_nanos: u64 },
    TxDuplicate { duplicate_of: BlockIndex },
    TxCreatedInFuture,
}

#[derive(CandidType, Deserialize, Debug)]
struct Tokens {
    e8s: u64,
}

impl Tokens {
    fn from_e8s(e8s: u64) -> Self {
        Self { e8s }
    }
}

#[derive(CandidType, Deserialize, Clone, Copy, Hash, Debug, PartialEq, Eq)]
struct AccountIdentifier([u8; 32]);

impl From<Principal> for AccountIdentifier {
    fn from(principal: Principal) -> Self {
        let mut data = b"\x0Aaccount-id".to_vec();
        data.extend_from_slice(principal.as_slice());
        data.extend_from_slice(&[0u8; 32]); // subaccount: default to zeroes
        let hash = Sha224::digest(&data);
        let mut bytes = [0u8; 32];
        bytes[..28].copy_from_slice(&hash[..]);
        AccountIdentifier(bytes)
    }
}

type Subaccount = [u8; 32];
type BlockIndex = u64;