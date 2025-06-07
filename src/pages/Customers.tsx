import { useState, useEffect, useContext } from "react";
import { Plus, Search, Filter, X } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomerSearch } from "@/components/customers/CustomerSearch";
import { CustomerTable } from "@/components/customers/CustomerTable";
import { CustomerModal } from "@/components/customers/CustomerModal";
import { ActionRequestModal } from "@/components/customers/ActionRequestModal";
import { AuthContext } from "@/contexts/AuthContext";
import { CustomerService } from "@/services/customerService";
import { Customer } from "@/types";
import { ActionRequest } from "@/types/auth";
import { useToast } from "@/hooks/use-toast";

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [filters, setFilters] = useState({
    package: "",
    billingStatus: "",
  });

  const { user, isAdmin } = useContext(AuthContext);
  const { toast } = useToast();

  // Simple data loading function - no subscriptions or real-time updates
  const loadCustomers = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      let customerData: Customer[] = [];

      if (isAdmin) {
        customerData = await CustomerService.getAllCustomers();
      } else {
        customerData = await CustomerService.getCustomersByCollector(user.name);
      }

      console.log("Loaded customers:", customerData.length);
      setCustomers(customerData);
    } catch (error) {
      console.error("Error loading customers:", error);
      toast({
        title: "Error",
        description: "Failed to load customers. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load data only once on mount
  useEffect(() => {
    loadCustomers();
  }, []); // No dependencies to prevent re-runs

  // Simple filtering without complex dependencies
  useEffect(() => {
    let filtered = [...customers]; // Create new array to avoid mutations

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (customer) =>
          customer.name.toLowerCase().includes(term) ||
          customer.phoneNumber.includes(term) ||
          customer.address.toLowerCase().includes(term) ||
          customer.email?.toLowerCase().includes(term) ||
          customer.vcNumber.toLowerCase().includes(term),
      );
    }

    if (filters.package) {
      filtered = filtered.filter(
        (customer) => customer.currentPackage === filters.package,
      );
    }

    if (filters.billingStatus) {
      filtered = filtered.filter(
        (customer) => customer.billingStatus === filters.billingStatus,
      );
    }

    setFilteredCustomers(filtered);
  }, [customers, searchTerm, filters.package, filters.billingStatus]);

  const handleAddCustomer = () => {
    setEditingCustomer(null);
    setIsModalOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleViewCustomer = (customer: Customer) => {
    setViewingCustomer(customer);
  };

  const handleActionRequest = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowActionModal(true);
  };

  const handleActionRequestSuccess = () => {
    toast({
      title: "Request Submitted",
      description: "Your action request has been submitted for admin approval.",
    });
  };

  // Completely isolated save function
  const handleSave = async (customer: Customer) => {
    setIsSaving(true);
    console.log("Saving customer:", customer.id, customer.name);

    try {
      if (editingCustomer) {
        // Update existing customer
        console.log("Updating existing customer");
        await CustomerService.updateCustomer(customer.id, customer);

        // Update local state with simple array replacement
        setCustomers((prevCustomers) => {
          const newCustomers = prevCustomers.map((c) =>
            c.id === customer.id ? { ...customer } : c,
          );
          console.log("Updated customers array");
          return newCustomers;
        });

        toast({
          title: "Success",
          description: "Customer updated successfully.",
        });
      } else {
        // Add new customer
        console.log("Adding new customer");
        const newId = await CustomerService.addCustomer(customer);
        const newCustomer = { ...customer, id: newId };

        // Update local state with simple array addition
        setCustomers((prevCustomers) => {
          const newCustomers = [...prevCustomers, newCustomer];
          console.log("Added new customer to array");
          return newCustomers;
        });

        toast({
          title: "Customer added",
          description: "New customer has been successfully added.",
        });
      }

      // Close modal and reset state
      setIsModalOpen(false);
      setEditingCustomer(null);
    } catch (error: any) {
      console.error("Save customer error:", error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to save customer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      console.log("Save operation completed");
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    console.log("Deleting customer:", customerId);

    try {
      await CustomerService.deleteCustomer(customerId);

      // Update local state with simple array filter
      setCustomers((prevCustomers) => {
        const newCustomers = prevCustomers.filter((c) => c.id !== customerId);
        console.log("Removed customer from array");
        return newCustomers;
      });

      toast({
        title: "Customer deleted",
        description: `${customer?.name} has been successfully removed.`,
        variant: "destructive",
      });
    } catch (error: any) {
      console.error("Delete customer error:", error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to delete customer. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({ package: "", billingStatus: "" });
    setSearchTerm("");
  };

  const handleViewHistory = (customerId: string) => {
    toast({
      title: "View History",
      description: "History feature will be available soon.",
    });
  };

  // Manual refresh function
  const handleRefresh = () => {
    console.log("Manual refresh triggered");
    loadCustomers();
  };

  // Calculate stats
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) => c.isActive).length;
  const paidCustomers = customers.filter(
    (c) => c.billingStatus === "Paid",
  ).length;
  const overdueCustomers = customers.filter(
    (c) => c.billingStatus === "Overdue",
  ).length;

  return (
    <DashboardLayout title="Customer Management">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Customer Management
            </h2>
            <p className="text-gray-600">Manage your cable TV customers</p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              Refresh Data
            </Button>
            <Button onClick={handleAddCustomer}>
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          </div>
        </div>

        {/* Debug Info */}
        <div className="bg-blue-50 p-3 rounded text-sm">
          <p>
            Debug: Total customers: {customers.length}, Filtered:{" "}
            {filteredCustomers.length}, Loading: {isLoading ? "Yes" : "No"}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Customers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCustomers}</div>
              <p className="text-xs text-gray-600">{activeCustomers} active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Active Customers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {activeCustomers}
              </div>
              <p className="text-xs text-gray-600">Currently active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Paid Customers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {paidCustomers}
              </div>
              <p className="text-xs text-gray-600">Up to date</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Overdue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {overdueCustomers}
              </div>
              <p className="text-xs text-gray-600">Need attention</p>
            </CardContent>
          </Card>
        </div>

        {/* Simple Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="flex-1">
                <Input
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select
                value={filters.package}
                onValueChange={(value) => handleFilterChange("package", value)}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by package" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Packages</SelectItem>
                  <SelectItem value="Basic">Basic</SelectItem>
                  <SelectItem value="Premium HD">Premium HD</SelectItem>
                  <SelectItem value="Sports Package">Sports Package</SelectItem>
                  <SelectItem value="Family Bundle">Family Bundle</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.billingStatus}
                onValueChange={(value) =>
                  handleFilterChange("billingStatus", value)
                }
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Status</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
              {(searchTerm || filters.package || filters.billingStatus) && (
                <Button variant="outline" onClick={handleClearFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Customer Table */}
        <CustomerTable
          customers={filteredCustomers}
          onEdit={handleEditCustomer}
          onDelete={handleDeleteCustomer}
          onView={handleViewCustomer}
          onActionRequest={handleActionRequest}
          onViewHistory={handleViewHistory}
          isLoading={isLoading}
        />

        {/* Customer Modal */}
        <CustomerModal
          open={isModalOpen}
          onOpenChange={(open) => {
            setIsModalOpen(open);
            if (!open) {
              setEditingCustomer(null);
            }
          }}
          customer={editingCustomer}
          onSave={handleSave}
          isSaving={isSaving}
        />

        {/* Customer Details Modal */}
        <Dialog
          open={!!viewingCustomer}
          onOpenChange={() => setViewingCustomer(null)}
        >
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Customer Details</DialogTitle>
              <DialogDescription>
                Complete information for {viewingCustomer?.name}
              </DialogDescription>
            </DialogHeader>

            {viewingCustomer && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Name
                    </label>
                    <p className="text-lg font-medium">
                      {viewingCustomer.name}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      VC Number
                    </label>
                    <p className="text-lg font-medium">
                      {viewingCustomer.vcNumber}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Phone
                    </label>
                    <p className="text-lg font-medium">
                      {viewingCustomer.phoneNumber}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Email
                    </label>
                    <p className="text-lg font-medium">
                      {viewingCustomer.email || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Address
                    </label>
                    <p className="text-lg font-medium">
                      {viewingCustomer.address}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Current Package
                    </label>
                    <p className="text-lg font-medium">
                      {viewingCustomer.currentPackage}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setViewingCustomer(null)}
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      setViewingCustomer(null);
                      handleEditCustomer(viewingCustomer);
                    }}
                  >
                    Edit Customer
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Action Request Modal */}
        <ActionRequestModal
          open={showActionModal}
          onOpenChange={setShowActionModal}
          customers={selectedCustomer ? [selectedCustomer] : []}
          onSuccess={handleActionRequestSuccess}
        />
      </div>
    </DashboardLayout>
  );
}
