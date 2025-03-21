# 🏦 Decentralized Social Security Fund on Internet Computer (ICP)

A decentralized social security fund built on the Internet Computer that provides retirement savings, employer matching, Bitcoin-backed borrowing, and governance functionality. This project consists of a Rust-based ICP canister backend and a Next.js 15 frontend (with NFID authentication).

---

## Overview

This project aims to revolutionize social security by leveraging blockchain technology. It offers:

1. Dual-Reserve Fund Mechanism
- 50/50 Allocation: Contributions split between ckBTC (50%) and USD stablecoins (50%)

- Dynamic Rebalancing: Automatic adjustment based on market conditions

- Collateralization: 150% over-collateralization for loans

  

2. Hybrid Governance Model
- Quadratic Voting: Prevent whale dominance in governance

- Time-locked Proposals: Minimum 72-hour voting period

- Delegated Voting: Employees can delegate voting power



3. Risk Management System
- Insurance Pool: 2% fee on all loans

- Withdrawal Throttling: Tiered withdrawal limits based on fund health



---



## Security Enhancements

1. Multi-Layered Authentication

```
sequenceDiagram
    User->>NFID: Initiate Auth
    NFID->>ICP: Request Delegation
    ICP->>Backend: Verify Principal
    Backend->>User: Session Token + 2FA
```

2. Fund Protection Mechanisms

- Regular Audits: On-chain verification of fund balances

---

## Environment Variables

### Frontend

NEXT_PUBLIC_CANISTER_ID=your_canister_id

NEXT_PUBLIC_IC_HOST=<https://ic0.app>

### Backend

FUND_THRESHOLD=100000000  # 1 BTC equivalent

MAX_LOAN_RATIO=150        # 150% collateralization

---
