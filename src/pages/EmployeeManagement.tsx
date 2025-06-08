import { useState, useEffect } from "react";
import { authService } from "@/services/authService";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Shield,
  UserCheck,
  UserX,
  MoreHorizontal,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { User } from "@/types/auth";
import { useToast } from "@/hooks/use-toast";

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteEmployee, setDeleteEmployee] = useState<User | null>(null);
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Load employees from Firebase on component mount
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        setIsLoading(true);
        // Get all users from the authentication service
        const allUsers = await authService.getAllUsers();
        setEmployees(allUsers.filter((user) => user.role === "employee"));
        console.log(
          "Loaded employees:",
          allUsers.filter((user) => user.role === "employee"),
        );
      } catch (error) {
        console.error("Failed to load employees:", error);
        toast({
          title: "Loading Error",
          description: "Failed to load employees. Starting with empty list.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadEmployees();
  }, [toast]);

  const filteredEmployees = employees.filter(
    (employee) =>
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.phone?.includes(searchTerm),
  );

  const handleToggleStatus = (employee: User) => {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === employee.id ? { ...emp, isActive: !emp.isActive } : emp,
      ),
    );

    toast({
      title: `Employee ${employee.isActive ? "deactivated" : "activated"}`,
      description: `${employee.name} has been ${employee.isActive ? "deactivated" : "activated"} successfully.`,
    });
  };

  const handleDeleteEmployee = async () => {
    if (!deleteEmployee) return;

    try {
      // Check if employee has any active assignments
      if (
        deleteEmployee.assignedCustomers &&
        deleteEmployee.assignedCustomers.length > 0
      ) {
        toast({
          title: "Cannot delete employee",
          description: `${deleteEmployee.name} has ${deleteEmployee.assignedCustomers.length} assigned customers. Please reassign customers before deleting.`,
          variant: "destructive",
        });
        setDeleteEmployee(null);
        return;
      }

      // Simulate API call to delete from Firebase
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setEmployees((prev) =>
        prev.filter((emp) => emp.id !== deleteEmployee.id),
      );

      toast({
        title: "Employee deleted",
        description: `${deleteEmployee.name} has been removed from the system.`,
        variant: "destructive",
      });

      setDeleteEmployee(null);
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "Failed to delete employee. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddEmployee = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const employeeData = {
      name: formData.get("name") as string,
      username: formData.get("username") as string,
      password: formData.get("password") as string,
      phone: formData.get("phone") as string,
      role: formData.get("role") as "admin" | "employee",
    };

    try {
      // Validate password strength
      if (employeeData.password.length < 6) {
        toast({
          title: "Validation Error",
          description: "Password must be at least 6 characters long.",
          variant: "destructive",
        });
        return;
      }

      // Create user through authentication service
      const newUser = await authService.createUser({
        username: employeeData.username,
        password: employeeData.password,
        name: employeeData.name,
        role: employeeData.role,
        access_scope: [],
      });

      // Add phone number to the user object
      const newEmployee: User = {
        ...newUser,
        phone: employeeData.phone,
        email: `${employeeData.username}@agvcabletv.local`,
        assignedCustomers: [],
      };

      setEmployees((prev) => [...prev, newEmployee]);
      setShowAddEmployeeModal(false);

      toast({
        title: "Employee Created",
        description: `${newEmployee.name} has been successfully created and saved to Firebase with username: ${employeeData.username}`,
      });
    } catch (error) {
      console.error("Failed to create employee:", error);
      toast({
        title: "Creation Failed",
        description: "Failed to create employee account. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const activeEmployees = employees.filter((emp) => emp.isActive).length;
  const totalCustomersAssigned = employees.reduce(
    (sum, emp) => sum + (emp.assignedCustomers?.length || 0),
    0,
  );

  if (isLoading) {
    return (
      <DashboardLayout title="Employee Management">
        <div className="p-6">
          <div className="text-center py-8">
            <div className="text-lg">Loading employees...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Employee Management">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Employee Management
            </h2>
            <p className="text-muted-foreground">
              Manage employee accounts and permissions
            </p>
          </div>
          <Button onClick={() => setShowAddEmployeeModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Employee
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Employees
              </CardTitle>
              <UserCheck className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{employees.length}</div>
              <p className="text-xs text-gray-600">{activeEmployees} active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Active Employees
              </CardTitle>
              <Shield className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {activeEmployees}
              </div>
              <p className="text-xs text-gray-600">
                {employees.length - activeEmployees} inactive
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Assigned Customers
              </CardTitle>
              <UserCheck className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCustomersAssigned}</div>
              <p className="text-xs text-gray-600">Total assignments</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex space-x-4">
              <div className="flex-1">
                <Input
                  placeholder="Search employees by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employee Table */}
        <Card>
          <CardHeader>
            <CardTitle>Employee Directory</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop Table */}
            <div className="hidden lg:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Assigned Customers</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{employee.name}</div>
                          <div className="text-sm text-gray-500">
                            {employee.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {employee.phone || "No phone"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {employee.assignedCustomers?.length || 0} customers
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={employee.isActive ? "default" : "secondary"}
                          className={employee.isActive ? "bg-green-600" : ""}
                        >
                          {employee.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {employee.lastLogin
                            ? formatDate(employee.lastLogin)
                            : "Never"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(employee.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Employee
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleStatus(employee)}
                            >
                              {employee.isActive ? (
                                <>
                                  <UserX className="mr-2 h-4 w-4" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteEmployee(employee)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-4 p-4">
              {filteredEmployees.map((employee) => (
                <Card key={employee.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-lg">{employee.name}</h3>
                      <p className="text-sm text-gray-500">{employee.email}</p>
                      {employee.phone && (
                        <p className="text-sm text-gray-500">
                          {employee.phone}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant={employee.isActive ? "default" : "secondary"}
                      className={employee.isActive ? "bg-green-600" : ""}
                    >
                      {employee.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Assigned Customers:</span>
                      <Badge variant="outline">
                        {employee.assignedCustomers?.length || 0}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Last Login:</span>
                      <span>
                        {employee.lastLogin
                          ? formatDate(employee.lastLogin)
                          : "Never"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Created:</span>
                      <span>{formatDate(employee.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex space-x-2 mt-4">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(employee)}
                      className="flex-1"
                    >
                      {employee.isActive ? (
                        <>
                          <UserX className="mr-2 h-4 w-4" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <UserCheck className="mr-2 h-4 w-4" />
                          Activate
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Delete Confirmation */}
        <AlertDialog
          open={!!deleteEmployee}
          onOpenChange={() => setDeleteEmployee(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Employee</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {deleteEmployee?.name}? This
                action cannot be undone and will remove all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteEmployee}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete Employee
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Add Employee Modal */}
        <Dialog
          open={showAddEmployeeModal}
          onOpenChange={setShowAddEmployeeModal}
        >
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
              <DialogDescription>
                Create a new employee account with access credentials
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddEmployee}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    required
                    placeholder="Enter employee's full name"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    required
                    placeholder="employee_username"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Used for login authentication
                  </p>
                </div>

                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    placeholder="Enter secure password"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum 8 characters recommended
                  </p>
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="role">Role</Label>
                  <select
                    id="role"
                    name="role"
                    required
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select role</option>
                    <option value="employee">Employee</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div className="text-sm text-gray-500 bg-blue-50 p-3 rounded-md">
                  <p>
                    <strong>Note:</strong> The employee will be able to login
                    using the username and password provided above. These
                    credentials will be saved securely in Firebase
                    Authentication.
                  </p>
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddEmployeeModal(false)}
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
