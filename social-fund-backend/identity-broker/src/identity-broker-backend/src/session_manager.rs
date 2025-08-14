use candid::Principal;
use ic_cdk::{
    api::{management_canister::main::raw_rand, time},
    update,
};
use rand::{rngs::StdRng, RngCore, SeedableRng};
use ring::signature::{Ed25519KeyPair, KeyPair};
use thiserror::Error;

use crate::{SessionInfo, STATE};

const SESSION_DURATION_NS: u64 = 15 * 60 * 1_000_000_000; // 15 minutes
const ROTATION_BUFFER: u64 = 5 * 60 * 1_000_000_000; // 5 minutes

#[derive(Error, Debug)]
pub enum SessionError {
    #[error("Session generation failed")]
    GenerationFailed,
    #[error("Invalid principal")]
    InvalidPrincipal,
}

pub struct Session {
    pub key: Vec<u8>,
    pub expires_at: u64,
}

/// Create a StdRng seeded from IC raw_rand
async fn ic_rng() -> StdRng {
    let (random_bytes,) = raw_rand()
        .await
        .expect("Failed to get IC randomness");
    let mut seed = [0u8; 32];
    seed.copy_from_slice(&random_bytes[..32]);
    StdRng::from_seed(seed)
}

pub async fn create_session(principal: Principal) -> Result<Session, SessionError> {
    let key_pair = generate_session_key().await?;
    let public_key = key_pair.public_key().as_ref().to_vec();
    let expires_at = time() + SESSION_DURATION_NS;

    STATE.with(|s| {
        let mut state = s.borrow_mut();
        state.sessions.insert(
            public_key.clone(),
            SessionInfo {
                principal,
                created_at: time(),
                expires_at,
            },
        );
    });

    Ok(Session {
        key: public_key,
        expires_at,
    })
}

pub async fn rotate_session(
    old_key: Vec<u8>,
    principal: Principal,
) -> Result<Session, SessionError> {
    STATE.with(|s| {
        s.borrow_mut().sessions.remove(&old_key);
    });
    create_session(principal).await
}

async fn generate_session_key() -> Result<Ed25519KeyPair, SessionError> {
    let mut rng = ic_rng().await;
    let mut seed = [0u8; 32];
    rng.fill_bytes(&mut seed);

    Ed25519KeyPair::from_seed_unchecked(&seed)
        .map_err(|_| SessionError::GenerationFailed)
}

#[update]
async fn rotate_expiring_sessions() {
    let now = time();

    // Extract data into an owned Vec before spawning tasks
    let to_rotate: Vec<(Vec<u8>, Principal)> = STATE.with(|s| {
        let state = s.borrow();
        state
            .sessions
            .iter()
            .filter(|(_, session)| session.expires_at - now < ROTATION_BUFFER)
            .map(|(key, session)| (key.clone(), session.principal))
            .collect()
    });

    for (key, principal) in to_rotate {
        ic_cdk::spawn(async move {
            if let Ok(_new_session) = create_session(principal).await {
                STATE.with(|s| {
                    s.borrow_mut().sessions.remove(&key);
                });
            }
        });
    }
}
