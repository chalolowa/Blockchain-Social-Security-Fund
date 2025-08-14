"use client";

import background from "../assets/homecover.jpg";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const router = useRouter();
  const { 
    isAuthenticated, 
    userPrincipal, 
    userDetails,
    sessionStatus,
    sessionExpiry,
    loginWithII, 
    loginWithGoogle,
    linkInternetIdentity,
    loading: authLoading,
    authError
  } = useAuth();
  
  const [showAuthOptions, setShowAuthOptions] = useState(false);
  const [showLinkOptions, setShowLinkOptions] = useState(false);

  // Handle authentication errors
  useEffect(() => {
    if (authError) {
      toast.error(authError);
    }
  }, [authError]);

  // Handle successful authentication
  useEffect(() => {
    if (isAuthenticated && userPrincipal) {
      handlePostAuthentication();
    }
  }, [isAuthenticated, userPrincipal, userDetails]);

  // Show session status warnings
  useEffect(() => {
    if (sessionStatus === 'expiring' && sessionExpiry) {
      const timeLeft = Math.round((sessionExpiry.getTime() - Date.now()) / (1000 * 60));
      toast.warning(`Your session expires in ${timeLeft} minutes`, {
        id: 'session-warning',
        duration: 30000,
      });
    } else if (sessionStatus === 'expired') {
      toast.error('Your session has expired. Please log in again.', {
        id: 'session-expired',
      });
    }
  }, [sessionStatus, sessionExpiry]);

  const handlePostAuthentication = async () => {
    if (!userPrincipal || !userDetails) return;
    
    try {
      // Check if user has linked Internet Identity
      if (userDetails.google_id && !userDetails.ii_principal) {
        setShowLinkOptions(true);
        toast.info('You can optionally link your Internet Identity for additional security');
        return;
      }

      // Route based on user type
      if (userDetails.employee_details) {
        router.replace("/employee");
      } else {
        router.replace("/employer");
      }
    } catch (err) {
      console.error("Post-auth routing error:", err);
      toast.error("Failed to load user profile");
    }
  };

  const handleConnect = () => {
    setShowAuthOptions(true);
  };

  const handleGoogleSuccess = (idToken: string) => {
    loginWithGoogle(idToken);
  };

  const handleGoogleError = (error: string) => {
    toast.error(error);
  };

  const handleLinkIdentity = async () => {
    try {
      await linkInternetIdentity();
      setShowLinkOptions(false);
      toast.success('Internet Identity linked successfully!');
      
      // Continue to routing after linking
      if (userDetails?.employee_details) {
        router.replace("/employee");
      } else {
        router.replace("/employer");
      }
    } catch (error) {
      console.error('Identity linking failed:', error);
      toast.error('Failed to link Internet Identity');
    }
  };

  const handleSkipLinking = () => {
    setShowLinkOptions(false);
    
    // Continue to routing without linking
    if (userDetails?.employee_details) {
      router.replace("/employee");
    } else {
      router.replace("/employer");
    }
  };

  // Session Status Component
  const SessionStatus = () => {
    if (!isAuthenticated || !sessionExpiry) return null;

    const getStatusColor = () => {
      switch (sessionStatus) {
        case 'active': return 'text-green-400';
        case 'expiring': return 'text-yellow-400';
        case 'expired': return 'text-red-400';
        default: return 'text-gray-400';
      }
    };

    const getStatusText = () => {
      if (sessionStatus === 'expired') return 'Session Expired';
      
      const timeLeft = Math.round((sessionExpiry.getTime() - Date.now()) / (1000 * 60));
      return `Session: ${timeLeft}m left`;
    };

    return (
      <div className={`fixed top-4 right-4 px-3 py-1 rounded-full bg-black/50 text-sm ${getStatusColor()}`}>
        {getStatusText()}
      </div>
    );
  };

  // Identity Linking Modal
  const IdentityLinkingModal = () => {
    if (!showLinkOptions) return null;

    return (
      <motion.div 
        className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div 
          className="bg-gray-900 p-8 rounded-2xl max-w-md w-full mx-4"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <h3 className="text-2xl font-bold text-white mb-4">
            Enhanced Security Available
          </h3>
          <p className="text-gray-300 mb-6">
            Link your Internet Identity to add an extra layer of security and enable recovery options.
          </p>
          
          <div className="flex flex-col gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-all"
              onClick={handleLinkIdentity}
              disabled={authLoading}
            >
              {authLoading ? 'Linking...' : 'Link Internet Identity'}
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl font-semibold transition-all"
              onClick={handleSkipLinking}
            >
              Continue Without Linking
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  return (
    <div className="relative w-full min-h-screen flex flex-col items-center justify-center text-white overflow-hidden"
      style={{
        backgroundImage: `url(${background.src})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 to-black/60"></div>
      
      <SessionStatus />
      
      <motion.div 
        className="relative z-10 flex flex-col items-center px-4 py-16 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h1 className="text-5xl md:text-6xl font-bold max-w-3xl leading-tight mb-6">
          Next-Generation Social Security on Blockchain
        </h1>
        
        <p className="text-xl md:text-2xl text-gray-200 max-w-2xl mb-8">
          Secure your future with decentralized retirement savings, employer-matched contributions, 
          and Bitcoin-backed financial flexibility
        </p>

        {/* Authentication Status Display */}
        {isAuthenticated && userPrincipal && (
          <motion.div 
            className="bg-green-900/30 border border-green-500/50 px-6 py-3 rounded-xl mb-6"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <p className="text-green-300 font-semibold">
              ✅ Authenticated as {userPrincipal.toText().slice(0, 15)}...
            </p>
            {userDetails?.google_id && (
              <p className="text-green-400 text-sm">Google Account Connected</p>
            )}
            {userDetails?.ii_principal && (
              <p className="text-blue-400 text-sm">Internet Identity Linked</p>
            )}
          </motion.div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 mt-6 w-full justify-center">
          {!showAuthOptions ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all"
              onClick={handleConnect}
              disabled={authLoading}
            >
              {authLoading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Connecting...
                </div>
              ) : (
                'Get started - it\'s free'
              )}
            </motion.button>
          ) : (
            <motion.div 
              className="flex flex-col gap-4 w-full max-w-md"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-lg font-semibold transition-all flex items-center justify-center"
                onClick={loginWithII}
                disabled={authLoading}
              >
                <div className="bg-white rounded-full p-1 mr-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#3B82F6" strokeWidth="2"/>
                    <path d="M12 6V12L16 14" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                {authLoading ? 'Connecting...' : 'Login with Internet Identity'}
              </motion.button>
              
              <GoogleSignInButton
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                disabled={authLoading}
                loading={authLoading}
              />
              
              <div className="relative my-4">
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-transparent text-gray-300">or</span>
                </div>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-xl text-lg font-semibold transition-all"
                onClick={() => setShowAuthOptions(false)}
              >
                ← Back to Home
              </motion.button>
            </motion.div>
          )}
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-transparent border-2 border-white hover:bg-white/10 px-8 py-4 rounded-xl text-lg font-semibold transition-all"
            onClick={() => router.push("/about")}
          >
            How It Works →
          </motion.button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 w-full max-w-6xl">
          {[
            { title: "APY Returns", value: "4-8%" },
            { title: "Assets Protected", value: "$50M+" },
            { title: "Users", value: "100K+" },
            { title: "Chain Security", value: "ICP Blockchain" },
          ].map((item, index) => (
            <motion.div
              key={index}
              className="bg-white/5 p-6 rounded-xl backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.2 }}
            >
              <div className="text-3xl font-bold text-emerald-400 mb-2">{item.value}</div>
              <div className="text-gray-300 text-sm">{item.title}</div>
            </motion.div>
          ))}
        </div>
        
        {/* Error Display */}
        {authError && (
          <motion.div 
            className="mt-6 p-4 bg-red-900/50 border border-red-500/50 rounded-lg text-red-200 max-w-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="font-medium">Authentication Error:</p>
            <p className="text-sm">{authError}</p>
          </motion.div>
        )}
      </motion.div>

      <IdentityLinkingModal />
    </div>
  );
}
