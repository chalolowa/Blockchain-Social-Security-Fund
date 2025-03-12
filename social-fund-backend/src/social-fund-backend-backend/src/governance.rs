use std::collections::HashMap;
use candid::Principal;
use crate::transactions::log_transaction;

type ProposalId = u64;

#[derive(Clone)]
struct Proposal {
    id: ProposalId,
    description: String,
    votes_for: u64,
    votes_against: u64,
    executed: bool,
}

thread_local! {
    static GOVERNANCE: std::cell::RefCell<HashMap<ProposalId, Proposal>> = std::cell::RefCell::new(HashMap::new());
    static REWARDS: std::cell::RefCell<HashMap<Principal, u64>> = std::cell::RefCell::new(HashMap::new());
}

static mut PROPOSAL_COUNTER: ProposalId = 0;


pub fn vote_on_proposal(proposal_id: ProposalId, approve: bool, voter: Principal) -> Result<String, String> {
    GOVERNANCE.with(|g| {
        let mut governance = g.borrow_mut();
        let proposal = governance.get_mut(&proposal_id);

        if let Some(p) = proposal {
            if p.executed {
                return Err("Proposal already executed.".to_string());
            }

            if approve {
                p.votes_for += 1;
            } else {
                p.votes_against += 1;
            }

            // Reward voter
            REWARDS.with(|r| {
                let mut rewards = r.borrow_mut();
                *rewards.entry(voter).or_insert(0) += REWARD_PER_VOTE;
            });

            if p.votes_for > p.votes_against {
                p.executed = true;
            }

            Ok("Vote recorded. Earned governance reward.".to_string())
        } else {
            Err("Proposal not found.".to_string())
        }
    })
}


fn create_proposal(description: String) -> ProposalId {
    let id = unsafe {
        PROPOSAL_COUNTER += 1;
        PROPOSAL_COUNTER
    };

    let desc = description.clone();
    GOVERNANCE.with(|g| {
        g.borrow_mut().insert(
            id,
            Proposal {
                id,
                description: desc,
                votes_for: 0,
                votes_against: 0,
                executed: false,
            },
        );
    });

    ic_cdk::println!("New proposal created: {}", description);
    id
}

// Voting system with rewards
const REWARD_PER_VOTE: u64 = 10;

//claim rewards
pub fn redeem_rewards(user: Principal) -> Result<String, String> {
    REWARDS.with(|r| {
        let mut rewards = r.borrow_mut();
        let amount = rewards.remove(&user).unwrap_or(0);
        if amount == 0 {
            return Err("No rewards.".to_string());
        }
        crate::fund::FUND.with(|f| {
            let mut fund = f.borrow_mut();
            fund.stable_reserve += amount;
            fund.total_fund = fund.ckbtc_reserve + fund.stable_reserve;
        });
        log_transaction(user, "Redeem Rewards", amount);
        Ok(format!("Redeemed {} rewards.", amount))
    })
}

//check rewards
pub fn check_rewards(user: Principal) -> u64 {
    REWARDS.with(|r| *r.borrow().get(&user).unwrap_or(&0))
}

