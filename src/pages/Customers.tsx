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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CustomerModal from "@/components/customers/CustomerModal";
import EnhancedCustomerTable from "@/components/customers/EnhancedCustomerTable";
import { CustomerImportExport } from "@/components/customers/CustomerImportExport";
import { AuthContext } from "@/contexts/AuthContext";
import { CustomerService } from "@/services/customerService";
import { authService } from "@/services/authService";
import { AreaService } from "@/services/areaService";
import { Customer } from "@/types";
import { ActionRequest } from "@/types/auth";
import { useToast } from "@/hooks/use-toast";

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [managedAreas, setManagedAreas] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);

  // Customer details modal
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Customer history modal
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [customerHistory, setCustomerHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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
          const userAreas =
            user?.assigned_areas ||
            (user?.collector_name ? [user.collector_name] : []);
          console.log(
            `🔍 Employee user - looking for customers assigned to areas: ${userAreas.join(", ")}`,
          );

          // First, get ALL customers to debug assignment
          const allCustomers = await CustomerService.getAllCustomers();
          console.log("🔍 DEBUG - All customers in system:");
          allCustomers.forEach((c) => {
            console.log(
              `  - ${c.name} (VC: ${c.vcNumber}) → area: "${c.collectorName}"`,
            );
          });

          // Filter customers for this employee's areas
          customerData = allCustomers.filter((customer) =>
            userAreas.includes(customer.collectorName),
          );

          console.log(
            `📊 Filtered customers for areas "${userAreas.join(", ")}": ${customerData.length}`,
          );

          if (customerData.length === 0) {
            console.log("⚠️ No customers found for this employee");
            console.log("🔧 Possible solutions:");
            console.log(
              "     a) Check customer data: ensure collectorName matches employee areas",
            );
            console.log(
              "     b) Check employee profile: ensure assigned_areas is set correctly in Firebase",
            );
            console.log(
              "     c) Add customers and assign them to employee areas",
            );

            toast({
              title: "No Customers Assigned",
              description: `No customers found assigned to your areas: ${userAreas.join(", ")}. Contact admin to assign customers to your areas.`,
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

    const loadManagedAreas = async () => {
      try {
        const areaNames = await AreaService.getAreaNames();
        if (mounted) {
          setManagedAreas(areaNames);
        }
      } catch (error) {
        console.error("Failed to load managed areas:", error);
        // Fallback will be handled in the component rendering
      }
    };

    loadCustomers();
    loadManagedAreas();

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

  // Get areas for filter dropdown - prioritize managed areas, fallback to customer areas
  const uniqueAreas =
    managedAreas.length > 0
      ? managedAreas
      : [
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
    console.log("📋 Opening customer details for:", customer.name);
    setViewingCustomer(customer);
    setShowDetailsModal(true);
  };

  const handleViewHistory = async (customer: Customer) => {
    console.log("📈 Loading customer history for:", customer.name);
    setHistoryCustomer(customer);
    setShowHistoryModal(true);
    setLoadingHistory(true);

    try {
      // Load customer billing history and other historical data
      const billingHistory = await CustomerService.getBillingHistory(
        customer.id,
      );

      // Create a comprehensive history from different sources
      const history = [
        ...billingHistory.map((record) => ({
          type: "billing",
          date: record.paymentDate,
          description: `Payment of ₹${record.amountPaid} for ${record.billingMonth}`,
          amount: record.amountPaid,
          status: record.paymentStatus,
          details: record,
        })),
        // Add more history types here (status changes, plan changes, etc.)
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setCustomerHistory(history);
    } catch (error) {
      console.error("Failed to load customer history:", error);
      toast({
        title: "Error",
        description: "Failed to load customer history",
        variant: "destructive",
      });
      setCustomerHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSaveCustomer = async (customerData: Customer) => {
    try {
      setIsSaving(true);

      if (editingCustomer) {
        // Update existing customer
        const updatedCustomer = await CustomerService.updateCustomer(
          editingCustomer.id,
          customerData,
        );

        // Update the customers state with the new data including the ID
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === editingCustomer.id
              ? { ...updatedCustomer, id: editingCustomer.id }
              : c,
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

      // Close modal and reset state
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
      // If status is being updated, also update connection statuses and add status log
      const customer = customers.find((c) => c.id === customerId);
      if (!customer) {
        throw new Error("Customer not found");
      }

      let enhancedUpdates = { ...updates };

      // Handle status changes
      if (updates.status && updates.status !== customer.status) {
        const newStatus = updates.status;

        // Ensure isActive is also updated for consistency
        enhancedUpdates.isActive = newStatus === "active";

        // Update connection statuses if they exist
        if (customer.connections && customer.connections.length > 0) {
          enhancedUpdates.connections = customer.connections.map((conn) => ({
            ...conn,
            status: newStatus as any, // Update all connections to the new status
          }));
        }

        // Add status log entry
        const statusLog = {
          id: `log-${Date.now()}`,
          customerId: customerId,
          previousStatus: customer.status,
          newStatus: newStatus,
          changedBy: user?.name || "Unknown",
          changedAt: new Date(),
          reason: `Status changed to ${newStatus}`,
        };

        enhancedUpdates.statusLogs = [
          ...(customer.statusLogs || []),
          statusLog,
        ];

        console.log(
          `🔄 Updating customer ${customer.name} status from ${customer.status} to ${newStatus}`,
        );
      }

      // Update the customer in Firestore
      await CustomerService.updateCustomer(customerId, enhancedUpdates);

      // Update local state with all the enhanced updates
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === customerId ? { ...c, ...enhancedUpdates } : c,
        ),
      );

      // Force a reload of customer data after status change to ensure consistency
      if (updates.status) {
        try {
          const updatedCustomer = await CustomerService.getCustomer(customerId);
          setCustomers((prev) =>
            prev.map((c) => (c.id === customerId ? updatedCustomer : c)),
          );
          console.log(
            `🔄 Reloaded customer ${customer.name} data from database`,
          );
        } catch (reloadError) {
          console.warn("Failed to reload customer data:", reloadError);
          // Continue without reloading if it fails
        }
      }

      console.log(`✅ Customer ${customer.name} updated successfully`);
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
                : `Manage customers in your areas: ${user?.assigned_areas?.join(", ") || user?.collector_name || user?.name}`}
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
            {isAdmin && (
              <Button onClick={handleCreateCustomer}>
                <Plus className="mr-2 h-4 w-4" />
                Add Customer
              </Button>
            )}
          </div>
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
        <EnhancedCustomerTable
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
          onOpenChange={(open) => {
            setIsModalOpen(open);
            if (!open) {
              setEditingCustomer(null);
              setIsSaving(false);
            }
          }}
          customer={editingCustomer}
          onSave={handleSaveCustomer}
          isLoading={isSaving}
        />

        {/* Customer Details Modal */}
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Customer Details
                {viewingCustomer?.name ? ` - ${viewingCustomer.name}` : ""}
              </DialogTitle>
              <DialogDescription>
                Complete customer information and service details
              </DialogDescription>
            </DialogHeader>

            {viewingCustomer && (
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3">Contact Information</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>Phone:</strong> {viewingCustomer.phoneNumber}
                      </div>
                      {viewingCustomer.email && (
                        <div>
                          <strong>Email:</strong> {viewingCustomer.email}
                        </div>
                      )}
                      <div>
                        <strong>Address:</strong> {viewingCustomer.address}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Service Information</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>VC Number:</strong> {viewingCustomer.vcNumber}
                      </div>
                      <div>
                        <strong>Package:</strong>{" "}
                        {viewingCustomer.currentPackage}
                      </div>
                      <div>
                        <strong>Monthly Amount:</strong> ₹
                        {viewingCustomer.packageAmount || 0}
                      </div>
                      <div>
                        <strong>Status:</strong> {viewingCustomer.status}
                      </div>
                      <div>
                        <strong>Area:</strong> {viewingCustomer.collectorName}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Billing Info */}
                <div>
                  <h3 className="font-semibold mb-3">Billing Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <strong>Join Date:</strong> {viewingCustomer.joinDate}
                    </div>
                    <div>
                      <strong>Last Payment:</strong>{" "}
                      {viewingCustomer.lastPaymentDate}
                    </div>
                    <div>
                      <strong>Outstanding:</strong> ₹
                      {viewingCustomer.currentOutstanding || 0}
                    </div>
                  </div>
                </div>

                {/* Connections */}
                {viewingCustomer.connections &&
                  viewingCustomer.connections.length > 1 && (
                    <div>
                      <h3 className="font-semibold mb-3">All Connections</h3>
                      <div className="space-y-2">
                        {viewingCustomer.connections.map((conn, index) => (
                          <div key={conn.id} className="border rounded p-3">
                            <div className="flex justify-between items-center">
                              <div>
                                <strong>VC: {conn.vcNumber}</strong>{" "}
                                {conn.isPrimary && (
                                  <span className="text-blue-600">
                                    (Primary)
                                  </span>
                                )}
                                <div className="text-sm text-muted-foreground">
                                  {conn.planName} - ₹{conn.packageAmount || 0}
                                  /month
                                </div>
                              </div>
                              <div className="text-sm">
                                Status: {conn.status || "active"}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Customer History Modal */}
        <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Customer History
                {historyCustomer?.name ? ` - ${historyCustomer.name}` : ""}
              </DialogTitle>
              <DialogDescription>
                Complete transaction and service history
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {loadingHistory ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="mt-2 text-muted-foreground">
                    Loading history...
                  </p>
                </div>
              ) : customerHistory.length > 0 ? (
                <div className="space-y-3">
                  {customerHistory.map((record, index) => (
                    <div key={index} className="border rounded p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">
                            {record.description}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(record.date).toLocaleDateString()} •{" "}
                            {record.type}
                          </div>
                        </div>
                        <div className="text-right">
                          {record.amount && (
                            <div className="font-medium">₹{record.amount}</div>
                          )}
                          {record.status && (
                            <div
                              className={`text-sm ${record.status === "Paid" ? "text-green-600" : "text-red-600"}`}
                            >
                              {record.status}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No history records found
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

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
