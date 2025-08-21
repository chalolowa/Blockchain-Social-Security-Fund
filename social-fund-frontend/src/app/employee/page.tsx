"use client";

import { useState } from "react";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { Sidebar } from "@/components/Sidebar";
import { Governance } from "./components/Governance";
import { User, LayoutDashboard, HandCoins, Scale } from "lucide-react";
import { Funds } from "./components/Funds";
import { Overview } from "./components/Overview";
import { Profile } from "./components/Profile";
import router from "next/router";
import { toast } from "sonner";

export default function EmployeeDashboard() {
  const [activeItem, setActiveItem] = useState("overview");

  const sidebarItems = [
    { id: "profile", label: "Profile", icon: <User className="h-4 w-4" /> },
    { id: "overview", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: "funds", label: "Funds", icon: <HandCoins className="h-4 w-4" /> },
    { id: "governance", label: "Governance", icon: <Scale className="h-4 w-4" /> },
  ];

  const handleLogout = async () => {
    try {
      localStorage.removeItem("userDetails");
      router.replace("/");
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
          {activeItem === "profile" && <Profile />}
          {activeItem === "funds" && <Funds />}
          {activeItem === "governance" && <Governance />}
        </main>
      </div>
    </LayoutWrapper>
  );
}
