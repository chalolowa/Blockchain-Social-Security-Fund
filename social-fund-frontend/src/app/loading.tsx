"use client";

import { Skeleton } from "../components/ui/skeleton";
import { motion } from "framer-motion";

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="space-y-8 w-full max-w-md px-4"
      >
        {/* Title / Heading placeholder */}
        <div className="text-center space-y-4">
          <Skeleton className="h-12 w-3/4 mx-auto bg-white/10 animate-pulse rounded-xl" />
          <Skeleton className="h-6 w-full bg-white/10 animate-pulse rounded-lg" />
          <Skeleton className="h-6 w-2/3 mx-auto bg-white/10 animate-pulse rounded-lg" />
        </div>

        {/* Button / Form placeholder */}
        <div className="space-y-3">
          <Skeleton className="h-12 w-full bg-white/10 animate-pulse rounded-xl" />
          <Skeleton className="h-12 w-full bg-white/10 animate-pulse rounded-xl" />
        </div>

        {/* Helper text */}
        <div className="text-center text-sm text-gray-400 animate-pulse">
          Preparing your dashboard…
        </div>
      </motion.div>
    </div>
  );
}
