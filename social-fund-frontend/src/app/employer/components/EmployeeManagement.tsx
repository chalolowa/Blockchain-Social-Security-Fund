"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { toast } from "sonner";

export function EmployeeManagement() {
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    email: "",
    wallet_address: "",
    position: "",
    salary: 0,
  });

  return (
    <Card className="animate-fade-in">
      <CardContent className="space-y-6 p-6">
        <h3 className="text-xl font-semibold">Register New Employee</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Name</Label>
            <Input
              value={newEmployee.name}
              onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              value={newEmployee.email}
              onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
            />
          </div>
          <div>
            <Label>Wallet address</Label>
            <Input
              value={newEmployee.wallet_address}
              onChange={(e) => setNewEmployee({ ...newEmployee, wallet_address: e.target.value })}
            />
          </div>
          <div>
            <Label>Position</Label>
            <Input
              value={newEmployee.position}
              onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
            />
          </div>
          <div>
            <Label>Salary (USD)</Label>
            <Input
              type="number"
              value={newEmployee.salary}
              onChange={(e) => setNewEmployee({ ...newEmployee, salary: Number(e.target.value) })}
            />
          </div>
        </div>
        <Button className="w-full md:w-auto">
          Add Employee
        </Button>

        <h4 className="text-lg font-semibold mt-6">Employee List</h4>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Salary</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
