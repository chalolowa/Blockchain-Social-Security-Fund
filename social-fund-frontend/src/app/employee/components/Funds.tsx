"use client";

import { useState } from "react";
import {
  withdrawFunds,
  borrowCkbtc,
  repayCkbtc,
  applyForLoan,
  repayLoan,
  stakeStableAssets,
  collectYield,
  getFundInfo,
} from "@/services/icpService";

import {
  Card,
  CardHeader,
  CardContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Handshake,
  Banknote,
  FileText,
  Clock,
  LockIcon,
  Coins,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@nfid/identitykit/react";

export function Funds() {
  const [ckbtcAmount, setCkbtcAmount] = useState<number>(0);
  const [ckbtcAction, setCkbtcAction] = useState<string>("");
  const [stableAmount, setStableAmount] = useState<number>(0);
  const [stableAction, setStableAction] = useState<string>("");
  const { user } = useAuth();
  const principal = user?.principal.toText();

  const handleCkbtcAction = async () => {
    try {
      if (!ckbtcAmount || !ckbtcAction) {
        toast("Enter amount and select action");
        return;
      }

      switch (ckbtcAction) {
        case "withdraw":
          await withdrawFunds(ckbtcAmount, principal || "");
          toast.success("ckBTC Withdrawal successful.");
          break;
        case "borrow":
          await borrowCkbtc(ckbtcAmount, principal || "");
          toast.success("ckBTC Borrowing successful.");
          break;
        case "repay":
          await repayCkbtc(ckbtcAmount, principal || "");
          toast.success("ckBTC Repayment successful.");
          break;
        default:
          toast("Invalid ckBTC action selected.");
      }

      await getFundInfo(); // Optional: update any parent state
    } catch (error) {
      console.error("Error in ckBTC action", error);
      toast.error("ckBTC action failed.");
    }
  };

  const handleStableAction = async () => {
    try {
      if (!stableAmount || !stableAction) {
        toast("Enter amount and select action");
        return;
      }

      switch (stableAction) {
        case "apply_loan":
          await applyForLoan(stableAmount, principal || "");
          toast.success("Loan application submitted.");
          break;
        case "repay_loan":
          await repayLoan(stableAmount, principal || "");
          toast.success("Loan repayment complete.");
          break;
        case "stake":
          await stakeStableAssets(stableAmount);
          toast.success("Assets staked successfully.");
          break;
        case "collect_yield":
          await collectYield();
          toast.success("Yield collected.");
          break;
        default:
          toast("Invalid stable reserve action selected.");
      }

      await getFundInfo(); // Optional: update any parent state
    } catch (error) {
      console.error("Error in stable reserve action", error);
      toast.error("Stable reserve action failed.");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
      {/* ckBTC Section */}
      <Card className="p-6 bg-gradient-to-br from-white to-emerald-50">
        <CardHeader className="p-0 mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ArrowDownCircle className="h-5 w-5 text-emerald-600" />
            ckBTC Management
          </h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <Label className="text-sm font-medium">Amount (ckBTC)</Label>
          <Input
            type="number"
            value={ckbtcAmount}
            onChange={(e) => setCkbtcAmount(Number(e.target.value))}
          />
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

      {/* Stable Reserve Section */}
      <Card className="p-6 bg-gradient-to-br from-white to-blue-50">
        <CardHeader className="p-0 mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Banknote className="h-5 w-5 text-blue-600" />
            Stable Reserve Management
          </h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <Label className="text-sm font-medium">Amount (USD)</Label>
          <Input
            type="number"
            value={stableAmount}
            onChange={(e) => setStableAmount(Number(e.target.value))}
          />
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
  );
}
