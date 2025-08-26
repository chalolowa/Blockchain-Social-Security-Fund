"use client";

import { backendICPService, UserDetails, WalletBalance, WalletInfo } from "@/services/icpService";
import { AuthClient } from "@dfinity/auth-client";
import { Principal } from "@dfinity/principal";
import { resolve } from "path";
import { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";

interface WalletState {
  walletId: Principal | null;
  WalletInfo: WalletInfo | null;
  balances: WalletBalance | null;
  btcAddress: string | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextType {
  // Authentication state
  isAuthenticated: boolean;
  userPrincipal: Principal | null;
  userDetails: UserDetails | null;
  sessionExpiry: Date | null;

  //Wallet state
  WalletState: WalletState;
  
  // Authentication methods
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginWithII: () => Promise<void>;
  linkInternetIdentity: () => Promise<void>;
  logout: () => Promise<void>;

    // Profile management
  updateEmployeeProfile: (profileData: Partial<UserDetails['employee_details']>) => Promise<void>;
  updateEmployerProfile: (profileData: Partial<UserDetails['employer_details']>) => Promise<void>;
  refreshUserDetails: () => Promise<void>;
  
  // Wallet management
  initializeWallet: () => Promise<void>;
  refreshWalletData: () => Promise<void>;
  updateBalance: (vaultType: string) => Promise<void>;
  batchUpdateBalances: () => Promise<void>;
  transferTokens: (vaultType: string, amount: bigint, recipient: string) => Promise<void>;
  
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

    // Wallet state
  const [walletState, setWalletState] = useState<WalletState>({
    walletId: null,
    WalletInfo: null,
    balances: null,
    btcAddress: null,
    loading: false,
    error: null,
  });

  // Initialize authentication
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Initialize auth client for Internet Identity
        const client = await AuthClient.create();
        setAuthClient(client);
        
        // Check for existing identity broker session
        const session = backendICPService.getCurrentSession();
        if (session && session.principal) {
          setUserPrincipal(session.principal);
          setSessionExpiry(new Date(Number(session.expiresAt) / 1000000));
          
          try {
            await fetchUserDetails(session.principal);
            startSessionMonitoring();
          } catch (error) {
            console.error('Failed to fetch user details with existing session:', error);
            // Clear invalid session
            backendICPService.clearSession();
            setAuthError("Session is invalid, please log in again");
          }
        } else {
          // Check Internet Identity as fallback
          const isAuth = await client.isAuthenticated();
          if (isAuth) {
            const identity = client.getIdentity();
            const principal = identity.getPrincipal();
            // Create session for II user
            try {
              const newSession = await backendICPService.createSessionForII(principal);
              setUserPrincipal(principal);
              setSessionExpiry(new Date(Number(newSession.expiresAt) / 1000000));
              await fetchUserDetails(principal);
              startSessionMonitoring();
            } catch (error) {
              console.error('Failed to create session for II user:', error);
              // Still set the principal for basic II auth
              setUserPrincipal(principal);
              try {
                await fetchUserDetailsDirectly(principal);
              } catch (detailsError) {
                console.error('Failed to fetch user details:', detailsError);
                setAuthError("Failed to load user profile");
              }
            }
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

  // Start monitoring session status
  const startSessionMonitoring = () => {
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
    
    // Cleanup function
    return () => clearInterval(interval);
  };

  // Monitor session status
  useEffect(() => {
    if (sessionExpiry) {
      return startSessionMonitoring();
    }
  }, [sessionExpiry]);

  const handleSessionExpired = () => {
    setUserPrincipal(null);
    setUserDetails(null);
    setSessionExpiry(null);
        setWalletState({
        walletId: null,
        WalletInfo: null,
        balances: null,
        btcAddress: null,
        loading: false,
        error: null,
    });
    backendICPService.clearSession();
    setAuthError("Your session has expired. Please log in again.");
  };

  const fetchUserDetails = async (principal: Principal) => {
    try {
      const details = await backendICPService.getUserDetails();
      setUserDetails(details);
      return details;
    } catch (error) {
      console.error("Failed to fetch user details:", error);
      throw error;
    }
  };

  // Fallback method for direct user details fetching (without session)
  const fetchUserDetailsDirectly = async (principal: Principal) => {
    const basicUser: UserDetails = {
      principal: principal.toText(),
    };
    setUserDetails(basicUser);
  };

  const loginWithGoogle = async (idToken: string) => {
    setLoading(true);
    setAuthError(null);
    
    try {
      const session = await backendICPService.authenticateWithGoogle(idToken);
      setUserPrincipal(session.principal);
      setSessionExpiry(new Date(Number(session.expiresAt) / 1000000));
      await fetchUserDetails(session.principal);
      startSessionMonitoring();
    } catch (error) {
      console.error("Google login failed:", error);
      setAuthError("Google authentication failed");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithII = async () => {
    if (!authClient) return;
    
    setLoading(true);
    setAuthError(null);

    try {
      const identityProvider = 'https://identity.ic0.app';

      await authClient.login({
        identityProvider,
        onSuccess: async () => {
          const identity = authClient.getIdentity();
          const principal = identity.getPrincipal();

          const session = await backendICPService.createSessionForII(principal);
          setUserPrincipal(principal);
          setSessionExpiry(new Date(Number(session.expiresAt) / 1000000));

          await fetchUserDetails(principal);
          startSessionMonitoring();

          resolve();
        },
      });
    } catch (error) {
      console.error("Internet Identity login failed:", error);
      setAuthError("Internet Identity login failed");
    } finally {
      setLoading(false);
    }
  };

  const linkInternetIdentity = async () => {
    if (!authClient || !userPrincipal) return;
    
    setLoading(true);
    setAuthError(null);

    try {
      console.log('Starting Internet Identity linking...');
      
      await new Promise<void>((resolve, reject) => {
        authClient.login({
          identityProvider: 'https://identity.ic0.app',
          onSuccess: async () => {
            try {
              const identity = authClient.getIdentity();
              const iiPrincipal = identity.getPrincipal();
              console.log('II linking successful, linking principal:', iiPrincipal.toText());
              
              // Link the identity
              await backendICPService.linkInternetIdentity(iiPrincipal);
              
              // Refresh user details
              await fetchUserDetails(userPrincipal);
              toast.success('Internet Identity linked successfully!');
              
              console.log('Identity linking completed successfully');
              resolve();
            } catch (error) {
              console.error('Identity linking failed:', error);
              reject(error);
            }
          },
          onError: (error) => {
            console.error('II linking login failed:', error);
            reject(new Error('Failed to authenticate with Internet Identity for linking'));
          }
        });
      });
    } catch (error) {
      console.error("Identity linking failed:", error);
      setAuthError(error instanceof Error ? error.message : "Failed to link Internet Identity");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      // Clear session
      backendICPService.logout();
      
      // Logout from Internet Identity if applicable
      if (authClient) {
        await authClient.logout();
      }
      
      setUserPrincipal(null);
      setUserDetails(null);
      setSessionExpiry(null);
      setSessionStatus('none');
      setWalletState({
        walletId: null,
        WalletInfo: null,
        balances: null,
        btcAddress: null,
        loading: false,
        error: null,
      });
      setAuthError(null);
    } catch (error) {
      console.error("Logout failed:", error);
      setAuthError("Logout failed");
    } finally {
      setLoading(false);
    }
  };

    // Profile management
  const updateEmployeeProfile = async (profileData: Partial<UserDetails['employee_details']>) => {
    if (!userPrincipal) throw new Error('User not authenticated');
    try {
      await backendICPService.updateEmployeeProfile(profileData);
      await fetchUserDetails(userPrincipal);
      toast.success('Employee profile updated successfully!');
    } catch (error) {
      console.error('Failed to update employee profile:', error);
      toast.error('Failed to update profile');
      throw error;
    }
  };

  const updateEmployerProfile = async (profileData: Partial<UserDetails['employer_details']>) => {
    if (!userPrincipal) throw new Error('User not authenticated');
    try {
      await backendICPService.updateEmployerProfile(profileData);
      await fetchUserDetails(userPrincipal);
      toast.success('Employer profile updated successfully!');
    } catch (error) {
      console.error('Failed to update employer profile:', error);
      toast.error('Failed to update profile');
      throw error;
    }
  };

  const refreshUserDetails = async () => {
    if (!userPrincipal) throw new Error('User not authenticated');
    try {
      await fetchUserDetails(userPrincipal);
    } catch (error) {
      console.error('Failed to refresh user details:', error);
      throw error;
    }
  };

  // Wallet management
  const initializeWallet = async () => {
    if (!userPrincipal) {
      throw new Error('User not authenticated');
    }

    setWalletState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const walletId = await backendICPService.getOrCreateWallet();
      const walletInfo = await backendICPService.getWalletInfo(walletId);
      const balances = await backendICPService.getWalletBalances(walletId);
      const btcAddress = await backendICPService.getBtcAddress(walletId);

      setWalletState({
        walletId,
        WalletInfo: walletInfo,
        balances,
        btcAddress,
        loading: false,
        error: null,
      });

      toast.success('Wallet initialized successfully!');
    } catch (error) {
      console.error('Failed to initialize wallet:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize wallet';
      setWalletState(prev => ({ ...prev, loading: false, error: errorMessage }));
      toast.error(errorMessage);
      throw error;
    }
  };

  const refreshWalletData = async () => {
    if (!walletState.walletId) {
      await initializeWallet();
      return;
    }

    setWalletState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const [walletInfo, balances] = await Promise.all([
        backendICPService.getWalletInfo(walletState.walletId),
        backendICPService.getWalletBalances(walletState.walletId),
      ]);

      setWalletState(prev => ({
        ...prev,
        WalletInfo: walletInfo,
        balances,
        loading: false,
        error: null,
      }));
    } catch (error) {
      console.error('Failed to refresh wallet data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh wallet data';
      setWalletState(prev => ({ ...prev, loading: false, error: errorMessage }));
      throw error;
    }
  };

  const updateBalance = async (vaultType: string) => {
    if (!walletState.walletId) {
      throw new Error('Wallet not initialized');
    }

    try {
      await backendICPService.updateBalance(walletState.walletId, vaultType);
      await refreshWalletData();
      toast.success(`${vaultType} balance updated successfully!`);
    } catch (error) {
      console.error(`Failed to update ${vaultType} balance:`, error);
      toast.error(`Failed to update ${vaultType} balance`);
      throw error;
    }
  };

  const batchUpdateBalances = async () => {
    if (!walletState.walletId) {
      throw new Error('Wallet not initialized');
    }

    try {
      const balances = await backendICPService.batchUpdateBalances(walletState.walletId);
      setWalletState(prev => ({ ...prev, balances }));
      toast.success('All balances updated successfully!');
    } catch (error) {
      console.error('Failed to batch update balances:', error);
      toast.error('Failed to update balances');
      throw error;
    }
  };

  const transferTokens = async (vaultType: string, amount: bigint, recipient: string) => {
    if (!walletState.walletId) {
      throw new Error('Wallet not initialized');
    }

    try {
      const recipientPrincipal = Principal.fromText(recipient);
      await backendICPService.transferTokens(
        walletState.walletId,
        vaultType,
        amount,
        recipientPrincipal
      );
      await refreshWalletData();
      toast.success('Transfer completed successfully!');
    } catch (error) {
      console.error('Transfer failed:', error);
      toast.error('Transfer failed');
      throw error;
    }
  };

  const value = {
    isAuthenticated: !!userPrincipal,
    userPrincipal,
    userDetails,
    sessionExpiry,
    WalletState: walletState,
    loginWithGoogle,
    loginWithII,
    linkInternetIdentity,
    logout,
    updateEmployeeProfile,
    updateEmployerProfile,
    refreshUserDetails,
    initializeWallet,
    refreshWalletData,
    updateBalance,
    batchUpdateBalances,
    transferTokens,
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