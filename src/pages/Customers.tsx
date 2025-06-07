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
import { CustomerModal } from "@/components/customers/CustomerModal";
import { CustomerTable } from "@/components/customers/CustomerTable";
import { CustomerDataImport } from "@/components/admin/CustomerDataImport";
import { CustomerImportExport } from "@/components/customers/CustomerImportExport";
import { AuthContext } from "@/contexts/AuthContext";
import { CustomerService } from "@/services/customerService";
import { Customer } from "@/types";
import { ActionRequest } from "@/types/auth";
import { useToast } from "@/hooks/use-toast";

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [collectorFilter, setCollectorFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);

  const { user, isAdmin } = useContext(AuthContext);
  const { toast } = useToast();

  // Load customers on component mount
  useEffect(() => {
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

        setCustomers(customerData);
      } catch (error) {
        console.error("Error loading customers:", error);
        toast({
          title: "Error",
          description: "Failed to load customers",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      loadCustomers();
    }
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
      (statusFilter === "active" && customer.isActive) ||
      (statusFilter === "inactive" && !customer.isActive);

    const matchesCollector =
      collectorFilter === "all" || customer.collectorName === collectorFilter;

    return matchesSearch && matchesStatus && matchesCollector;
  });

  // Get unique collectors for filter dropdown
  const uniqueCollectors = Array.from(
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

  const handleView = (customer: Customer) => {
    // For now, view opens edit modal (read-only for employees)
    setEditingCustomer(customer);
    setIsModalOpen(true);
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

  const handleSave = async (customer: Customer) => {
    setIsSaving(true);
    try {
      if (editingCustomer) {
        await CustomerService.updateCustomer(customer.id, customer);
        setCustomers((prev) =>
          prev.map((c) => (c.id === customer.id ? customer : c)),
        );
        toast({
          title: "Customer Updated",
          description: `${customer.name} has been successfully updated.`,
        });
      } else {
        const newId = await CustomerService.addCustomer(customer);
        setCustomers((prev) => [...prev, { ...customer, id: newId }]);
        toast({
          title: "Customer Added",
          description: `${customer.name} has been successfully added.`,
        });
      }
      setIsModalOpen(false);
      setEditingCustomer(null);
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Error",
        description: "Failed to save customer",
        variant: "destructive",
      });
    } finally {
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

  const handleViewHistory = (customer: Customer) => {
    // For now, redirect to billing page or open billing modal
    toast({
      title: "Feature Coming Soon",
      description: "Full billing history view will be available soon.",
    });
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
            <h2 className="text-xl lg:text-2xl font-bold text-gray-900">
              Customer Management
            </h2>
            <p className="text-sm lg:text-base text-gray-600">
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

        {/* Import Data Panel */}
        {isAdmin && showImport && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Import Customer Data</CardTitle>
            </CardHeader>
            <CardContent>
              <CustomerDataImport onSuccess={handleImportSuccess} />
            </CardContent>
          </Card>
        )}

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
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
                </SelectContent>
              </Select>

              {/* Collector Filter */}
              <Select
                value={collectorFilter}
                onValueChange={setCollectorFilter}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by collector" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Collectors</SelectItem>
                  {uniqueCollectors.map((collector) => (
                    <SelectItem key={collector} value={collector}>
                      {collector}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <div className="text-sm text-blue-800">
            <span className="font-medium">
              Showing {filteredCustomers.length} of {customers.length} customers
            </span>
            {searchTerm && (
              <span className="ml-2">• Search: "{searchTerm}"</span>
            )}
            {statusFilter !== "all" && (
              <span className="ml-2">• Status: {statusFilter}</span>
            )}
            {collectorFilter !== "all" && (
              <span className="ml-2">• Collector: {collectorFilter}</span>
            )}
          </div>
        </div>

        {/* Enhanced Customer Table */}
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-gray-500">Loading customers...</div>
            </CardContent>
          </Card>
        ) : (
          <CustomerTable
            customers={filteredCustomers}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            onView={handleView}
            onActionRequest={handleActionRequest}
            onViewHistory={handleViewHistory}
          />
        )}

        {/* Customer Modal */}
        {isAdmin && (
          <CustomerModal
            open={isModalOpen}
            onOpenChange={setIsModalOpen}
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
