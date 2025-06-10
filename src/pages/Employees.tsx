import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  UserPlus,
  Mail,
  Shield,
  ShieldOff,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Users,
  Crown,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { authService } from "@/services/authService";
import { firestoreService } from "@/services/firestoreService";

interface Employee {
  id: string;
  email: string;
  name: string;
  role: "admin" | "employee";
  collector_name?: string;
  is_active: boolean;
}

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [availableAreas, setAvailableAreas] = useState<string[]>([]);
  const { toast } = useToast();
  const { user, isAdmin, createUser, sendPasswordReset } = useAuth();

  // Load employees and areas on component mount
  useEffect(() => {
    if (isAdmin) {
      loadEmployees();
      loadAvailableAreas();
    }
  }, [isAdmin]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const employeeList = await authService.getAllEmployees();
      setEmployees(employeeList);
    } catch (error) {
      console.error("Failed to load employees:", error);
      toast({
        title: "Error",
        description: "Failed to load employees",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableAreas = async () => {
    try {
      // Get all customers to extract unique areas
      const customers = await firestoreService.getAllCustomers();
      const areas = customers
        .map((c) => c.collectorName)
        .filter(Boolean)
        .filter((area, index, arr) => arr.indexOf(area) === index) // Remove duplicates
        .sort();

      setAvailableAreas(areas);
      console.log("📍 Available areas:", areas);
    } catch (error) {
      console.error("Failed to load areas:", error);
      // Set some default areas if loading fails
      setAvailableAreas(["Area 1", "Area 2", "Area 3", "Downtown", "Suburb"]);
    }
  };

  const handleCreateEmployee = async (formData: FormData) => {
    try {
      const email = formData.get("email") as string;
      const name = formData.get("name") as string;
      const role = formData.get("role") as "admin" | "employee";
      const collectorName = formData.get("collector_name") as string;
      const password = formData.get("password") as string;

      console.log("🔧 Creating employee with:", {
        email,
        name,
        role,
        collector_name: collectorName,
      });

      // Don't await the user creation to prevent logout
      createUser({
        email,
        password,
        name,
        role,
        collector_name: role === "employee" ? collectorName : undefined,
      })
        .then(() => {
          console.log("✅ Employee created successfully");

          // Send password reset email (don't await to prevent issues)
          sendPasswordReset(email)
            .then(() => {
              toast({
                title: "Employee Created",
                description: `${name} has been created and a password reset email has been sent.`,
              });
            })
            .catch(() => {
              toast({
                title: "Employee Created",
                description: `${name} has been created. Please manually send them their login credentials.`,
              });
            });

          // Reload employees list
          loadEmployees();
        })
        .catch((error: any) => {
          console.error("❌ Failed to create employee:", error);
          toast({
            title: "Error",
            description: error.message || "Failed to create employee",
            variant: "destructive",
          });
        });

      setShowCreateModal(false);

      // Reset form
      const form = document.getElementById(
        "create-employee-form",
      ) as HTMLFormElement;
      form?.reset();
    } catch (error: any) {
      console.error("Failed to create employee:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create employee",
        variant: "destructive",
      });
    }
  };

  const toggleEmployeeStatus = async (employee: Employee) => {
    try {
      const newStatus = !employee.is_active;

      await authService.updateUser(employee.id, {
        is_active: newStatus,
      });

      toast({
        title: newStatus ? "Employee Activated" : "Employee Deactivated",
        description: `${employee.name} has been ${newStatus ? "activated" : "deactivated"}`,
      });

      loadEmployees();
    } catch (error) {
      console.error("Failed to update employee status:", error);
      toast({
        title: "Error",
        description: "Failed to update employee status",
        variant: "destructive",
      });
    }
  };

  const updateEmployeeRole = async (
    employee: Employee,
    newRole: "admin" | "employee",
  ) => {
    try {
      await authService.updateUser(employee.id, {
        role: newRole,
      });

      toast({
        title: "Role Updated",
        description: `${employee.name} is now ${newRole}`,
      });

      loadEmployees();
    } catch (error) {
      console.error("Failed to update role:", error);
      toast({
        title: "Error",
        description: "Failed to update role",
        variant: "destructive",
      });
    }
  };

  const updateEmployeeArea = async (employee: Employee, newArea: string) => {
    try {
      await authService.updateUser(employee.id, {
        collector_name: newArea,
      });

      toast({
        title: "Area Updated",
        description: `${employee.name}'s area updated to ${newArea}`,
      });

      loadEmployees();
    } catch (error) {
      console.error("Failed to update area:", error);
      toast({
        title: "Error",
        description: "Failed to update area",
        variant: "destructive",
      });
    }
  };

  const handleSendPasswordReset = async (employee: Employee) => {
    try {
      await sendPasswordReset(employee.email);

      toast({
        title: "Password Reset Sent",
        description: `Password reset email sent to ${employee.email}`,
      });
    } catch (error) {
      console.error("Failed to send password reset:", error);
      toast({
        title: "Error",
        description: "Failed to send password reset email",
        variant: "destructive",
      });
    }
  };

  const handleDeleteEmployee = async (employee: Employee) => {
    if (
      !confirm(
        `Are you sure you want to delete ${employee.name}? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      await authService.deleteUser(employee.id);

      toast({
        title: "Employee Deleted",
        description: `${employee.name} has been deleted`,
      });

      loadEmployees();
    } catch (error: any) {
      console.error("Failed to delete employee:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete employee",
        variant: "destructive",
      });
    }
  };

  if (!isAdmin) {
    return (
      <DashboardLayout title="Employee Management">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Only administrators can access employee management.
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Employee Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Employee Management
            </h2>
            <p className="text-muted-foreground">
              Manage system users and their permissions
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Users
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{employees.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Users
              </CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {employees.filter((emp) => emp.is_active).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Administrators
              </CardTitle>
              <Crown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {employees.filter((emp) => emp.role === "admin").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Employee List */}
        <div className="grid gap-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-muted-foreground">Loading employees...</p>
            </div>
          ) : employees.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No employees found</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first employee account to get started.
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add First Employee
                </Button>
              </CardContent>
            </Card>
          ) : (
            employees.map((employee) => (
              <Card key={employee.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{employee.name}</h3>
                        <Badge
                          variant={
                            employee.role === "admin" ? "default" : "secondary"
                          }
                        >
                          {employee.role === "admin" ? (
                            <>
                              <Crown className="mr-1 h-3 w-3" />
                              Admin
                            </>
                          ) : (
                            "Employee"
                          )}
                        </Badge>
                        <Badge
                          variant={
                            employee.is_active ? "default" : "destructive"
                          }
                        >
                          {employee.is_active ? (
                            <>
                              <Shield className="mr-1 h-3 w-3" />
                              Active
                            </>
                          ) : (
                            <>
                              <ShieldOff className="mr-1 h-3 w-3" />
                              Inactive
                            </>
                          )}
                        </Badge>
                        {employee.id === user?.id && (
                          <Badge variant="outline">You</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {employee.email}
                      </p>
                      {employee.collector_name && (
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-muted-foreground">
                            Area: {employee.collector_name}
                          </p>
                          {employee.role === "employee" &&
                            availableAreas.length > 0 && (
                              <Select
                                value={employee.collector_name}
                                onValueChange={(value) =>
                                  updateEmployeeArea(employee, value)
                                }
                              >
                                <SelectTrigger className="w-32 h-6 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableAreas.map((area) => (
                                    <SelectItem key={area} value={area}>
                                      {area}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSendPasswordReset(employee)}
                        title="Send password reset email"
                      >
                        <Mail className="h-4 w-4" />
                      </Button>

                      {employee.id !== user?.id && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleEmployeeStatus(employee)}
                            title={
                              employee.is_active
                                ? "Deactivate user"
                                : "Activate user"
                            }
                          >
                            {employee.is_active ? (
                              <ShieldOff className="h-4 w-4" />
                            ) : (
                              <Shield className="h-4 w-4" />
                            )}
                          </Button>

                          <Select
                            value={employee.role}
                            onValueChange={(value: "admin" | "employee") =>
                              updateEmployeeRole(employee, value)
                            }
                          >
                            <SelectTrigger className="w-24 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="employee">Employee</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteEmployee(employee)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            title="Delete user"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Create Employee Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
            </DialogHeader>

            <form
              id="create-employee-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateEmployee(new FormData(e.currentTarget));
              }}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Full Name</label>
                    <Input name="name" placeholder="John Doe" required />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Email Address</label>
                    <Input
                      name="email"
                      type="email"
                      placeholder="john@agvcabletv.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Password</label>
                  <div className="relative">
                    <Input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter temporary password"
                      className="pr-10"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Employee will receive a password reset email
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Role</label>
                    <Select name="role" required>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">
                      Collection Area
                    </label>
                    <Select name="collector_name">
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select or enter area" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableAreas.map((area) => (
                          <SelectItem key={area} value={area}>
                            {area}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      For employees only. Can be edited later.
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create Employee</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
