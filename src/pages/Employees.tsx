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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  MapPin,
  Settings,
  Check,
  X,
  MoreHorizontal,
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
  assigned_areas?: string[]; // New field for multiple areas
  is_active: boolean;
}

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [availableAreas, setAvailableAreas] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
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
      const customerAreas = customers
        .map((c) => c.collectorName)
        .filter(Boolean);

      // Get areas from employees
      const employees = await authService.getAllEmployees();
      const employeeAreas = employees
        .flatMap((e) => e.assigned_areas || [e.collector_name])
        .filter(Boolean);

      // Combine, deduplicate, and sort
      const allAreas = [
        ...new Set([...customerAreas, ...employeeAreas]),
      ].sort();
      setAvailableAreas(allAreas);

      console.log("📍 Available areas:", allAreas);
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
      const password = formData.get("password") as string;

      console.log("🔧 Creating employee with:", {
        email,
        name,
        role,
        assigned_areas: selectedAreas,
      });

      // Create user data with multiple areas
      const userData = {
        email,
        password,
        name,
        role,
        assigned_areas: role === "employee" ? selectedAreas : [],
        collector_name:
          role === "employee" && selectedAreas.length > 0
            ? selectedAreas[0]
            : undefined,
      };

      // Don't await the user creation to prevent logout
      createUser(userData)
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
      setSelectedAreas([]);

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

  const updateEmployeeAreas = async (
    employee: Employee,
    newAreas: string[],
  ) => {
    try {
      await authService.updateUser(employee.id, {
        assigned_areas: newAreas,
        collector_name: newAreas.length > 0 ? newAreas[0] : undefined,
      });

      toast({
        title: "Areas Updated",
        description: `${employee.name}'s areas updated successfully`,
      });

      loadEmployees();
    } catch (error) {
      console.error("Failed to update areas:", error);
      toast({
        title: "Error",
        description: "Failed to update areas",
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
      const result = await authService.deleteUser(employee.id);

      // Show success message with additional cleanup instructions
      toast({
        title: "Employee Account Disabled",
        description: `${employee.name} has been removed from the system. For complete removal, please delete the user from Firebase Authentication console.`,
        duration: 8000, // Longer duration for important message
      });

      // Show additional instructions in console for admin
      console.log("🔧 CLEANUP REQUIRED:");
      console.log(`📧 Employee email: ${employee.email}`);
      console.log("📋 Next steps:");
      console.log("   1. Go to Firebase Console → Authentication → Users");
      console.log(`   2. Find user: ${employee.email}`);
      console.log("   3. Delete the user from Firebase Auth");

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

  const handleDisableEmployee = async (employee: Employee) => {
    if (
      !confirm(
        `Are you sure you want to disable ${employee.name}? They will not be able to access the system but their account will remain.`,
      )
    ) {
      return;
    }

    try {
      await authService.disableUser(employee.id);

      toast({
        title: "Employee Disabled",
        description: `${employee.name} has been disabled and cannot access the system`,
      });

      loadEmployees();
    } catch (error: any) {
      console.error("Failed to disable employee:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to disable employee",
        variant: "destructive",
      });
    }
  };

  const AreaSelector = ({
    employeeAreas = [],
    onUpdate,
  }: {
    employeeAreas: string[];
    onUpdate: (areas: string[]) => void;
  }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempAreas, setTempAreas] = useState<string[]>(employeeAreas);

    const handleAreaToggle = (area: string) => {
      setTempAreas((prev) =>
        prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area],
      );
    };

    const handleSave = () => {
      onUpdate(tempAreas);
      setIsEditing(false);
    };

    const handleCancel = () => {
      setTempAreas(employeeAreas);
      setIsEditing(false);
    };

    if (!isEditing) {
      return (
        <div className="flex items-center gap-2">
          <div className="flex flex-wrap gap-1">
            {employeeAreas.length > 0 ? (
              employeeAreas.map((area) => (
                <Badge key={area} variant="secondary" className="text-xs">
                  {area}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">
                No areas assigned
              </span>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsEditing(true)}
            className="h-6 w-6 p-0"
          >
            <Settings className="h-3 w-3" />
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="text-xs font-medium">Select Areas:</div>
        <ScrollArea className="h-24 w-full border rounded-md p-2">
          <div className="space-y-1">
            {availableAreas.map((area) => (
              <div key={area} className="flex items-center space-x-2">
                <Checkbox
                  id={`area-${area}`}
                  checked={tempAreas.includes(area)}
                  onCheckedChange={() => handleAreaToggle(area)}
                />
                <label
                  htmlFor={`area-${area}`}
                  className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {area}
                </label>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="flex gap-1">
          <Button size="sm" onClick={handleSave} className="h-6 px-2">
            <Check className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            className="h-6 px-2"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
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
              Manage system users and their area assignments
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Coverage Areas
              </CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{availableAreas.length}</div>
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
              <Card
                key={employee.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start space-y-0">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg">
                          {employee.name}
                        </h3>
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

                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          {employee.email}
                        </p>

                        {employee.role === "employee" && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs font-medium">
                                Assigned Areas:
                              </span>
                            </div>
                            <AreaSelector
                              employeeAreas={
                                employee.assigned_areas ||
                                (employee.collector_name
                                  ? [employee.collector_name]
                                  : [])
                              }
                              onUpdate={(areas) =>
                                updateEmployeeAreas(employee, areas)
                              }
                            />
                          </div>
                        )}
                      </div>
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
                            <SelectTrigger className="w-28 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="employee">Employee</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="outline">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>
                                Manage Employee
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() => handleDisableEmployee(employee)}
                                className="text-orange-600 dark:text-orange-400"
                              >
                                <ShieldOff className="mr-2 h-4 w-4" />
                                Disable Account
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() => handleDeleteEmployee(employee)}
                                className="text-red-600 dark:text-red-400"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Account
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
          <DialogContent className="sm:max-w-[600px]">
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
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Full Name *</label>
                    <Input name="name" placeholder="John Doe" required />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Email Address *
                    </label>
                    <Input
                      name="email"
                      type="email"
                      placeholder="john@agvcabletv.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Password *</label>
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
                  <p className="text-xs text-muted-foreground">
                    Employee will receive a password reset email
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Role *</label>
                  <Select name="role" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">
                      Collection Areas
                    </label>
                    <Badge variant="outline" className="text-xs">
                      For employees only
                    </Badge>
                  </div>
                  <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                    {availableAreas.length > 0 ? (
                      availableAreas.map((area) => (
                        <div key={area} className="flex items-center space-x-2">
                          <Checkbox
                            id={`create-area-${area}`}
                            checked={selectedAreas.includes(area)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedAreas((prev) => [...prev, area]);
                              } else {
                                setSelectedAreas((prev) =>
                                  prev.filter((a) => a !== area),
                                );
                              }
                            }}
                          />
                          <label
                            htmlFor={`create-area-${area}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {area}
                          </label>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No areas available
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Select multiple areas this employee will manage. Areas can
                    be modified later.
                  </p>
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setSelectedAreas([]);
                  }}
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
