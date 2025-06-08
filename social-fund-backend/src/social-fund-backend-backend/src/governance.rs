use candid::Principal;

#[derive(Clone)]
pub struct Proposal {
    pub proposer: Principal,
    pub token: String,
    pub votes_for: u64,
    pub votes_against: u64,
    pub executed: bool,
}

thread_local! {
    pub static PROPOSALS: RefCell<Vec<Proposal>> = RefCell::new(Vec::new());
}

pub fn create_proposal(proposer: Principal, token: String) -> usize {
    let proposal = Proposal {
        proposer,
        token,
        votes_for: 0,
        votes_against: 0,
        executed: false,
    };

    PROPOSALS.with(|p| {
        let mut list = p.borrow_mut();
        list.push(proposal);
        list.len() - 1
    })
}

pub fn vote(index: usize, voter: Principal, approve: bool) -> Result<(), String> {
    PROPOSALS.with(|p| {
        let mut list = p.borrow_mut();
        let prop = list.get_mut(index).ok_or("Invalid proposal index")?;
        if approve {
            prop.votes_for += 1;
        } else {
            prop.votes_against += 1;
        }
        Ok(())
    })
}
