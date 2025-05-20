"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LogOut } from "lucide-react";
import { JSX } from "react";

type SidebarItem = {
  id: string;
  label: string;
  icon: JSX.Element;
};

interface SidebarProps {
  className?: string;
  items: SidebarItem[];
  activeItem: string;
  setActiveItem: (item: string) => void;
  onLogout: () => void;
}

export function Sidebar({
  className,
  items,
  activeItem,
  setActiveItem,
  onLogout,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "h-screen w-[250px] bg-white/90 border-r backdrop-blur-sm shadow-sm flex flex-col",
        className
      )}
    >
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-800">Dashboard</h2>
      </div>

      <ScrollArea className="flex-1">
        <nav className="px-2 py-4 space-y-1">
          {items.map((item) => (
            <Button
              key={item.id}
              variant={activeItem === item.id ? "secondary" : "ghost"}
              onClick={() => setActiveItem(item.id)}
              className={cn(
                "w-full justify-start px-4 py-2 gap-2 text-sm font-medium transition-colors",
                activeItem === item.id
                  ? "bg-muted text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.icon}
              {item.label}
            </Button>
          ))}
        </nav>
      </ScrollArea>

      <div className="p-4 border-t">
        <Button
          variant="ghost"
          onClick={onLogout}
          className="w-full justify-start gap-2 text-red-600 hover:text-red-700 text-sm"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
