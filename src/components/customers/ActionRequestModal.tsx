import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Customer } from "@/types";
import { ActionRequest } from "@/types/auth";
import { useAuth } from "@/contexts/AuthContext";
import { mockPackages } from "@/data/mockData";
import { CustomerService } from "@/services/customerService";

const actionRequestSchema = z.object({
  customerId: z.string().min(1, "Please select a customer"),
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
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const { user } = useAuth();

  const form = useForm<ActionRequestFormValues>({
    resolver: zodResolver(actionRequestSchema),
    defaultValues: {
      customerId: customer?.id || "",
      actionType: defaultActionType,
      requestedPlan: "",
      reason: "",
    },
  });

  // Watch the action type to show/hide plan selection
  const actionType = form.watch("actionType");
  const customerId = form.watch("customerId");

  // Update selected customer when customer ID changes
  useEffect(() => {
    if (customerId) {
      const customer = customers.find((c) => c.id === customerId);
      setSelectedCustomer(customer || null);
    } else {
      setSelectedCustomer(null);
    }
  }, [customerId, customers]);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      form.reset({
        customerId: customer?.id || "",
        actionType: defaultActionType,
        requestedPlan: "",
        reason: "",
      });
      setSelectedCustomer(customer || null);
    }
  }, [open, defaultActionType, form, customer]);

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
      const request: Omit<ActionRequest, "id"> = {
        customerId: customerData.id,
        customerName: customerData.name,
        employeeId: user.id,
        employeeName: user.name,
        actionType: values.actionType,
        currentPlan: customerData.currentPackage,
        // Only include requestedPlan for plan_change actions
        ...(values.actionType === "plan_change" && values.requestedPlan
          ? { requestedPlan: values.requestedPlan }
          : {}),
        reason: values.reason,
        status: "pending",
        requestDate: new Date().toISOString().split("T")[0],
      };

      console.log("🔄 Submitting action request:", request);

      // Submit to Firebase
      await CustomerService.addRequest(request);

      console.log("✅ Action request submitted successfully");

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
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Submit Action Request</DialogTitle>
          <DialogDescription>
            Submit a request for admin approval to perform an action on a
            customer
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <div className="space-y-4">
              {/* Customer Selection - only show if not pre-selected */}
              {!customer && (
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Customer *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a customer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name} - {customer.vcNumber} (
                              {customer.currentPackage})
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
              {(selectedCustomer || customer) && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h4 className="font-medium mb-2">Customer Information</h4>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div>
                      <strong>Name:</strong>{" "}
                      {(selectedCustomer || customer)?.name}
                    </div>
                    <div>
                      <strong>Current Package:</strong>{" "}
                      {(selectedCustomer || customer)?.currentPackage}
                    </div>
                    <div>
                      <strong>Status:</strong>{" "}
                      {(selectedCustomer || customer)?.isActive
                        ? "Active"
                        : "Inactive"}
                    </div>
                    <div>
                      <strong>VC Number:</strong>{" "}
                      {(selectedCustomer || customer)?.vcNumber}
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
                          Request Activation
                        </SelectItem>
                        <SelectItem value="deactivation">
                          Request Deactivation
                        </SelectItem>
                        <SelectItem value="plan_change">
                          Request Plan Change
                        </SelectItem>
                      </SelectContent>
                    </Select>
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
                        placeholder="Provide a detailed reason for this action request..."
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
                disabled={isLoading || (!selectedCustomer && !customer)}
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
