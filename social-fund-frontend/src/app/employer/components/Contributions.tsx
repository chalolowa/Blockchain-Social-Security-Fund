"use client";

import { useEffect, useState } from "react";
import { Banknote, Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DialogHeader } from "@/components/ui/dialog";
import { Checkbox } from "@radix-ui/react-checkbox";
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from "@radix-ui/react-dialog";
import { Label } from "@/components/ui/label";

interface Employee {
  principal: string;
  name: string;
  position: string;
  salary: number;
}

export function Contributions() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [matchEnabled, setMatchEnabled] = useState<Record<string, boolean>>({});
  const [amount, setAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState<Employee | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);

  return (
    <Card className="animate-fade-in">
      <CardContent className="space-y-6 p-6">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Banknote className="h-5 w-5" />
          Monthly Contributions + Optional Match
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Amount per Employee (USD)</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>
          <div className="flex items-end">
            <Button
              disabled={loading || selected.length === 0}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? "Processing..." : "Contribute to Selected"}
            </Button>
          </div>
        </div>

        <h4 className="text-lg font-semibold pt-4 border-t">Select Employees</h4>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {employees.map((emp) => (
            <div
              key={emp.principal}
              className="flex items-center justify-between px-4 py-2 border rounded-md"
            >
              <div className="flex items-center gap-4">
                <Checkbox
                  checked={selected.includes(emp.principal)}
                />
                <div>
                  <p className="font-medium">{emp.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {emp.position} — ${emp.salary}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">Match</Label>
                <Checkbox
                  checked={!!matchEnabled[emp.principal]}
                />
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{viewing?.name}'s Details</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p><strong>Position:</strong> {viewing?.position}</p>
                      <p><strong>Salary:</strong> ${viewing?.salary}</p>
                      <p className="text-muted-foreground">Transaction History:</p>
                      <ul className="text-sm list-disc list-inside max-h-40 overflow-y-auto">
                        {transactions.map((t, i) => (
                          <li key={i}>
                            {new Date(Number(t.timestamp) / 1_000_000).toLocaleString()} — ${Number(t.amount)} ({t.type})
                          </li>
                        ))}
                      </ul>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
