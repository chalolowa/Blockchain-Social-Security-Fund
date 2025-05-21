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
import { addEmployee, getAllEmployees } from "@/services/icpService";
import { useAuth } from "@nfid/identitykit/react";

export function EmployeeManagement() {
  const { user } = useAuth();
  const principal = user?.principal.toText();
  const [employees, setEmployees] = useState<any[]>([]);
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    email: "",
    wallet_address: "",
    position: "",
    salary: 0,
  });

  useEffect(() => {
    fetchEmployees();
  }, [user])

  const handleAddEmployee = async () => {
    if (!newEmployee.name || !newEmployee.position || !newEmployee.salary) {
      toast.error("Please fill all employee details");
      return;
    }
    try {
      await addEmployee(principal, newEmployee);
      toast.success("Employee added");
      setNewEmployee({ name: "", email: "", wallet_address: "", position: "", salary: 0 });
      // refresh list
      const list = await getAllEmployees();
      setEmployees(list);
    } catch (err) {
      console.error(err);
      toast.error("Failed to add employee");
    }
  };

  const fetchEmployees = async () => {
    try {
      const employeesList = await getAllEmployees();
      setEmployees(employeesList as any[]);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to load employees");
    }
  };

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
        <Button onClick={handleAddEmployee} className="w-full md:w-auto">
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
            {employees.map((emp, idx) => (
              <TableRow key={idx}>
                <TableCell>{emp.id}</TableCell>
                <TableCell>{emp.name}</TableCell>
                <TableCell>{emp.email}</TableCell>
                <TableCell>{emp.position}</TableCell>
                <TableCell>${emp.salary}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
