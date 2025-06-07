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

const actionRequestSchema = z.object({
  actionType: z.enum(["activation", "deactivation", "plan_change"]),
  requestedPlan: z.string().optional(),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
});

type ActionRequestFormValues = z.infer<typeof actionRequestSchema>;

interface ActionRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  onSubmit: (request: Omit<ActionRequest, "id">) => void;
  defaultActionType?: "activation" | "deactivation" | "plan_change";
}

export function ActionRequestModal({
  open,
  onOpenChange,
  customer,
  onSubmit,
  defaultActionType = "activation",
}: ActionRequestModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const form = useForm<ActionRequestFormValues>({
    resolver: zodResolver(actionRequestSchema),
    defaultValues: {
      actionType: defaultActionType,
      requestedPlan: "",
      reason: "",
    },
  });

  const actionType = form.watch("actionType");

  const handleSubmit = async (values: ActionRequestFormValues) => {
    if (!customer || !user) return;

    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const request: Omit<ActionRequest, "id"> = {
      customerId: customer.id,
      customerName: customer.name,
      employeeId: user.id,
      employeeName: user.name,
      actionType: values.actionType,
      currentPlan: customer.currentPackage,
      requestedPlan: values.requestedPlan || undefined,
      reason: values.reason,
      status: "pending",
      requestDate: new Date().toISOString().split("T")[0],
    };

    onSubmit(request);
    setIsLoading(false);
    onOpenChange(false);
    form.reset();
  };

  const handleClose = () => {
    onOpenChange(false);
    form.reset();
  };

  // Reset form when modal opens with new action type
  useEffect(() => {
    if (open) {
      form.reset({
        actionType: defaultActionType,
        requestedPlan: "",
        reason: "",
      });
    }
  }, [open, defaultActionType, form]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Request Customer Action</DialogTitle>
          <DialogDescription>
            Submit a request for admin approval for {customer?.name}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <div className="space-y-4">
              {/* Customer Info */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Customer Information</h4>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div>
                    <strong>Name:</strong> {customer?.name}
                  </div>
                  <div>
                    <strong>Current Package:</strong> {customer?.currentPackage}
                  </div>
                  <div>
                    <strong>Status:</strong>{" "}
                    {customer?.isActive ? "Active" : "Inactive"}
                  </div>
                  <div>
                    <strong>VC Number:</strong> {customer?.vcNumber}
                  </div>
                </div>
              </div>

              <FormField
                control={form.control}
                name="actionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Action Type</FormLabel>
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
                      <FormLabel>New Package</FormLabel>
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
                              {pkg.name} - ${pkg.price}/month
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
                    <FormLabel>Reason for Request</FormLabel>
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
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
