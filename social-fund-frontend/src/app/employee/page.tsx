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
import { PieChart, BarChart, User, LayoutDashboard, HandCoins, Scale, Activity, ArrowDownCircle, ArrowUpCircle, Banknote, Bitcoin, CheckCircle2, Clock, Coins, FileText, Gift, Handshake, Save, ThumbsDown, ThumbsUp, Vote, Wallet, LockIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bar, Pie } from "react-chartjs-2";
import { Chart, registerables } from "chart.js";
import { Separator } from "@radix-ui/react-select";
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

const chartOptions = {
  maintainAspectRatio: false,
  plugins: {
    tooltip: {
      callbacks: {
        label: (context: any) => {
          const label = context.label || '';
          const value = context.parsed || 0;
          return `${label}: ${value.toLocaleString()} USD`;
        }
      }
    }
  }
};

// Transaction type icons
const getTransactionIcon = (txType: string) => {
  const type = txType.toLowerCase();
  if (type.includes("withdraw")) return <ArrowUpCircle className="h-4 w-4 text-red-500" />;
  if (type.includes("loan")) return <HandCoins className="h-4 w-4 text-blue-500" />;
  if (type.includes("stake")) return <LockIcon className="h-4 w-4 text-purple-500" />;
  return <ArrowDownCircle className="h-4 w-4 text-green-500" />;
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
        <div className="absolute inset-0 bg-background/10 backdrop-blur-sm" />
      <div className="flex">
        <Sidebar
          className="w-[250px] border-r bg-white/95 backdrop-blur shadow-lg"
          items={sidebarItems}
          activeItem={activeItem}
          setActiveItem={setActiveItem}
          onLogout={handleLogout}
        />
        
        <div className="flex-1 p-8 space-y-6">
          {/* Profile Section */}
          {activeItem === "profile" && (
            <Card className="animate-fade-in">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <User className="h-6 w-6 text-primary" />
                    Profile Information
                  </h3>
                  <Badge variant="outline" className="bg-emerald-100 text-emerald-800">
                    Employee Account
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Full Name</Label>
                    <Input
                      value={userDetails?.employee_details?.name || "Not provided"}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Position</Label>
                    <Input
                      value={userDetails?.employee_details?.position || "Not provided"}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <h4 className="text-lg font-semibold">Beneficiary Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    placeholder="Name"
                    value={nextOfKin.name}
                    onChange={(e) => setNextOfKin({ ...nextOfKin, name: e.target.value })}
                  />
                  <Input
                    placeholder="Relationship"
                    value={nextOfKin.relation}
                    onChange={(e) => setNextOfKin({ ...nextOfKin, relation: e.target.value })}
                  />
                  <Input
                    placeholder="Contact Information"
                    value={nextOfKin.contact}
                    onChange={(e) => setNextOfKin({ ...nextOfKin, contact: e.target.value })}
                  />
                </div>
                <Button onClick={handleAddNextOfKin} className="w-full md:w-auto">
                  <Save className="mr-2 h-4 w-4" />
                  Save Beneficiary
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Overview Section */}
          {activeItem === "overview" && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="p-6 bg-gradient-to-br from-white to-emerald-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Balance</p>
                      <h2 className="text-3xl font-bold mt-2">
                        ${(fundInfo?.ckbtc_reserve + fundInfo?.stable_reserve).toLocaleString()}
                      </h2>
                    </div>
                    <Wallet className="h-8 w-8 text-emerald-600" />
                  </div>
                  <Progress 
                    value={(fundInfo?.ckbtc_reserve / (fundInfo?.ckbtc_reserve + fundInfo?.stable_reserve)) * 100}
                    className="mt-4 h-2 bg-gray-200"
                  />
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
                  <Button 
                    onClick={handleClaimRewards} 
                    className="mt-4 w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Gift className="mr-2 h-4 w-4" />
                    Claim Rewards
                  </Button>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6">
                  <CardHeader className="p-0 mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <PieChart className="h-5 w-5 text-emerald-600" />
                      Asset Distribution
                    </h3>
                  </CardHeader>
                  <CardContent className="h-64">
                    {fundInfo ? (
                      <Pie data={chartData} options={chartOptions} />
                    ) : (
                      <Skeleton className="h-full w-full" />
                    )}
                  </CardContent>
                </Card>

                <Card className="p-6">
                  <CardHeader className="p-0 mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Activity className="h-5 w-5 text-blue-600" />
                      Contribution History
                    </h3>
                  </CardHeader>
                  <CardContent className="h-64">
                    {transactionHistory.length > 0 ? (
                      <Bar 
                        data={{
                          labels: transactionHistory.map(t => 
                            new Date(Number(t.timestamp) * 1000).toLocaleDateString()
                          ),
                          datasets: [{
                            label: 'Contributions',
                            data: transactionHistory.map(t => Number(t.amount)),
                            backgroundColor: '#10B981',
                            borderRadius: 4,
                          }]
                        }}
                        options={chartOptions}
                      />
                    ) : (
                      <Skeleton className="h-full w-full" />
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Funds Management Section */}
          {activeItem === "funds" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
              {/* ckBTC Card */}
              <Card className="p-6 bg-gradient-to-br from-white to-emerald-50">
                <CardHeader className="p-0 mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Bitcoin className="h-5 w-5 text-emerald-600" />
                    ckBTC Management
                  </h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Amount (ckBTC)</Label>
                    <Input
                      type="number"
                      value={ckbtcAmount}
                      onChange={(e) => setCkbtcAmount(Number(e.target.value))}
                      className="bg-white"
                    />
                  </div>
                  <Select onValueChange={setCkbtcAction}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="withdraw">
                        <ArrowUpCircle className="mr-2 h-4 w-4" />
                        Withdraw
                      </SelectItem>
                      <SelectItem value="borrow">
                        <Handshake className="mr-2 h-4 w-4" />
                        Borrow
                      </SelectItem>
                      <SelectItem value="repay">
                        <ArrowDownCircle className="mr-2 h-4 w-4" />
                        Repay
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleCkbtcAction} 
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    Confirm ckBTC Action
                  </Button>
                </CardContent>
              </Card>

              {/* Stable Reserve Card */}
              <Card className="p-6 bg-gradient-to-br from-white to-blue-50">
                <CardHeader className="p-0 mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Banknote className="h-5 w-5 text-blue-600" />
                    Stable Reserve Management
                  </h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Amount (USD)</Label>
                    <Input
                      type="number"
                      value={stableAmount}
                      onChange={(e) => setStableAmount(Number(e.target.value))}
                      className="bg-white"
                    />
                  </div>
                  <Select onValueChange={setStableAction}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apply_loan">
                        <FileText className="mr-2 h-4 w-4" />
                        Apply for Loan
                      </SelectItem>
                      <SelectItem value="repay_loan">
                        <Clock className="mr-2 h-4 w-4" />
                        Repay Loan
                      </SelectItem>
                      <SelectItem value="stake">
                        <LockIcon className="mr-2 h-4 w-4" />
                        Stake Assets
                      </SelectItem>
                      <SelectItem value="collect_yield">
                        <Coins className="mr-2 h-4 w-4" />
                        Collect Yield
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleStableAction} 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Confirm Stable Action
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Governance Section */}
          {activeItem === "governance" && (
            <Card className="animate-fade-in">
              <CardHeader className="border-b">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Scale className="h-6 w-6 text-purple-600" />
                  Governance Portal
                </h3>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold">Active Proposals</h4>
                    <div className="space-y-2">
                      {[1, 2, 3].map((id) => (
                        <div key={id} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Proposal #{id}</span>
                            <Badge variant="outline" className="bg-purple-100 text-purple-800">
                              Voting Open
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-2">
                            Update staking protocol parameters...
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold">Cast Your Vote</h4>
                    <div className="space-y-2">
                      <Input
                        type="number"
                        placeholder="Proposal ID"
                        value={proposalId}
                        onChange={(e) => setProposalId(Number(e.target.value))}
                      />
                      <Select onValueChange={(v) => setVoteApprove(v === "approve")}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vote" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="approve">
                            <ThumbsUp className="mr-2 h-4 w-4" />
                            Approve
                          </SelectItem>
                          <SelectItem value="reject">
                            <ThumbsDown className="mr-2 h-4 w-4" />
                            Reject
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Button 
                        onClick={handleVote} 
                        className="w-full bg-purple-600 hover:bg-purple-700"
                      >
                        <Vote className="mr-2 h-4 w-4" />
                        Submit Vote
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                <div>
                  <h4 className="text-lg font-semibold mb-4">Voting History</h4>
                  <div className="space-y-2">
                    {[1, 2, 3].map((id) => (
                      <div key={id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span>Proposal #{id}</span>
                        </div>
                        <Badge variant="outline" className="bg-green-100 text-green-800">
                          Approved
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
    );
}
