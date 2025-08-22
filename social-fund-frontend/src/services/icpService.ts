import { Actor, HttpAgent, Identity } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { fromByteArray, toByteArray } from "base64-js"
import { idlFactory as IdentityBrokerIdl } from "../declarations/identity_broker/identity_broker.did.js";
import { idlFactory as WalletFactoryIdl } from "@/declarations/wallet_factory/wallet_factory.did.js";

export interface SessionState {
  principal: Principal;
  sessionKey: Uint8Array;
  expiresAt: bigint;
  lastRotation: Date;
}

export interface UserDetails {
  principal: string;
  google_id?: string;
  ii_principal?: string;
  employee_details?: {
    name: string;
    email: string;
    address: string;
    role: string;
    position: string;
    department: string;
    salary: number;
    start_date: string;
  };
  employer_details?: {
    company_name: string;
    company_id: string;
    email: string;
    address: string;
    industry: string;
    employee_count: number;
    registration_date: string;
    contact_person: string;
  };
}

export interface WalletBalance {
  Icp: number;
  CkBtc: number;
  CkUsdt: number;
}

export interface TransactionInfo {
  id: string;
  amount: bigint;
  from: Principal;
  to: Principal;
  timestamp: bigint;
  transaction_type: string;
  status: string;
}

export interface WalletInfo {
  id: Principal;
  owner: Principal;
  created_at: bigint;
  last_accessed: bigint;
  security_settings: {
    two_factor_enabled: boolean;
    daily_transfer_limit: Record<string, bigint>;
    requires_confirmation: boolean;
    ip_whitelist: string[];
    last_security_update: bigint;
  };
  usage_statistics: {
    total_transactions: bigint;
    total_volume: bigint;
    last_transaction: bigint;
    favorite_tokens: string[];
    average_transaction_amount: bigint;
  };
}

class ICPService {
  private sessionState: SessionState | null = null;
  private identityBrokerActor: any;
  private WalletFactoryActor: any
  private agent: HttpAgent;

  constructor() {
    const host = process.env.NEXT_PUBLIC_IC_HOST || "https://ic0.app";
    const identityBrokerId = process.env.NEXT_PUBLIC_IDENTITY_BROKER_ID || "";
    const walletFactoryId = process.env.NEXT_PUBLIC_WALLET_FACTORY_ID || "";

    // Create an agent
    this.agent = HttpAgent.createSync({ host });

    // In development, we need to fetch the root key
    if (process.env.NODE_ENV !== "production") {
      this.agent.fetchRootKey().catch(err => {
        console.warn("Unable to fetch root key. Check your local replica is running");
        console.error(err);
      });
    }

    // Create an actors
    this.identityBrokerActor = Actor.createActor(IdentityBrokerIdl, {
      agent: this.agent,
      canisterId: identityBrokerId
    });

    this.WalletFactoryActor = Actor.createActor(WalletFactoryIdl, {
      agent: this.agent,
      canisterId: walletFactoryId
    });
  }

  // Google authentication with session management
  async authenticateWithGoogle(idToken: string): Promise<SessionState> {
    try {
      const response = await this.identityBrokerActor.authenticate_with_google(idToken);
      
      if ('Ok' in response) {
        const authResponse = response.Ok;
        this.sessionState = {
          principal: Principal.fromText(authResponse.principal),
          sessionKey: new Uint8Array(authResponse.session_key),
          expiresAt: authResponse.expires_at,
          lastRotation: new Date()
        };
        
        // Store session in localStorage (with encryption)
        this.storeSession(this.sessionState);
        
        // Schedule automatic rotation
        this.scheduleSessionRotation();
        
        return this.sessionState;
      } else {
        throw this.mapBackendError(response.Err);
      }
    } catch (error) {
      console.error('Google authentication failed:', error);
      throw error;
    }
  }

  // User profile management
  async getUserDetails(): Promise<UserDetails> {
    return this.makeAuthenticatedCall<UserDetails>(
      'get_user_details',
      'identityBroker'
    );
  }

  async updateEmployeeProfile(profileData: Partial<UserDetails['employee_details']>): Promise<void> {
    return this.makeAuthenticatedCall<void>(
      'update_employee_profile',
      'identityBroker',
      [profileData]
    );
  }

  async updateEmployerProfile(profileData: Partial<UserDetails['employer_details']>): Promise<void> {
    return this.makeAuthenticatedCall<void>(
      'update_employer_profile',
      'identityBroker',
      [profileData]
    );
  }

  // Wallet management
  async getOrCreateWallet(): Promise<Principal> {
    return this.makeAuthenticatedCall<Principal>(
      'get_or_create_wallet',
      'wallet',
      [null]
    );
  }

  async getWalletInfo(walletId: Principal): Promise<WalletInfo> {
    return this.makeAuthenticatedCall<WalletInfo>(
      'get_wallet_info',
      'wallet',
      [walletId]
    );
  }

  async getWalletBalances(walletId: Principal): Promise<WalletBalance> {
    return this.makeAuthenticatedCall<WalletBalance>(
      'get_all_balances',
      'wallet',
      [walletId]
    );
  }

  async updateBalance(walletId: Principal, vaultType: string): Promise<bigint> {
    return this.makeAuthenticatedCall<bigint>(
      'update_balance',
      'wallet',
      [walletId, { [vaultType]: null }]
    );
  }

  async batchUpdateBalances(walletId: Principal): Promise<WalletBalance> {
    return this.makeAuthenticatedCall<WalletBalance>(
      'batch_update_balances',
      'wallet',
      [walletId]
    );
  }

  async transferTokens(
    walletId: Principal,
    vaultType: string,
    amount: bigint,
    recipient: Principal
  ): Promise<bigint> {
    return this.makeAuthenticatedCall<bigint>(
      'transfer_tokens',
      'wallet',
      [walletId, { [vaultType]: null }, amount, recipient]
    );
  }

  async getBtcAddress(walletId: Principal): Promise<string> {
    return this.makeAuthenticatedCall<string>(
      'get_btc_address',
      'wallet',
      [walletId]
    );
  }

  async getTransactionHistory(
    walletId: Principal,
    vaultType: string,
    limit?: number
  ): Promise<TransactionInfo[]> {
    return this.makeAuthenticatedCall<TransactionInfo[]>(
      'get_transaction_history',
      'wallet',
      [walletId, { [vaultType]: null }, limit ? [limit] : []]
    );
  }

  async retrieveBtc(
    walletId: Principal,
    amount: bigint,
    btcAddress: string
  ): Promise<bigint> {
    return this.makeAuthenticatedCall<bigint>(
      'retrieve_btc',
      'wallet',
      [walletId, amount, btcAddress]
    );
  }

  async withdrawUsdt(
    walletId: Principal,
    amount: bigint,
    ethereumAddress: string
  ): Promise<string> {
    return this.makeAuthenticatedCall<string>(
      'withdraw_usdt',
      'wallet',
      [walletId, amount, ethereumAddress]
    );
  }

  // Session-aware canister calls
  async makeAuthenticatedCall<T>(
    method: string,
    actorType: 'identityBroker' | 'wallet',
    args: any[] = []
  ): Promise<T> {
    if (!this.sessionState) {
      throw new Error('No active session');
    }

    // Check if session needs rotation
    await this.checkAndRotateSession();

    const actor = actorType === 'identityBroker' ? this.identityBrokerActor : this.WalletFactoryActor;

    try {
      const response = await actor[method](
        Array.from(this.sessionState.sessionKey),
        ...args
      );
      
      if ('Ok' in response) {
        return response.Ok;
      } else {
        throw this.mapBackendError(response.Err);
      }
    } catch (error) {
      // Handle session expiration
      if (this.isSessionError(error)) {
        this.clearSession();
        throw new Error('Session expired, please log in again');
      }
      throw error;
    }
  }

  // Automatic session rotation
  private async checkAndRotateSession(): Promise<void> {
    if (!this.sessionState) return;

    const now = Date.now() * 1000000; // Convert to nanoseconds
    const rotationBuffer = 5 * 60 * 1000000000; // 5 minutes in nanoseconds
    
    if (Number(this.sessionState.expiresAt) - now < rotationBuffer) {
      await this.rotateSession();
    }
  }

  private async rotateSession(): Promise<void> {
    if (!this.sessionState) return;

    try {
      const response = await this.identityBrokerActor.rotate_session_key(
        Array.from(this.sessionState.sessionKey)
      );
      
      if ('Ok' in response) {
        this.sessionState.sessionKey = new Uint8Array(response.Ok.session_key);
        this.sessionState.expiresAt = response.Ok.expires_at;
        this.sessionState.lastRotation = new Date();
        
        this.storeSession(this.sessionState);
      }
    } catch (error) {
      console.error('Session rotation failed:', error);
    }
  }

  // Enhanced error mapping
    private mapBackendError(error: any): Error {
    if (typeof error === 'object') {
      if (error.AuthenticationFailed) {
        return new Error(`Authentication failed: ${error.AuthenticationFailed.reason}`);
      }
      if (error.WalletNotFound) {
        return new Error(`Wallet not found: ${error.WalletNotFound.principal}`);
      }
      if (error.ValidationError) {
        return new Error(`Validation error: ${error.ValidationError.message}`);
      }
      if (error.VaultError) {
        return new Error(`Vault error: ${error.VaultError.details}`);
      }
    }
    
    switch (error) {
      case 'InvalidToken':
        return new Error('Invalid Google token');
      case 'SessionExpired':
        return new Error('Session has expired');
      case 'InvalidSession':
        return new Error('Invalid session');
      case 'UserNotFound':
        return new Error('User not found');
      default:
        return new Error(`Backend error: ${JSON.stringify(error)}`);
    }
  }

  private storeSession(session: SessionState): void {
    // Encrypt and store session data
    const encrypted = this.encryptSession(session);
    localStorage.setItem('identity_broker_session', encrypted);
  }

  public loadSession(): SessionState | null {
    const stored = localStorage.getItem('identity_broker_session');
    if (!stored) return null;
    
    try {
      return this.decryptSession(stored);
    } catch {
      return null;
    }
  }

  public clearSession(): void {
    this.sessionState = null;
    localStorage.removeItem('identity_broker_session');
  }

  private encryptSession(session: SessionState): string {
    const payload = JSON.stringify({
      ...session,
      principal: session.principal.toText(),
      sessionKey: Array.from(session.sessionKey),
      expiresAt: session.expiresAt.toString(),
      lastRotation: session.lastRotation.toISOString(),
    });

    const encoder = new TextEncoder();
    const encoded = encoder.encode(payload);
    return fromByteArray(encoded);
  }

  private decryptSession(encoded: string): SessionState {
    const decodedBytes = toByteArray(encoded);
    const decoder = new TextDecoder();
    const json = decoder.decode(decodedBytes);

    const data = JSON.parse(json);

    return {
      principal: Principal.fromText(data.principal),
      sessionKey: new Uint8Array(data.sessionKey),
      expiresAt: BigInt(data.expiresAt),
      lastRotation: new Date(data.lastRotation),
    };
  }

  private isSessionError(error: any): boolean {
    return error.message?.includes('Session') || error.message?.includes('Unauthorized');
  }

  private scheduleSessionRotation(): void {
    // Schedule rotation check every 5 minutes
    setInterval(() => {
      this.checkAndRotateSession();
    }, 5 * 60 * 1000);
  }

    // Link Internet Identity
  async linkInternetIdentity(iiPrincipal: Principal): Promise<void> {
    return this.makeAuthenticatedCall<void>(
      'link_internet_identity',
      'identityBroker',
      [iiPrincipal]
    );
  }

  // Logout
  async logout(): Promise<void> {
    if (this.sessionState) {
      try {
        await this.makeAuthenticatedCall<void>('logout', 'identityBroker');
      } catch (error) {
        console.error('Logout call failed:', error);
      }
    }
    this.clearSession();
  }
}

export const backendICPService = new ICPService();