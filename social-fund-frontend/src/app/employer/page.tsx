"use client";

import { useState } from "react";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { Sidebar } from "@/components/Sidebar";
import { LayoutDashboard, Users, Banknote, Scale } from "lucide-react";
import { Contributions } from "./components/Contributions";
import { EmployeeManagement } from "./components/EmployeeManagement";
import { Governance } from "./components/Governance";
import { Overview } from "./components/Overview";
import { logout } from "@/services/icpService";
import router from "next/router";
import { toast } from "sonner";
import { useAuth } from "@nfid/identitykit/react";

export default function EmployerDashboard() {
  const [activeItem, setActiveItem] = useState("overview");
  const { user } = useAuth();
  const principal = user?.principal.toText();

  const sidebarItems = [
    { id: "overview", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: "employees", label: "Employees", icon: <Users className="h-4 w-4" /> },
    { id: "contributions", label: "Contributions", icon: <Banknote className="h-4 w-4" /> },
    { id: "governance", label: "Governance", icon: <Scale className="h-4 w-4" /> },
  ];

  const handleLogout = async () => {
    try {
      if (user?.principal) {
        await logout(principal || "");
        localStorage.removeItem("userDetails");
        router.replace("/");
      }
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Failed to logout");
    }
  };

  return (
    <LayoutWrapper>
      <div className="flex">
        <Sidebar items={sidebarItems} activeItem={activeItem} setActiveItem={setActiveItem} onLogout={handleLogout} />
        <main className="flex-1 p-6 space-y-6">
          {activeItem === "overview" && <Overview />}
          {activeItem === "employees" && <EmployeeManagement />}
          {activeItem === "contributions" && <Contributions />}
          {activeItem === "governance" && <Governance />}
        </main>
      </div>
    </LayoutWrapper>
  );
}

