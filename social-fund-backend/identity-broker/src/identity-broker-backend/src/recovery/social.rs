use std::collections::HashSet;

use candid::{CandidType, Principal};
use ic_cdk::api::time;
use serde::{Deserialize, Serialize};

use crate::{recovery::multi_factor::RecoveryError, STATE};

#[derive(Serialize, Deserialize, CandidType, Clone)]
pub struct SocialRecovery {
    contacts: Vec<Principal>,
    threshold: u8,
    pending_recovery: Option<PendingRecovery>,
}

#[derive(Serialize, Deserialize, CandidType, Clone)]
struct PendingRecovery {
    initiator: Principal,
    approvals: HashSet<Principal>,
    expires_at: u64,
}

pub fn setup_social_recovery(
    principal: Principal,
    contacts: Vec<Principal>,
    threshold: u8,
) -> Result<(), RecoveryError> {
    if threshold as usize > contacts.len() || threshold == 0 {
        return Err(RecoveryError::InvalidThreshold);
    }
    
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        state.recovery.social.insert(
            principal,
            SocialRecovery {
                contacts,
                threshold,
                pending_recovery: None,
            }
        );
        Ok(())
    })
}

pub fn initiate_recovery(
    principal: Principal,
) -> Result<(), RecoveryError> {
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        if let Some(recovery) = state.recovery.social.get_mut(&principal) {
            recovery.pending_recovery = Some(PendingRecovery {
                initiator: ic_cdk::caller(),
                approvals: HashSet::new(),
                expires_at: time() + 48 * 60 * 60 * 1_000_000_000, // 48 hours
            });
            Ok(())
        } else {
            Err(RecoveryError::NotSetup)
        }
    })
}

pub fn approve_recovery(
    approver: Principal,
    target: Principal,
) -> Result<(), RecoveryError> {
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        if let Some(recovery) = state.recovery.social.get_mut(&target) {
            if let Some(pending) = &mut recovery.pending_recovery {
                // Check if approver is a contact
                if !recovery.contacts.contains(&approver) {
                    return Err(RecoveryError::Unauthorized);
                }
                
                pending.approvals.insert(approver);
                
                // Check if threshold met
                if pending.approvals.len() >= recovery.threshold as usize {
                    execute_recovery(target);
                    recovery.pending_recovery = None;
                }
                
                Ok(())
            } else {
                Err(RecoveryError::NoPendingRecovery)
            }
        } else {
            Err(RecoveryError::NotSetup)
        }
    })
}

pub fn execute_recovery(principal: Principal) {
    // Recovery logic here
    // 1. Reset authentication methods
    // 2. Generate new recovery options
    // 3. Notify user

}