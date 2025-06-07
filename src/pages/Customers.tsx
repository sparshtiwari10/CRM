import { useState, useEffect, useContext } from "react";
import { Plus } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CustomerModal } from "@/components/customers/CustomerModal";
import { CustomerTable } from "@/components/customers/CustomerTable";
import { CustomerSearch } from "@/components/customers/CustomerSearch";
import { AuthContext } from "@/contexts/AuthContext";
import { CustomerService } from "@/services/customerService";
import { Customer } from "@/types";
import { ActionRequest } from "@/types/auth";
import { useToast } from "@/hooks/use-toast";

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [packageFilter, setPackageFilter] = useState("all");

  const { user, isAdmin } = useContext(AuthContext);
  const { toast } = useToast();

  // Simple data loading - no dependencies
  const loadData = async () => {
    if (!user) return;

    console.log("Loading customers...");
    setIsLoading(true);

    try {
      const data = isAdmin
        ? await CustomerService.getAllCustomers()
        : await CustomerService.getCustomersByCollector(user.name);

      console.log("Loaded customers:", data.length);
      setCustomers(data);
    } catch (error) {
      console.error("Load error:", error);
      toast({
        title: "Error",
        description: "Failed to load customers",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load once on mount and when user changes
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Enhanced search and filter
  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      !searchTerm ||
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phoneNumber.includes(searchTerm) ||
      customer.vcNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.collectorName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && customer.isActive) ||
      (statusFilter === "inactive" && !customer.isActive);

    const matchesPackage =
      packageFilter === "all" || customer.currentPackage === packageFilter;

    return matchesSearch && matchesStatus && matchesPackage;
  });

  const handleAdd = () => {
    console.log("Add customer clicked");
    setEditingCustomer(null);
    setIsModalOpen(true);
  };

  const handleEdit = (customer: Customer) => {
    console.log("Edit customer clicked:", customer.id);
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleView = (customer: Customer) => {
    console.log("View customer clicked:", customer.id);
    // For now, just open edit modal in view mode
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleViewHistory = (customer: Customer) => {
    console.log("View history clicked:", customer.id);
    toast({
      title: "History",
      description: `Viewing history for ${customer.name}`,
    });
  };

  const handleActionRequest = (request: Omit<ActionRequest, "id">) => {
    console.log("Action request:", request);
    toast({
      title: "Request Submitted",
      description: "Your action request has been submitted for admin approval.",
    });
  };

  const handleSave = async (customer: Customer) => {
    console.log("Save started:", customer.id, customer.name);
    setIsSaving(true);

    try {
      if (editingCustomer) {
        console.log("Updating customer...");
        await CustomerService.updateCustomer(customer.id, customer);

        // Simple state update - no complex logic
        setCustomers((prev) =>
          prev.map((c) => (c.id === customer.id ? customer : c)),
        );

        toast({
          title: "Success",
          description: "Customer updated successfully.",
        });
      } else {
        console.log("Adding customer...");
        const newId = await CustomerService.addCustomer(customer);
        const newCustomer = { ...customer, id: newId };

        setCustomers((prev) => [...prev, newCustomer]);

        toast({
          title: "Success",
          description: "Customer added successfully.",
        });
      }

      console.log("Closing modal...");
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
      console.log("Save completed");
      setIsSaving(false);
    }
  };

  const handleDelete = async (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    console.log("Delete customer:", customerId);

    try {
      await CustomerService.deleteCustomer(customerId);
      setCustomers((prev) => prev.filter((c) => c.id !== customerId));

      toast({
        title: "Success",
        description: `${customer?.name} deleted successfully.`,
        variant: "destructive",
      });
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: "Failed to delete customer",
        variant: "destructive",
      });
    }
  };

  const uniquePackages = Array.from(
    new Set(customers.map((c) => c.currentPackage)),
  );

  console.log(
    "Render - customers:",
    customers.length,
    "loading:",
    isLoading,
    "saving:",
    isSaving,
  );

  return (
    <DashboardLayout title="Customer Management">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Customer Management</h2>
            <p className="text-gray-600">
              Manage your customers with enhanced Status, Collector Name, and
              Last Payment details
            </p>
          </div>
          <Button onClick={handleAdd} disabled={isSaving}>
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        </div>

        {/* Search and Filters */}
        <CustomerSearch
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          packageFilter={packageFilter}
          onPackageFilterChange={setPackageFilter}
          packages={uniquePackages}
        />

        {/* Results Summary */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div>
                Showing {filteredCustomers.length} of {customers.length}{" "}
                customers
              </div>
              <div className="flex space-x-4">
                <span>
                  Active: {customers.filter((c) => c.isActive).length}
                </span>
                <span>
                  Inactive: {customers.filter((c) => !c.isActive).length}
                </span>
                <span>
                  Overdue:{" "}
                  {
                    customers.filter((c) => c.billingStatus === "Overdue")
                      .length
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

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
            onDelete={handleDelete}
            onView={handleView}
            onActionRequest={handleActionRequest}
            onViewHistory={handleViewHistory}
          />
        )}

        {/* Customer Modal */}
        <CustomerModal
          open={isModalOpen}
          onOpenChange={(open) => {
            console.log("Modal open change:", open);
            if (!isSaving) {
              setIsModalOpen(open);
              if (!open) {
                setEditingCustomer(null);
              }
            }
          }}
          customer={editingCustomer}
          onSave={handleSave}
          isSaving={isSaving}
        />
      </div>
    </DashboardLayout>
  );
}
