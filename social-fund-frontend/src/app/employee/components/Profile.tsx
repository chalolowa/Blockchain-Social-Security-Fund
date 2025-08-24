"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Heart, Save, Shield, User, Users, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Textarea } from "@/components/ui/textarea";

export function Profile() {
    const { 
    userDetails, 
    updateEmployeeProfile, 
    WalletState, 
    initializeWallet,
    refreshWalletData
  } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setSaving] = useState(false);
  
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    address: "",
    role: "",
    position: "",
    department: "",
    salary: 0,
    start_date: "",
    phone: "",
    emergency_contact: "",
  });

  const [nextOfKin, setNextOfKin] = useState({
    name: "",
    relation: "",
    email: "",
    address: "",
    phone_number: "",
  });

  useEffect(() => {
    if (userDetails?.employee_details) {
      setProfileData({
        name: userDetails.employee_details.name || "",
        email: userDetails.employee_details.email || "",
        address: userDetails.employee_details.address || "",
        role: userDetails.employee_details.role || "",
        position: userDetails.employee_details.position || "",
        department: userDetails.employee_details.department || "",
        salary: userDetails.employee_details.salary || 0,
        start_date: userDetails.employee_details.start_date || "",
        phone: "",
        emergency_contact: "",
      });
    }
  }, [userDetails]);

  const handleInputChange = (field: string, value: string | number) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateEmployeeProfile({
        name: profileData.name,
        email: profileData.email,
        address: profileData.address,
        role: profileData.role,
        position: profileData.position,
        department: profileData.department,
        salary: profileData.salary,
        start_date: profileData.start_date,
      });
      
      setIsEditing(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Failed to update employee profile:", error);
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleInitializeWallet = async () => {
    try {
      await initializeWallet();
    } catch (error) {
      console.error("Failed to initialize wallet:", error);
    }
  };

  const handleRefreshWallet = async () => {
    try {
      await refreshWalletData();
      toast.success("Wallet data refreshed!");
    } catch (error) {
      console.error("Failed to refresh wallet:", error);
      toast.error("Failed to refresh wallet data");
    }
  };

  const formatBalance = (balance: number) => {
    return balance.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 8 
    });
  };

  return (
        <div className="space-y-6 animate-fade-in">
      {/* Header Card */}
      <Card className="bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-600 rounded-lg">
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Employee Profile</h1>
                <p className="text-gray-600">Manage your personal and employment information</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-emerald-100 text-emerald-800">
                Employee Account
              </Badge>
              
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)} className="ml-2">
                  <User className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditing(false)}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Personal Information
          </h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Full Name</Label>
              <Input
                value={profileData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                disabled={!isEditing}
                className={!isEditing ? "bg-gray-50" : ""}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Email Address</Label>
              <Input
                value={profileData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                disabled={!isEditing}
                className={!isEditing ? "bg-gray-50" : ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Phone Number</Label>
              <Input
                value={profileData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="Enter phone number"
                disabled={!isEditing}
                className={!isEditing ? "bg-gray-50" : ""}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Emergency Contact</Label>
              <Input
                value={profileData.emergency_contact}
                onChange={(e) => handleInputChange("emergency_contact", e.target.value)}
                placeholder="Enter emergency contact"
                disabled={!isEditing}
                className={!isEditing ? "bg-gray-50" : ""}
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Address</Label>
            <Textarea
              value={profileData.address}
              onChange={(e: { target: { value: string | number; }; }) => handleInputChange("address", e.target.value)}
              disabled={!isEditing}
              className={!isEditing ? "bg-gray-50" : ""}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Employment Information */}
      <Card>
        <CardHeader>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Employment Information
          </h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Position/Title</Label>
              <Input
                value={profileData.position}
                onChange={(e) => handleInputChange("position", e.target.value)}
                disabled={!isEditing}
                className={!isEditing ? "bg-gray-50" : ""}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Department</Label>
              <Input
                value={profileData.department}
                onChange={(e) => handleInputChange("department", e.target.value)}
                disabled={!isEditing}
                className={!isEditing ? "bg-gray-50" : ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Role</Label>
              <Input
                value={profileData.role}
                onChange={(e) => handleInputChange("role", e.target.value)}
                disabled={!isEditing}
                className={!isEditing ? "bg-gray-50" : ""}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Start Date</Label>
              <Input
                type="date"
                value={profileData.start_date}
                onChange={(e) => handleInputChange("start_date", e.target.value)}
                disabled={!isEditing}
                className={!isEditing ? "bg-gray-50" : ""}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wallet Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Wallet className="h-5 w-5 text-purple-600" />
              Digital Wallet
            </h3>
            
            <div className="flex gap-2">
              {!WalletState.walletId ? (
                <Button 
                  onClick={handleInitializeWallet}
                  disabled={WalletState.loading}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {WalletState.loading ? "Initializing..." : "Initialize Wallet"}
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={handleRefreshWallet}
                  disabled={WalletState.loading}
                >
                  Refresh Balances
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {WalletState.walletId ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-blue-700">ICP Balance</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900 mt-1">
                    {WalletState.balances ? formatBalance(WalletState.balances.Icp) : "0.00"} ICP
                  </p>
                </div>
                
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-sm font-medium text-orange-700">Bitcoin Balance</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-900 mt-1">
                    {WalletState.balances ? formatBalance(WalletState.balances.CkBtc) : "0.00"} BTC
                  </p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-700">USDT Balance</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900 mt-1">
                    {WalletState.balances ? formatBalance(WalletState.balances.CkUsdt) : "0.00"} USDT
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Wallet Information</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Wallet ID:</span>
                    <p className="font-mono text-xs break-all">{WalletState.walletId.toText()}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Bitcoin Address:</span>
                    <p className="font-mono text-xs break-all">{WalletState.btcAddress || "Loading..."}</p>
                  </div>
                </div>
              </div>

              {WalletState.WalletInfo && (
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-700">Wallet Statistics</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-purple-600">Total Transactions:</span>
                      <p className="font-semibold">{Number(WalletState.WalletInfo.usage_statistics.total_transactions)}</p>
                    </div>
                    <div>
                      <span className="text-purple-600">Total Volume:</span>
                      <p className="font-semibold">{formatBalance(Number(WalletState.WalletInfo.usage_statistics.total_volume))}</p>
                    </div>
                    <div>
                      <span className="text-purple-600">Created:</span>
                      <p className="font-semibold">
                        {new Date(Number(WalletState.WalletInfo.created_at) / 1000000).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-600 mb-2">No Wallet Initialized</h4>
              <p className="text-gray-500 mb-4">
                Initialize your digital wallet to start managing your crypto assets and retirement savings.
              </p>
            </div>
          )}

          {WalletState.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-sm font-medium text-red-700">Wallet Error</span>
              </div>
              <p className="text-red-600 text-sm mt-1">{WalletState.error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Beneficiary Information */}
      <Card>
        <CardHeader>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Beneficiary Information
          </h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Beneficiary Name"
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
            Save Beneficiary Information
          </Button>
        </CardContent>
      </Card>

      {/* Account Security */}
      <Card className="bg-gray-50">
        <CardHeader>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-gray-600" />
            Account Security
          </h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-2">Authentication Methods</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Google Authentication</span>
                  <Badge variant={userDetails?.google_id ? "default" : "secondary"}>
                    {userDetails?.google_id ? "Connected" : "Not Connected"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Internet Identity</span>
                  <Badge variant={userDetails?.ii_principal ? "default" : "secondary"}>
                    {userDetails?.ii_principal ? "Linked" : "Not Linked"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-2">Wallet Security</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Two-Factor Authentication</span>
                  <Badge variant={WalletState.WalletInfo?.security_settings.two_factor_enabled ? "default" : "secondary"}>
                    {WalletState.WalletInfo?.security_settings.two_factor_enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Transfer Confirmation</span>
                  <Badge variant={WalletState.WalletInfo?.security_settings.requires_confirmation ? "default" : "secondary"}>
                    {WalletState.WalletInfo?.security_settings.requires_confirmation ? "Required" : "Optional"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-800">Security Recommendations</h4>
                <ul className="text-blue-700 text-sm mt-1 space-y-1">
                  {!userDetails?.ii_principal && (
                    <li>• Consider linking your Internet Identity for additional security</li>
                  )}
                  {!WalletState.WalletInfo?.security_settings.two_factor_enabled && (
                    <li>• Enable two-factor authentication for wallet transactions</li>
                  )}
                  <li>• Regularly review your transaction history</li>
                  <li>• Keep your contact information up to date</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
