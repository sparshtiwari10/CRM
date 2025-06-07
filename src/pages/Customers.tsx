import { useState, useMemo, useEffect } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Customer } from "@/types";
import { ActionRequest } from "@/types/auth";
import { CustomerService } from "@/services/customerService";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    package: "",
    billingStatus: "",
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();

  // Set up real-time listener for customers
  useEffect(() => {
    if (!user) return;

    let unsubscribe: (() => void) | undefined;
    setIsLoading(true);

    const setupListener = () => {
      const onCustomersUpdate = (updatedCustomers: Customer[]) => {
        // Use functional update to prevent stale closures
        setCustomers((prevCustomers) => {
          // Only update if the data actually changed
          if (
            JSON.stringify(prevCustomers) !== JSON.stringify(updatedCustomers)
          ) {
            return updatedCustomers;
          }
          return prevCustomers;
        });
        setIsLoading(false);
      };

      const onError = (error: Error) => {
        console.error("Error syncing customers:", error);
        toast({
          title: "Sync Error",
          description: "Failed to sync customer data. Please refresh the page.",
          variant: "destructive",
        });
        setIsLoading(false);
      };

      if (isAdmin) {
        // Admin can see all customers
        unsubscribe = CustomerService.subscribeToCustomers(
          onCustomersUpdate,
          onError,
        );
      } else {
        // Employee sees only assigned customers
        unsubscribe = CustomerService.subscribeToCustomersByCollector(
          user.name,
          onCustomersUpdate,
          onError,
        );
      }
    };

    // Add a small delay to prevent rapid re-subscriptions
    const timeoutId = setTimeout(setupListener, 100);

    return () => {
      clearTimeout(timeoutId);
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.id, isAdmin]); // Only depend on user.id and isAdmin, not the full user object

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

  const handleSaveCustomer = async (
    customerData: Omit<Customer, "id"> & { id?: string },
  ) => {
    setIsSaving(true);

    try {
      if (customerData.id) {
        // Edit existing customer
        await CustomerService.updateCustomer(customerData.id, customerData);
        toast({
          title: "Customer updated",
          description: "Customer information has been successfully updated.",
        });
      } else {
        // Add new customer
        const newCustomerId = await CustomerService.addCustomer(customerData);
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
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);

    try {
      await CustomerService.deleteCustomer(customerId);
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

  const handleActionRequest = (request: Omit<ActionRequest, "id">) => {
    // For now, just show a toast - you can implement request storage later
    toast({
      title: "Request submitted",
      description: "Your action request has been submitted for admin approval.",
    });
  };

  const handleEditSave = async (customer: Customer) => {
    try {
      await CustomerService.updateCustomer(customer.id, customer);

      toast({
        title: "Success",
        description: "Customer updated successfully.",
      });

      setEditingCustomer(null);

      // For admin, force a page reload to ensure responsiveness
      if (isAdmin) {
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update customer. Please try again.",
        variant: "destructive",
      });
    }
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

  // Loading skeleton
  if (isLoading) {
    return (
      <DashboardLayout title="Customers">
        <div className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-10 w-40" />
          </div>

          <Card>
            <CardContent className="pt-6">
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-64" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

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
              {!isAdmin && " (assigned to you)"}
            </p>
          </div>
          {isAdmin && (
            <Button onClick={handleAddCustomer}>
              <Plus className="mr-2 h-4 w-4" />
              Add New Customer
            </Button>
          )}
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
          onActionRequest={handleActionRequest}
          onViewHistory={handleViewHistory}
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
          onSave={handleSaveCustomer}
          isLoading={isSaving}
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
                      VC Number
                    </label>
                    <p className="text-lg font-mono">
                      {viewingCustomer.vcNumber}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Service Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Assigned Collector
                    </label>
                    <p className="text-lg">{viewingCustomer.collectorName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Service Status
                    </label>
                    <div className="mt-1">
                      <Badge
                        variant="outline"
                        className={
                          viewingCustomer.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }
                      >
                        {viewingCustomer.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
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

                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  {viewingCustomer.activationDate && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Activation Date
                      </label>
                      <p className="text-lg">
                        {formatDate(viewingCustomer.activationDate)}
                      </p>
                    </div>
                  )}
                  {viewingCustomer.deactivationDate && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Deactivation Date
                      </label>
                      <p className="text-lg">
                        {formatDate(viewingCustomer.deactivationDate)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Admin-only portal bill */}
                {isAdmin && viewingCustomer.portalBill && (
                  <>
                    <Separator />
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Portal Bill (Admin Only)
                      </label>
                      <p className="text-lg font-bold">
                        ${viewingCustomer.portalBill.toFixed(2)}
                      </p>
                    </div>
                  </>
                )}

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setViewingCustomer(null)}
                  >
                    Close
                  </Button>
                  {isAdmin && (
                    <Button
                      onClick={() => {
                        setViewingCustomer(null);
                        handleEditCustomer(viewingCustomer);
                      }}
                    >
                      Edit Customer
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
