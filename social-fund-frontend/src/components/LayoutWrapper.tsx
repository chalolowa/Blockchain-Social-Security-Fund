import background from "@/assets/backgroundark.jpg";
import { ReactNode } from "react";
import { RoleSwitcher } from "./RoleSwitcher";

export function LayoutWrapper({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen relative"
      style={{ 
        backgroundImage: `url(${background.src})`, 
        backgroundPosition: "center", 
        backgroundSize: "cover",
        backgroundAttachment: "fixed" 
      }}
    >
      {/* Background overlay with improved gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background/5 via-background/10 to-background/15 backdrop-blur-sm" />
      
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header with role switcher */}
        <header className="flex-shrink-0 p-4 flex justify-between items-center">
          <div className="flex-1" /> {/* Spacer for mobile menu button */}
          <div className="flex-shrink-0">
            <RoleSwitcher />
          </div>
        </header>
        
        {/* Main content area */}
        <div className="flex-1 flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}
