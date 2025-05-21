"use client";

import { useEffect, useState } from "react";
import { getFundInfo, checkRewards, getTransactions, redeemRewards } from "@/services/icpService";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Wallet, Gift, PieChart, Activity } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Pie, Bar } from "react-chartjs-2";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@nfid/identitykit/react";

export function Overview() {
  const [fundInfo, setFundInfo] = useState<any>(null);
  const [rewards, setRewards] = useState<string>("0");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const principal = user?.principal.toText();

  useEffect(() => {
    async function fetchData() {
      try {
        const [fundData, rewardAmt, txHistory] = await Promise.all([
          getFundInfo(),
          checkRewards(principal),
          getTransactions(),
        ]);
        setFundInfo(fundData);
        setRewards(String(rewardAmt));
        setTransactions(txHistory as any[]);
      } catch (error) {
        console.error("Failed to load dashboard data", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleClaimRewards = async () => {
    try {
      await redeemRewards(user.principal);
      toast.success("Rewards claimed successfully");
      const rewardAmt = await checkRewards(user.principal);
      setRewards(String(rewardAmt));
    } catch (error) {
      toast.error("Failed to claim rewards");
    }
  };

  const total =
    (fundInfo?.ckbtc_reserve || 0) + (fundInfo?.stable_reserve || 0);
  const ckbtcPercent = total > 0 ? (fundInfo.ckbtc_reserve / total) * 100 : 0;

  const chartData = {
    labels: ["ckBTC", "Stable Reserve"],
    datasets: [
      {
        label: "Asset Distribution",
        data: [fundInfo?.ckbtc_reserve || 0, fundInfo?.stable_reserve || 0],
        backgroundColor: ["#10B981", "#3B82F6"],
      },
    ],
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-br from-white to-emerald-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Balance</p>
              <h2 className="text-3xl font-bold mt-2">
                ${total.toLocaleString()}
              </h2>
            </div>
            <Wallet className="h-8 w-8 text-emerald-600" />
          </div>
          <Progress value={ckbtcPercent} className="mt-4 h-2 bg-gray-200" />
          <div className="flex justify-between text-sm mt-2">
            <span className="text-emerald-600">
              ckBTC: ${fundInfo?.ckbtc_reserve.toLocaleString()}
            </span>
            <span className="text-blue-600">
              Stable: ${fundInfo?.stable_reserve.toLocaleString()}
            </span>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-white to-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Governance Power</p>
              <h2 className="text-3xl font-bold mt-2">{rewards} Votes</h2>
            </div>
            <Badge className="bg-blue-100 text-blue-800 px-3 py-1">
              Tier 2 Member
            </Badge>
          </div>
          <button
            onClick={handleClaimRewards}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
          >
            <Gift className="mr-2 inline h-4 w-4" />
            Claim Rewards
          </button>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <CardHeader className="p-0 mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <PieChart className="h-5 w-5 text-emerald-600" /> Asset Distribution
            </h3>
          </CardHeader>
          <CardContent className="h-64">
            {fundInfo ? (
              <Pie data={chartData} />
            ) : (
              <Skeleton className="h-full w-full" />
            )}
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardHeader className="p-0 mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" /> Contribution History
            </h3>
          </CardHeader>
          <CardContent className="h-64">
            {transactions.length > 0 ? (
              <Bar
                data={{
                  labels: transactions.map((t) =>
                    new Date(Number(t.timestamp) * 1000).toLocaleDateString()
                  ),
                  datasets: [
                    {
                      label: "Contributions",
                      data: transactions.map((t) => Number(t.amount)),
                      backgroundColor: "#10B981",
                      borderRadius: 4,
                    },
                  ],
                }}
              />
            ) : (
              <Skeleton className="h-full w-full" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
