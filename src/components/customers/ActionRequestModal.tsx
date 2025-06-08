import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Search, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Customer } from "@/types";
import { ActionRequest } from "@/types/auth";
import { useAuth } from "@/contexts/AuthContext";
import { mockPackages } from "@/data/mockData";
import { CustomerService } from "@/services/customerService";
import { cn } from "@/lib/utils";

const actionRequestSchema = z.object({
  customerId: z.string().min(1, "Please select a customer"),
  vcNumber: z.string().min(1, "Please select a VC number"),
  actionType: z.enum(["activation", "deactivation", "plan_change"]),
  requestedPlan: z.string().optional(),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
});

type ActionRequestFormValues = z.infer<typeof actionRequestSchema>;

interface ActionRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  onSuccess: () => void;
  // Legacy props for backward compatibility
  customer?: Customer | null;
  onSubmit?: (request: Omit<ActionRequest, "id">) => void;
  defaultActionType?: "activation" | "deactivation" | "plan_change";
}

export function ActionRequestModal({
  open,
  onOpenChange,
  customers,
  onSuccess,
  customer,
  onSubmit,
  defaultActionType = "activation",
}: ActionRequestModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const { user } = useAuth();

  const form = useForm<ActionRequestFormValues>({
    resolver: zodResolver(actionRequestSchema),
    defaultValues: {
      customerId: customer?.id || "",
      vcNumber: "",
      actionType: defaultActionType,
      requestedPlan: "",
      reason: "",
    },
  });

  // Watch the action type to show/hide plan selection
  const actionType = form.watch("actionType");
  const customerId = form.watch("customerId");
  const vcNumber = form.watch("vcNumber");

  // Update selected customer when customer ID changes
  useEffect(() => {
    if (customerId) {
      const customer = customers.find((c) => c.id === customerId);
      setSelectedCustomer(customer || null);
      // Reset VC number when customer changes
      form.setValue("vcNumber", "");
    } else {
      setSelectedCustomer(null);
    }
  }, [customerId, customers, form]);

  // Filter customers based on search term
  useEffect(() => {
    if (!searchTerm || !showCustomerSearch) {
      setFilteredCustomers([]);
      return;
    }

    const filtered = customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.vcNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phoneNumber.includes(searchTerm),
    );

    setFilteredCustomers(filtered.slice(0, 10)); // Limit to 10 results
  }, [searchTerm, customers, showCustomerSearch]);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      const autoSelectedVC = customer?.vcNumber || "";

      form.reset({
        customerId: customer?.id || "",
        vcNumber: autoSelectedVC,
        actionType: defaultActionType,
        requestedPlan: "",
        reason: "",
      });
      setSelectedCustomer(customer || null);
      setSearchTerm(customer?.name || "");
      setShowCustomerSearch(!customer); // Show search if no pre-selected customer
    }
  }, [open, defaultActionType, form, customer]);

  // Auto-select VC when customer is selected and has only one VC
  useEffect(() => {
    if (selectedCustomer) {
      const vcNumbers = getVCNumbers();
      if (vcNumbers.length === 1) {
        form.setValue("vcNumber", vcNumbers[0].value);
      }
    }
  }, [selectedCustomer, form]);

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSearchTerm(customer.name);
    setFilteredCustomers([]);
    setShowCustomerSearch(false);
    form.setValue("customerId", customer.id);
    form.setValue("vcNumber", ""); // Reset VC selection
  };

  const handleClearSelection = () => {
    setSelectedCustomer(null);
    setSearchTerm("");
    setShowCustomerSearch(true);
    form.setValue("customerId", "");
    form.setValue("vcNumber", "");
  };

  const getVCNumbers = () => {
    if (!selectedCustomer) return [];

    const vcNumbers = [
      {
        value: selectedCustomer.vcNumber,
        label: `${selectedCustomer.vcNumber} (Primary)`,
        isPrimary: true,
      },
    ];

    // Add secondary VC numbers
    if (
      selectedCustomer.connections &&
      selectedCustomer.connections.length > 1
    ) {
      selectedCustomer.connections.forEach((conn, index) => {
        if (!conn.isPrimary) {
          vcNumbers.push({
            value: conn.vcNumber,
            label: `${conn.vcNumber} (Secondary ${index})`,
            isPrimary: false,
          });
        }
      });
    }

    return vcNumbers;
  };

  const getSelectedConnection = () => {
    if (!selectedCustomer || !vcNumber) return null;

    if (vcNumber === selectedCustomer.vcNumber) {
      return { isPrimary: true, status: selectedCustomer.status };
    }

    return (
      selectedCustomer.connections?.find(
        (conn) => conn.vcNumber === vcNumber,
      ) || null
    );
  };

  const handleSubmit = async (values: ActionRequestFormValues) => {
    if (!user) {
      console.error("User not authenticated");
      return;
    }

    const customerData =
      selectedCustomer || customers.find((c) => c.id === values.customerId);
    if (!customerData) {
      console.error("Selected customer not found");
      return;
    }

    setIsLoading(true);

    try {
      const connection = getSelectedConnection();
      const currentStatus = connection?.status || customerData.status;

      const request: Omit<ActionRequest, "id"> = {
        customerId: customerData.id,
        customerName: customerData.name,
        vcNumber: values.vcNumber,
        employeeId: user.id,
        employeeName: user.name,
        actionType: values.actionType,
        currentPlan: customerData.currentPackage,
        currentStatus: currentStatus,
        // Only include requestedPlan for plan_change actions
        ...(values.actionType === "plan_change" && values.requestedPlan
          ? { requestedPlan: values.requestedPlan }
          : {}),
        reason: values.reason,
        status: "pending",
        requestDate: new Date().toISOString().split("T")[0],
      };

      console.log("🔄 Submitting VC status change request:", request);

      // Submit to Firebase
      await CustomerService.addRequest(request);

      console.log("✅ VC status change request submitted successfully");

      // Call success callback or submit callback
      if (onSuccess) {
        onSuccess();
      } else if (onSubmit) {
        onSubmit(request);
      }

      handleClose();
    } catch (error) {
      console.error("❌ Error submitting request:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setSelectedCustomer(null);
    setSearchTerm("");
    setShowCustomerSearch(false);
    setFilteredCustomers([]);
    onOpenChange(false);
  };

  const getActionTypeDescription = (actionType: string) => {
    switch (actionType) {
      case "activation":
        return "Request to activate the selected VC number (change status to Active)";
      case "deactivation":
        return "Request to deactivate the selected VC number (change status to Inactive)";
      case "plan_change":
        return "Request to change the package plan for the selected VC number";
      default:
        return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit VC Status Change Request</DialogTitle>
          <DialogDescription>
            Submit a request for admin approval to change VC number status or
            plan
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <div className="space-y-4">
              {/* Customer Selection with Search */}
              {!customer && (
                <div className="space-y-2">
                  <FormLabel>Select Customer *</FormLabel>

                  {selectedCustomer ? (
                    // Selected customer display
                    <Card>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">
                              {selectedCustomer.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {selectedCustomer.vcNumber} •{" "}
                              {selectedCustomer.phoneNumber}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleClearSelection}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    // Search interface
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search by name, VC number, phone, or address..."
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setShowCustomerSearch(true);
                          }}
                          onFocus={() => setShowCustomerSearch(true)}
                          className="pl-10"
                        />
                      </div>

                      {/* Search Results */}
                      {filteredCustomers.length > 0 && (
                        <div className="border rounded-md max-h-48 overflow-y-auto">
                          {filteredCustomers.map((customer) => (
                            <div
                              key={customer.id}
                              className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                              onClick={() => handleCustomerSelect(customer)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium">
                                    {customer.name}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    VC: {customer.vcNumber} •{" "}
                                    {customer.phoneNumber}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {customer.address}
                                  </div>
                                </div>
                                <Badge
                                  variant={
                                    customer.isActive ? "default" : "secondary"
                                  }
                                >
                                  {customer.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Hidden form field for customer ID */}
              <FormField
                control={form.control}
                name="customerId"
                render={() => <input type="hidden" />}
              />

              {/* VC Number Selection */}
              {selectedCustomer && (
                <FormField
                  control={form.control}
                  name="vcNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select VC Number *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a VC number" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {getVCNumbers().map((vc) => (
                            <SelectItem key={vc.value} value={vc.value}>
                              {vc.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Customer Info Display */}
              {selectedCustomer && vcNumber && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h4 className="font-medium mb-2">Selected VC Information</h4>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div>
                      <strong>Customer:</strong> {selectedCustomer.name}
                    </div>
                    <div>
                      <strong>VC Number:</strong> {vcNumber}
                    </div>
                    <div>
                      <strong>Current Status:</strong>{" "}
                      <Badge
                        variant={
                          getSelectedConnection()?.status === "active"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {getSelectedConnection()?.status ||
                          selectedCustomer.status}
                      </Badge>
                    </div>
                    <div>
                      <strong>Current Package:</strong>{" "}
                      {selectedCustomer.currentPackage}
                    </div>
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="actionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Action Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select action type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="activation">
                          Request VC Activation
                        </SelectItem>
                        <SelectItem value="deactivation">
                          Request VC Deactivation
                        </SelectItem>
                        <SelectItem value="plan_change">
                          Request Plan Change
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="text-xs text-muted-foreground mt-1">
                      {getActionTypeDescription(field.value)}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {actionType === "plan_change" && (
                <FormField
                  control={form.control}
                  name="requestedPlan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Package *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select new package" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mockPackages.map((pkg) => (
                            <SelectItem key={pkg.id} value={pkg.name}>
                              {pkg.name} - ₹{pkg.price}/month
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Request *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Provide a detailed reason for this VC status change request..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !selectedCustomer || !vcNumber}
              >
                {isLoading ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
