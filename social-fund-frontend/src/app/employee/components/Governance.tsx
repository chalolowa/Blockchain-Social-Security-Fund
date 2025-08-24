"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Scale,
  Vote,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

export function Governance() {
  const [proposalId, setProposalId] = useState<number>(0);
  const [voteApprove, setVoteApprove] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <Card className="animate-fade-in">
      <CardHeader className="border-b">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Scale className="h-6 w-6 text-purple-600" />
          Governance Portal
        </h3>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Proposals (Static for now) */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Active Proposals</h4>
            <div className="space-y-2">
              {[1, 2, 3].map((id) => (
                <div key={id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Proposal #{id}</span>
                    <Badge
                      variant="outline"
                      className="bg-purple-100 text-purple-800"
                    >
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

          {/* Vote Form */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Cast Your Vote</h4>
            <Input
              type="number"
              placeholder="Proposal ID"
              value={proposalId}
              onChange={(e) => setProposalId(Number(e.target.value))}
            />
            <Select
              value={voteApprove !== null ? (voteApprove ? "approve" : "reject") : ""}
              onValueChange={(v) => setVoteApprove(v === "approve")}
            >
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
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              <Vote className="mr-2 h-4 w-4" />
              {loading ? "Submitting..." : "Submit Vote"}
            </Button>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Voting History (Static demo) */}
        <div>
          <h4 className="text-lg font-semibold mb-4">Voting History</h4>
          <div className="space-y-2">
            {[1, 2].map((id) => (
              <div
                key={id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Proposal #{id}</span>
                </div>
                <Badge
                  variant="outline"
                  className="bg-green-100 text-green-800"
                >
                  Approved
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
