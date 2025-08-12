use candid::{CandidType, Principal};
use ic_cdk::api::time;
use rand::{distr::Alphanumeric, Rng};
use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::{recovery::social::execute_recovery, AuthError, STATE};

#[derive(Debug, Error, Serialize, Deserialize, CandidType)]
pub enum RecoveryError {
    #[error("Recovery configuration invalid")]
    InvalidConfig,
    #[error("No recovery setup for principal")]
    NotSetup,
    #[error("Recovery method not available")]
    MethodNotAvailable,
    #[error("Recovery code has expired")]
    CodeExpired,
    #[error("Invalid recovery code")]
    InvalidCode,
    #[error("No pending recovery request")]
    NoPendingRecovery,
    #[error("Recovery is unathorized")]
    Unauthorized,
    #[error("Threshold is invalid")]
    InvalidThreshold
}

impl From<AuthError> for RecoveryError {
    fn from(err: AuthError) -> Self {
        match err {
            AuthError::InvalidSession => RecoveryError::InvalidThreshold,
            AuthError::UserNotFound => RecoveryError::Unauthorized,
            AuthError::InvalidToken => RecoveryError::InvalidConfig,
            AuthError::PrincipalError => RecoveryError::NotSetup,
            AuthError::SessionExpired => RecoveryError::CodeExpired,
        }
    }
}

#[derive(Serialize, Deserialize, CandidType, Clone)]
pub struct MultiFactorRecovery {
    email: Option<String>,
    phone: Option<String>,
    pending_recovery: Option<PendingMfaRecovery>,
}

#[derive(Serialize, Deserialize, CandidType, Clone)]
struct PendingMfaRecovery {
    method: RecoveryMethod,
    code: String,
    expires_at: u64,
}

#[derive(Serialize, Deserialize, Clone, CandidType)]
pub enum RecoveryMethod {
    Email,
    Sms,
}

pub fn setup_multi_factor_recovery(
    principal: Principal,
    email: Option<String>,
    phone: Option<String>,
) -> Result<(), RecoveryError> {
    if email.is_none() && phone.is_none() {
        return Err(RecoveryError::InvalidConfig);
    }
    
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        state.recovery.multi_factor.insert(
            principal,
            MultiFactorRecovery {
                email,
                phone,
                pending_recovery: None,
            }
        );
        Ok(())
    })
}

pub fn initiate_mfa_recovery(
    principal: Principal,
    method: RecoveryMethod,
) -> Result<(), RecoveryError> {
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        if let Some(recovery) = state.recovery.multi_factor.get_mut(&principal) {
            let contact = match &method {
                RecoveryMethod::Email => recovery.email.as_ref(),
                RecoveryMethod::Sms => recovery.phone.as_ref(),
            };
            
            if contact.is_none() {
                return Err(RecoveryError::MethodNotAvailable);
            }
            
            let code = generate_recovery_code();
            recovery.pending_recovery = Some(PendingMfaRecovery {
                method: method.clone(),
                code: code.clone(),
                expires_at: time() + 15 * 60 * 1_000_000_000, // 15 minutes
            });
            
            // Send code to contact method (pseudo-code)
            send_recovery_code(contact.unwrap(), &code);
            
            Ok(())
        } else {
            Err(RecoveryError::NotSetup)
        }
    })
}

pub fn complete_mfa_recovery(
    principal: Principal,
    code: String,
) -> Result<(), RecoveryError> {
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        if let Some(recovery) = state.recovery.multi_factor.get_mut(&principal) {
            if let Some(pending) = &recovery.pending_recovery {
                if pending.expires_at < time() {
                    return Err(RecoveryError::CodeExpired);
                }
                
                if pending.code == code {
                    execute_recovery(principal);
                    recovery.pending_recovery = None;
                    Ok(())
                } else {
                    Err(RecoveryError::InvalidCode)
                }
            } else {
                Err(RecoveryError::NoPendingRecovery)
            }
        } else {
            Err(RecoveryError::NotSetup)
        }
    })
}

fn generate_recovery_code() -> String {
    rand::rng()
        .sample_iter(&Alphanumeric)
        .take(6)
        .map(char::from)
        .collect()
}

fn send_recovery_code(contact: &str, code: &str) {
    // Implementation would integrate with email/SMS service
}