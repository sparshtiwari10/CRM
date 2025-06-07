import { useState, useEffect, useContext } from "react";
import {
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  Upload,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { CustomerModal } from "@/components/customers/CustomerModal";
import { CustomerTable } from "@/components/customers/CustomerTable";
import { CustomerDataImport } from "@/components/admin/CustomerDataImport";
import { AuthContext } from "@/contexts/AuthContext";
import { CustomerService } from "@/services/customerService";
import { Customer } from "@/types";
import { useToast } from "@/hooks/use-toast";

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  const { user, isAdmin } = useContext(AuthContext);
  const { toast } = useToast();

  // Load customers function
  const loadCustomers = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const data = isAdmin
        ? await CustomerService.getAllCustomers()
        : await CustomerService.getCustomersByCollector(user.name);
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

  // Load data once on mount
  useEffect(() => {
    loadCustomers();
  }, []);

  // Enhanced search and status filter
  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      !searchTerm ||
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phoneNumber.includes(searchTerm) ||
      customer.vcNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.address.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && customer.isActive) ||
      (statusFilter === "inactive" && !customer.isActive) ||
      (statusFilter === "paid" && customer.billingStatus === "Paid") ||
      (statusFilter === "pending" && customer.billingStatus === "Pending") ||
      (statusFilter === "overdue" && customer.billingStatus === "Overdue");

    return matchesSearch && matchesStatus;
  });

  function handleAdd() {
    // Only admins can add customers
    if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "Only administrators can add new customers.",
        variant: "destructive",
      });
      return;
    }
    setEditingCustomer(null);
    setIsModalOpen(true);
  }

  function handleEdit(customer: Customer) {
    // Only admins can edit customers
    if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "Only administrators can edit customer details.",
        variant: "destructive",
      });
      return;
    }

    console.log("Edit clicked for:", customer.name);
    // Create a simple copy without complex operations
    const customerCopy = {
      id: customer.id,
      name: customer.name,
      phoneNumber: customer.phoneNumber,
      email: customer.email,
      address: customer.address,
      vcNumber: customer.vcNumber,
      currentPackage: customer.currentPackage,
      collectorName: customer.collectorName,
      billingStatus: customer.billingStatus,
      isActive: customer.isActive,
      portalBill: customer.portalBill,
      lastPaymentDate: customer.lastPaymentDate,
      joinDate: customer.joinDate,
      activationDate: customer.activationDate,
      deactivationDate: customer.deactivationDate,
      numberOfConnections: customer.numberOfConnections || 1,
      connections: customer.connections || [],
      customPlan: customer.customPlan,
    };
    setEditingCustomer(customerCopy);
    setIsModalOpen(true);
  }

  function handleDeleteClick(customer: Customer) {
    // Only admins can delete customers
    if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "Only administrators can delete customers.",
        variant: "destructive",
      });
      return;
    }
    setDeleteCustomer(customer);
  }

  async function handleDeleteConfirm() {
    if (!deleteCustomer) return;

    try {
      await CustomerService.deleteCustomer(deleteCustomer.id);
      setCustomers((prev) => prev.filter((c) => c.id !== deleteCustomer.id));

      // Show toast notification at bottom for mobile
      toast({
        title: "Customer Deleted",
        description: `${deleteCustomer.name} has been successfully deleted.`,
        variant: "destructive",
        className:
          "lg:bottom-4 lg:right-4 bottom-2 right-2 left-2 lg:left-auto lg:max-w-sm",
      });

      setDeleteCustomer(null);
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: "Failed to delete customer",
        variant: "destructive",
      });
    }
  }

  async function handleSave(customer: Customer) {
    setIsSaving(true);
    try {
      if (editingCustomer) {
        await CustomerService.updateCustomer(customer.id, customer);
        setCustomers((prev) =>
          prev.map((c) => (c.id === customer.id ? customer : c)),
        );

        // Show toast notification at bottom for mobile
        toast({
          title: "Customer Updated",
          description: `${customer.name} has been successfully updated.`,
          className:
            "lg:bottom-4 lg:right-4 bottom-2 right-2 left-2 lg:left-auto lg:max-w-sm",
        });
      } else {
        const newId = await CustomerService.addCustomer(customer);
        setCustomers((prev) => [...prev, { ...customer, id: newId }]);

        // Show toast notification at bottom for mobile
        toast({
          title: "Customer Added",
          description: `${customer.name} has been successfully added.`,
          className:
            "lg:bottom-4 lg:right-4 bottom-2 right-2 left-2 lg:left-auto lg:max-w-sm",
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
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? "bg-green-100 text-green-800 border-green-200"
      : "bg-red-100 text-red-800 border-red-200";
  };

  const getBillingStatusColor = (status: string) => {
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
    <DashboardLayout title="Customer Management">
      <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold">
              Customer Management
            </h2>
            <p className="text-sm lg:text-base text-gray-600">
              {isAdmin
                ? "Manage customers with Status, Collector Name, and Last Payment"
                : "View customers assigned to you"}
            </p>
          </div>
          {/* Only show Add Customer and Import buttons for admins */}
          {isAdmin && (
            <div className="flex space-x-2">
              <Button
                onClick={handleAdd}
                disabled={isSaving}
                className="lg:h-10 h-8 text-sm lg:text-base"
              >
                <Plus className="mr-1 lg:mr-2 h-3 w-3 lg:h-4 lg:w-4" />
                <span className="hidden sm:inline">Add Customer</span>
                <span className="sm:hidden">Add</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowImport(!showImport)}
                disabled={isSaving}
                className="lg:h-10 h-8 text-sm lg:text-base"
              >
                <Upload className="mr-1 lg:mr-2 h-3 w-3 lg:h-4 lg:w-4" />
                <span className="hidden sm:inline">Import Data</span>
                <span className="sm:hidden">Import</span>
              </Button>
            </div>
          )}
        </div>

        {/* Search and Status Filter */}
        <Card>
          <CardContent className="pt-4 lg:pt-6">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="flex-1">
                <Input
                  placeholder="Search customers by name, phone, VC number, or address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={isSaving}
                  className="text-sm lg:text-base"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Import Data Section - Only for admins */}
        {isAdmin && showImport && (
          <CustomerDataImport
            onImportComplete={() => {
              loadCustomers(); // Refresh the customer list
              setShowImport(false); // Hide the import section
            }}
          />
        )}

        {/* Results Summary - Smaller and cleaner */}
        <div className="bg-gray-50 rounded-lg p-2 lg:p-3 border">
          <div className="text-xs lg:text-sm text-gray-600">
            Showing {filteredCustomers.length} of {customers.length} customers
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
            onView={handleEdit} // For now, view opens edit modal
            onActionRequest={() => {}} // Handle action requests for employees
            onViewHistory={handleEdit} // For now, view history opens edit modal
          />
        )}
                        </div>
                        <div>
                          <span className="text-gray-500">Collector:</span>
                          <div className="font-medium">
                            {customer.collectorName}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Billing Status:</span>
                          <div>
                            <Badge
                              variant="outline"
                              className={getBillingStatusColor(
                                customer.billingStatus,
                              )}
                              size="sm"
                            >
                              {customer.billingStatus}
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Connections:</span>
                          <div className="font-medium">
                            {customer.numberOfConnections || 1}
                          </div>
                        </div>
                      </div>

                      {/* Admin actions in mobile view */}
                      {isAdmin && (
                        <div className="flex space-x-2 pt-2 border-t border-gray-100">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(customer);
                            }}
                            disabled={isSaving}
                            className="flex-1"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(customer);
                            }}
                            disabled={isSaving}
                            className="flex-1 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      )}

                      {/* Employee view-only indicator */}
                      {!isAdmin && (
                        <div className="text-center pt-2 border-t border-gray-100">
                          <span className="text-xs text-gray-500 italic">
                            View Only - Contact administrator for changes
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Customer Modal - Only for admins */}
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
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
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