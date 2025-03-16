"use client";

import background from "../assets/homecover.jpg";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@nfid/identitykit/react";
import { toast } from "sonner";
import { useState } from "react";
import { authenticateWithDetails, isAuthenticated } from "@/services/icpService";

export default function Home() {
  const router = useRouter();
  const { connect, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      if (!user) {
        await connect();
      }
      
      // Check if already authenticated with backend
      const isAuthed = await isAuthenticated(user?.principal.toText() || "");
      if (isAuthed) {
          router.push(user?.role === "employer" ? "/employer" : "/employee");
          return;
      }

      // Authenticate with default employee role
      const userDetails = await authenticateWithDetails(
          user?.principal.toText() || "",
          "employee", 
          null,  // No employee details initially
          null   // No employer details
      );
      
      // Store user details
      localStorage.setItem("userDetails", JSON.stringify(userDetails));
      
      // Redirect based on role
      router.push(userDetails.role === "employer" ? "/employer" : "/employee");

    } catch (error) {
      console.error("Failed to connect:", error);
      toast.error("Authentication failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }
  
  return (
    <div className="relative w-full min-h-screen flex flex-col items-center justify-center text-white overflow-hidden"
      style={{
        backgroundImage: `url(${background.src})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 to-black/60"></div>
      
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

        <div className="flex flex-col sm:flex-row gap-4 mt-6 w-full justify-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all"
            onClick={handleConnect}
            disabled={isLoading}
          >
             {isLoading ? (
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
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-transparent border-2 border-white hover:bg-white/10 px-8 py-4 rounded-xl text-lg font-semibold transition-all"
            onClick={() => router.push("/about")}
          >
            How It Works →
          </motion.button>
        </div>

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
      </motion.div>
    </div>
  );
}