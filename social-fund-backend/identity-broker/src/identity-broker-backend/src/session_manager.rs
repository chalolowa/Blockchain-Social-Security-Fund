use candid::Principal;
use ic_cdk::{api::time, update};
use rand::RngCore;
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

pub fn create_session(principal: Principal) -> Result<Session, SessionError> {
    let key_pair = generate_session_key()?;
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
            }
        );
    });
    
    Ok(Session {
        key: public_key,
        expires_at,
    })
}

pub fn rotate_session(
    old_key: Vec<u8>,
    principal: Principal,
) -> Result<Session, SessionError> {
    // Remove old session
    STATE.with(|s| {
        s.borrow_mut().sessions.remove(&old_key);
    });
    
    // Create new session
    create_session(principal)
}

fn generate_session_key() -> Result<Ed25519KeyPair, SessionError> {
    let mut rng = rand::rng();
    let mut seed = [0u8; 32];
    rng.fill_bytes(&mut seed);
    
    Ed25519KeyPair::from_seed_unchecked(&seed)
        .map_err(|_| SessionError::GenerationFailed)
}

// Automatic session rotation
#[update]
fn rotate_expiring_sessions() {
    let now = time();
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        
        // Identify sessions needing rotation
        let to_rotate: Vec<Vec<u8>> = state.sessions.iter()
            .filter(|(_, session)| session.expires_at - now < ROTATION_BUFFER)
            .map(|(key, _)| key.clone())
            .collect();
        
        // Rotate sessions
        for key in to_rotate {
            if let Some(session) = state.sessions.get(&key) {
                if let Ok(_new_session) = create_session(session.principal) {
                    // Notify client via callback would go here
                    state.sessions.remove(&key);
                }
            }
        }
    });
}