"use client";

import { Switch } from "@/components/ui/switch";
import { Building2, User } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { Badge } from "./ui/badge";

export function RoleSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const isEmployer = pathname.includes("employer");

  const toggle = () => {
    router.push(isEmployer ? "/employee" : "/employer");
  };

  return (
    <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-white/20">
      {/* Employee indicator */}
      <div className={`flex items-center gap-2 transition-opacity ${!isEmployer ? 'opacity-100' : 'opacity-50'}`}>
        <User className="h-4 w-4" />
        <span className="text-sm font-medium hidden sm:inline">Employee</span>
      </div>
      
      {/* Switch */}
      <Switch 
        checked={isEmployer} 
        onCheckedChange={toggle}
        className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-green-600"
      />
      
      {/* Employer indicator */}
      <div className={`flex items-center gap-2 transition-opacity ${isEmployer ? 'opacity-100' : 'opacity-50'}`}>
        <Building2 className="h-4 w-4" />
        <span className="text-sm font-medium hidden sm:inline">Employer</span>
      </div>
      
      {/* Current role badge */}
      <Badge 
        variant={isEmployer ? "default" : "secondary"} 
        className={`ml-2 text-xs ${isEmployer ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}
      >
        {isEmployer ? 'Employer' : 'Employee'}
      </Badge>
    </div>
  );
}
