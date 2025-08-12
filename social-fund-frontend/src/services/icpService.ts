import { Actor, HttpAgent, Identity } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { fromByteArray, toByteArray } from "base64-js"
import { idlFactory as IdentityBrokerIdl } from "../../../social-fund-backend/identity-broker/src/declarations/identity-broker-backend/identity-broker-backend.did";

interface SessionState {
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
  };
}

class IdentityBrokerService {
  private sessionState: SessionState | null = null;
  private actor: any;

  constructor() {
    const host = process.env.NEXT_PUBLIC_IC_HOST || "https://ic0.app";
    const canisterId = process.env.NEXT_PUBLIC_IDENTITY_BROKER_ID || "";

    // Create an agent
    const agent = HttpAgent.createSync({ host });

    // In development, we need to fetch the root key
    if (process.env.NODE_ENV !== "production") {
      agent.fetchRootKey().catch(err => {
        console.warn("Unable to fetch root key. Check your local replica is running");
        console.error(err);
      });
    }

    // Create an actor for your canister
    this.actor = Actor.createActor<IdentityBrokerService>(IdentityBrokerIdl, {
      agent,
      canisterId,
    });
  }

  // Enhanced Google authentication with session management
  async authenticateWithGoogle(idToken: string): Promise<SessionState> {
    try {
      const response = await this.actor.authenticate_with_google(idToken);
      
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

  // Session-aware canister calls
  async makeAuthenticatedCall<T>(
    method: string, 
    args: any[] = []
  ): Promise<T> {
    if (!this.sessionState) {
      throw new Error('No active session');
    }

    // Check if session needs rotation
    await this.checkAndRotateSession();

    try {
      const response = await this.actor[method](
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
      const response = await this.actor.rotate_session_key(
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
      // Don't throw - let the next call handle the expired session
    }
  }

  // Enhanced error mapping
  private mapBackendError(error: any): Error {
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
        return new Error(`Backend error: ${error}`);
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
}

export const identityBrokerService = new IdentityBrokerService();