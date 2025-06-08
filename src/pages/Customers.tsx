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

        if (isAdmin) {
          customerData = await CustomerService.getAllCustomers();
        } else {
          // For employees, get customers assigned to them
          customerData = await CustomerService.getCustomersByCollector(
            user?.name || "",
          );
        }

        // Only update state if component is still mounted
        if (mounted) {
          setCustomers(customerData);
        }
      } catch (error) {
        console.error("Error loading customers:", error);
        if (mounted) {
          toast({
            title: "Error",
            description: "Failed to load customers",
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

    // Cleanup function
    return () => {
      mounted = false;
    };
  }, [user, isAdmin, toast]);

  // Filter customers based on search and filters
  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phoneNumber.includes(searchTerm) ||
      customer.vcNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.address.toLowerCase().includes(searchTerm.toLowerCase());

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

  // Also get unique collectors from existing customer data as fallback
  const uniqueCollectors = Array.from(
    new Set(customers.map((customer) => customer.collectorName)),
  ).filter(Boolean);

  const handleAdd = () => {
    if (isSaving) return; // Prevent opening modal while saving
    setEditingCustomer(null);
    setIsModalOpen(true);
  };

  const handleEdit = (customer: Customer) => {
    if (isSaving) return; // Prevent opening modal while saving
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleView = (customer: Customer) => {
    if (isSaving) return; // Prevent opening modal while saving
    // For now, view opens edit modal (read-only for employees)
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleCloseModal = (open: boolean) => {
    if (!open && !isSaving) {
      setIsModalOpen(false);
      setEditingCustomer(null);
    }
  };

  const handleViewHistory = (customer: Customer) => {
    console.log("View history for:", customer.name);
    // TODO: Implement view history functionality
  };

  const handlePaymentCapture = (customer: Customer) => {
    console.log("Payment capture for:", customer.name);
    // TODO: Implement payment capture functionality
  };

  const handleCustomerUpdate = async (
    customerId: string,
    updates: Partial<Customer>,
  ) => {
    try {
      setIsSaving(true);
      await CustomerService.updateCustomer(customerId, updates);

      setCustomers((prevCustomers) =>
        prevCustomers.map((customer) =>
          customer.id === customerId ? { ...customer, ...updates } : customer,
        ),
      );

      toast({
        title: "Customer Updated",
        description: "Customer information has been successfully updated.",
      });
    } catch (error) {
      console.error("Update error:", error);
      toast({
        title: "Error",
        description: "Failed to update customer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (customer: Customer) => {
    setDeleteCustomer(customer);
  };

  const handleDeleteConfirm = async () => {
    if (deleteCustomer) {
      setIsSaving(true);
      try {
        await CustomerService.deleteCustomer(deleteCustomer.id);
        setCustomers((prev) => prev.filter((c) => c.id !== deleteCustomer.id));
        toast({
          title: "Customer Deleted",
          description: `${deleteCustomer.name} has been successfully deleted.`,
        });
      } catch (error) {
        console.error("Delete error:", error);
        toast({
          title: "Error",
          description: "Failed to delete customer",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
        setDeleteCustomer(null);
      }
    }
  };

  const handleSave = async (customer: Omit<Customer, "id">) => {
    console.log("Save started for:", customer.name);

    if (isSaving) {
      console.log("Save already in progress, ignoring");
      return;
    }

    setIsSaving(true);

    try {
      console.log("Performing save operation...");

      if (editingCustomer) {
        console.log("Updating existing customer:", editingCustomer.id);
        const customerWithId = { ...customer, id: editingCustomer.id };
        await CustomerService.updateCustomer(
          editingCustomer.id,
          customerWithId,
        );

        setCustomers((prevCustomers) => {
          console.log(
            "Updating customer list, previous count:",
            prevCustomers.length,
          );
          const updatedCustomers = prevCustomers.map((c) =>
            c.id === editingCustomer.id ? { ...customerWithId } : c,
          );
          console.log(
            "Updated customer list, new count:",
            updatedCustomers.length,
          );
          return updatedCustomers;
        });

        toast({
          title: "Customer Updated",
          description: `${customer.name} has been successfully updated.`,
        });
      } else {
        console.log("Adding new customer");
        const newId = await CustomerService.addCustomer(customer);
        const newCustomer = { ...customer, id: newId };

        setCustomers((prevCustomers) => {
          console.log(
            "Adding customer to list, previous count:",
            prevCustomers.length,
          );
          const newList = [...prevCustomers, newCustomer];
          console.log("New customer list count:", newList.length);
          return newList;
        });

        toast({
          title: "Customer Added",
          description: `${customer.name} has been successfully added.`,
        });
      }

      console.log("Save operation completed successfully");

      // Use setTimeout to ensure state updates are processed
      setTimeout(() => {
        console.log("Closing modal");
        setIsModalOpen(false);
        setEditingCustomer(null);
      }, 100);
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Error",
        description: "Failed to save customer. Please try again.",
        variant: "destructive",
      });
    } finally {
      console.log("Resetting saving state");
      setIsSaving(false);
    }
  };

  const handleActionRequest = async (request: Omit<ActionRequest, "id">) => {
    try {
      // Submit action request for admin approval
      await CustomerService.addRequest(request);
      toast({
        title: "Request Submitted",
        description:
          "Your action request has been submitted for admin approval.",
      });
    } catch (error) {
      console.error("Action request error:", error);
      toast({
        title: "Error",
        description: "Failed to submit request",
        variant: "destructive",
      });
    }
  };

  const handleImportSuccess = () => {
    // Reload customers after import
    const loadCustomers = async () => {
      try {
        const customerData = isAdmin
          ? await CustomerService.getAllCustomers()
          : await CustomerService.getCustomersByCollector(user?.name || "");
        setCustomers(customerData);
      } catch (error) {
        console.error("Error reloading customers:", error);
      }
    };
    loadCustomers();
  };

  const handleCsvImport = async (importedCustomers: Customer[]) => {
    try {
      setIsSaving(true);

      // Save imported customers
      for (const customer of importedCustomers) {
        await CustomerService.addCustomer(customer);
      }

      // Reload customer list
      await handleImportSuccess();

      toast({
        title: "Import Successful",
        description: `Successfully imported ${importedCustomers.length} customers.`,
      });
    } catch (error) {
      console.error("Error importing customers:", error);
      toast({
        title: "Import Failed",
        description: "An error occurred while importing customers.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

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
              {isAdmin
                ? "Manage customers with enhanced billing tracking and invoice history"
                : "View customers assigned to you"}
            </p>
          </div>

          {/* Admin Actions */}
          {isAdmin && (
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowImportExport(true)}
                disabled={isSaving}
                className="text-sm"
              >
                <Upload className="mr-2 h-4 w-4" />
                Import/Export CSV
              </Button>
              <Button
                onClick={handleAdd}
                disabled={isSaving}
                className="text-sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Customer
              </Button>
            </div>
          )}
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, phone, VC number, or address..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
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

        {/* Enhanced Customer Table */}
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-muted-foreground">Loading customers...</div>
            </CardContent>
          </Card>
        ) : (
          <CustomerTable
            customers={filteredCustomers}
            searchTerm={searchTerm}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            onView={handleView}
            onViewHistory={handleViewHistory}
            onPaymentCapture={handlePaymentCapture}
            onCustomerUpdate={handleCustomerUpdate}
          />
        )}

        {/* Customer Modal */}
        {isAdmin && (
          <CustomerModal
            key={editingCustomer?.id || "new"}
            open={isModalOpen}
            onOpenChange={handleCloseModal}
            customer={editingCustomer}
            onSave={handleSave}
            isSaving={isSaving}
          />
        )}

        {/* Delete Confirmation Dialog */}
        {isAdmin && (
          <AlertDialog
            open={!!deleteCustomer}
            onOpenChange={() => setDeleteCustomer(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete{" "}
                  <strong>{deleteCustomer?.name}</strong>? This action cannot be
                  undone and will permanently remove all customer data, billing
                  records, and payment history.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isSaving}>
                  Cancel
                </AlertDialogCancel>
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
        )}

        {/* CSV Import/Export Modal */}
        {isAdmin && (
          <CustomerImportExport
            open={showImportExport}
            onOpenChange={setShowImportExport}
            customers={customers}
            onImport={handleCsvImport}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
