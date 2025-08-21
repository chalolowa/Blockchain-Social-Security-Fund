"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Wallet } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export function Overview() {
  const [fundInfo, setFundInfo] = useState<any>(null);

  const total = (fundInfo?.ckbtc_reserve || 0) + (fundInfo?.stable_reserve || 0);
  const ckbtcPercent = total > 0 ? (fundInfo.ckbtc_reserve / total) * 100 : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
      <Card className="p-6 bg-gradient-to-br from-white to-emerald-50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Total Balance</p>
            <h2 className="text-3xl font-bold mt-2">${total.toLocaleString()}</h2>
          </div>
          <Wallet className="h-8 w-8 text-emerald-600" />
        </div>
        <Progress value={ckbtcPercent} className="mt-4 h-2 bg-gray-200" />
        <div className="flex justify-between text-sm mt-2">
          <span className="text-emerald-600">ckBTC: ${fundInfo?.ckbtc_reserve.toLocaleString()}</span>
          <span className="text-blue-600">Stable: ${fundInfo?.stable_reserve.toLocaleString()}</span>
        </div>
      </Card>
    </div>
  );
}

