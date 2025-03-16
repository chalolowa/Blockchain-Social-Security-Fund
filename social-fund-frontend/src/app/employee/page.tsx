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

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        if (!user) {
          router.push('/');
          return;
        }

        // Get stored user details
        const storedDetails = localStorage.getItem('userDetails');
        if (storedDetails) {
          const details = JSON.parse(storedDetails);
          setUserDetails(details);
          
          // Verify authentication with backend
          const isAuth = await isAuthenticated(user.principal.toText());
          if (!isAuth) {
            localStorage.removeItem('userDetails');
            router.push('/');
            return;
          }

          // If authenticated, fetch all necessary data
          await Promise.all([
            fetchFundInfo(),
            fetchTransactions(),
            fetchRewards()
          ]);
        } else {
          router.push('/');
        }
      } catch (error) {
        console.error("Error checking authentication:", error);
        toast.error("Failed to verify authentication");
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [user, router]);

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
      if (user) {
        await logout(user.principal.toText());
        localStorage.removeItem('userDetails');
        router.push('/');
      }
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Failed to logout");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative" style={{
      backgroundImage: `url(${background.src})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    }}>
      <div className="absolute inset-0 bg-background/20" />
      <div className="relative container mx-auto max-w-7xl py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Employee Portal</h1>
          <div className="flex items-center gap-4">
            <Switch 
              checked={isEmployerView}
              onCheckedChange={setIsEmployerView}
            />
            <span className="text-sm">Employer View</span>
          </div>
        </div>

        {/* Balance Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Your Holdings</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>ckBTC Reserve</span>
                  <Badge variant="outline">{fundInfo?.ckbtc_reserve} ckBTC</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Stable Reserve</span>
                  <Badge variant="outline">${fundInfo?.stable_reserve}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Governance Section */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <h3 className="font-semibold">Governance & Rewards</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Button onClick={handleClaimRewards} className="bg-yellow-500 text-white px-4 py-2 rounded">
                  Claim Rewards
                </Button>
                <span>Your Rewards: {rewards}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Input
                  type="number"
                  placeholder="Proposal ID"
                  value={proposalId}
                  onChange={(e) => setProposalId(Number(e.target.value))}
                />
                <Select onValueChange={(value) => setVoteApprove(value === "approve")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Vote" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approve">Approve</SelectItem>
                    <SelectItem value="reject">Reject</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleVote} className="bg-red-500 text-white px-4 py-2 rounded">
                  Submit Vote
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Actions Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* ckBTC Actions */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold">ckBTC Actions</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount (ckBTC)</Label>
                  <Input
                    type="number"
                    value={ckbtcAmount}
                    onChange={(e) => setCkbtcAmount(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Action</Label>
                  <Select onValueChange={(value) => setCkbtcAction(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="withdraw">Withdraw ckBTC</SelectItem>
                      <SelectItem value="borrow">Borrow ckBTC</SelectItem>
                      <SelectItem value="repay">Repay ckBTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleCkbtcAction} className="w-full">
                Confirm ckBTC Action
              </Button>
            </CardContent>
          </Card>

          {/* Stable Reserve Actions */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Stable Reserve Actions</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount (Stable)</Label>
                  <Input
                    type="number"
                    value={stableAmount}
                    onChange={(e) => setStableAmount(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Action</Label>
                  <Select onValueChange={(value) => setStableAction(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apply_loan">Apply for Loan</SelectItem>
                      <SelectItem value="repay_loan">Repay Loan</SelectItem>
                      <SelectItem value="stake">Stake Stable</SelectItem>
                      <SelectItem value="collect_yield">Collect Yield</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleStableAction} className="w-full">
                Confirm Stable Action
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Beneficiary Information */}
        <div className="mb-6">
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Beneficiary Information</h3>
            </CardHeader>
            <CardContent className="space-y-4">
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
                placeholder="Contact Info"
                value={nextOfKin.contact}
                onChange={(e) => setNextOfKin({ ...nextOfKin, contact: e.target.value })}
              />
              <Button onClick={handleAddNextOfKin} className="w-full">
                Save Beneficiary
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ckBTC Transactions */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold">ckBTC Transactions</h3>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ckbtcTransactions.map((tx) => (
                    <TableRow key={tx.tx_id}>
                      <TableCell>{tx.tx_type}</TableCell>
                      <TableCell>{tx.amount}</TableCell>
                      <TableCell>{new Date(tx.timestamp * 1000).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={tx.status === "completed" ? "default" : "secondary"}>
                          {tx.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {/* Stable Reserve Transactions */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Stable Reserve Transactions</h3>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stableTransactions.map((tx) => (
                    <TableRow key={tx.tx_id}>
                      <TableCell>{tx.tx_type}</TableCell>
                      <TableCell>{tx.amount}</TableCell>
                      <TableCell>{new Date(tx.timestamp * 1000).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={tx.status === "completed" ? "default" : "secondary"}>
                          {tx.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
