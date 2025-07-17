use base64::{prelude::BASE64_URL_SAFE_NO_PAD, Engine};
use ring::signature::{self, UnparsedPublicKey};
use serde::Deserialize;
use thiserror::Error;

use crate::GoogleConfig;

#[derive(Deserialize)]
struct GoogleCerts {
    keys: Vec<Jwk>,
}

#[derive(Deserialize)]
struct Jwk {
    kty: String,
    alg: String,
    kid: String,
    e: String,
    n: String,
}

#[derive(Deserialize)]
pub struct GoogleUser {
    pub id: String,
    pub email: String,
    pub verified_email: bool,
    pub name: String,
}

#[derive(Error, Debug)]
pub enum GoogleError {
    #[error("Invalid token format")]
    InvalidFormat,
    #[error("Invalid signature")]
    InvalidSignature,
    #[error("Token expired")]
    Expired,
    #[error("Invalid audience")]
    InvalidAudience,
    #[error("Network error")]
    NetworkError,
}

pub async fn verify_google_token(
    id_token: &str,
    config: &GoogleConfig,
) -> Result<GoogleUser, GoogleError> {
    // Split the token into its parts
    let parts: Vec<&str> = id_token.split('.').collect();
    if parts.len() != 3 {
        return Err(GoogleError::InvalidFormat);
    }

    // Decode the header and claims
    let header = decode_jwt_header(parts[0])?;
    let claims = decode_jwt_claims(parts[1])?;
    
    // Verify token expiration
    let now = ic_cdk::api::time() / 1000_000; // Convert to seconds
    if claims.exp < now {
        return Err(GoogleError::Expired);
    }
    
    // Verify audience
    if claims.aud != config.client_id {
        return Err(GoogleError::InvalidAudience);
    }
    
    // Fetch Google certificates
    let certs = fetch_google_certs().await?;
    
    // Find appropriate key
    let key = certs.keys.iter()
        .find(|k| k.kid == header.kid)
        .ok_or(GoogleError::InvalidSignature)?;
    
    // Verify signature
    verify_signature(
        parts[0], 
        parts[1], 
        parts[2], 
        key
    )?;
    
    Ok(GoogleUser {
        id: claims.sub,
        email: claims.email,
        verified_email: claims.email_verified,
        name: claims.name,
    })
}

async fn fetch_google_certs() -> Result<GoogleCerts, GoogleError> {
    let url = "https://www.googleapis.com/oauth2/v3/certs";
    let response = reqwest::get(url)
        .await
        .map_err(|_| GoogleError::NetworkError)?;
    
    response.json()
        .await
        .map_err(|_| GoogleError::NetworkError)
}

fn verify_signature(
    header: &str,
    payload: &str,
    signature: &str,
    key: &Jwk,
) -> Result<(), GoogleError> {
    // Format the message that was signed (header.payload)
    let message = format!("{}.{}", header, payload);
    
    // Decode the signature from base64url
    let sig = BASE64_URL_SAFE_NO_PAD.decode(signature)
        .map_err(|_| GoogleError::InvalidFormat)?;
    
    // Decode the modulus (n) from base64url
    let n = BASE64_URL_SAFE_NO_PAD.decode(&key.n)
        .map_err(|_| GoogleError::InvalidFormat)?;
    
    // For RSA-256 verification, we can use the modulus directly with UnparsedPublicKey
    let verification_alg = &signature::RSA_PKCS1_2048_8192_SHA256;
    
    // Create the public key using the modulus as the key material
    let unparsed_key = UnparsedPublicKey::new(verification_alg, &n);
    
    // Verify the signature
    unparsed_key.verify(message.as_bytes(), &sig)
        .map_err(|_| GoogleError::InvalidSignature)
}

// Helper structs for JWT decoding
#[derive(Deserialize)]
struct JwtHeader {
    kid: String,
    alg: String,
}

#[derive(Deserialize)]
struct JwtClaims {
    sub: String,
    aud: String,
    exp: u64,
    email: String,
    email_verified: bool,
    name: String,
}

fn decode_jwt_header(header: &str) -> Result<JwtHeader, GoogleError> {
    let decoded = BASE64_URL_SAFE_NO_PAD.decode(header)
        .map_err(|_| GoogleError::InvalidFormat)?;
    serde_json::from_slice(&decoded).map_err(|_| GoogleError::InvalidFormat)
}

fn decode_jwt_claims(claims: &str) -> Result<JwtClaims, GoogleError> {
    let decoded = BASE64_URL_SAFE_NO_PAD.decode(claims)
        .map_err(|_| GoogleError::InvalidFormat)?;
    serde_json::from_slice(&decoded).map_err(|_| GoogleError::InvalidFormat)
}