"use client";

import { Switch } from "@/components/ui/switch";
import { useRouter, usePathname } from "next/navigation";

export function RoleSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const isEmployer = pathname.includes("employer");

  const toggle = () => {
    router.push(isEmployer ? "/employee" : "/employer");
  };

  return (
    <div className="flex items-center gap-2">
        <Switch checked={isEmployer} onCheckedChange={toggle} />
    </div>
  );
}
