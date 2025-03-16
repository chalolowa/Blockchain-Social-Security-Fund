"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@nfid/identitykit/react";
import { useRouter } from "next/navigation";
import { getFundInfo, employerMatch, voteOnProposal, checkRewards, redeemRewards, getTransactions, isAuthenticated, logout } from "@/services/icpService";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner";
import background from "../../assets/backgroundark.jpg"

export default function EmployerDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [fundInfo, setFundInfo] = useState<any>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [matchAmount, setMatchAmount] = useState<number>(0);
  const [proposalId, setProposalId] = useState<number>(0);
  const [voteApprove, setVoteApprove] = useState<boolean>(true);
  const [transactionHistory, setTransactionHistory] = useState<any[]>([]);
  const [isEmployerView, setIsEmployerView] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [newEmployee, setNewEmployee] = useState({ name: "", position: "", salary: 0 });
  const [userDetails, setUserDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

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
          
          // Verify authentication and role
          const isAuth = await isAuthenticated(user.principal.toText());
          if (!isAuth || details.role !== 'employer') {
            localStorage.removeItem('userDetails');
            router.push('/');
            return;
          }

          // If authenticated, fetch all necessary data
          await Promise.all([
            fetchFundInfo(),
            fetchTransactions()
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

  const handleMatchContribution = async () => {
    try {
      if (!employeeId || !matchAmount) {
        toast("Please enter employee ID and match amount");
        return;
      }
      await employerMatch(employeeId, matchAmount);
      toast("Contribution matched successfully");
      setEmployeeId("");
      setMatchAmount(0);
      fetchFundInfo();
      fetchTransactions();
    } catch (error) {
      console.error("Error matching contribution", error);
      toast("Failed to match contribution");
    }
  };

  const handleVote = async () => {
    try {
      if (!proposalId) {
        toast("Please select a proposal");
        return;
      }
      await voteOnProposal(proposalId, voteApprove, user?.principal.toText() || "");
      toast("Vote recorded successfully");
      setProposalId(0);
      fetchFundInfo();
    } catch (error) {
      console.error("Error voting on proposal", error);
      toast("Failed to record vote");
    }
  };

  const handleClaimRewards = async () => {
    try {
      const rewardsAvailable = await checkRewards(user?.principal.toText() || "");
      if (!rewardsAvailable) {
        toast("No rewards available to claim");
        return;
      }
      await redeemRewards(user?.principal.toText() || "");
      toast("Rewards claimed successfully");
      fetchFundInfo();
    } catch (error) {
      console.error("Error claiming rewards", error);
      toast("Failed to claim rewards");
    }
  };

  const handleAddEmployee = async () => {
    try {
      if (!newEmployee.name || !newEmployee.position || !newEmployee.salary) {
        toast("Please fill all employee details");
        return;
      }
      // API call to add employee would go here
      setEmployees([...employees, { ...newEmployee, id: employees.length + 1 }]);
      setNewEmployee({ name: "", position: "", salary: 0 }); // Reset form
      toast("Employee added successfully");
    } catch (error) {
      console.error("Error adding employee", error);
      toast("Error adding employee");
    }
  };

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

  const handleViewSwitch = () => {
    if (!isEmployerView) {
      router.push('/employee');
    }
    setIsEmployerView(!isEmployerView);
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
        <div className="absolute inset-0 bg-background/10 backdrop-blur-sm" />
        
        <div className="relative container py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Employer Portal</h1>
            <Button onClick={handleViewSwitch}>
              Switch to {isEmployerView ? 'Employee' : 'Employer'} View
            </Button>
          </div>
  
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Employee Management */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <h3 className="font-semibold">Employee Management</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Input
                    placeholder="Employee Name"
                    value={newEmployee.name}
                    onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
                  />
                  <Input
                    placeholder="Position"
                    value={newEmployee.position}
                    onChange={(e) => setNewEmployee({...newEmployee, position: e.target.value})}
                  />
                  <Input
                    type="number"
                    placeholder="Salary"
                    value={newEmployee.salary}
                    onChange={(e) => setNewEmployee({...newEmployee, salary: Number(e.target.value)})}
                  />
                </div>
                <Button onClick={handleAddEmployee} className="w-full">
                  Add Employee
                </Button>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Salary</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell>{employee.name}</TableCell>
                        <TableCell>{employee.position}</TableCell>
                        <TableCell>${employee.salary}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
  
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold">Organization Stats</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Employees</span>
                  <Badge variant="outline">{employees.length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Monthly Contributions</span>
                  <Badge variant="outline">${fundInfo?.total_contributions}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Pending Matches</span>
                  <Badge variant="outline">${fundInfo?.pending_matches}</Badge>
                </div>
              </CardContent>
            </Card>
  
            {/* Contribution Matching */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold">Contribution Matching</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Employee ID"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Match Amount"
                  value={matchAmount}
                  onChange={(e) => setMatchAmount(Number(e.target.value))}
                />
                <Button onClick={handleMatchContribution} className="w-full">
                  Match Contribution
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  );
}
