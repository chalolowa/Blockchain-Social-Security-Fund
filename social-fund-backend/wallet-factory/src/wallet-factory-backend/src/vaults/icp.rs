use crate::types::*;
use candid::{CandidType, Deserialize, Principal};
use ic_cdk::api::call::CallResult;
use serde::{Serialize, Deserialize};
use std::cell::Cell;
use sha2::Digest;

const ICP_LEDGER_CANISTER_ID: &str = "ryjl3-tyaaa-aaaaa-aaaba-cai";

#[derive(Serialize, Deserialize)]
pub struct IcpVault {
    owner: Principal,
    ledger_canister_id: Principal,
    #[serde(skip)]
    balance: Cell<u64>,
}

impl IcpVault {
    pub fn new(owner: Principal, ledger_id: &str) -> Self {
        Self {
            owner,
            ledger_canister_id: Principal::from_text(ledger_id).unwrap(),
            balance: Cell::new(0),
        }
    }

    pub fn balance(&self) -> u64 {
        self.balance.get()
    }

    pub async fn update_balance(&self) -> Result<u64, VaultError> {
        let account = self.account_identifier();
        
        let result: CallResult<(Tokens,)> = ic_cdk::call(
            self.ledger_canister_id,
            "account_balance",
            (AccountBalanceArgs { account },),
        )
        .await;
        
        match result {
            Ok((tokens,)) => {
                self.balance.set(tokens.e8s);
                Ok(tokens.e8s)
            }
            Err((_, err)) => Err(VaultError::BalanceUpdateFailed(format!(
                "ICP balance update failed: {:?}",
                err
            ))),
        }
    }

    pub async fn transfer(&self, amount: u64, recipient: Principal) -> Result<(), VaultError> {
        if amount > self.balance.get() {
            return Err(VaultError::InsufficientFunds);
        }

        let to_account = AccountIdentifier::from(recipient);
        let transfer_args = TransferArgs {
            memo: 0,
            amount: Tokens::from_e8s(amount),
            fee: Tokens::from_e8s(10_000),
            from_subaccount: None,
            to: to_account,
            created_at_time: None,
        };
        
        let result: CallResult<(Result<BlockIndex, TransferError>,)> = ic_cdk::call(
            self.ledger_canister_id,
            "transfer",
            (transfer_args,),
        )
        .await;

        match result {
            Ok((Ok(block_index),)) => {
                self.balance.set(self.balance.get() - amount);
                Ok(())
            }
            Ok((Err(err),)) => Err(VaultError::TransferFailed(format!(
                "ICP transfer failed: {:?}",
                err
            ))),
            Err((_, err)) => Err(VaultError::TransferFailed(format!(
                "ICP transfer call failed: {:?}",
                err
            ))),
        }
    }

    fn account_identifier(&self) -> AccountIdentifier {
        AccountIdentifier::from(self.owner)
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
        let mut hash = sha2::Sha224::new();
        hash.update(b"\x0Aaccount-id");
        hash.update(principal.as_slice());
        let mut hash = hash.finalize();
        let mut bytes = [0u8; 32];
        bytes.copy_from_slice(&hash.as_slice()[..32]);
        AccountIdentifier(bytes)
    }
}

type Subaccount = [u8; 32];
type BlockIndex = u64;