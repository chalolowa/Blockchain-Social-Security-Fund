# Build and Deployment Instructions

## ⚠️ Important: DFX Required

The Internet Computer SDK (`dfx`) is required to build and deploy the canisters. Since you're on Windows, you have two options:

### Option 1: Use WSL (Windows Subsystem for Linux)

1. Install WSL2: `wsl --install`
2. Install Ubuntu from Microsoft Store
3. Inside WSL, install dfx:

   ```bash
   sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"
   ```

### Option 2: Use a Linux/Mac Machine

Transfer the codebase to a Linux or Mac machine and run the commands there.

---

## Build Steps

After installing dfx, follow these steps from the **project root directory**:

### 1. Navigate to Backend Directory

```bash
cd social-fund-backend
```

### 2. Build the Identity Broker Canister

```bash
dfx build identity_broker
```

This will:

- Compile the Rust code to WebAssembly
- Generate the Candid interface file at: `identity-broker/src/identity-broker-backend/identity-broker-backend.did`
- The `export_candid!()` macro will auto-generate the interface from your Rust code

### 3. Generate TypeScript Bindings for Frontend

```bash
dfx generate identity_broker
```

This creates TypeScript type definitions in the frontend:

- `social-fund-frontend/src/declarations/identity_broker/identity_broker.did.d.ts`
- `social-fund-frontend/src/declarations/identity_broker/identity_broker.did.js`

### 4. Build Other Canisters

```bash
dfx build wallet_factory
dfx build fund_core
dfx build token_factory
dfx build watchdog
```

### 5. Deploy to Local Replica (for testing)

```bash
# Start local replica
dfx start --clean --background

# Deploy all canisters
dfx deploy

# Or deploy individual canister
dfx deploy identity_broker
```

### 6. Deploy to IC Mainnet (for production)

```bash
# First, create canisters on mainnet
dfx canister create identity_broker --network ic
dfx canister create wallet_factory --network ic
# ... repeat for other canisters

# Deploy
dfx deploy --network ic

# Get canister IDs
dfx canister id identity_broker --network ic
dfx canister id wallet_factory --network ic
```

---

## Environment Variables

After deployment, update your frontend `.env.local` file with the canister IDs:

```env
NEXT_PUBLIC_IC_HOST=https://ic0.app
NEXT_PUBLIC_IDENTITY_BROKER_ID=<canister_id_from_deploy>
NEXT_PUBLIC_WALLET_FACTORY_ID=<wallet_factory_canister_id>
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<your_google_client_id>
GOOGLE_CLIENT_SECRET=<your_google_client_secret>
```

For local development:

```env
NEXT_PUBLIC_IC_HOST=http://localhost:4943
NEXT_PUBLIC_IDENTITY_BROKER_ID=<local_canister_id>
NEXT_PUBLIC_WALLET_FACTORY_ID=<local_wallet_factory_id>
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<your_google_client_id>
GOOGLE_CLIENT_SECRET=<your_google_client_secret>
```

---

## Configure Google OAuth

You need to set the Google OAuth configuration in the identity broker canister:

```bash
# Local
dfx canister call identity_broker set_google_config '(record { 
  client_id = "YOUR_GOOGLE_CLIENT_ID"; 
  client_secret = "YOUR_GOOGLE_CLIENT_SECRET" 
})'

# Mainnet
dfx canister call identity_broker set_google_config '(record { 
  client_id = "YOUR_GOOGLE_CLIENT_ID"; 
  client_secret = "YOUR_GOOGLE_CLIENT_SECRET" 
})' --network ic
```

---

## Verify Deployment

### Test Google Authentication

```bash
# Should return AuthResponse with principal and session_key
dfx canister call identity_broker authenticate_with_google '("test_id_token")'
```

### Check Generated Candid Interface

```bash
cat identity-broker/src/identity-broker-backend/identity-broker-backend.did
```

You should see methods like:

- `authenticate_with_google`
- `get_user_details`
- `update_employee_profile`
- `update_employer_profile`
- `get_user_role`
- `link_internet_identity`
- `logout`

---

## Frontend Development

After building canisters and generating types:

```bash
cd ../social-fund-frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

---

## Troubleshooting

### Issue: "Cannot find module '@dfinity/candid'"

**Solution:** Run `npm install` in the frontend directory after generating types

### Issue: "Candid interface not updated"

**Solution:** 

1. Delete `.dfx` directory: `rm -rf .dfx`
2. Rebuild: `dfx build identity_broker`
3. Regenerate: `dfx generate identity_broker`

### Issue: "Session validation fails"

**Solution:** Make sure the canister ID in `.env.local` matches the deployed canister

### Issue: "Google token verification fails"

**Solution:** 

1. Verify Google OAuth credentials are correct
2. Check that the redirect URI in Google Console matches your app
3. Ensure the identity broker canister can make HTTP outcalls

---

## Next Steps

1. **Build the canisters** using the commands above (requires WSL or Linux/Mac)
2. **Test authentication flow**:
   - Google OAuth → Onboarding → Dashboard
   - Internet Identity → Onboarding → Dashboard
3. **Configure Google OAuth** credentials in the canister
4. **Deploy to IC mainnet** when ready for production
5. **Monitor canister logs** for any errors during authentication

---

## Support

If you encounter issues during deployment:

- Check the Candid interface was generated correctly
- Verify environment variables are set
- Test locally before deploying to mainnet
- Review canister logs: `dfx canister logs identity_broker`
