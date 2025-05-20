import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory } from "../declarations/social-fund-backend-backend/service.did.js";
import { Principal } from "@dfinity/principal";
import { IDL } from "@dfinity/candid";

const host = process.env.NEXT_PUBLIC_IC_HOST || "https://ic0.app";

// Create an agent
const agent = new HttpAgent({ host });

// In development, we need to fetch the root key
if (process.env.NODE_ENV !== "production") {
  agent.fetchRootKey().catch(err => {
    console.warn("Unable to fetch root key. Check your local replica is running");
    console.error(err);
  });
}

// Create an actor for your canister
const canisterId = process.env.NEXT_PUBLIC_CANISTER_ID || "";
const backend = Actor.createActor(idlFactory, { agent, canisterId });

// functions:
export const getFundInfo = async () => {
  return await backend.get_fund_info();
};

export const addEmployee = async (principal: Principal, p0: Principal, p1: { salary: number; name: string; position: string; email: string; wallet_address: string; }, user: string, employee: EmployeeDetails) => {
  const userPrincipal = Principal.fromText(user);
  return await backend.add_employee(userPrincipal, employee);
}

export const getEmployee = async (user: string) => {
  const userPrincipal = Principal.fromText(user);
  return await backend.get_employee(userPrincipal);
};

export const getAllEmployees = async () => {
  return await backend.get_all_employees();
};

export const addNextOfKin = async (nextOfKin: any, user: string) => {
    const userPrincipal = Principal.fromText(user);
    return await backend.add_next_of_kin(userPrincipal, nextOfKin);
};

export const getNextOfKin = async (user: string) => {
    const userPrincipal = Principal.fromText(user);
    return await backend.get_next_of_kin(userPrincipal);
};

export const setUserRole = async (role: string, user: string) => {
    const userPrincipal = Principal.fromText(user);
    return await backend.set_user_role(userPrincipal, role);
}

export const getUserRole = async (user: string) => {
    const userPrincipal = Principal.fromText(user);
    return await backend.get_user_role(userPrincipal);
};

export const withdrawFunds = async (amount: number, user: string) => {
  return await backend.request_withdrawal(BigInt(amount), user);
};

export const borrowCkbtc = async (amount: number, user: string) => {
  return await backend.borrow_ckbtc(BigInt(amount), user);
};

export const repayCkbtc = async (amount: number, user: string) => {
  return await backend.repay_ckbtc(BigInt(amount), user);
};

export const applyForLoan = async (amount: number, user: string) => {
  return await backend.apply_for_loan(BigInt(amount), user);
};

export const repayLoan = async (amount: number, user: string) => {
  return await backend.repay_loan(BigInt(amount), user);
};

export const voteOnProposal = async (proposalId: number, approve: boolean, voter: string) => {
  return await backend.vote_on_proposal(BigInt(proposalId), approve, voter);
};

export const checkRewards = async (user: string) => {
  return await backend.check_rewards(user);
};

export const redeemRewards = async (user: string) => {
  return await backend.redeem_rewards(user);
};

export const stakeStableAssets = async (amount: number) => {
  return await backend.stake_stable_assets(BigInt(amount));
};

export const collectYield = async () => {
  return await backend.collect_yield();
};

export const getTransactions = async () => {
  return await backend.get_transactions();
};

export const employerMatch = async (employee: string, amount: number) => {
  return await backend.employer_match(employee, BigInt(amount));
};

export const contribute = async (user: string, amount: number) => {
  return await backend.contribute(user, BigInt(amount));
};

export interface EmployeeDetails {
    name: string;
    position: string;
    salary: number;
    wallet_address: string;
    email: string;
}

export interface EmployerDetails {
    company_name: string;
    registration_number: string;
    wallet_address: string;
}

export interface UserDetails {
    principal: string;
    authenticated_at: bigint;
    employee_details: EmployeeDetails | null;
    employer_details: EmployerDetails | null;
}

export const authenticateWithDetails = async (
  principal: string,
  employeeDetails?: any,
  employerDetails?: any
): Promise<UserDetails> => {
  const result =  await backend.authenticate_with_details(
    Principal.fromText(principal),
    employeeDetails ? [employeeDetails] : [],
    employerDetails ? [employerDetails] : []
  );

  return result as UserDetails;
};

export const getAuthenticatedUser = async (principal: string) => {
    const userPrincipal = Principal.fromText(principal);
    return await backend.get_authenticated_user(userPrincipal);
};

export const isAuthenticated = async (principal: string) => {
    const userPrincipal = Principal.fromText(principal);
    return await backend.is_authenticated(userPrincipal);
};

export const logout = async (principal: string) => {
    const userPrincipal = Principal.fromText(principal);
    return await backend.logout(userPrincipal);
};
