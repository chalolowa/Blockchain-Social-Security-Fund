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
import { Sidebar } from "@/components/Sidebar";
import { Banknote, LayoutDashboard, Scale, Users } from "lucide-react";

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
  const [activeItem, setActiveItem] = useState("overview");

// Sidebar items configuration
const sidebarItems = [
  {
    id: "overview",
    label: "Overview",
    icon: <LayoutDashboard className="h-4 w-4" />
  },
  {
    id: "governance",
    label: "Governance",
    icon: <Scale className="h-4 w-4" />
  },
  {
    id: "employees",
    label: "Employee Management",
    icon: <Users className="h-4 w-4" />
  },
  {
    id: "contributions",
    label: "Funds Management",
    icon: <Banknote className="h-4 w-4" />
  }
];

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
          return; 
        }

        // Verify authentication and role
        const isAuth = await isAuthenticated(user.principal.toText());
        if (!isAuth || details.role !== 'employer') {
          localStorage.removeItem('userDetails');
          router.replace('/');
          return;
        }

        setUserDetails(details);

        // If authenticated, fetch all necessary data
        await Promise.all([
          fetchFundInfo(),
          fetchTransactions()
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

  const handleViewSwitch = () => {
    if (!isEmployerView) {
      router.push('/employee');
    }
    setIsEmployerView(!isEmployerView);
  };

  return (
    <div className="min-h-screen relative" style={{ backgroundImage: `url(${background.src})` }}>
      <div className="absolute inset-0 bg-background/10 backdrop-blur-sm" />
      <div className="flex">
        <Sidebar
          className="w-[250px] border-r bg-background/95 backdrop-blur"
          items={sidebarItems}
          activeItem={activeItem}
          setActiveItem={setActiveItem}
          onLogout={handleLogout}
        />
        
        <div className="flex-1 p-8">
          {activeItem === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Organization Stats Cards */}
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
  
          {activeItem === "employees" && (
            <Card>
              <CardHeader>
                <h3 className="font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5" /> Employee Management
                </h3>
              </CardHeader>
              <CardContent>
                {/* Employee Management Form and Table */}
              </CardContent>
            </Card>
          )}
  
          {activeItem === "contributions" && (
            <Card>
              <CardHeader>
                <h3 className="font-semibold flex items-center gap-2">
                  <Banknote className="h-5 w-5" /> Contribution Matching
                </h3>
              </CardHeader>
              <CardContent>
                {/* Contribution Matching Form */}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
