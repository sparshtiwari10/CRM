import { useState, useEffect, useContext } from "react";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
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

  // Load once on mount
  useEffect(() => {
    loadData();
  }, []);

  // Simple search filter
  const filteredCustomers = customers.filter(
    (customer) =>
      !searchTerm ||
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phoneNumber.includes(searchTerm) ||
      customer.vcNumber.toLowerCase().includes(searchTerm.toLowerCase()),
  );

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

  const getBillingStatusColor = (status: string) => {
    switch (status) {
      case "Paid":
        return "bg-green-100 text-green-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

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
            <p className="text-gray-600">Manage your customers</p>
          </div>
          <Button onClick={handleAdd} disabled={isSaving}>
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        </div>

        {/* Debug Info */}
        <div className="bg-yellow-50 p-3 rounded text-sm">
          <p>
            Debug: Total: {customers.length}, Filtered:{" "}
            {filteredCustomers.length}, Loading: {isLoading ? "Yes" : "No"},
            Saving: {isSaving ? "Yes" : "No"}
          </p>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <Input
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isSaving}
            />
          </CardContent>
        </Card>

        {/* Simple Customer Table */}
        <Card>
          <CardHeader>
            <CardTitle>Customers ({filteredCustomers.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center">Loading customers...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>VC Number</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        No customers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">
                          {customer.name}
                        </TableCell>
                        <TableCell>{customer.vcNumber}</TableCell>
                        <TableCell>{customer.phoneNumber}</TableCell>
                        <TableCell>{customer.currentPackage}</TableCell>
                        <TableCell>
                          <Badge
                            className={getBillingStatusColor(
                              customer.billingStatus,
                            )}
                          >
                            {customer.billingStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(customer)}
                              disabled={isSaving}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(customer.id)}
                              disabled={isSaving}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
