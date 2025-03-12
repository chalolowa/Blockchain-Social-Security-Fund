use candid::{CandidType, Deserialize, Principal};
use ic_cdk_macros::{query, update};
use std::collections::HashMap;

#[derive(CandidType, Deserialize, Eq, PartialEq, Debug)]
pub struct SupportedStandard {
    pub url: String,
    pub name: String,
}

#[query]
fn icrc10_supported_standards() -> Vec<SupportedStandard> {
    vec![
        SupportedStandard {
            url: "https://github.com/dfinity/ICRC/blob/main/ICRCs/ICRC-10/ICRC-10.md".to_string(),
            name: "ICRC-10".to_string(),
        },
        SupportedStandard {
            url: "https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_28_trusted_origins.md".to_string(),
            name: "ICRC-28".to_string(),
        },
    ]
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct Icrc28TrustedOriginsResponse {
    pub trusted_origins: Vec<String>,
}

#[update]
fn icrc28_trusted_origins() -> Icrc28TrustedOriginsResponse {
    let trusted_origins = vec![
        String::from("https://your-frontend-canister-id.icp0.io"),
        String::from("https://yourcustomdomain.com"),
    ];

    Icrc28TrustedOriginsResponse { trusted_origins }
}

// Authentication Map
thread_local! {
    static AUTHENTICATED_USERS: std::cell::RefCell<HashMap<Principal, bool>> = std::cell::RefCell::new(HashMap::new());
}

// Authenticate User
pub fn authenticate(user: Principal) -> Result<String, String> {
    AUTHENTICATED_USERS.with(|auth| {
        let mut auth_map = auth.borrow_mut();
        auth_map.insert(user, true);
    });
    Ok("User authenticated successfully.".to_string())
}

// Check Authentication Status
pub fn is_authenticated(user: Principal) -> bool {
    AUTHENTICATED_USERS.with(|auth| auth.borrow().get(&user).cloned().unwrap_or(false))
}
