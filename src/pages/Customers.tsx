import React, { useState, useEffect, useContext } from "react";
import { Plus, Upload, Search, Filter, ChevronDown } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import CustomerModal from "@/components/customers/CustomerModal";
import CustomerTable from "@/components/customers/CustomerTable";
import { CustomerImportExport } from "@/components/customers/CustomerImportExport";
import { AuthContext } from "@/contexts/AuthContext";
import { CustomerService } from "@/services/customerService";
import { authService } from "@/services/authService";
import { Customer } from "@/types";
import { ActionRequest } from "@/types/auth";
import { useToast } from "@/hooks/use-toast";

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);

  const { user, isAdmin } = useContext(AuthContext);
  const { toast } = useToast();

  // Load customers on component mount
  useEffect(() => {
    let mounted = true;

    const loadCustomers = async () => {
      try {
        setIsLoading(true);
        let customerData: Customer[];

        console.log("🔄 Loading customers...");
        console.log("👤 Current user:", {
          name: user?.name,
          role: user?.role,
          collector_name: user?.collector_name,
          isAdmin: isAdmin,
        });

        if (isAdmin) {
          console.log("👑 Admin user - loading all customers");
          customerData = await CustomerService.getAllCustomers();

          // Debug: Show all customers and their assignments
          if (customerData.length > 0) {
            console.log("📋 All customers loaded:", customerData.map(c => ({
              name: c.name,
              collectorName: c.collectorName,
              vcNumber: c.vcNumber
            })));

            // Show unique employee assignments
            const uniqueEmployees = [...new Set(customerData.map(c => c.collectorName))];
            console.log("👥 Employees with customers assigned:", uniqueEmployees);
          }
        } else {
          // For employees, get customers assigned to them
          // Use collector_name if available, otherwise fall back to name
          const collectorName = user?.collector_name || user?.name || "";
          console.log(`🔍 Employee user - loading customers for collector: "${collectorName}"`);

          // First, get ALL customers to debug assignment
          const allCustomers = await CustomerService.getAllCustomers();
          console.log("🔍 DEBUG - All customers in system:", allCustomers.map(c => ({
            name: c.name,
            collectorName: c.collectorName,
            matchesUser: c.collectorName === collectorName
          })));

          customerData = await CustomerService.getCustomersByCollector(
            collectorName,
          );
          console.log(`📊 Found ${customerData.length} customers assigned to ${collectorName}`);

          // Debug: Show which customers were found
          if (customerData.length > 0) {
            console.log("📋 Assigned customers:", customerData.map(c => ({
              name: c.name,
              collectorName: c.collectorName,
              vcNumber: c.vcNumber
            })));
          } else {
            console.warn("⚠️ No customers found for this employee. Diagnosis:");
            console.warn(`  1. Employee looking for: "${collectorName}"`);
            console.warn(`  2. Available customers:`, allCustomers.map(c => `${c.name} (assigned to: "${c.collectorName}")`));
            console.warn("  3. Check customer assignment: ensure customers have collectorName exactly matching:", collectorName);
            console.warn("  4. Check employee profile: ensure collector_name is set correctly in Firebase");
          }
        }
                name: c.name,
                collectorName: c.collectorName,
                vcNumber: c.vcNumber,
              })),
            );
          } else {
            console.warn("⚠️ No customers found for this employee. Check:");
            console.warn(
              "  1. Customer assignment: ensure customers have collectorName set to:",
              collectorName,
            );
            console.warn(
              "  2. Employee profile: ensure collector_name is set correctly",
            );
          }
        }

        // Only update state if component is still mounted
        if (mounted) {
          setCustomers(customerData);
          console.log(
            `✅ Successfully loaded ${customerData.length} customers`,
          );
        }
      } catch (error) {
        console.error("❌ Error loading customers:", error);
        if (mounted) {
          toast({
            title: "Error",
            description: "Failed to load customers. Check console for details.",
            variant: "destructive",
          });
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    if (user) {
      loadCustomers();
    }

    return () => {
      mounted = false;
    };
  }, [isAdmin, toast, user]);

  // Filter customers based on search term and filters
  const filteredCustomers = customers.filter((customer) => {
    const searchTerm_lower = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      customer.name.toLowerCase().includes(searchTerm_lower) ||
      customer.phoneNumber.includes(searchTerm) ||
      customer.vcNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.collectorName.toLowerCase().includes(searchTerm_lower);

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && customer.status === "active") ||
      (statusFilter === "inactive" && customer.status === "inactive") ||
      (statusFilter === "demo" && customer.status === "demo");

    const matchesEmployee =
      employeeFilter === "all" || customer.collectorName === employeeFilter;

    return matchesSearch && matchesStatus && matchesEmployee;
  });

  // Get unique employees for filter dropdown - using same source as billing
  const [allEmployees, setAllEmployees] = useState<
    Array<{ id: string; name: string; role: string; is_active: boolean }>
  >([]);

  // Load employees from Firebase (same as billing)
  useEffect(() => {
    const loadEmployees = async () => {
      if (isAdmin) {
        try {
          const users = await authService.getAllEmployees();
          // Only include active employees for assignment
          const activeUsers = users.filter((user) => user.is_active);
          setAllEmployees(activeUsers);
        } catch (error) {
          console.error("Failed to load employees:", error);
        }
      }
    };
    loadEmployees();
  }, [isAdmin]);

  // Also get unique employees from existing customer data as fallback
  const uniqueEmployees = Array.from(
    new Set(customers.map((customer) => customer.collectorName)),
  ).filter(Boolean);

  const handleAdd = () => {
    setEditingCustomer(null);
    setIsModalOpen(true);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleDelete = (customer: Customer) => {
    setDeleteCustomer(customer);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteCustomer) return;

    try {
      setIsSaving(true);
      await CustomerService.deleteCustomer(deleteCustomer.id);
      setCustomers((prev) =>
        prev.filter((customer) => customer.id !== deleteCustomer.id),
      );
      toast({
        title: "Success",
        description: "Customer deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete customer",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      setDeleteCustomer(null);
    }
  };

  const handleSave = async (customerData: Customer) => {
    try {
      setIsSaving(true);

      if (editingCustomer) {
        // Update existing customer
        await CustomerService.updateCustomer(editingCustomer.id, customerData);
        setCustomers((prev) =>
          prev.map((customer) =>
            customer.id === editingCustomer.id
              ? { ...customerData, id: editingCustomer.id }
              : customer,
          ),
        );
        toast({
          title: "Success",
          description: "Customer updated successfully",
        });
      } else {
        // Add new customer
        const newCustomerId = await CustomerService.addCustomer(customerData);
        const newCustomer = { ...customerData, id: newCustomerId };
        setCustomers((prev) => [newCustomer, ...prev]);
        toast({
          title: "Success",
          description: "Customer added successfully",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: editingCustomer
          ? "Failed to update customer"
          : "Failed to add customer",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (
    customerId: string,
    newStatus: "active" | "inactive" | "demo",
  ) => {
    try {
      const customer = customers.find((c) => c.id === customerId);
      if (!customer) return;

      await CustomerService.updateCustomer(customerId, { status: newStatus });

      setCustomers((prev) =>
        prev.map((c) =>
          c.id === customerId ? { ...c, status: newStatus } : c,
        ),
      );

      toast({
        title: "Status Updated",
        description: `Customer status changed to ${newStatus}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update customer status",
        variant: "destructive",
      });
    }
  };

  const handleImportSuccess = (importedCustomers: Customer[]) => {
    setCustomers((prev) => [...importedCustomers, ...prev]);
    setShowImportExport(false);
    toast({
      title: "Import Successful",
      description: `${importedCustomers.length} customers imported successfully`,
    });
  };

  // For employees, don't allow accessing all customers functionality
  const showOnlyMyCustomers = !isAdmin;

  return (
    <DashboardLayout title="Customer Management">
      <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-foreground">
              Customer Management
            </h2>
            <p className="text-sm lg:text-base text-muted-foreground">
              {showOnlyMyCustomers
                ? `Managing customers assigned to you (${filteredCustomers.length} customers)`
                : `Manage all customers and their connections (${filteredCustomers.length} customers)`}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            {isAdmin && (
              <Button
                variant="outline"
                onClick={() => setShowImportExport(true)}
                className="text-sm"
              >
                <Upload className="mr-2 h-4 w-4" />
                Import/Export
              </Button>
            )}
            <Button onClick={handleAdd} className="text-sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search customers by name, phone, address, VC number, or employee..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="demo">Demo</SelectItem>
                </SelectContent>
              </Select>

              {/* Employee Filter */}
              <Select
                value={employeeFilter}
                onValueChange={setEmployeeFilter}
                disabled={!isAdmin}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {/* Use Firebase employee data first, fallback to customer data */}
                  {allEmployees.length > 0
                    ? allEmployees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.name}>
                          {employee.name} ({employee.role})
                        </SelectItem>
                      ))
                    : uniqueEmployees.map((employee) => (
                        <SelectItem key={employee} value={employee}>
                          {employee}
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <span className="font-medium">
              Showing {filteredCustomers.length} of {customers.length} customers
            </span>
            {searchTerm && (
              <span className="ml-2">• Search: "{searchTerm}"</span>
            )}
            {statusFilter !== "all" && (
              <span className="ml-2">• Status: {statusFilter}</span>
            )}
            {employeeFilter !== "all" && (
              <span className="ml-2">• Employee: {employeeFilter}</span>
            )}
          </div>
        </div>

        {/* Customer Table */}
        <CustomerTable
          customers={filteredCustomers}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
          isLoading={isLoading}
        />

        {/* Customer Modal */}
        <CustomerModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          customer={editingCustomer}
          onSave={handleSave}
          isLoading={isSaving}
        />

        {/* Import/Export Modal */}
        {isAdmin && (
          <CustomerImportExport
            open={showImportExport}
            onOpenChange={setShowImportExport}
            customers={customers}
            onImportSuccess={handleImportSuccess}
          />
        )}

        {/* Delete Confirmation */}
        <AlertDialog
          open={!!deleteCustomer}
          onOpenChange={() => setDeleteCustomer(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Customer</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deleteCustomer?.name}"? This
                action cannot be undone and will remove all customer data
                including billing history.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={isSaving}
                className="bg-red-600 hover:bg-red-700"
              >
                {isSaving ? "Deleting..." : "Delete Customer"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}