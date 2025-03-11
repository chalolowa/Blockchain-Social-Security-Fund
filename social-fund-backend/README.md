# `social-fund-backend`

This is the backend implementation for a decentralized social security fund on Internet Computer (ICP). It allows private company employees to contribute funds in ckBTC, withdraw when the balance exceeds a threshold, apply for decentralized loans, and earn yield on stable reserves.

---


## 🛠️ Setup & Deployment

### 1️⃣ Install Dependencies
Ensure you have **DFX (ICP SDK)** and **Rust** installed:

```sh
dfx --version  # Should be installed
cargo --version  # Rust should be installed
```
If not installed, follow the ICP installation guide.

2️⃣ Start the Local ICP Replica
```sh
dfx start --background
```

3️⃣ Deploy the Canisters
```sh
dfx deploy
```


## 📌 API Endpoints (Candid)
| Function |	Description |
| :--- | ---|
| contribute(amount, user) |	Employee contributes ckBTC to the fund |
| request_withdrawal(amount, user) |	Withdraw funds if above threshold |
| apply_for_loan(amount, user) |	Apply for a decentralized Bitcoin loan |
| borrow_ckbtc(amount, user) |	Borrow Bitcoin from ckBTC reserves |
| stake_stable_assets(amount) |	Stake stable reserves for yield |
| collect_yield()	| Collect & reinvest stable yield |
| create_proposal(description)	| Create a governance proposal |
| vote(proposal_id, approve) |	Vote on a governance proposal |
| check_rewards(user) |	Check governance rewards (GOV tokens) |
| redeem_rewards(user) |	Redeem governance rewards into Bitcoin |



## 📞 Contact & Support
For support, reach out to Charles Wangwe. 🚀
