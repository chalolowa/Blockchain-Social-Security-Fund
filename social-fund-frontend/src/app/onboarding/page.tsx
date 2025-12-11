"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, User, ArrowRight } from "lucide-react";

type UserRole = "employee" | "employer" | null;

export default function Onboarding() {
  const router = useRouter();
  const { updateEmployeeProfile, updateEmployerProfile, loading } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>(null);
  const [submitting, setSubmitting] = useState(false);

  // Employee form state
  const [employeeData, setEmployeeData] = useState({
    name: "",
    email: "",
    address: "",
    position: "",
    department: "",
    role: "",
    salary: "",
    start_date: "",
  });

  // Employer form state
  const [employerData, setEmployerData] = useState({
    company_name: "",
    company_id: "",
    email: "",
    address: "",
    industry: "",
    employee_count: "",
    registration_date: "",
    contact_person: "",
  });

  const handleSubmitEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Convert string dates to timestamps (nanoseconds)
      const startDateTimestamp = employeeData.start_date 
        ? BigInt(new Date(employeeData.start_date).getTime() * 1_000_000)
        : BigInt(Date.now() * 1_000_000);

      await updateEmployeeProfile({
        name: employeeData.name || null,
        email: employeeData.email || null,
        address: employeeData.address || null,
        position: employeeData.position || null,
        department: employeeData.department || null,
        role: employeeData.role || null,
        salary: employeeData.salary ? Number(employeeData.salary) : 0,
        start_date: startDateTimestamp.toString(),
      });

      toast.success("Employee profile created successfully!");
      router.replace("/employee");
    } catch (error) {
      console.error("Failed to create employee profile:", error);
      toast.error("Failed to create profile. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitEmployer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Convert string dates to timestamps (nanoseconds)
      const registrationTimestamp = employerData.registration_date
        ? BigInt(new Date(employerData.registration_date).getTime() * 1_000_000)
        : BigInt(Date.now() * 1_000_000);

      await updateEmployerProfile({
        company_name: employerData.company_name || null,
        company_id: employerData.company_id || null,
        email: employerData.email || null,
        address: employerData.address || null,
        industry: employerData.industry || null,
        employee_count: employerData.employee_count ? Number(employerData.employee_count) : 0,
        registration_date: registrationTimestamp.toString(),
        contact_person: employerData.contact_person || null,
      });

      toast.success("Employer profile created successfully!");
      router.replace("/employer");
    } catch (error) {
      console.error("Failed to create employer profile:", error);
      toast.error("Failed to create profile. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!selectedRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl w-full"
        >
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Welcome to Social Security Fund</h1>
            <p className="text-gray-300 text-lg">Let's set up your profile</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Employee Card */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedRole("employee")}
              className="cursor-pointer"
            >
              <Card className="border-2 border-transparent hover:border-blue-500 transition-all bg-gray-800 text-white h-full">
                <CardHeader>
                  <div className="flex items-center justify-center mb-4">
                    <div className="bg-blue-600 p-4 rounded-full">
                      <User className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-center text-2xl">I'm an Employee</CardTitle>
                  <CardDescription className="text-center text-gray-400">
                    Set up your employee profile to start contributing to your retirement fund
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li>✓ Track your contributions</li>
                    <li>✓ View employer matching</li>
                    <li>✓ Access loans against your fund</li>
                    <li>✓ Participate in governance</li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            {/* Employer Card */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedRole("employer")}
              className="cursor-pointer"
            >
              <Card className="border-2 border-transparent hover:border-emerald-500 transition-all bg-gray-800 text-white h-full">
                <CardHeader>
                  <div className="flex items-center justify-center mb-4">
                    <div className="bg-emerald-600 p-4 rounded-full">
                      <Briefcase className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-center text-2xl">I'm an Employer</CardTitle>
                  <CardDescription className="text-center text-gray-400">
                    Manage employee contributions and matching programs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li>✓ Manage employee accounts</li>
                    <li>✓ Set up contribution matching</li>
                    <li>✓ View company analytics</li>
                    <li>✓ Bulk operations support</li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Employee Form
  if (selectedRole === "employee") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-2xl w-full"
        >
          <Card className="bg-gray-800 text-white border-gray-700">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-blue-600 p-2 rounded-full">
                  <User className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-2xl">Employee Profile</CardTitle>
              </div>
              <CardDescription className="text-gray-400">
                Complete your profile to access your social security fund
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitEmployee} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={employeeData.name}
                      onChange={(e) => setEmployeeData({ ...employeeData, name: e.target.value })}
                      required
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={employeeData.email}
                      onChange={(e) => setEmployeeData({ ...employeeData, email: e.target.value })}
                      required
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="john@company.com"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={employeeData.address}
                    onChange={(e) => setEmployeeData({ ...employeeData, address: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="123 Main St, City, Country"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="position">Position</Label>
                    <Input
                      id="position"
                      value={employeeData.position}
                      onChange={(e) => setEmployeeData({ ...employeeData, position: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="Software Engineer"
                    />
                  </div>
                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={employeeData.department}
                      onChange={(e) => setEmployeeData({ ...employeeData, department: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="Engineering"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="role">Role Level</Label>
                    <Input
                      id="role"
                      value={employeeData.role}
                      onChange={(e) => setEmployeeData({ ...employeeData, role: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="Senior, Mid-level, etc."
                    />
                  </div>
                  <div>
                    <Label htmlFor="salary">Annual Salary (USD)</Label>
                    <Input
                      id="salary"
                      type="number"
                      value={employeeData.salary}
                      onChange={(e) => setEmployeeData({ ...employeeData, salary: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="50000"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={employeeData.start_date}
                    onChange={(e) => setEmployeeData({ ...employeeData, start_date: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedRole(null)}
                    disabled={submitting}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting || loading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {submitting ? "Creating Profile..." : "Complete Setup"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Employer Form
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="max-w-2xl w-full"
      >
        <Card className="bg-gray-800 text-white border-gray-700">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-emerald-600 p-2 rounded-full">
                <Briefcase className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-2xl">Employer Profile</CardTitle>
            </div>
            <CardDescription className="text-gray-400">
              Set up your company profile to manage employee contributions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitEmployer} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company_name">Company Name *</Label>
                  <Input
                    id="company_name"
                    value={employerData.company_name}
                    onChange={(e) => setEmployerData({ ...employerData, company_name: e.target.value })}
                    required
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Acme Corporation"
                  />
                </div>
                <div>
                  <Label htmlFor="company_id">Company ID/Tax ID</Label>
                  <Input
                    id="company_id"
                    value={employerData.company_id}
                    onChange={(e) => setEmployerData({ ...employerData, company_id: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="12-3456789"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Company Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={employerData.email}
                  onChange={(e) => setEmployerData({ ...employerData, email: e.target.value })}
                  required
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="hr@company.com"
                />
              </div>

              <div>
                <Label htmlFor="address">Company Address</Label>
                <Input
                  id="address"
                  value={employerData.address}
                  onChange={(e) => setEmployerData({ ...employerData, address: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="456 Business Rd, City, Country"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    value={employerData.industry}
                    onChange={(e) => setEmployerData({ ...employerData, industry: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Technology, Healthcare, etc."
                  />
                </div>
                <div>
                  <Label htmlFor="employee_count">Number of Employees</Label>
                  <Input
                    id="employee_count"
                    type="number"
                    value={employerData.employee_count}
                    onChange={(e) => setEmployerData({ ...employerData, employee_count: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="50"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="registration_date">Registration Date</Label>
                  <Input
                    id="registration_date"
                    type="date"
                    value={employerData.registration_date}
                    onChange={(e) => setEmployerData({ ...employerData, registration_date: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="contact_person">Contact Person</Label>
                  <Input
                    id="contact_person"
                    value={employerData.contact_person}
                    onChange={(e) => setEmployerData({ ...employerData, contact_person: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Jane Smith"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedRole(null)}
                  disabled={submitting}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || loading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  {submitting ? "Creating Profile..." : "Complete Setup"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
