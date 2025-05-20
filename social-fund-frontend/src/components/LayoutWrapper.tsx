import background from "@/assets/backgroundark.jpg";
import { ReactNode } from "react";
import { RoleSwitcher } from "./RoleSwitcher";

export function LayoutWrapper({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen relative"
      style={{ backgroundImage: `url(${background.src})`, backgroundPosition: "center", backgroundSize: "cover" }}
    >
      <div className="absolute inset-0 bg-background/10 backdrop-blur-sm" />
      <div className="relative z-10">
        <div className="p-4 flex justify-end">
          <RoleSwitcher />
        </div>
        {children}
      </div>
    </div>
  );
}
