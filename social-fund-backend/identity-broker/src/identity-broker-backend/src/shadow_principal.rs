use candid::Principal;
use ic_cdk::api::management_canister::ecdsa::{ecdsa_public_key, EcdsaCurve, EcdsaKeyId, EcdsaPublicKeyArgument};
use sha2::{Digest, Sha256};
use thiserror::Error;

use crate::STATE;

#[derive(Error, Debug)]
pub enum PrincipalError {
    #[error("Public key generation failed")]
    KeyGenerationFailed,
    #[error("Invalid input data")]
    InvalidInput,
}

pub async fn generate_shadow_principal(google_id: &str) -> Result<Principal, PrincipalError> {
    // Step 1: Check sync if already cached
    let existing = STATE.with(|s| s.borrow().google_mappings.get(google_id).cloned());
    if let Some(principal) = existing {
        return Ok(principal);
    }

    // Step 2: Generate new
    let seed = generate_principal_seed(google_id).await?;
    let principal = Principal::self_authenticating(&seed);

    // Step 3: Store in state (sync)
    STATE.with(|s| {
        s.borrow_mut()
            .google_mappings
            .insert(google_id.to_string(), principal);
    });

    Ok(principal)
}

async fn generate_principal_seed(google_id: &str) -> Result<Vec<u8>, PrincipalError> {
    let pub_key = {
        // Try cached key first
        let cached = STATE.with(|s| s.borrow().public_key.clone());
        if let Some(pk) = cached {
            pk
        } else {
            // Fetch from management canister
            let key = fetch_and_cache_public_key().await?;
            key
        }
    };

    let mut hasher = Sha256::new();
    hasher.update(pub_key);
    hasher.update(google_id.as_bytes());
    Ok(hasher.finalize().to_vec())
}

/// calls the ECDSA canister and caches the key
async fn fetch_and_cache_public_key() -> Result<Vec<u8>, PrincipalError> {
    let pub_key_arg = EcdsaPublicKeyArgument {
        canister_id: None,
        derivation_path: vec![],
        key_id: EcdsaKeyId {
            curve: EcdsaCurve::Secp256k1,
            name: "dfx_test_key".to_string(),
        },
    };

    match ecdsa_public_key(pub_key_arg).await {
        Ok((res,)) => {
            let key = res.public_key.clone();

            // Store to state
            STATE.with(|s| {
                s.borrow_mut().public_key = Some(key.clone());
            });

            Ok(key)
        }
        Err(_) => Err(PrincipalError::KeyGenerationFailed),
    }
}