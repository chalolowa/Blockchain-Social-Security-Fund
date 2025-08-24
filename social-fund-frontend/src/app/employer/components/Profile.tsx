"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { Briefcase, Building, Calendar, Mail, Save, Shield, TrendingUp, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const INDUSTRIES = [
  "Technology",
  "Healthcare",
  "Finance",
  "Education",
  "Manufacturing",
  "Retail",
  "Construction",
  "Transportation",
  "Energy",
  "Agriculture",
  "Entertainment",
  "Government",
  "Non-profit",
  "Other"
];

const EMPLOYEE_RANGES = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1000+"
];

export function EmployerProfile() {
  const { userDetails, updateEmployerProfile, refreshUserDetails, loading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    company_name: "",
    company_id: "",
    email: "",
    address: "",
    industry: "",
    employee_count: 0,
    contact_person: "",
    phone: "",
    website: "",
    description: "",
    founded_year: "",
    headquarters: "",
    tax_id: "",
  });

  useEffect(() => {
    if (userDetails?.employer_details) {
      setFormData({
        company_name: userDetails.employer_details.company_name || "",
        company_id: userDetails.employer_details.company_id || "",
        email: userDetails.employer_details.email || "",
        address: userDetails.employer_details.address || "",
        industry: userDetails.employer_details.industry || "",
        employee_count: userDetails.employer_details.employee_count || 0,
        contact_person: userDetails.employer_details.contact_person || "",
        phone: "",
        website: "",
        description: "",
        founded_year: "",
        headquarters: "",
        tax_id: "",
      });
    }
  }, [userDetails]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateEmployerProfile({
        company_name: formData.company_name,
        company_id: formData.company_id,
        email: formData.email,
        address: formData.address,
        industry: formData.industry,
        employee_count: formData.employee_count,
        contact_person: formData.contact_person,
      });
      
      setIsEditing(false);
      toast.success("Company profile updated successfully!");
    } catch (error) {
      console.error("Failed to update employer profile:", error);
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (userDetails?.employer_details) {
      setFormData({
        company_name: userDetails.employer_details.company_name || "",
        company_id: userDetails.employer_details.company_id || "",
        email: userDetails.employer_details.email || "",
        address: userDetails.employer_details.address || "",
        industry: userDetails.employer_details.industry || "",
        employee_count: userDetails.employer_details.employee_count || 0,
        contact_person: userDetails.employer_details.contact_person || "",
        phone: "",
        website: "",
        description: "",
        founded_year: "",
        headquarters: "",
        tax_id: "",
      });
    }
    setIsEditing(false);
  };

  const isProfileComplete = () => {
    return formData.company_name && 
           formData.email && 
           formData.industry && 
           formData.contact_person &&
           formData.address;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600 rounded-lg">
                <Building className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Company Profile</h1>
                <p className="text-gray-600">Manage your organization's information</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge 
                variant={isProfileComplete() ? "default" : "secondary"}
                className={isProfileComplete() ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}
              >
                {isProfileComplete() ? "✓ Complete" : "⚠ Incomplete"}
              </Badge>
              
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)} className="ml-2">
                  <Briefcase className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleCancel}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSave}
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

      {/* Company Information */}
      <Card>
        <CardHeader>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Building className="h-5 w-5 text-blue-600" />
            Company Information
          </h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Company Name *</Label>
              <Input
                value={formData.company_name}
                onChange={(e) => handleInputChange("company_name", e.target.value)}
                placeholder="Enter company name"
                disabled={!isEditing}
                className={!isEditing ? "bg-gray-50" : ""}
              />
            </div>
            
            <div>
              <Label className="text-sm font-medium">Company ID/Registration</Label>
              <Input
                value={formData.company_id}
                onChange={(e) => handleInputChange("company_id", e.target.value)}
                placeholder="Enter company registration number"
                disabled={!isEditing}
                className={!isEditing ? "bg-gray-50" : ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Industry *</Label>
              <Select 
                value={formData.industry} 
                onValueChange={(value) => handleInputChange("industry", value)}
                disabled={!isEditing}
              >
                <SelectTrigger className={!isEditing ? "bg-gray-50" : ""}>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((industry) => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Employee Count</Label>
              <Select 
                value={formData.employee_count.toString()} 
                onValueChange={(value) => handleInputChange("employee_count", parseInt(value))}
                disabled={!isEditing}
              >
                <SelectTrigger className={!isEditing ? "bg-gray-50" : ""}>
                  <SelectValue placeholder="Select employee range" />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYEE_RANGES.map((range, index) => (
                    <SelectItem key={range} value={index.toString()}>
                      {range}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Company Address *</Label>
            <Textarea
              value={formData.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
              placeholder="Enter complete company address"
              disabled={!isEditing}
              className={!isEditing ? "bg-gray-50" : ""}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Mail className="h-5 w-5 text-green-600" />
            Contact Information
          </h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Primary Contact Person *</Label>
              <Input
                value={formData.contact_person}
                onChange={(e) => handleInputChange("contact_person", e.target.value)}
                placeholder="Enter contact person name"
                disabled={!isEditing}
                className={!isEditing ? "bg-gray-50" : ""}
              />
            </div>
            
            <div>
              <Label className="text-sm font-medium">Email Address *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="Enter email address"
                disabled={!isEditing}
                className={!isEditing ? "bg-gray-50" : ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Phone Number</Label>
              <Input
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="Enter phone number"
                disabled={!isEditing}
                className={!isEditing ? "bg-gray-50" : ""}
              />
            </div>
            
            <div>
              <Label className="text-sm font-medium">Website</Label>
              <Input
                value={formData.website}
                onChange={(e) => handleInputChange("website", e.target.value)}
                placeholder="Enter website URL"
                disabled={!isEditing}
                className={!isEditing ? "bg-gray-50" : ""}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            Additional Information
          </h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Founded Year</Label>
              <Input
                value={formData.founded_year}
                onChange={(e) => handleInputChange("founded_year", e.target.value)}
                placeholder="Enter founding year"
                disabled={!isEditing}
                className={!isEditing ? "bg-gray-50" : ""}
              />
            </div>
            
            <div>
              <Label className="text-sm font-medium">Tax ID</Label>
              <Input
                value={formData.tax_id}
                onChange={(e) => handleInputChange("tax_id", e.target.value)}
                placeholder="Enter tax identification number"
                disabled={!isEditing}
                className={!isEditing ? "bg-gray-50" : ""}
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Company Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Brief description of your company and services"
              disabled={!isEditing}
              className={!isEditing ? "bg-gray-50" : ""}
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Account Status */}
      <Card className="bg-gray-50">
        <CardHeader>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-gray-600" />
            Account Status
          </h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Registration Date</span>
              </div>
              <p className="text-lg font-semibold mt-1">
                {userDetails?.employer_details?.registration_date 
                  ? new Date(userDetails.employer_details.registration_date).toLocaleDateString()
                  : 'Not available'
                }
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-gray-700">Employee Range</span>
              </div>
              <p className="text-lg font-semibold mt-1">
                {formData.employee_count >= 0 && formData.employee_count < EMPLOYEE_RANGES.length
                  ? EMPLOYEE_RANGES[formData.employee_count]
                  : 'Not specified'
                }
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">Verification Status</span>
              </div>
              <p className="text-lg font-semibold mt-1 text-yellow-600">
                Pending Verification
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Completion Help */}
      {!isProfileComplete() && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-yellow-100 rounded-full">
                <Shield className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <h4 className="font-semibold text-yellow-800">Complete Your Profile</h4>
                <p className="text-yellow-700 text-sm mt-1">
                  Please complete all required fields (*) to enable full functionality of your employer account.
                  A complete profile helps employees find and trust your organization.
                </p>
                <ul className="text-yellow-700 text-sm mt-2 space-y-1">
                  {!formData.company_name && <li>• Company name is required</li>}
                  {!formData.email && <li>• Email address is required</li>}
                  {!formData.industry && <li>• Industry selection is required</li>}
                  {!formData.contact_person && <li>• Contact person is required</li>}
                  {!formData.address && <li>• Company address is required</li>}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}