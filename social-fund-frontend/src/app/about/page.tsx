"use client";

import { motion } from "framer-motion";
import { CheckCircleIcon, LockClosedIcon, CurrencyDollarIcon, UserGroupIcon } from "@heroicons/react/24/solid";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@nfid/identitykit/react";
import { authenticateWithDetails, getAuthenticatedUser, isAuthenticated, UserDetails } from "@/services/icpService";
import { useEffect, useState } from "react";

export default function About() {
  const router = useRouter();
  const {connect, user} = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      if (!user?.principal) return;

      try {
        const princText = user.principal.toText();
        const authed = await isAuthenticated(princText);

        if (authed) {
          const details = await getAuthenticatedUser(princText) as UserDetails;
          // if employee_details exists => employee dashboard
          if (details?.employee_details) {
            router.replace("/employee");
          } else {
            // no employee record => employer dashboard (onboarding)
            router.replace("/employer");
          }
        } else {
          // never seen before => send to employer onboarding
          router.replace("/employer");
        }
      } catch (err) {
        console.error("Auth check error:", err);
        toast.error("Failed to verify authentication");
      }
    };

    checkUser();
  }, [user, router]);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      // trigger NFID popup if not connected
      if (!user) {
        await connect();
        return;
      }
      // already connected, effect above will run
    } catch (err) {
      console.error("NFID connect failed:", err);
      toast.error("Connection failed. Try again.");
    } finally {
      setIsLoading(false);
    }
  };


  const features = [
    {
      icon: <CurrencyDollarIcon className="w-8 h-8 text-emerald-400" />,
      title: "Smart Contributions",
      description: "Automated salary deductions with 50% in ckBTC and 50% in stable assets for optimal growth and stability"
    },
    {
      icon: <UserGroupIcon className="w-8 h-8 text-emerald-400" />,
      title: "Employer Matching",
      description: "Companies can match contributions up to 15% of salary with enforceable smart contracts"
    },
    {
      icon: <LockClosedIcon className="w-8 h-8 text-emerald-400" />,
      title: "Secure Withdrawals",
      description: "Threshold-protected withdrawals with optional Bitcoin conversion via ckBTC"
    },
    {
      icon: <CheckCircleIcon className="w-8 h-8 text-emerald-400" />,
      title: "Governance & Staking",
      description: "Earn voting rights and rewards by participating in fund governance"
    }
  ];

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-16 text-white">
            Revolutionizing Social Security with Web3
          </h1>

          <div className="grid md:grid-cols-2 gap-12 mb-24">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="bg-white/5 p-8 rounded-2xl backdrop-blur-sm hover:bg-white/10 transition-all"
                whileHover={{ y: -5 }}
              >
                <div className="flex items-start gap-6">
                  <div className="p-3 bg-emerald-400/10 rounded-lg">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-white">{feature.title}</h3>
                    <p className="text-gray-300 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="bg-emerald-500/10 p-8 rounded-2xl border border-emerald-400/30">
            <h2 className="text-3xl font-bold text-white mb-6">Why Choose Us?</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  <span className="text-white">Real-time contribution tracking</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  <span className="text-white">Decentralized Bitcoin lending</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  <span className="text-white">Multi-role account management</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  <span className="text-white">ICP storage-secured beneficiary info</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  <span className="text-white">Smart contract enforcement</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  <span className="text-white">24/7 blockchain transparency</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-16">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all"
              onClick={handleConnect}
            >
              Start Securing Your Future Today
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}