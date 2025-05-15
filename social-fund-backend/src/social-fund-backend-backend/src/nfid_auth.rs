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
        String::from("http://localhost:3000"),
    ];

    Icrc28TrustedOriginsResponse { trusted_origins }
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct UserDetails {
    pub user_principal: Principal,
    pub authenticated_at: u64,
    pub employee_details: Option<EmployeeDetails>,
    pub employer_details: Option<EmployerDetails>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct EmployeeDetails {
    pub name: String,
    pub position: String,
    pub salary: u64,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct EmployerDetails {
    pub company_name: String,
    pub registration_number: String,
}

// Authentication Map
thread_local! {
    static AUTHENTICATED_USERS: std::cell::RefCell<HashMap<Principal, UserDetails>> = std::cell::RefCell::new(HashMap::new());
}

// Authenticate User with Details
pub fn authenticate_with_details(
    user: Principal,
    employee_details: Option<EmployeeDetails>,
    employer_details: Option<EmployerDetails>,
) -> Result<UserDetails, String> {
    // Validate principal
    if user == Principal::anonymous() {
        return Err("Anonymous principal not allowed".to_string());
    }

    let now = ic_cdk::api::time();
    let user_details = UserDetails {
        user_principal: user,
        authenticated_at: now,
        employee_details,
        employer_details,
    };

    // Log authentication attempt
    ic_cdk::println!("Authenticating principal: {}", user);
    
    AUTHENTICATED_USERS.with(|auth| {
        let mut auth_map = auth.borrow_mut();
        auth_map.insert(user, user_details.clone());
    });

    Ok(user_details)
}

// Check Authentication Status and Get User Details
pub fn get_authenticated_user(user: Principal) -> Option<UserDetails> {
    AUTHENTICATED_USERS.with(|auth| auth.borrow().get(&user).cloned())
}

// Check if User is Authenticated
pub fn is_authenticated(user: Principal) -> bool {
    AUTHENTICATED_USERS.with(|auth| auth.borrow().contains_key(&user))
}

// Logout User
pub fn logout(user: Principal) -> Result<String, String> {
    AUTHENTICATED_USERS.with(|auth| {
        let mut auth_map = auth.borrow_mut();
        auth_map.remove(&user);
    });
    Ok("User logged out successfully.".to_string())
}
