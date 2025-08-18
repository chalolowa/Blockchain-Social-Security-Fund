export const idlFactory = ({ IDL }) => {
  const EmployeeDetails = IDL.Record({
    'name': IDL.Text,
    'position': IDL.Text,
    'salary': IDL.Nat64,
  });

  const EmployerDetails = IDL.Record({
    'company_name': IDL.Text,
    'registration_number': IDL.Text,
  });

  const UserDetails = IDL.Record({
    'user_principal': IDL.Principal,
    'role': IDL.Text,
    'authenticated_at': IDL.Nat64,
    'employee_details': IDL.Opt(EmployeeDetails),
    'employer_details': IDL.Opt(EmployerDetails),
  });

  const Transaction = IDL.Record({
    'tx_id': IDL.Nat64,
    'user': IDL.Principal,
    'tx_type': IDL.Text,
    'amount': IDL.Nat64,
    'timestamp': IDL.Nat64,
  });

  const FundInfo = IDL.Record({
    'total_fund': IDL.Nat64,
    'ckbtc_reserve': IDL.Nat64,
    'stable_reserve': IDL.Nat64,
    'threshold': IDL.Nat64,
    'contributors': IDL.Vec(IDL.Tuple(IDL.Principal, IDL.Nat64)),
    'total_contributions': IDL.Vec(IDL.Tuple(IDL.Principal, IDL.Nat64)),
    'withdrawal_records': IDL.Vec(IDL.Tuple(IDL.Principal, IDL.Tuple(IDL.Nat64, IDL.Nat64))),
  });

  const NextOfKin = IDL.Record({
    'name': IDL.Text,
    'relationship': IDL.Text,
    'contact_info': IDL.Text,
  });

  const Result = IDL.Variant({ 'Ok': IDL.Text, 'Err': IDL.Text });
  const Result_1 = IDL.Variant({ 'Ok': UserDetails, 'Err': IDL.Text });

  return IDL.Service({
    'authenticate': IDL.Func([IDL.Principal], [Result], []),
    'authenticate_with_details': IDL.Func(
      [IDL.Principal, IDL.Text, IDL.Opt(EmployeeDetails), IDL.Opt(EmployerDetails)],
      [Result_1],
      [],
    ),
    'is_authenticated': IDL.Func([IDL.Principal], [IDL.Bool], ['query']),
    'get_authenticated_user': IDL.Func([IDL.Principal], [IDL.Opt(UserDetails)], ['query']),
    'get_fund_info': IDL.Func([], [FundInfo], ['query']),
    'get_user_role': IDL.Func([IDL.Principal], [IDL.Text], ['query']),
    'get_next_of_kin': IDL.Func([IDL.Principal], [IDL.Opt(NextOfKin)], ['query']),
    'set_user_role': IDL.Func([IDL.Principal, IDL.Text], [Result], []),
    'add_next_of_kin': IDL.Func([IDL.Principal, NextOfKin], [Result], []),
    'contribute': IDL.Func([IDL.Nat64, IDL.Principal], [], []),
    'request_withdrawal': IDL.Func([IDL.Nat64, IDL.Principal], [Result], []),
    'borrow_ckbtc': IDL.Func([IDL.Nat64, IDL.Principal], [Result], []),
    'apply_for_loan': IDL.Func([IDL.Nat64, IDL.Principal], [Result], []),
    'employer_match': IDL.Func([IDL.Principal, IDL.Nat64], [], []),
    'vote_on_proposal': IDL.Func([IDL.Nat64, IDL.Bool, IDL.Principal], [Result], []),
    'check_rewards': IDL.Func([IDL.Principal], [IDL.Nat64], ['query']),
    'redeem_rewards': IDL.Func([IDL.Principal], [Result], []),
    'stake_stable_assets': IDL.Func([IDL.Nat64], [Result], []),
    'collect_yield': IDL.Func([], [], []),
    'apply_interest': IDL.Func([], [], []),
    'get_transactions': IDL.Func([], [IDL.Vec(Transaction)], ['query']),
    'logout': IDL.Func([IDL.Principal], [Result], []),
  });
};

export const init = ({ IDL }) => { return []; };
