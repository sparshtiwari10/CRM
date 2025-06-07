import { useState, useEffect, useContext } from "react";
import { Plus } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomerModal } from "@/components/customers/CustomerModal";
import { CustomerTable } from "@/components/customers/CustomerTable";
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

  const { user, isAdmin } = useContext(AuthContext);
  const { toast } = useToast();

  // Load data once
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
    setEditingCustomer(null);
    setIsModalOpen(true);
  }

  function handleEdit(customer: Customer) {
    // Create a simple copy
    setEditingCustomer({
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
    });
    setIsModalOpen(true);
  }

  function handleView(customer: Customer) {
    handleEdit(customer); // For now, same as edit
  }

  function handleViewHistory(customer: Customer) {
    toast({
      title: "History",
      description: `Viewing history for ${customer.name}`,
    });
  }

  function handleActionRequest(request: Omit<ActionRequest, "id">) {
    toast({
      title: "Request Submitted",
      description: "Your action request has been submitted.",
    });
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

  return (
    <DashboardLayout title="Customer Management">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Customer Management</h2>
            <p className="text-gray-600">
              Manage customers with Status, Collector Name, and Last Payment
            </p>
          </div>
          <Button onClick={handleAdd} disabled={isSaving}>
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        </div>

        {/* Simple Search */}
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

        {/* Results */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600 mb-4">
              Showing {filteredCustomers.length} of {customers.length} customers
            </div>
          </CardContent>
        </Card>

        {/* Customer Table */}
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

        {/* Modal */}
        <CustomerModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          customer={editingCustomer}
          onSave={handleSave}
          isSaving={isSaving}
        />
      </div>
    </DashboardLayout>
  );
}
