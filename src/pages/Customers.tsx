import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CustomerTable } from "@/components/customers/CustomerTable";
import { CustomerModal } from "@/components/customers/CustomerModal";
import { CustomerSearch } from "@/components/customers/CustomerSearch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Customer } from "@/types";
import { ActionRequest } from "@/types/auth";
import {
  mockCustomers,
  mockActionRequests,
  mockChangeHistory,
} from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>(mockCustomers);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    package: "",
    billingStatus: "",
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const { toast } = useToast();

  // Filter and search customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const matchesSearch =
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phoneNumber.includes(searchTerm) ||
        customer.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.vcNumber.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesPackage =
        !filters.package || customer.currentPackage === filters.package;
      const matchesStatus =
        !filters.billingStatus ||
        customer.billingStatus === filters.billingStatus;

      return matchesSearch && matchesPackage && matchesStatus;
    });
  }, [customers, searchTerm, filters]);
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

  const handleSaveCustomer = (
    customerData: Omit<Customer, "id"> & { id?: string },
  ) => {
    if (customerData.id) {
      // Edit existing customer
      setCustomers((prev) =>
        prev.map((customer) =>
          customer.id === customerData.id
            ? { ...(customerData as Customer) }
            : customer,
        ),
      );
      toast({
        title: "Customer updated",
        description: "Customer information has been successfully updated.",
      });
    } else {
      // Add new customer
      const newCustomer: Customer = {
        ...customerData,
        id: Date.now().toString(),
      } as Customer;
      setCustomers((prev) => [newCustomer, ...prev]);
      toast({
        title: "Customer added",
        description: "New customer has been successfully added.",
      });
    }
  };

  const handleDeleteCustomer = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    setCustomers((prev) =>
      prev.filter((customer) => customer.id !== customerId),
    );
    toast({
      title: "Customer deleted",
      description: `${customer?.name} has been successfully removed.`,
      variant: "destructive",
    });
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({ package: "", billingStatus: "" });
    setSearchTerm("");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getBillingStatusColor = (status: Customer["billingStatus"]) => {
    switch (status) {
      case "Paid":
        return "bg-green-100 text-green-800 border-green-200";
      case "Pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Overdue":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <DashboardLayout title="Customers">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Customer Management
            </h2>
            <p className="text-gray-600">
              Showing {filteredCustomers.length} of {customers.length} customers
            </p>
          </div>
          <Button onClick={handleAddCustomer}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Customer
          </Button>
        </div>

        {/* Search and Filters */}
        <CustomerSearch
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
        />

        {/* Customer Table */}
        <CustomerTable
          customers={filteredCustomers}
          onEdit={handleEditCustomer}
          onDelete={handleDeleteCustomer}
          onView={handleViewCustomer}
        />

        {/* Customer Modal */}
        <CustomerModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          customer={editingCustomer}
          onSave={handleSaveCustomer}
        />

        {/* View Customer Dialog */}
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
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Full Name
                    </label>
                    <p className="text-lg font-medium">
                      {viewingCustomer.name}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Phone Number
                    </label>
                    <p className="text-lg">{viewingCustomer.phoneNumber}</p>
                  </div>
                  {viewingCustomer.email && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Email
                      </label>
                      <p className="text-lg">{viewingCustomer.email}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Current Package
                    </label>
                    <div className="mt-1">
                      <Badge variant="outline" className="text-sm">
                        {viewingCustomer.currentPackage}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Address */}
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Address
                  </label>
                  <p className="text-lg mt-1">{viewingCustomer.address}</p>
                </div>

                <Separator />

                {/* Billing Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Billing Status
                    </label>
                    <div className="mt-1">
                      <Badge
                        variant="outline"
                        className={getBillingStatusColor(
                          viewingCustomer.billingStatus,
                        )}
                      >
                        {viewingCustomer.billingStatus}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Last Payment Date
                    </label>
                    <p className="text-lg">
                      {formatDate(viewingCustomer.lastPaymentDate)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Customer Since
                    </label>
                    <p className="text-lg">
                      {formatDate(viewingCustomer.joinDate)}
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
      </div>
    </DashboardLayout>
  );
}
