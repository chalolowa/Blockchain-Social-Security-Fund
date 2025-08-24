"use client";

import { useState } from "react";
import {
  Card,
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
import { Vote, ThumbsUp, ThumbsDown, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export function Governance() {
  const [proposalId, setProposalId] = useState<number>(0);
  const [voteApprove, setVoteApprove] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <Card className="animate-fade-in">
      <CardContent className="p-6 space-y-6">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Vote className="h-6 w-6 text-purple-600" /> Governance
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <ThumbsUp className="mr-2 h-4 w-4" /> Approve
              </SelectItem>
              <SelectItem value="reject">
                <ThumbsDown className="mr-2 h-4 w-4" /> Reject
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700">
          {loading ? "Submitting..." : "Submit Vote"}
        </Button>

        {/* Static history for now */}
        <div className="pt-6 border-t mt-6 space-y-2">
          {[1, 2].map((id) => (
            <div key={id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Proposal #{id}</span>
              </div>
              <Badge variant="outline" className="bg-green-100 text-green-800">Approved</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
