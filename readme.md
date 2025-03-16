# 🏦 Decentralized Social Security Fund on Internet Computer (ICP)

A decentralized social security fund built on the Internet Computer that provides retirement savings, employer matching, Bitcoin-backed borrowing, and governance functionality. This project consists of a Rust-based ICP canister backend and a Next.js 15 frontend (with NFID authentication).

---

## Overview

This project aims to revolutionize social security by leveraging blockchain technology. It offers:

- **Employee Dashboard:**  
  - View ckBTC and stable reserve contributions.
  - Perform financial actions: withdraw, borrow, repay ckBTC; apply for/repay loans.
  - Manage beneficiary (next of kin) information.
  - Participate in governance: vote on staking proposals and claim rewards.
  - Collect yield from staking operations.
  - Review transaction receipts and history (split between ckBTC and stable reserve transactions).

- **Employer Dashboard:**  
  - View overall fund statistics.
  - Contribute directly to employee wallets.
  - Match employee contributions.
  - Participate in governance: vote on staking proposals and claim governance rewards.
  - View transaction receipts and history.

- **NFID Authentication:**  
  - Secure login using NFID IdentityKit.
  - Users can switch between employee and employer roles.

- **ICP Storage:**  
  - All transaction logs and sensitive data are stored securely on the ICP canister (no external IPFS used).

---

## Critical Backend Functions

The backend canister (written in Rust) provides the following critical functions:

### Authentication
- **`authenticate(user: Principal) -> Result<String, String>`**  
  Authenticates the user using NFID.

- **`is_authenticated(user: Principal) -> bool`**  
  Checks whether a user is authenticated.

### Fund Management
- **`get_fund_info() -> FundInfo`**  
  Returns the current fund status, including total funds, ckBTC reserve, stable reserve, and user contributions.

- **`contribute(amount: u64, user: Principal)`**  
  Allows an employee to contribute funds (50% allocated to ckBTC and 50% to stable reserves).

- **`request_withdrawal(amount: u64, user: Principal) -> Result<String, String>`**  
  Enables withdrawal requests (subject to fund thresholds and withdrawal limits).

### Borrowing and Loans
- **`borrow_ckbtc(amount: u64, user: Principal) -> Result<String, String>`**  
  Processes decentralized Bitcoin (ckBTC) borrowing from the fund.

- **`repay_ckbtc(amount: u64, user: Principal) -> Result<String, String>`**  
  Processes repayment of a ckBTC loan.

- **`apply_for_loan(amount: u64, user: Principal) -> Result<String, String>`**  
  Allows employees to apply for a loan (insured using stable reserves).

- **`repay_loan(amount: u64, user: Principal) -> Result<String, String>`**  
  Enables employees to repay a loan.

### Governance and Staking
- **`vote_on_proposal(proposal_id: u64, approve: bool, voter: Principal) -> Result<String, String>`**  
  Allows fund managers to vote on governance proposals regarding staking or fund management.

- **`check_rewards(user: Principal) -> u64`**  
  Returns the current governance rewards for the user.

- **`redeem_rewards(user: Principal) -> Result<String, String>`**  
  Allows users to claim their governance rewards directly to their wallet.

- **`stake_stable_assets(amount: u64) -> Result<String, String>`**  
  Enables staking of stable reserves to generate yield.

- **`collect_yield() -> Result<String, String>`**  
  Collects the yield generated from staked assets.

- **`apply_interest() -> ()`**  
  Applies monthly interest to all contributions.

### User Profile and Role Management
- **`add_next_of_kin(user: Principal, next_of_kin: NextOfKin) -> Result<String, String>`**  
  Adds or updates beneficiary (next of kin) information for the user.

- **`get_next_of_kin(user: Principal) -> Option<NextOfKin>`**  
  Retrieves the next of kin details for the user.

- **`set_user_role(user: Principal, role: String) -> Result<String, String>`**  
  Sets the role (employee or employer) for the user.

- **`get_user_role(user: Principal) -> String`**  
  Retrieves the current role of the user.

### Transaction Logging
- **`get_transactions() -> Vec<Transaction>`**  
  Returns a list of all transactions, which include details such as type, amount, timestamp, and status.
  
- **Transaction logging functions are called internally by other actions (e.g., borrow, repay, redeem) to record each operation.**

---
