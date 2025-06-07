import { useState, useEffect, useContext } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { CustomerModal } from "@/components/customers/CustomerModal";
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

  const { user, isAdmin } = useContext(AuthContext);
  const { toast } = useToast();

  // Load data once on mount
  useEffect(() => {
    async function loadCustomers() {
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
    }

    loadCustomers();
  }, []);

  // Simple search filter
  const filteredCustomers = customers.filter(
    (customer) =>
      !searchTerm ||
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phoneNumber.includes(searchTerm) ||
      customer.vcNumber.toLowerCase().includes(searchTerm.toLowerCase()),
  );

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

  async function handleSave(customer: Customer) {
    setIsSaving(true);
    try {
      if (editingCustomer) {
        await CustomerService.updateCustomer(customer.id, customer);
        setCustomers((prev) =>
          prev.map((c) => (c.id === customer.id ? customer : c)),
        );
        toast({
          title: "Success",
          description: "Customer updated successfully.",
        });
      } else {
        const newId = await CustomerService.addCustomer(customer);
        setCustomers((prev) => [...prev, { ...customer, id: newId }]);
        toast({
          title: "Success",
          description: "Customer added successfully.",
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

  async function handleDelete(customerId: string) {
    // Only admins can delete customers
    if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "Only administrators can delete customers.",
        variant: "destructive",
      });
      return;
    }

    try {
      await CustomerService.deleteCustomer(customerId);
      setCustomers((prev) => prev.filter((c) => c.id !== customerId));
      toast({
        title: "Success",
        description: "Customer deleted successfully.",
      });
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: "Failed to delete customer",
        variant: "destructive",
      });
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

  return (
    <DashboardLayout title="Customer Management">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Customer Management</h2>
            <p className="text-gray-600">
              {isAdmin
                ? "Manage customers with Status, Collector Name, and Last Payment"
                : "View customers assigned to you"}
            </p>
          </div>
          {/* Only show Add Customer button for admins */}
          {isAdmin && (
            <Button onClick={handleAdd} disabled={isSaving}>
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          )}
        </div>

        {/* Simple Search */}
        <Card>
          <CardContent className="pt-6">
            <Input
              placeholder="Search customers by name, phone, or VC number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isSaving}
            />
          </CardContent>
        </Card>

        {/* Results Summary - Made smaller and cleaner */}
        <div className="bg-gray-50 rounded-lg p-3 border">
          <div className="text-sm text-gray-600">
            Showing {filteredCustomers.length} of {customers.length} customers
          </div>
        </div>

        {/* Simple Table */}
        <Card>
          <CardHeader>
            <CardTitle>Customers</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="text-gray-500">Loading customers...</div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>VC Number</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Collector Name</TableHead>
                    <TableHead>Last Payment</TableHead>
                    {(isAdmin || filteredCustomers.some((c) => c.id)) && (
                      <TableHead className="text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        No customers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div className="font-medium">{customer.name}</div>
                            {customer.email && (
                              <div className="text-sm text-gray-500">
                                {customer.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="text-sm">
                              {customer.phoneNumber}
                            </div>
                            <div className="text-xs text-gray-500 max-w-xs truncate">
                              {customer.address}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">
                            {customer.vcNumber}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <Badge variant="outline">
                              {customer.currentPackage}
                            </Badge>
                            {customer.customPlan && (
                              <div className="text-xs text-blue-600 mt-1">
                                Custom: {customer.customPlan.name}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getStatusColor(customer.isActive)}
                          >
                            {customer.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {customer.collectorName}
                            </span>
                            <span className="text-xs text-gray-500">
                              Collector
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {formatDate(customer.lastPaymentDate)}
                            </span>
                            <span className="text-xs text-gray-500">
                              Last paid
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {/* Only show edit button for admins */}
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(customer)}
                                disabled={isSaving}
                                title="Edit Customer (Admin Only)"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {/* Only show delete button for admins */}
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(customer.id)}
                                disabled={isSaving}
                                className="text-red-600 hover:text-red-700"
                                title="Delete Customer (Admin Only)"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                            {/* For employees, show view-only indicator */}
                            {!isAdmin && (
                              <span className="text-xs text-gray-500 italic">
                                View Only
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

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
      </div>
    </DashboardLayout>
  );
}
