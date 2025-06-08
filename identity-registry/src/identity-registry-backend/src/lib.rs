use candid::Principal;
use ic_cdk::{query, update};
use crate::user_storage::STORAGE;
use crate::model::IdentityProfile;

#[update]
pub fn register_identity(google_id: String, email: String, display_name: String, wallet_id: Option<Principal>) -> Result<Principal, String> {
    let principal = ic_cdk::caller();
    let now = ic_cdk::api::time();
    let profile = IdentityProfile {
        google_id: google_id.clone(),
        email,
        display_name,
        icp_principal: principal,
        wallet_canister: wallet_id,
        created_at: now,
    };

    STORAGE.with(|cell| {
        let mut store = cell.get().clone();
        store.principal_to_profile.insert(principal, profile);
        store.google_id_to_principal.insert(google_id, principal);
        cell.set(store).unwrap();
    });

    Ok(principal)
}

#[query]
pub fn get_profile_by_principal(principal: Principal) -> Option<IdentityProfile> {
    STORAGE.with(|cell| {
        cell.get().principal_to_profile.get(&principal).cloned()
    })
}

#[query]
pub fn get_principal_by_google_id(google_id: String) -> Option<Principal> {
    STORAGE.with(|cell| {
        cell.get().google_id_to_principal.get(&google_id).cloned()
    })
}
