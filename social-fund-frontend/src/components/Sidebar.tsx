"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRight, LogOut } from "lucide-react";
import { JSX } from "react";
import { Separator } from "./ui/separator";

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
        "h-full w-64 bg-white/95 backdrop-blur-md border-r border-white/20 shadow-xl flex flex-col",
        className
      )}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-200/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">D</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Dashboard</h2>
            <p className="text-sm text-gray-500">Manage your account</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="p-4 space-y-2">
          {items.map((item) => {
            const isActive = activeItem === item.id;
            return (
              <Button
                key={item.id}
                variant="ghost"
                onClick={() => setActiveItem(item.id)}
                className={cn(
                  "w-full justify-start px-4 py-3 h-auto gap-3 text-sm font-medium transition-all duration-200",
                  "hover:bg-gray-100/80 hover:scale-[1.02] hover:shadow-sm",
                  isActive && [
                    "bg-gradient-to-r from-blue-50 to-purple-50",
                    "text-blue-700 shadow-sm border border-blue-200/50",
                    "hover:from-blue-100 hover:to-purple-100",
                  ]
                )}
              >
                <div
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    isActive
                      ? "bg-blue-100 text-blue-600"
                      : "bg-gray-100 text-gray-600"
                  )}
                >
                  {item.icon}
                </div>
                <span className="flex-1 text-left">{item.label}</span>
                {isActive && <ChevronRight className="h-4 w-4 text-blue-500" />}
              </Button>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200/50 bg-gray-50/50">
        <Separator className="mb-4" />
        <Button
          variant="ghost"
          onClick={onLogout}
          className="w-full justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200 py-3"
        >
          <div className="p-2 rounded-lg bg-red-100 text-red-600">
            <LogOut className="h-4 w-4" />
          </div>
          <span className="font-medium">Logout</span>
        </Button>

        {/* Footer info */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-400">Version 2.0.1</p>
        </div>
      </div>
    </aside>
  );
}
