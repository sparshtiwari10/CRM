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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Customer } from "@/types";
import { mockPackages } from "@/data/mockData";
import { useAuth } from "@/contexts/AuthContext";

const customerFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phoneNumber: z
    .string()
    .min(10, "Phone number must be at least 10 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  address: z.string().min(5, "Address must be at least 5 characters"),
  vcNumber: z.string().min(3, "VC Number must be at least 3 characters"),
  currentPackage: z.string().min(1, "Please select a package"),
  collectorName: z
    .string()
    .min(2, "Collector name must be at least 2 characters"),
  billingStatus: z.enum(["Paid", "Pending", "Overdue"]),
  isActive: z.boolean(),
  portalBill: z
    .number()
    .min(0, "Portal bill must be a positive number")
    .optional(),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

interface CustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  onSave: (customer: Omit<Customer, "id"> & { id?: string }) => void;
  isLoading?: boolean;
}

// Mock collectors for the dropdown - in real app this would come from employee data
const mockCollectors = [
  "John Collector",
  "Sarah Collector",
  "Mike Field",
  "System Administrator",
];

export function CustomerModal({
  open,
  onOpenChange,
  customer,
  onSave,
  isLoading = false,
}: CustomerModalProps) {
  const { isAdmin } = useAuth();
  const isEditing = !!customer;

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      phoneNumber: "",
      email: "",
      address: "",
      vcNumber: "",
      currentPackage: "",
      collectorName: "",
      billingStatus: "Pending",
      isActive: true,
      portalBill: 0,
    },
  });

  useEffect(() => {
    if (customer) {
      form.reset({
        name: customer.name,
        phoneNumber: customer.phoneNumber,
        email: customer.email || "",
        address: customer.address,
        vcNumber: customer.vcNumber,
        currentPackage: customer.currentPackage,
        collectorName: customer.collectorName,
        billingStatus: customer.billingStatus,
        isActive: customer.isActive,
        portalBill: customer.portalBill || 0,
      });
    } else {
      form.reset({
        name: "",
        phoneNumber: "",
        email: "",
        address: "",
        vcNumber: "",
        currentPackage: "",
        collectorName: "",
        billingStatus: "Pending",
        isActive: true,
        portalBill: 0,
      });
    }
  }, [customer, form]);

  const onSubmit = async (values: CustomerFormValues) => {
    const customerData = {
      ...values,
      id: customer?.id,
      lastPaymentDate:
        customer?.lastPaymentDate || new Date().toISOString().split("T")[0],
      joinDate: customer?.joinDate || new Date().toISOString().split("T")[0],
      activationDate: values.isActive
        ? customer?.activationDate || new Date().toISOString().split("T")[0]
        : customer?.activationDate,
      deactivationDate:
        !values.isActive && customer?.isActive
          ? new Date().toISOString().split("T")[0]
          : customer?.deactivationDate,
    };

    onSave(customerData);
  };

  const handleClose = () => {
    // Reset form state first
    form.reset();
    // Close the modal
    onOpenChange(false);
  };

  const generateVCNumber = () => {
    const prefix = "VC";
    const randomNum = Math.floor(Math.random() * 900000) + 100000; // 6 digit number
    return `${prefix}${randomNum}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Customer" : "Add New Customer"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the customer information below."
              : "Enter the customer details to create a new account."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-900">
                Basic Information
              </h4>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="John Doe"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="+1 (555) 123-4567"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="john@example.com"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="123 Main St, City, State, ZIP"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Service Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-900">
                Service Information
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="vcNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>VC Number</FormLabel>
                      <div className="flex space-x-2">
                        <FormControl>
                          <Input
                            placeholder="VC123456"
                            {...field}
                            className="font-mono"
                            disabled={isLoading}
                          />
                        </FormControl>
                        {!isEditing && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => field.onChange(generateVCNumber())}
                            disabled={isLoading}
                          >
                            Generate
                          </Button>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currentPackage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Package</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a package" />
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="collectorName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned Collector</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select collector" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mockCollectors.map((collector) => (
                            <SelectItem key={collector} value={collector}>
                              {collector}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="billingStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Billing Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Paid">Paid</SelectItem>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Overdue">Overdue</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Status and Admin Settings */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-900">
                Status & Settings
              </h4>

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <div className="text-sm text-gray-500">
                        Customer service is currently{" "}
                        {field.value ? "active" : "inactive"}
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Portal Bill - Admin Only */}
              {isAdmin && (
                <FormField
                  control={form.control}
                  name="portalBill"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Portal Bill Amount (Admin Only)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value) || 0)
                            }
                            className="pl-8"
                            disabled={isLoading}
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                            $
                          </span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
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
                {isLoading
                  ? "Saving..."
                  : isEditing
                    ? "Update Customer"
                    : "Add Customer"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
