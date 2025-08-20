# 🏦 Decentralized Social Security Fund on Internet Computer (ICP)

A decentralized social security fund built on the Internet Computer that provides retirement savings, employer matching, Bitcoin-backed borrowing, and governance functionality. This startup project consists of a Rust-based ICP canister backend and a Next.js 15 frontend.

---

## Overview

This project aims to revolutionize social security by leveraging blockchain technology. It offers:

1. Dual-Reserve Fund Mechanism
   
    - 50/50 Allocation: Contributions split between ckBTC (50%) and stable assets (50%)
    
    - ckBTC is pegged 1:1 with BTC allowing users fund to grow overtime as the value of BTC grows.
      
    - Stable assets specifically ckUSDT will be utilised in DeFi staking along with native ICP.

  

2. Hybrid Governance Model
    - Quadratic Voting: Prevent whale dominance in governance
    
    - Time-locked Proposals: Minimum 72-hour voting period
    
    - Delegated Voting: Employees can delegate voting power
      
    - Users earn governance tokens for voting participation which can be redeemed and also grows in value as the user base expands.



3. Risk Management System
    - Insurance Pool: 2% fee on all loans
    
    - Withdrawal Throttling: Tiered withdrawal limits on ckBTC based on fund health.
      
    - Loan accessibility: Tiered loan access based on fund health with funds used as collateral.


4. Additional Benefits
    - Employer can match employees monthly contributions as a bonus or reward.
      
    - Participation in personal financial growth through active staking and voting on passive staking options.



---


MAX_LOAN_RATIO=100        # 100% collateralization

---
