"use client";

import { useState } from "react";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { Sidebar } from "@/components/Sidebar";
import { LayoutDashboard, Users, Banknote, Scale, Menu, X, User } from "lucide-react";
import { Contributions } from "./components/Contributions";
import { EmployeeManagement } from "./components/EmployeeManagement";
import { Governance } from "./components/Governance";
import { Overview } from "./components/Overview";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Profile } from "./components/Profile";

export default function EmployerDashboard() {
  const [activeItem, setActiveItem] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const { logout } = useAuth();

  const sidebarItems = [
    { id: "profile", label: "Profile", icon: <User className="h-4 w-4" /> },
    { id: "overview", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: "employees", label: "Employees", icon: <Users className="h-4 w-4" /> },
    { id: "contributions", label: "Contributions", icon: <Banknote className="h-4 w-4" /> },
    { id: "governance", label: "Governance", icon: <Scale className="h-4 w-4" /> },
  ];

  const handleLogout = async () => {
    try {
        await logout();
        localStorage.removeItem("userDetails");
        router.replace("/");
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Failed to logout");
    }
  };

  const handleItemSelect = (item: string) => {
    setActiveItem(item);
    setSidebarOpen(false); // Close sidebar on mobile after selection
  };

  return (
    <LayoutWrapper>
      <div className="flex h-screen overflow-hidden">
        {/* Mobile Menu Button */}
        <div className="lg:hidden fixed top-4 left-4 z-50">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white/95"
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`
          fixed lg:static inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <Sidebar 
            items={sidebarItems} 
            activeItem={activeItem} 
            setActiveItem={handleItemSelect}
            onLogout={handleLogout}
          />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 lg:p-6 pt-16 lg:pt-6 space-y-6 min-h-full">
            {activeItem === "overview" && <Overview />}
            {activeItem === "employees" && <EmployeeManagement />}
            {activeItem === "contributions" && <Contributions />}
            {activeItem === "governance" && <Governance />}
            {activeItem === "profile" && <Profile />}
          </div>
        </main>
      </div>
    </LayoutWrapper>
  );
}
