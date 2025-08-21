"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@nfid/identitykit/react";

export function Profile() {
  const [userDetails, setUserDetails] = useState<any>(null);
  const { user } = useAuth()
  const principal = user?.principal?.toText();
  const [nextOfKin, setNextOfKin] = useState({
    name: "",
    relation: "",
    email: "",
    address: "",
    phone_number: "",
  });

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <User className="h-6 w-6 text-primary" />
            Profile Information
          </h3>
          <Badge variant="outline" className="bg-emerald-100 text-emerald-800">
            Employee Account
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Full Name</Label>
            <Input
              value={userDetails?.employee_details?.name || ""}
              readOnly
              className="bg-gray-50"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Position</Label>
            <Input
              value={userDetails?.employee_details?.position || ""}
              readOnly
              className="bg-gray-50"
            />
          </div>
        </div>

        <Separator className="my-4" />

        <h4 className="text-lg font-semibold">Beneficiary Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            placeholder="Name"
            value={nextOfKin.name}
            onChange={(e) =>
              setNextOfKin({ ...nextOfKin, name: e.target.value })
            }
          />
          <Input
            placeholder="Relationship"
            value={nextOfKin.relation}
            onChange={(e) =>
              setNextOfKin({ ...nextOfKin, relation: e.target.value })
            }
          />
          <Input
            placeholder="Email"
            value={nextOfKin.email}
            onChange={(e) =>
              setNextOfKin({ ...nextOfKin, email: e.target.value })
            }
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            placeholder="Phone Number"
            value={nextOfKin.phone_number}
            onChange={(e) =>
              setNextOfKin({ ...nextOfKin, phone_number: e.target.value })
            }
          />
          <Input
            placeholder="Address"
            value={nextOfKin.address}
            onChange={(e) =>
              setNextOfKin({ ...nextOfKin, address: e.target.value })
            }
          />
        </div>

        <Button className="w-full md:w-auto">
          <Save className="mr-2 h-4 w-4" />
          Save Beneficiary
        </Button>
      </CardContent>
    </Card>
  );
}
