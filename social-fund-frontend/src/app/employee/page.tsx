"use client";

import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getFundInfo,
  addNextOfKin,
  withdrawFunds,
  borrowCkbtc,
  repayCkbtc,
  applyForLoan,
  repayLoan,
  voteOnProposal,
  checkRewards,
  redeemRewards,
  stakeStableAssets,
  collectYield,
  getTransactions,
  isAuthenticated,
  logout,
} from "@/services/icpService";
import { useAuth } from "@nfid/identitykit/react";
import { toast } from "sonner";
import background from "../../assets/backgroundark.jpg";
import { Sidebar } from "@/components/Sidebar";
import { PieChart, BarChart, User, LayoutDashboard, HandCoins, Scale } from "lucide-react";
import { Bar, Pie } from "react-chartjs-2";
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [isEmployerView, setIsEmployerView] = useState(false);
  const [fundInfo, setFundInfo] = useState<any>(null);
  const [nextOfKin, setNextOfKin] = useState({ name: "", relation: "", contact: "" });
  const [transactionHistory, setTransactionHistory] = useState<any[]>([]);
  const [rewards, setRewards] = useState<string>("0");
  const [userDetails, setUserDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Separate state for financial actions
  const [ckbtcAmount, setCkbtcAmount] = useState<number>(0);
  const [ckbtcAction, setCkbtcAction] = useState<string>("");
  const [stableAmount, setStableAmount] = useState<number>(0);
  const [stableAction, setStableAction] = useState<string>("");

  // State for governance
  const [proposalId, setProposalId] = useState<number>(0);
  const [voteApprove, setVoteApprove] = useState<boolean>(true);
  const [activeItem, setActiveItem] = useState("overview");

// Sidebar items configuration
const sidebarItems = [
  {
    id: "profile",
    label: "Profile Information",
    icon: <User className="h-4 w-4" />
  },
  {
    id: "overview",
    label: "Overview",
    icon: <LayoutDashboard className="h-4 w-4" />
  },
  {
    id: "funds",
    label: "Funds Management",
    icon: <HandCoins className="h-4 w-4" />
  },
  {
    id: "governance",
    label: "Governance",
    icon: <Scale className="h-4 w-4" />
  }
];

// Chart data configuration
const chartData = {
  labels: ["ckBTC", "Stable Reserve"],
  datasets: [
    {
      label: 'Asset Distribution',
      data: [fundInfo?.ckbtc_reserve || 0, fundInfo?.stable_reserve || 0],
      backgroundColor: ['#10B981', '#3B82F6'],
    },
  ],
};

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        
        // Get stored user details first
        const storedDetails = localStorage.getItem('userDetails');
        if (!storedDetails) {
          router.replace('/');
          return;
        }

        const details = JSON.parse(storedDetails);
        
        // Check if user is connected
        if (!user?.principal) {
          return; // Wait for user to be connected instead of redirecting
        }

        // Verify authentication and role
        const isAuth = await isAuthenticated(user.principal.toText());
        if (!isAuth || details.role !== 'employee') {
          localStorage.removeItem('userDetails');
          router.replace('/');
          return;
        }

        setUserDetails(details);

        // If authenticated, fetch all necessary data
        await Promise.all([
          fetchFundInfo(),
          fetchTransactions(),
          fetchRewards()
        ]);
      } catch (error) {
        console.error("Error checking authentication:", error);
        toast.error("Failed to verify authentication");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [user]);

  async function fetchFundInfo() {
    try {
      const info = await getFundInfo();
      setFundInfo(info);
    } catch (error) {
      console.error("Error fetching fund info", error);
    }
  }

  async function fetchTransactions() {
    try {
      const txs = await getTransactions();
      setTransactionHistory(txs as any[]);
    } catch (error) {
      console.error("Error fetching transactions", error);
    }
  }

  async function fetchRewards() {
    if (!user) {
      console.error("User is not defined");
      return;
    }
    try {
      const rewardsAmount = await checkRewards(user.principal.toText());
      setRewards(String(rewardsAmount));
    } catch (error) {
      console.error("Error fetching rewards", error);
    }
  }

  // Financial actions for ckBTC reserve
  const handleCkbtcAction = async () => {
    try {
      if (ckbtcAction === "withdraw") {
        await withdrawFunds(ckbtcAmount, user?.principal.toText() || "");
        toast("ckBTC Withdrawal successful.");
      } else if (ckbtcAction === "borrow") {
        await borrowCkbtc(ckbtcAmount, user?.principal.toText() || "");
        toast("ckBTC Borrowing successful.");
      } else if (ckbtcAction === "repay") {
        await repayCkbtc(ckbtcAmount, user?.principal.toText() || "");
        toast("ckBTC Repayment successful.");
      } else {
        toast("Please select a valid ckBTC action.");
      }
      fetchFundInfo();
    } catch (error) {
      console.error("Error in ckBTC action", error);
      toast.error("ckBTC action failed.");
    }
  };

  // Financial actions for stable reserve
  const handleStableAction = async () => {
    try {
      if (stableAction === "apply_loan") {
        await applyForLoan(stableAmount, user?.principal.toText() || "");
        toast("Loan application successful.");
      } else if (stableAction === "repay_loan") {
        await repayLoan(stableAmount, user?.principal.toText() || "");
        toast("Loan repayment successful.");
      } else if (stableAction === "stake") {
        await stakeStableAssets(stableAmount);
        toast("Stable assets staked successfully.");
      } else if (stableAction === "collect_yield") {
        await collectYield();
        toast("Yield collected.");
      } else {
        toast("Please select a valid stable reserve action.");
      }
      fetchFundInfo();
    } catch (error) {
      console.error("Error in stable reserve action", error);
      toast("Stable reserve action failed.");
    }
  };

  const handleAddNextOfKin = async () => {
    try {
      await addNextOfKin(nextOfKin, user?.principal.toText() || "");
      toast("Next of kin added.");
    } catch (error) {
      console.error("Error adding next of kin", error);
      toast("Failed to add beneficiary.");
    }
  };

  const handleVote = async () => {
    try {
      await voteOnProposal(proposalId, voteApprove, user?.principal.toText() || "");
      toast("Vote recorded.");
    } catch (error) {
      console.error("Error voting on proposal", error);
      toast("Vote failed.");
    }
  };

  const handleClaimRewards = async () => {
    try {
      await redeemRewards(user?.principal.toText() || "");
      toast("Rewards claimed to wallet.");
      fetchFundInfo();
    } catch (error) {
      console.error("Error claiming rewards", error);
      toast("Claim rewards failed.");
    }
  };

  // Filter transactions based on type
  const ckbtcTransactions = transactionHistory.filter(tx => tx.tx_type.toLowerCase().includes("ckbtc"));
  const stableTransactions = transactionHistory.filter(tx => !tx.tx_type.toLowerCase().includes("ckbtc"));

  const handleLogout = async () => {
    try {
      if (user?.principal) {
        await logout(user.principal.toText());
        localStorage.removeItem('userDetails');
        router.replace('/');
      }
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Failed to logout");
    }
  };


    return (
      <div className="min-h-screen relative" style={{ backgroundImage: `url(${background.src})` }}>
        <div className="absolute inset-0 bg-background/20" />
        <div className="flex">
          <Sidebar
            className="w-[250px] border-r bg-background/95 backdrop-blur"
            items={sidebarItems}
            activeItem={activeItem}
            setActiveItem={setActiveItem}
            onLogout={handleLogout}
          />
          
          <div className="flex-1 p-8">
            {activeItem === "profile" && (
              <Card>
                <CardHeader>
                  <h3 className="font-semibold flex items-center gap-2">
                    <User className="h-5 w-5" /> Profile Information
                  </h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Existing profile form */}
                </CardContent>
              </Card>
            )}
    
            {activeItem === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <h3 className="font-semibold flex items-center gap-2">
                        <PieChart className="h-5 w-5" /> Asset Distribution
                      </h3>
                    </CardHeader>
                    <CardContent>
                      <Pie data={chartData} />
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <h3 className="font-semibold flex items-center gap-2">
                        <BarChart className="h-5 w-5" /> Contribution History
                      </h3>
                    </CardHeader>
                    <CardContent>
                      <Bar 
                        data={{
                          labels: transactionHistory.map(t => new Date(Number(t.timestamp) * 1000).toLocaleDateString()),
                          datasets: [{
                            label: 'Contributions',
                            data: transactionHistory.map(t => Number(t.amount)),
                            backgroundColor: '#10B981',
                          }]
                        }}
                      />
                    </CardContent>
                  </Card>
                </div>
                
                {/* Transaction History Tables */}
              </div>
            )}
    
            {activeItem === "funds" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ckBTC and Stable Reserve Cards */}
              </div>
            )}
    
            {activeItem === "governance" && (
              <Card>
                <CardHeader>
                  <h3 className="font-semibold flex items-center gap-2">
                    <Scale className="h-5 w-5" /> Governance
                  </h3>
                </CardHeader>
                <CardContent>
                  {/* Governance Section */}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
}
