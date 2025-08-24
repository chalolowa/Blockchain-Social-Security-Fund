use base64::{prelude::BASE64_URL_SAFE_NO_PAD, Engine};
use ic_cdk::api::management_canister::http_request::{
    http_request, HttpMethod, CanisterHttpRequestArgument, HttpResponse,
};
use ring::signature::{RsaPublicKeyComponents, RSA_PKCS1_2048_8192_SHA256};
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
    #[serde(rename = "use")]
    key_use: Option<String>,
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
    pub picture: Option<String>,
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
    #[error("Invalid issuer")]
    InvalidIssuer,
    #[error("Network error: {0}")]
    NetworkError(String),
    #[error("Key not found")]
    KeyNotFound,
    #[error("Unsupported algorithm: {0}")]
    UnsupportedAlgorithm(String),
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

    // Verify token expiration (ic_cdk::api::time returns ns)
    let now = ic_cdk::api::time() / 1_000_000_000;
    if claims.exp < now {
        return Err(GoogleError::Expired);
    }

    // Verify audience
    if claims.aud != config.client_id {
        return Err(GoogleError::InvalidAudience);
    }

    // Verify issuer
    if claims.iss != "https://accounts.google.com" && claims.iss != "accounts.google.com" {
        return Err(GoogleError::InvalidIssuer);
    }

    // Fetch Google certificates
    let certs = fetch_google_certs().await?;

    // Find appropriate key by kid
    let key = certs
        .keys
        .iter()
        .find(|k| k.kid == header.kid)
        .ok_or(GoogleError::KeyNotFound)?;

    // Verify algorithm
    if header.alg != "RS256" {
        return Err(GoogleError::UnsupportedAlgorithm(header.alg));
    }
    if key.kty != "RSA" {
        return Err(GoogleError::UnsupportedAlgorithm(key.kty.clone()));
    }

    // Verify signature
    verify_signature(parts[0], parts[1], parts[2], key)?;

    Ok(GoogleUser {
        id: claims.sub,
        email: claims.email,
        verified_email: claims.email_verified,
        name: claims.name,
        picture: claims.picture,
    })
}

async fn fetch_google_certs() -> Result<GoogleCerts, GoogleError> {
    let request = CanisterHttpRequestArgument {
        url: "https://www.googleapis.com/oauth2/v3/certs".to_string(),
        method: HttpMethod::GET,
        body: None,
        max_response_bytes: Some(10_000),
        transform: None,
        headers: vec![],
    };

    // Cycles must be u128
    let cycles: u128 = 2_000_000_000;

    let (response,): (HttpResponse,) = http_request(request, cycles)
        .await
        .map_err(|e| GoogleError::NetworkError(format!("HTTP request failed: {:?}", e)))?;

    // candid::Nat comparison needs a concrete type
    if response.status != candid::Nat::from(200u16) {
        return Err(GoogleError::NetworkError(format!(
            "HTTP status: {}",
            response.status
        )));
    }

    let body = String::from_utf8(response.body)
        .map_err(|e| GoogleError::NetworkError(format!("Invalid UTF-8: {}", e)))?;

    serde_json::from_str(&body)
        .map_err(|e| GoogleError::NetworkError(format!("JSON parse error: {}", e)))
}

fn verify_signature(
    header: &str,
    payload: &str,
    signature_b64: &str,
    key: &Jwk,
) -> Result<(), GoogleError> {
    // Signed message is "base64url(header).base64url(payload)"
    let message = format!("{}.{}", header, payload);

    // Base64url-decode signature, modulus n, and exponent e
    let signature = BASE64_URL_SAFE_NO_PAD
        .decode(signature_b64)
        .map_err(|_| GoogleError::InvalidFormat)?;

    let n = BASE64_URL_SAFE_NO_PAD
        .decode(&key.n)
        .map_err(|_| GoogleError::InvalidFormat)?;

    let e = BASE64_URL_SAFE_NO_PAD
        .decode(&key.e)
        .map_err(|_| GoogleError::InvalidFormat)?;

    // Use ring’s raw RSA components; ring handles the SHA-256 hash internally
    let pubkey = RsaPublicKeyComponents { n: &n, e: &e };
    pubkey
        .verify(&RSA_PKCS1_2048_8192_SHA256, message.as_bytes(), &signature)
        .map_err(|_| GoogleError::InvalidSignature)
}

// Helper structs for JWT decoding
#[derive(Deserialize)]
struct JwtHeader {
    kid: String,
    alg: String,
    #[allow(dead_code)]
    typ: String,
}

#[derive(Deserialize)]
struct JwtClaims {
    iss: String,          // Issuer
    sub: String,          // Subject (user ID)
    aud: String,          // Audience (client ID)
    exp: u64,             // Expiration time (seconds)
    iat: u64,             // Issued at (seconds)
    email: String,
    email_verified: bool,
    name: String,
    picture: Option<String>,
    given_name: Option<String>,
    family_name: Option<String>,
}

fn decode_jwt_header(header: &str) -> Result<JwtHeader, GoogleError> {
    let decoded = BASE64_URL_SAFE_NO_PAD
        .decode(header)
        .map_err(|_| GoogleError::InvalidFormat)?;
    serde_json::from_slice(&decoded).map_err(|_| GoogleError::InvalidFormat)
}

fn decode_jwt_claims(claims: &str) -> Result<JwtClaims, GoogleError> {
    let decoded = BASE64_URL_SAFE_NO_PAD
        .decode(claims)
        .map_err(|_| GoogleError::InvalidFormat)?;
    serde_json::from_slice(&decoded).map_err(|_| GoogleError::InvalidFormat)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_decode_jwt_header() {
        // Example JWT header: {"alg":"RS256","kid":"test","typ":"JWT"}
        let header_b64 = "eyJhbGciOiJSUzI1NiIsImtpZCI6InRlc3QiLCJ0eXAiOiJKV1QifQ";
        let result = decode_jwt_header(header_b64);
        assert!(result.is_ok());

        let header = result.unwrap();
        assert_eq!(header.alg, "RS256");
        assert_eq!(header.kid, "test");
        assert_eq!(header.typ, "JWT");
    }
}
