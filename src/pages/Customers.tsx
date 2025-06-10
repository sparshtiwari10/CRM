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
  const [areaFilter, setAreaFilter] = useState("all");
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
            console.log("📋 All customers loaded:");
            customerData.forEach((c) => {
              console.log(
                `  - ${c.name} → assigned to: "${c.collectorName}" (VC: ${c.vcNumber})`,
              );
            });

            // Show unique area assignments
            const uniqueAreas = [
              ...new Set(customerData.map((c) => c.collectorName)),
            ].filter(Boolean);
            console.log("📍 Areas with customers assigned:", uniqueAreas);
          }
        } else {
          // For employees, get customers assigned to them
          // Use collector_name if available, otherwise fall back to name
          const collectorName = user?.collector_name || user?.name || "";
          console.log(
            `🔍 Employee user - looking for customers assigned to: "${collectorName}"`,
          );

          // First, get ALL customers to debug assignment
          const allCustomers = await CustomerService.getAllCustomers();
          console.log("🔍 DEBUG - All customers in system:");
          allCustomers.forEach((c) => {
            console.log(
              `  - ${c.name} (VC: ${c.vcNumber}) → area: "${c.collectorName}"`,
            );
          });

          // Filter customers for this employee
          customerData = allCustomers.filter(
            (customer) => customer.collectorName === collectorName,
          );

          console.log(
            `📊 Filtered customers for "${collectorName}": ${customerData.length}`,
          );

          if (customerData.length === 0) {
            console.log("⚠️ No customers found for this employee");
            console.log("🔧 Possible solutions:");
            console.log(
              "     a) Check customer data: ensure collectorName matches employee name",
            );
            console.log(
              "     b) Check employee profile: ensure collector_name is set correctly in Firebase",
            );
            console.log("     c) Add customers and assign them to this area");

            toast({
              title: "No Customers Assigned",
              description: `No customers found assigned to your area "${collectorName}". Contact admin to assign customers to your area.`,
              variant: "destructive",
            });
          }
        }

        if (mounted) {
          setCustomers(customerData);
        }
      } catch (error) {
        console.error("Failed to load customers:", error);
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

    loadCustomers();

    return () => {
      mounted = false;
    };
  }, [user, isAdmin, toast]);

  // Filter customers based on current filters
  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch = searchTerm
      ? customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phoneNumber.includes(searchTerm) ||
        customer.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.vcNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.currentPackage.toLowerCase().includes(searchTerm.toLowerCase())
      : true;

    const matchesStatus =
      statusFilter === "all" || customer.status === statusFilter;

    const matchesArea =
      areaFilter === "all" || customer.collectorName === areaFilter;

    return matchesSearch && matchesStatus && matchesArea;
  });

  // Get unique areas for filter dropdown
  const uniqueAreas = [
    ...new Set(customers.map((customer) => customer.collectorName)),
  ].filter(Boolean);

  const handleCreateCustomer = () => {
    setEditingCustomer(null);
    setIsModalOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleDeleteCustomer = (customer: Customer) => {
    setDeleteCustomer(customer);
  };

  const handleViewCustomer = (customer: Customer) => {
    // Implement view customer details
    console.log("View customer:", customer);
  };

  const handleViewHistory = (customer: Customer) => {
    // Implement view customer history
    console.log("View history for:", customer);
  };

  const handleSaveCustomer = async (customerData: Customer) => {
    try {
      setIsSaving(true);

      if (editingCustomer) {
        // Update existing customer
        await CustomerService.updateCustomer(editingCustomer.id, customerData);
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === editingCustomer.id ? { ...customerData } : c,
          ),
        );
        toast({
          title: "Success",
          description: "Customer updated successfully",
        });
      } else {
        // Create new customer
        const newCustomer = await CustomerService.createCustomer(customerData);
        setCustomers((prev) => [...prev, newCustomer]);
        toast({
          title: "Success",
          description: "Customer created successfully",
        });
      }

      setIsModalOpen(false);
      setEditingCustomer(null);
    } catch (error) {
      console.error("Failed to save customer:", error);
      toast({
        title: "Error",
        description: "Failed to save customer",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteCustomer = async () => {
    if (!deleteCustomer) return;

    try {
      await CustomerService.deleteCustomer(deleteCustomer.id);
      setCustomers((prev) => prev.filter((c) => c.id !== deleteCustomer.id));
      toast({
        title: "Success",
        description: "Customer deleted successfully",
      });
      setDeleteCustomer(null);
    } catch (error) {
      console.error("Failed to delete customer:", error);
      toast({
        title: "Error",
        description: "Failed to delete customer",
        variant: "destructive",
      });
    }
  };

  const handleCustomerUpdate = async (
    customerId: string,
    updates: Partial<Customer>,
  ) => {
    try {
      await CustomerService.updateCustomer(customerId, updates);
      setCustomers((prev) =>
        prev.map((c) => (c.id === customerId ? { ...c, ...updates } : c)),
      );
    } catch (error) {
      console.error("Failed to update customer:", error);
      throw error;
    }
  };

  const handleImportCustomers = async (importedCustomers: Customer[]) => {
    try {
      const newCustomers = [];
      for (const customer of importedCustomers) {
        const newCustomer = await CustomerService.createCustomer(customer);
        newCustomers.push(newCustomer);
      }

      setCustomers((prev) => [...prev, ...newCustomers]);
      toast({
        title: "Import Successful",
        description: `${newCustomers.length} customers imported successfully`,
      });
    } catch (error) {
      console.error("Import failed:", error);
      toast({
        title: "Import Failed",
        description: "Failed to import customers",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout title="Customer Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Customer Management
            </h2>
            <p className="text-muted-foreground">
              {isAdmin
                ? "Manage all customers in the system"
                : `Manage customers in your area: ${user?.collector_name || user?.name}`}
            </p>
          </div>
          <div className="flex space-x-2">
            {isAdmin && (
              <Button
                variant="outline"
                onClick={() => setShowImportExport(true)}
              >
                <Upload className="mr-2 h-4 w-4" />
                Import/Export
              </Button>
            )}
            <Button onClick={handleCreateCustomer}>
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Customers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customers.length}</div>
              <p className="text-xs text-muted-foreground">
                {filteredCustomers.length} matching filters
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Customers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {customers.filter((c) => c.status === "active").length}
              </div>
              <p className="text-xs text-muted-foreground">
                {(
                  (customers.filter((c) => c.status === "active").length /
                    customers.length) *
                  100
                ).toFixed(1)}
                % of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {isAdmin ? "Total Areas" : "Your Area"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isAdmin ? uniqueAreas.length : 1}
              </div>
              <p className="text-xs text-muted-foreground">
                {isAdmin
                  ? `${uniqueAreas.length} areas covered`
                  : user?.collector_name || user?.name}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

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

              {isAdmin && uniqueAreas.length > 0 && (
                <Select value={areaFilter} onValueChange={setAreaFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by area" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Areas</SelectItem>
                    {uniqueAreas.map((area) => (
                      <SelectItem key={area} value={area}>
                        {area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {(searchTerm ||
                statusFilter !== "all" ||
                areaFilter !== "all") && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setAreaFilter("all");
                  }}
                  className="px-3"
                >
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Customer Table */}
        <CustomerTable
          customers={filteredCustomers}
          searchTerm={searchTerm}
          onEdit={handleEditCustomer}
          onDelete={handleDeleteCustomer}
          onView={handleViewCustomer}
          onViewHistory={handleViewHistory}
          onCustomerUpdate={handleCustomerUpdate}
          isLoading={isLoading}
        />

        {/* Customer Modal */}
        <CustomerModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          customer={editingCustomer}
          onSave={handleSaveCustomer}
          isLoading={isSaving}
        />

        {/* Import/Export Modal */}
        {isAdmin && (
          <CustomerImportExport
            open={showImportExport}
            onOpenChange={setShowImportExport}
            customers={customers}
            onImport={handleImportCustomers}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={!!deleteCustomer}
          onOpenChange={() => setDeleteCustomer(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Customer</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {deleteCustomer?.name}? This
                action cannot be undone and will remove all associated billing
                history.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteCustomer(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteCustomer}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete Customer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
