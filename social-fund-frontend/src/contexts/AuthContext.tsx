"use client";

import { identityBrokerService, UserDetails } from "@/services/icpService";
import { AuthClient } from "@dfinity/auth-client";
import { Principal } from "@dfinity/principal";
import { createContext, useContext, ReactNode, useEffect, useState } from "react";

interface AuthContextType {
  // Authentication state
  isAuthenticated: boolean;
  userPrincipal: Principal | null;
  userDetails: UserDetails | null;
  sessionExpiry: Date | null;
  
  // Authentication methods
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginWithII: () => Promise<void>;
  linkInternetIdentity: () => Promise<void>;
  logout: () => Promise<void>;
  
  // State management
  loading: boolean;
  authError: string | null;
  sessionStatus: 'active' | 'expiring' | 'expired' | 'none';
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authClient, setAuthClient] = useState<AuthClient | null>(null);
  const [userPrincipal, setUserPrincipal] = useState<Principal | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [sessionExpiry, setSessionExpiry] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<'active' | 'expiring' | 'expired' | 'none'>('none');

  // Initialize authentication
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Initialize auth client for Internet Identity
        const client = await AuthClient.create();
        setAuthClient(client);
        
        // Check for existing identity broker session
        const session = identityBrokerService.loadSession();
        if (session) {
          setUserPrincipal(session.principal);
          setSessionExpiry(new Date(Number(session.expiresAt) / 1000000));
          await fetchUserDetails(session.principal);
          monitorSession();
        } else {
          // Check Internet Identity
          const isAuth = await client.isAuthenticated();
          if (isAuth) {
            const identity = client.getIdentity();
            const principal = identity.getPrincipal();
            setUserPrincipal(principal);
            await fetchUserDetails(principal);
          }
        }
      } catch (error) {
        console.error("Auth initialization failed:", error);
        setAuthError("Failed to initialize authentication");
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Monitor session status
  const monitorSession = () => {
    const checkSession = () => {
      if (!sessionExpiry) {
        setSessionStatus('none');
        return;
      }

      const now = Date.now();
      const expiry = sessionExpiry.getTime();
      const timeToExpiry = expiry - now;
      const fiveMinutes = 5 * 60 * 1000;

      if (timeToExpiry <= 0) {
        setSessionStatus('expired');
        handleSessionExpired();
      } else if (timeToExpiry <= fiveMinutes) {
        setSessionStatus('expiring');
      } else {
        setSessionStatus('active');
      }
    };

    checkSession();
    const interval = setInterval(checkSession, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  };

  const handleSessionExpired = () => {
    setUserPrincipal(null);
    setUserDetails(null);
    setSessionExpiry(null);
    setAuthError("Your session has expired. Please log in again.");
  };

  const fetchUserDetails = async (principal: Principal) => {
    try {
      const details = await identityBrokerService.makeAuthenticatedCall<UserDetails>(
        'get_user_details'
      );
      setUserDetails(details);
    } catch (error) {
      console.error("Failed to fetch user details:", error);
      // Don't set error here - user might not be fully set up yet
    }
  };

  const loginWithGoogle = async (idToken: string) => {
    setLoading(true);
    setAuthError(null);
    
    try {
      const session = await identityBrokerService.authenticateWithGoogle(idToken);
      setUserPrincipal(session.principal);
      setSessionExpiry(new Date(Number(session.expiresAt) / 1000000));
      await fetchUserDetails(session.principal);
      monitorSession();
    } catch (error) {
      console.error("Google login failed:", error);
      setAuthError("Google authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const loginWithII = async () => {
    if (!authClient) return;
    
    setLoading(true);
    setAuthError(null);

    try {
      const identityProvider = process.env.NODE_ENV === 'production'
        ? 'https://identity.ic0.app'
        : `http://rdmx6-jaaaa-aaaaa-aaadq-cai.localhost:4943`;

      await authClient.login({
        identityProvider,
        onSuccess: async () => {
          const identity = authClient.getIdentity();
          const principal = identity.getPrincipal();
          setUserPrincipal(principal);
          await fetchUserDetails(principal);
          setLoading(false);
        },
      });
    } catch (error) {
      console.error("Internet Identity login failed:", error);
      setAuthError("Internet Identity login failed");
      setLoading(false);
    }
  };

  const linkInternetIdentity = async () => {
    if (!authClient || !userPrincipal) return;
    
    setLoading(true);
    setAuthError(null);

    try {
      await authClient.login({
        identityProvider: process.env.NODE_ENV === 'production'
          ? 'https://identity.ic0.app'
          : `http://rdmx6-jaaaa-aaaaa-aaadq-cai.localhost:4943`,
        onSuccess: async () => {
          const identity = authClient.getIdentity();
          const iiPrincipal = identity.getPrincipal();
          
          // Link the identities
          await identityBrokerService.makeAuthenticatedCall(
            'link_internet_identity',
            [iiPrincipal.toText()]
          );
          
          // Refresh user details
          await fetchUserDetails(userPrincipal);
          setLoading(false);
        },
      });
    } catch (error) {
      console.error("Identity linking failed:", error);
      setAuthError("Failed to link Internet Identity");
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      // Clear identity broker session
      identityBrokerService.clearSession();
      
      // Logout from Internet Identity if applicable
      if (authClient) {
        await authClient.logout();
      }
      
      setUserPrincipal(null);
      setUserDetails(null);
      setSessionExpiry(null);
      setSessionStatus('none');
    } catch (error) {
      console.error("Logout failed:", error);
      setAuthError("Logout failed");
    } finally {
      setLoading(false);
    }
  };

  const value = {
    isAuthenticated: !!userPrincipal,
    userPrincipal,
    userDetails,
    sessionExpiry,
    loginWithGoogle,
    loginWithII,
    linkInternetIdentity,
    logout,
    loading,
    authError,
    sessionStatus
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};