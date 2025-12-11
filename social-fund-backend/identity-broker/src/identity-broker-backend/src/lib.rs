use std::{cell::RefCell, collections::HashMap};

use candid::{CandidType, Principal};
use ic_cdk::{api::time, export_candid, init, post_upgrade, pre_upgrade, query, update};
use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::{google_verifier::verify_google_token, recovery::{multi_factor::{MultiFactorRecovery, RecoveryError, RecoveryMethod}, social::SocialRecovery}, session_manager::{create_session, rotate_session, Session, SessionError}, shadow_principal::generate_shadow_principal};

mod session_manager;
mod google_verifier;
mod shadow_principal;
mod recovery {
    pub mod social;
    pub mod multi_factor;
}

thread_local! {
    static STATE: RefCell<State> = RefCell::new(State::default());
}

#[derive(Serialize, Deserialize, Default, CandidType, Clone)]
struct State {
    // Google ID -> Shadow Principal mapping
    google_mappings: HashMap<String, Principal>,
    // Principal -> UserData mapping
    users: HashMap<Principal, UserData>,
    // Session keys
    sessions: HashMap<Vec<u8>, SessionInfo>,
    // Recovery data
    recovery: RecoveryStore,
    // Google OAuth config
    google_config: GoogleConfig,
    // Cached public key for principal generation
    public_key: Option<Vec<u8>>,
}

#[derive(Serialize, Deserialize, CandidType, Clone)]
struct UserData {
    principal: Principal,
    google_id: Option<String>,
    ii_principal: Option<Principal>,
    linked_at: u64,
    employee_details: Option<EmployeeProfileData>,
    employer_details: Option<EmployerProfileData>,
}

#[derive(Serialize, Deserialize, Default, CandidType, Clone)]
struct RecoveryStore {
    social: HashMap<Principal, SocialRecovery>,
    multi_factor: HashMap<Principal, MultiFactorRecovery>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Default, Debug)]
pub struct GoogleConfig {
    pub client_id: String,
    pub client_secret: String,
}

#[derive(Serialize, Deserialize, Clone, CandidType)]
pub struct SessionInfo {
    pub principal: Principal,
    pub created_at: u64,
    pub expires_at: u64,
}

#[derive(Serialize, Deserialize, CandidType)]
pub struct SessionResponse {
    pub session_key: Vec<u8>,
    pub expires_at: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct EmployeeProfileData {
    pub name: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub position: Option<String>,
    pub department: Option<String>,
    pub role: Option<String>,
    pub salary: u128,
    pub start_date: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct EmployerProfileData {
    pub company_name: Option<String>,
    pub company_id: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub industry: Option<String>,
    pub employee_count: u128,
    pub registration_date: u64,
    pub contact_person: Option<String>,
}

#[init]
fn init(google_config: Option<GoogleConfig>) {
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        if let Some(config) = google_config {
            state.google_config = config;
        }
    });
}

#[update]
fn set_google_config(google_config: GoogleConfig) {
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        state.google_config = google_config;
    });
}

#[pre_upgrade]
fn pre_upgrade() {
    STATE.with(|s| {
        let state = s.borrow().clone();
        ic_cdk::storage::stable_save((state,)).unwrap();
    });
}

#[post_upgrade]
fn post_upgrade() {
    let (old_state,): (State,) = ic_cdk::storage::stable_restore().unwrap();
    STATE.with(|s| {
        *s.borrow_mut() = old_state;
    });
}

// Main authentication endpoint
#[update]
async fn authenticate_with_google(id_token: String) -> Result<AuthResponse, AuthError> {
    let config = STATE.with(|s| s.borrow().google_config.clone());
    
    // Verify Google token
    let google_user = verify_google_token(&id_token, &config).await
        .map_err(|_| AuthError::InvalidToken)?;
    
    // Check if user already exists
    let existing_principal = STATE.with(|s| {
        let state = s.borrow();
        state.google_mappings.get(&google_user.id).copied()
    });
    
    let shadow_principal = if let Some(principal) = existing_principal {
        // User exists, return existing principal
        principal
    } else {
        // New user, generate shadow principal
        let principal = generate_shadow_principal(&google_user.id).await
            .map_err(|_| AuthError::PrincipalError)?;
        
        // Store new user data
        STATE.with(|s| {
            let mut state = s.borrow_mut();
            state.google_mappings.insert(google_user.id.clone(), principal);
            state.users.insert(principal, UserData {
                principal,
                google_id: Some(google_user.id),
                ii_principal: None,
                linked_at: time(),
                employee_details: None,
                employer_details: None,
            });
        });
        
        principal
    };
    
    // Create session
    let session = create_session(shadow_principal).await?;
    
    // Store session in state
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        state.sessions.insert(session.key.clone(), SessionInfo {
            principal: shadow_principal,
            created_at: time(),
            expires_at: session.expires_at,
        });
    });
    
    Ok(AuthResponse {
        principal: shadow_principal,
        session_key: session.key,
        expires_at: session.expires_at,
    })
}

// Link Internet Identity
#[update]
fn link_internet_identity(
    session_key: Vec<u8>, 
    ii_principal: Principal
) -> Result<(), AuthError> {
    let session = validate_session(&session_key)?;
    
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        if let Some(user) = state.users.get_mut(&session.principal) {
            user.ii_principal = Some(ii_principal);
            Ok(())
        } else {
            Err(AuthError::UserNotFound)
        }
    })
}

// Session management
impl From<SessionError> for AuthError {
    fn from(err: SessionError) -> Self {
        match err {
            SessionError::GenerationFailed => AuthError::PrincipalError,
            SessionError::InvalidPrincipal => AuthError::InvalidSession,
        }
    }
}

impl From<Session> for SessionResponse {
    fn from(session: Session) -> Self {
        SessionResponse {
            session_key: session.key,
            expires_at: session.expires_at,
        }
    }
}

// Create a new session for Internet Identity callers.
// The caller's principal becomes the user principal.
#[update]
async fn create_session_for_ii() -> Result<SessionResponse, AuthError> {
    let principal = ic_cdk::caller();

    // Reject anonymous callers
    if principal == Principal::anonymous() {
        return Err(AuthError::InvalidSession);
    }

    // Ensure user exists; if new, initialize minimal user record
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        state.users.entry(principal).or_insert_with(|| UserData {
            principal,
            google_id: None,
            ii_principal: Some(principal),
            linked_at: time(),
            employee_details: None,
            employer_details: None,
        });
    });

    // Create session
    let session = create_session(principal).await?;

    // Persist session
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        state.sessions.insert(
            session.key.clone(),
            SessionInfo {
                principal,
                created_at: time(),
                expires_at: session.expires_at,
            },
        );
    });

    Ok(session.into())
}

#[update]
async fn rotate_session_key(old_key: Vec<u8>) -> Result<SessionResponse, AuthError> {
    let session = validate_session(&old_key)?;
    let new_session = rotate_session(old_key.clone(), session.principal).await?;
    
    // Update session in state
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        state.sessions.remove(&old_key);
        state.sessions.insert(new_session.key.clone(), SessionInfo {
            principal: session.principal,
            created_at: time(),
            expires_at: new_session.expires_at,
        });
    });
    
    Ok(new_session.into())
}

// Recovery endpoints
#[update]
fn setup_social_recovery(
    session_key: Vec<u8>,
    contacts: Vec<Principal>,
    threshold: u8
) -> Result<(), RecoveryError> {
    let session = validate_session(&session_key)?;
    recovery::social::setup_social_recovery(session.principal, contacts, threshold)
}

#[update]
fn initiate_recovery(
    session_key: Vec<u8>,
) -> Result<(), RecoveryError> {
    let session = validate_session(&session_key)?;
    recovery::social::initiate_recovery(session.principal)
}

#[query]
fn approve_recovery(
    session_key: Vec<u8>,
    principal: Principal
) -> Result<(), RecoveryError> {
    let session = validate_session(&session_key)?;
    recovery::social::approve_recovery(session.principal, principal)
}

#[update]
fn setup_multi_factor_recovery(
    session_key: Vec<u8>,
    email: Option<String>,
    phone: Option<String>
) -> Result<(), RecoveryError> {
    let session = validate_session(&session_key)?;
    recovery::multi_factor::setup_multi_factor_recovery(session.principal, email, phone)
}

#[update]
async fn initiate_multi_factor_recovery(
    session_key: Vec<u8>,
) -> Result<(), RecoveryError> {
    let session = validate_session(&session_key)?;
    recovery::multi_factor::initiate_mfa_recovery(session.principal, RecoveryMethod::Email).await
}

#[query]
fn complete_mfa_recovery(
    session_key: Vec<u8>,
    code: String
) -> Result<(), RecoveryError> {
    let session = validate_session(&session_key)?;
    recovery::multi_factor::complete_mfa_recovery(session.principal, code)
}

// Helper function
fn validate_session(session_key: &[u8]) -> Result<SessionInfo, AuthError> {
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        
        // Get session
        let session = state.sessions.get(session_key)
            .cloned()
            .ok_or(AuthError::InvalidSession)?;
        
        // Check expiration
        if session.expires_at <= time() {
            // Remove expired session
            state.sessions.remove(session_key);
            return Err(AuthError::SessionExpired);
        }
        
        Ok(session)
    })
}

#[derive(Serialize, Deserialize, CandidType)]
pub struct AuthResponse {
    pub principal: Principal,
    pub session_key: Vec<u8>,
    pub expires_at: u64,
}

// Add user info query endpoint
#[query]
fn get_user_details(session_key: Vec<u8>) -> Result<UserData, AuthError> {
    let session = validate_session(&session_key)?;
    
    STATE.with(|s| {
        let state = s.borrow();
        if let Some(user) = state.users.get(&session.principal) {
            Ok(user.clone())
        } else {
            Err(AuthError::UserNotFound)
        }
    })
}

// Add logout endpoint
#[update]
fn logout(session_key: Vec<u8>) -> Result<(), AuthError> {
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        state.sessions.remove(&session_key);
    });
    Ok(())
}

// check session validity
#[query]
fn is_session_valid(session_key: Vec<u8>) -> bool {
    validate_session(&session_key).is_ok()
}

// Profile management endpoints
#[update]
fn update_employee_profile(
    session_key: Vec<u8>,
    profile_data: EmployeeProfileData
) -> Result<(), AuthError> {
    let session = validate_session(&session_key)?;
    
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        if let Some(user) = state.users.get_mut(&session.principal) {
            user.employee_details = Some(profile_data);
            // Clear employer details if setting employee profile
            user.employer_details = None;
            ic_cdk::print(&format!("Employee profile updated for principal: {}", session.principal));
            Ok(())
        } else {
            Err(AuthError::UserNotFound)
        }
    })
}

#[update]
fn update_employer_profile(
    session_key: Vec<u8>,
    profile_data: EmployerProfileData
) -> Result<(), AuthError> {
    let session = validate_session(&session_key)?;
    
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        if let Some(user) = state.users.get_mut(&session.principal) {
            user.employer_details = Some(profile_data);
            // Clear employee details if setting employer profile
            user.employee_details = None;
            ic_cdk::print(&format!("Employer profile updated for principal: {}", session.principal));
            Ok(())
        } else {
            Err(AuthError::UserNotFound)
        }
    })
}

#[query]
fn get_user_role(session_key: Vec<u8>) -> Result<String, AuthError> {
    let session = validate_session(&session_key)?;
    
    STATE.with(|s| {
        let state = s.borrow();
        if let Some(user) = state.users.get(&session.principal) {
            if user.employee_details.is_some() {
                Ok("employee".to_string())
            } else if user.employer_details.is_some() {
                Ok("employer".to_string())
            } else {
                Ok("none".to_string())
            }
        } else {
            Err(AuthError::UserNotFound)
        }
    })
}

#[derive(Error, Debug, Serialize, Deserialize, CandidType, Clone)]
pub enum AuthError {
    #[error("Invalid Google token")]
    InvalidToken,
    #[error("Session expired")]
    SessionExpired,
    #[error("Invalid session")]
    InvalidSession,
    #[error("User not found")]
    UserNotFound,
    #[error("Principal generation failed")]
    PrincipalError,
}

#[cfg(feature = "export_candid")]
pub mod candid_export {
    use super::*;
    // Generate Candid at build-time only when the feature is enabled
    pub fn export_candid() -> String {
        ic_cdk::export_candid!();
        __export_service()
    }
}
