# `identity-broker`

## Hybrid Architecture

                    [User]
                      |
            ┌─────────┴─────────┐
            │                   │
        (Primary)           (Secondary)
            │                   │
            ▼                   ▼
     [Internet Identity]    [Google Sign-In]
            │                   │
            ▼                   ▼
      [II Principal]    [Identity Broker Canister]
            │                   │
            │                   ▼
            │         [Generate Shadow Principal]
            │                   │
            └─────────┬─────────┘
                      ▼
            [Unified User Profile]
                      │
                      ▼
           [Fund Management System]

## Key Components & Security Measures

1. Identity Broker Canister (Critical Security Layer):

    Generates deterministic "shadow principals" for Google users using:
    
    ```
    fn generate_shadow_principal(google_id: &str) -> Principal {
        let seed = hmac_sha256(canister_secret, google_id);
        Principal::self_authenticating(&seed)
    }
    ```

2. Authentication Workflow:

    - Google Sign-In Path:
  
      1. Frontend receives Google OAuth2 token
      
      2. Token sent to Identity Broker for verification
      
      3. Broker returns ephemeral delegation to shadow principal
      
      4. Client sessions automatically expire after 15 minutes

    - Principal Unification System:
    
      Links Google sign-in method to internet identity:
      
      ```
      async fn link_identities(
          ii_principal: Principal,
          google_token: String,
          broker: &IdentityBroker
      ) -> Result<(), LinkError> {
          let shadow = broker.verify_google(google_token).await?;
          store_mapping(ii_principal, shadow);
      }
      ```

3. Recovery Protocol (Critical for Social Security System):

    - Multi-Factor Recovery:
    
      1. Google authentication (knowledge factor)
      
      2. Device confirmation (possession factor)
      
      3. Delay-based finalization (time factor)
    
    - Social Recovery:
    
      1. Designate 5 trusted contacts
      
      2. 3-of-5 required for account recovery
      
      3. 48-hour time-lock for fund-related actions
     
