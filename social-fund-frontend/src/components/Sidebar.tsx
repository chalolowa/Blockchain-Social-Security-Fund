// components/Sidebar.tsx
"use client";

import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { 
  User, 
  Wallet, 
  HandCoins, 
  Scale, 
  Users,
  Banknote,
  LayoutDashboard,
  LogOut
} from "lucide-react";
import { useRouter } from "next/navigation";
import { JSX } from "react";

export function Sidebar({ className, items, activeItem, setActiveItem, onLogout }: {
  className?: string;
  items: { id: string; label: string; icon: JSX.Element }[];
  activeItem: string;
  setActiveItem: (item: string) => void;
  onLogout: () => void;
}) {
  return (
    <div className={cn("pb-12", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Navigation
          </h2>
          <div className="space-y-1">
            {items.map((item) => (
              <Button
                key={item.id}
                variant={activeItem === item.id ? "secondary" : "ghost"}
                className="w-full justify-start gap-2"
                onClick={() => setActiveItem(item.id)}
              >
                {item.icon}
                {item.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="px-3 py-2">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2 text-red-500 hover:text-red-600"
            onClick={onLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}