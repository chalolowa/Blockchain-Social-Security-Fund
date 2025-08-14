use candid::{CandidType, Principal};
use ic_cdk::api::{management_canister::main::raw_rand, time};
use rand::{RngCore, SeedableRng, rngs::StdRng};
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
    #[error("Recovery is unauthorized")]
    Unauthorized,
    #[error("Threshold is invalid")]
    InvalidThreshold,
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

/// Get an RNG seeded from IC randomness
async fn ic_rng() -> StdRng {
    let (random_bytes,) = raw_rand()
        .await
        .expect("Failed to get IC randomness");
    let mut seed = [0u8; 32];
    seed.copy_from_slice(&random_bytes[..32]);
    StdRng::from_seed(seed)
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
            },
        );
        Ok(())
    })
}

pub async fn initiate_mfa_recovery(
    principal: Principal,
    method: RecoveryMethod,
) -> Result<(), RecoveryError> {
    // 1) Read and clone the contact info WITHOUT holding the borrow across an await
    let contact: String = STATE.with(|s| {
        let state = s.borrow();
        let recovery = state
            .recovery
            .multi_factor
            .get(&principal)
            .ok_or(RecoveryError::NotSetup)?;

        let contact_opt = match &method {
            RecoveryMethod::Email => recovery.email.as_ref(),
            RecoveryMethod::Sms => recovery.phone.as_ref(),
        };

        contact_opt
            .cloned()
            .ok_or(RecoveryError::MethodNotAvailable)
    })?;

    // 2) Generate the code (async) with no STATE borrow in scope
    let code = generate_recovery_code().await;
    let expires_at = time() + 15 * 60 * 1_000_000_000; // 15 minutes

    // 3) Write back the pending recovery (short, scoped borrow)
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        if let Some(rec) = state.recovery.multi_factor.get_mut(&principal) {
            rec.pending_recovery = Some(PendingMfaRecovery {
                method: method.clone(),
                code: code.clone(),
                expires_at,
            });
            Ok(())
        } else {
            Err(RecoveryError::NotSetup)
        }
    })?;

    // 4) Send the code using owned String (no lifetime headaches)
    send_recovery_code(&contact, &code);

    Ok(())
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

async fn generate_recovery_code() -> String {
    let mut rng = ic_rng().await;
    let mut bytes = [0u8; 3];
    rng.fill_bytes(&mut bytes);
    // 6-digit zero-padded numeric code
    format!(
        "{:06}",
        u32::from_be_bytes([0, bytes[0], bytes[1], bytes[2]]) % 1_000_000
    )
}

fn send_recovery_code(contact: &str, code: &str) {
    // email/SMS service integration
    println!("Sending recovery code '{}' to '{}'", code, contact);
}
