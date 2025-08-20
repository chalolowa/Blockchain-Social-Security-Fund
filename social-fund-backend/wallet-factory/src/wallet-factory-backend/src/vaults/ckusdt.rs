use crate::types::*;
use crate::vaults::VaultError;
use candid::{CandidType, Deserialize, Principal};
use ic_cdk::api::call::CallResult;
use serde::{Serialize, Deserialize};
use std::cell::Cell;
use std::collections::HashMap;

const CKETH_MINTER_CANISTER_ID: &str = "sv3dd-oaaaa-aaaar-qacoa-cai";
const CKUSDT_LEDGER_CANISTER_ID: &str = "cngnf-vqaaa-aaaar-qag4q-cai";

#[derive(Serialize, Deserialize)]
pub struct CkUsdtVault {
    owner: Principal,
    ledger_canister_id: Principal,
    minter_canister_id: Principal,
    #[serde(skip)]
    balance: Cell<u64>,
    #[serde(skip)]
    pending_withdrawals: HashMap<u64, WithdrawalStatus>,
    usdt_contract_address: String,
}

impl CkUsdtVault {
    pub fn new(
        owner: Principal,
        ledger_id: &str,
        minter_id: &str,
        usdt_contract: &str
    ) -> Self {
        Self {
            owner,
            ledger_canister_id: Principal::from_text(ledger_id).unwrap(),
            minter_canister_id: Principal::from_text(minter_id).unwrap(),
            balance: Cell::new(0),
            pending_withdrawals: HashMap::new(),
            usdt_contract_address: usdt_contract.to_string(),
        }
    }

    pub fn balance(&self) -> u64 {
        self.balance.get()
    }

    pub async fn update_balance(&self) -> Result<u64, VaultError> {
        let account = Account {
            owner: self.owner,
            subaccount: None,
        };
        
        let result: CallResult<(u64,)> = ic_cdk::call(
            self.ledger_canister_id,
            "icrc1_balance_of",
            (account,),
        )
        .await;
        
        match result {
            Ok((balance,)) => {
                self.balance.set(balance);
                Ok(balance)
            }
            Err((_, err)) => Err(VaultError::BalanceUpdateFailed(format!(
                "ckUSDT balance update failed: {:?}",
                err
            ))),
        }
    }

    pub async fn withdraw_usdt(
        &mut self,
        amount: u64,
        ethereum_address: String,
    ) -> Result<u64, VaultError> {
        if amount > self.balance.get() {
            return Err(VaultError::InsufficientFunds);
        }

        let args = WithdrawErc20Args {
            amount: amount.into(),
            recipient: ethereum_address,
            contract: self.usdt_contract_address.clone(),
        };
        
        let result: CallResult<(Result<WithdrawalId, WithdrawErc20Error>,)> = ic_cdk::call(
            self.minter_canister_id,
            "withdraw_erc20",
            (args,),
        )
        .await;

        match result {
            Ok((Ok(withdrawal_id),)) => {
                // Reserve funds
                self.balance.set(self.balance.get() - amount);
                self.pending_withdrawals.insert(
                    withdrawal_id,
                    WithdrawalStatus::Pending {
                        amount,
                        created_at: ic_cdk::api::time(),
                    }
                );
                Ok(withdrawal_id)
            }
            Ok((Err(err),)) => Err(VaultError::WithdrawalFailed(format!(
                "USDT withdrawal failed: {:?}",
                err
            ))),
            Err((_, err)) => Err(VaultError::WithdrawalFailed(format!(
                "Withdrawal call failed: {:?}",
                err
            ))),
        }
    }

    pub async fn check_withdrawal_status(
        &mut self,
        withdrawal_id: u64,
    ) -> Result<WithdrawalStatus, VaultError> {
        if let Some(status) = self.pending_withdrawals.get(&withdrawal_id) {
            // If already finalized, return status
            if matches!(status, WithdrawalStatus::Completed {..}) {
                return Ok(status.clone());
            }

            // Check minter for updated status
            let result: CallResult<(Result<WithdrawalStatus, String>,)> = ic_cdk::call(
                self.minter_canister_id,
                "withdrawal_status",
                (withdrawal_id,),
            )
            .await;

            match result {
                Ok((Ok(status),)) => {
                    self.pending_withdrawals.insert(withdrawal_id, status.clone());
                    Ok(status)
                }
                Ok((Err(err),)) => Err(VaultError::StatusCheckFailed(err)),
                Err((_, err)) => Err(VaultError::StatusCheckFailed(format!(
                    "Status check failed: {:?}",
                    err
                ))),
            }
        } else {
            Err(VaultError::InvalidWithdrawalId)
        }
    }

    pub async fn transfer(&self, amount: u64, recipient: Principal) -> Result<(), VaultError> {
        if amount > self.balance.get() {
            return Err(VaultError::InsufficientFunds);
        }

        let transfer_args = TransferArg {
            from_subaccount: None,
            to: Account {
                owner: recipient,
                subaccount: None,
            },
            amount,
            fee: None,
            memo: None,
            created_at_time: None,
        };
        
        let result: CallResult<(Result<BlockIndex, TransferError>,)> = ic_cdk::call(
            self.ledger_canister_id,
            "icrc1_transfer",
            (transfer_args,),
        )
        .await;

        match result {
            Ok((Ok(block_index),)) => {
                self.balance.set(self.balance.get() - amount);
                Ok(())
            }
            Ok((Err(err),)) => Err(VaultError::TransferFailed(format!(
                "ckUSDT transfer failed: {:?}",
                err
            ))),
            Err((_, err)) => Err(VaultError::TransferFailed(format!(
                "ckUSDT transfer call failed: {:?}",
                err
            ))),
        }
    }
}