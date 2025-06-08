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
  Power,
  PowerOff,
  KeyRound,
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
  DropdownMenuSeparator,
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
import { useToast } from "@/hooks/use-toast";

// Define the user type based on what authService.getAllUsers() returns
type User = {
  id: string;
  name: string;
  role: string;
  is_active: boolean;
};

export default function EmployeeManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [toggleStatusUser, setToggleStatusUser] = useState<User | null>(null);
  const [changePasswordUser, setChangePasswordUser] = useState<User | null>(
    null,
  );
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const { toast } = useToast();

  // Load all users from Firebase on component mount
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setIsLoading(true);
        console.log("🔄 Loading all users for User Management...");

        // Get all users from the authentication service (both admins and employees)
        const allUsers = await authService.getAllUsers();

        setUsers(allUsers);

        if (allUsers.length === 0) {
          console.warn("⚠�� No users found in Firebase");
          toast({
            title: "No Users Found",
            description:
              "No user accounts found. You can create new users below.",
            variant: "destructive",
          });
        } else {
          console.log(
            `✅ Loaded ${allUsers.length} users (admins + employees/collectors):`,
            allUsers,
          );
          const adminCount = allUsers.filter((u) => u.role === "admin").length;
          const employeeCount = allUsers.filter(
            (u) => u.role === "employee",
          ).length;
          const activeCount = allUsers.filter((u) => u.is_active).length;
          const inactiveCount = allUsers.filter((u) => !u.is_active).length;
          console.log(`   - ${adminCount} Administrators`);
          console.log(`   - ${employeeCount} Employees/Collectors`);
          console.log(`   - ${activeCount} Active, ${inactiveCount} Inactive`);
        }
      } catch (error) {
        console.error("Failed to load users:", error);
        toast({
          title: "Loading Error",
          description:
            "Failed to load users from Firebase. Starting with empty list.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadUsers();
  }, [toast]);

  // Filter users based on search term
  const filteredUsers = users.filter((user) => {
    if (!searchTerm) return true;

    const term = searchTerm.toLowerCase();
    return (
      user.name?.toLowerCase().includes(term) ||
      user.role?.toLowerCase().includes(term) ||
      user.id?.toLowerCase().includes(term) ||
      (user.is_active ? "active" : "inactive").includes(term)
    );
  });

  const handleToggleStatus = async () => {
    if (!toggleStatusUser) return;

    try {
      setIsUpdating(toggleStatusUser.id);
      const newStatus = !toggleStatusUser.is_active;

      console.log(
        `🔄 ${newStatus ? "Activating" : "Deactivating"} user: ${toggleStatusUser.name}`,
      );

      // Update user status in Firebase
      await authService.updateUser(toggleStatusUser.id, {
        is_active: newStatus,
      });

      // Update local state
      setUsers((prev) =>
        prev.map((user) =>
          user.id === toggleStatusUser.id
            ? { ...user, is_active: newStatus }
            : user,
        ),
      );

      toast({
        title: "Status Updated",
        description: `${toggleStatusUser.name} has been ${newStatus ? "activated" : "deactivated"}. ${newStatus ? "They can now log in." : "They can no longer log in."}`,
      });

      console.log(
        `✅ Successfully ${newStatus ? "activated" : "deactivated"} user: ${toggleStatusUser.name}`,
      );
    } catch (error: any) {
      console.error("Failed to toggle user status:", error);
      toast({
        title: "Status Update Failed",
        description:
          error.message || "Failed to update user status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(null);
      setToggleStatusUser(null);
    }
  };

  const handleChangePassword = async () => {
    if (!changePasswordUser) return;

    // Validate passwords
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    try {
      setIsUpdating(changePasswordUser.id);

      console.log(`🔄 Changing password for user: ${changePasswordUser.name}`);

      // Change password in Firebase
      await authService.changeUserPassword(changePasswordUser.id, newPassword);

      toast({
        title: "Password Changed",
        description: `Password has been successfully changed for ${changePasswordUser.name}. They can now log in with the new password.`,
      });

      console.log(
        `✅ Successfully changed password for user: ${changePasswordUser.name}`,
      );

      // Reset form and close modal
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError("");
      setChangePasswordUser(null);
    } catch (error: any) {
      console.error("Failed to change password:", error);
      toast({
        title: "Password Change Failed",
        description:
          error.message || "Failed to change password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;

    try {
      setIsUpdating(deleteUser.id);

      console.log(`🔄 Deleting user from Firebase: ${deleteUser.name}`);

      // Actually delete the user from Firebase
      await authService.deleteUser(deleteUser.id);

      // Remove from local state only after successful Firebase deletion
      setUsers((prev) => prev.filter((user) => user.id !== deleteUser.id));

      toast({
        title: "User Deleted",
        description: `${deleteUser.name} has been permanently removed from the system.`,
      });

      console.log(`✅ Successfully deleted user: ${deleteUser.name}`);

      setDeleteUser(null);
    } catch (error: any) {
      console.error("Failed to delete user:", error);
      toast({
        title: "Delete Failed",
        description:
          error.message || "Failed to remove user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleAddUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const userData = {
      name: formData.get("name") as string,
      username: formData.get("username") as string,
      password: formData.get("password") as string,
      role: (formData.get("role") as string) || "employee",
      collector_name: formData.get("name") as string, // Use name as collector name for employees
    };

    try {
      // Validate required fields
      if (!userData.name || !userData.username || !userData.password) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields.",
          variant: "destructive",
        });
        return;
      }

      // Validate password strength
      if (userData.password.length < 6) {
        toast({
          title: "Validation Error",
          description: "Password must be at least 6 characters long.",
          variant: "destructive",
        });
        return;
      }

      console.log(`🔄 Creating new ${userData.role}: ${userData.name}`);

      // Create user through authentication service
      const newUserId = await authService.createUser({
        username: userData.username,
        password: userData.password,
        name: userData.name,
        role: userData.role as "admin" | "employee",
        collector_name:
          userData.role === "employee" ? userData.collector_name : null,
      });

      // Add to local state
      const newUser: User = {
        id: newUserId,
        name: userData.name,
        role: userData.role,
        is_active: true, // New users are active by default
      };

      setUsers((prev) => [...prev, newUser]);
      setShowAddUserModal(false);

      // Reset form
      (event.target as HTMLFormElement).reset();

      toast({
        title: "User Created",
        description: `${userData.name} has been successfully created and can now log in.`,
      });

      console.log(`✅ Successfully created ${userData.role}: ${userData.name}`);
    } catch (error: any) {
      console.error("Failed to create user:", error);
      toast({
        title: "Creation Failed",
        description:
          error.message || "Failed to create user. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="User Management">
        <div className="p-4 lg:p-6">
          <div className="text-center py-8 text-muted-foreground">
            Loading users...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="User Management">
      <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-foreground">
              User Management
            </h2>
            <p className="text-sm lg:text-base text-muted-foreground">
              Manage all user accounts (Admins & Employees/Collectors)
            </p>
          </div>

          <Button onClick={() => setShowAddUserModal(true)} className="text-sm">
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Input
                placeholder="Search users by name, role, status, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              <div className="absolute inset-y-0 left-3 flex items-center">
                <Eye className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <span className="font-medium">
              Showing {filteredUsers.length} of {users.length} users
            </span>
            {searchTerm && (
              <span className="ml-2">• Search: "{searchTerm}"</span>
            )}
            <span className="ml-4">
              ({users.filter((u) => u.role === "admin").length} Admins,{" "}
              {users.filter((u) => u.role === "employee").length}{" "}
              Employees/Collectors)
            </span>
            <span className="ml-4">
              ({users.filter((u) => u.is_active).length} Active,{" "}
              {users.filter((u) => !u.is_active).length} Inactive)
            </span>
          </div>
        </div>

        {/* User Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <div className="text-muted-foreground">
                          <UserX className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <div className="font-medium">No users found</div>
                          <div className="text-sm">
                            {searchTerm
                              ? "Try adjusting your search criteria"
                              : "No user accounts have been created yet"}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div
                              className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                user.role === "admin"
                                  ? "bg-purple-600"
                                  : "bg-blue-600"
                              } ${!user.is_active ? "opacity-50" : ""}`}
                            >
                              <span className="text-xs font-medium text-white">
                                {user.name?.charAt(0).toUpperCase() || "?"}
                              </span>
                            </div>
                            <div>
                              <div
                                className={`font-medium ${
                                  user.is_active
                                    ? "text-foreground"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {user.name || "Unknown"}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              user.role === "admin" ? "default" : "secondary"
                            }
                            className={`${
                              user.role === "admin"
                                ? "bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200"
                                : "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200"
                            } ${!user.is_active ? "opacity-50" : ""}`}
                          >
                            {user.role === "admin" ? (
                              <>
                                <Shield className="w-3 h-3 mr-1" />
                                Administrator
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3 h-3 mr-1" />
                                Employee/Collector
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`font-mono text-sm ${
                              user.is_active
                                ? "text-muted-foreground"
                                : "text-muted-foreground opacity-50"
                            }`}
                          >
                            {user.id}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={user.is_active ? "default" : "secondary"}
                            className={
                              user.is_active
                                ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200"
                                : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200"
                            }
                          >
                            {user.is_active ? (
                              <>
                                <UserCheck className="w-3 h-3 mr-1" />
                                Active
                              </>
                            ) : (
                              <>
                                <UserX className="w-3 h-3 mr-1" />
                                Inactive
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={isUpdating === user.id}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setChangePasswordUser(user)}
                              >
                                <KeyRound className="mr-2 h-4 w-4" />
                                Change Password
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setToggleStatusUser(user)}
                              >
                                {user.is_active ? (
                                  <>
                                    <PowerOff className="mr-2 h-4 w-4" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <Power className="mr-2 h-4 w-4" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeleteUser(user)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Change Password Dialog */}
        <Dialog
          open={!!changePasswordUser}
          onOpenChange={() => {
            setChangePasswordUser(null);
            setNewPassword("");
            setConfirmPassword("");
            setPasswordError("");
          }}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
              <DialogDescription>
                Change the password for {changePasswordUser?.name}. They will
                need to use the new password to log in.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setPasswordError("");
                  }}
                  placeholder="Enter new password"
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setPasswordError("");
                  }}
                  placeholder="Confirm new password"
                  minLength={6}
                />
              </div>
              {passwordError && (
                <div className="p-3 border border-red-200 bg-red-50 dark:bg-red-900/20 rounded-md">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {passwordError}
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setChangePasswordUser(null);
                  setNewPassword("");
                  setConfirmPassword("");
                  setPasswordError("");
                }}
                disabled={isUpdating === changePasswordUser?.id}
              >
                Cancel
              </Button>
              <Button
                onClick={handleChangePassword}
                disabled={
                  isUpdating === changePasswordUser?.id ||
                  !newPassword ||
                  !confirmPassword
                }
              >
                {isUpdating === changePasswordUser?.id
                  ? "Changing..."
                  : "Change Password"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Toggle Status Confirmation Dialog */}
        <AlertDialog
          open={!!toggleStatusUser}
          onOpenChange={() => setToggleStatusUser(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {toggleStatusUser?.is_active ? "Deactivate" : "Activate"} User
              </AlertDialogTitle>
              <AlertDialogDescription>
                {toggleStatusUser?.is_active
                  ? `Are you sure you want to deactivate ${toggleStatusUser?.name}? They will no longer be able to log in to the system.`
                  : `Are you sure you want to activate ${toggleStatusUser?.name}? They will be able to log in to the system.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleToggleStatus}
                className={
                  toggleStatusUser?.is_active
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-green-600 hover:bg-green-700"
                }
              >
                {toggleStatusUser?.is_active ? "Deactivate" : "Activate"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete User Confirmation Dialog */}
        <AlertDialog
          open={!!deleteUser}
          onOpenChange={() => setDeleteUser(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove User</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove {deleteUser?.name}? This action
                cannot be undone and they will be permanently removed from the
                system.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteUser}
                className="bg-red-600 hover:bg-red-700"
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Add User Modal */}
        <Dialog open={showAddUserModal} onOpenChange={setShowAddUserModal}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new user account (Admin or Employee/Collector). They
                will be able to log in with these credentials.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddUser}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Full Name *
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="John Doe"
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="username" className="text-right">
                    Username *
                  </Label>
                  <Input
                    id="username"
                    name="username"
                    placeholder="johndoe"
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="password" className="text-right">
                    Password *
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Min 6 characters"
                    className="col-span-3"
                    required
                    minLength={6}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="text-right">
                    Role
                  </Label>
                  <select
                    id="role"
                    name="role"
                    className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    defaultValue="employee"
                  >
                    <option value="employee">Employee/Collector</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddUserModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create User</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
