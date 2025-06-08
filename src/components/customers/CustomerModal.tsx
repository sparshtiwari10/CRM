import React, { useState, useEffect } from "react";
import { X, Calendar, Package, DollarSign, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Customer, Connection, CustomerStatus } from "@/types";
import { authService } from "@/services/authService";

interface CustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  onSave: (customer: Customer) => Promise<void>;
  isLoading?: boolean;
}

interface CustomerFormData {
  name: string;
  phoneNumber: string;
  email: string;
  address: string;
  joinDate: string;
  billDueDate: number;
  status: CustomerStatus;
  collectorName: string;
  previousOutstanding: number;
  connections: Connection[];
}

const initialFormData: CustomerFormData = {
  name: "",
  phoneNumber: "",
  email: "",
  address: "",
  joinDate: new Date().toISOString().split("T")[0],
  billDueDate: 1,
  status: "active",
  collectorName: "",
  previousOutstanding: 0,
  connections: [
    {
      id: "conn-1",
      vcNumber: "",
      planName: "",
      planPrice: 0,
      isCustomPlan: false,
      isPrimary: true,
      connectionIndex: 0,
      status: "active",
      packageAmount: 0,
      previousOutstanding: 0,
      currentOutstanding: 0,
    },
  ],
};

export default function CustomerModal({
  open,
  onOpenChange,
  customer,
  onSave,
  isLoading = false,
}: CustomerModalProps) {
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableEmployees, setAvailableEmployees] = useState<string[]>([]);

  // Reset form when modal opens/closes or customer changes
  useEffect(() => {
    if (open) {
      if (customer) {
        // Editing existing customer
        setFormData({
          name: customer.name || "",
          phoneNumber: customer.phoneNumber || "",
          email: customer.email || "",
          address: customer.address || "",
          joinDate: customer.joinDate
            ? new Date(customer.joinDate).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
          billDueDate: customer.billDueDate || 1,
          status: customer.status || "active",
          collectorName: customer.collectorName || "",
          previousOutstanding: customer.previousOutstanding || 0,
          connections:
            customer.connections && customer.connections.length > 0
              ? customer.connections.map((conn) => ({
                  ...conn,
                  vcNumber: conn.vcNumber || "",
                  planName: conn.planName || "",
                  planPrice: conn.planPrice || 0,
                  isCustomPlan: conn.isCustomPlan || false,
                  isPrimary: conn.isPrimary || false,
                  status: conn.status || "active",
                  packageAmount: conn.packageAmount || 0,
                  previousOutstanding: conn.previousOutstanding || 0,
                  currentOutstanding: conn.currentOutstanding || 0,
                }))
              : [
                  {
                    id: "conn-1",
                    vcNumber: customer.vcNumber || "",
                    planName: customer.currentPackage || "",
                    planPrice: customer.packageAmount || 0,
                    isCustomPlan: !!customer.customPlan,
                    isPrimary: true,
                    connectionIndex: 0,
                    status: customer.status || "active",
                    packageAmount: customer.packageAmount || 0,
                    previousOutstanding: customer.previousOutstanding || 0,
                    currentOutstanding: customer.currentOutstanding || 0,
                  },
                ],
        });
      } else {
        // Adding new customer
        setFormData(initialFormData);
      }
      setErrors({});
    }
  }, [open, customer]);

  // Load available employees
  useEffect(() => {
    if (open) {
      let mounted = true;

      const loadEmployees = async () => {
        try {
          // Get all active employees from Firebase
          const allUsers = await authService.getAllUsers();
          const activeEmployees = allUsers
            .filter((user) => user.is_active)
            .map((user) => user.name);

          if (mounted) {
            setAvailableEmployees(activeEmployees);
          }
        } catch (error) {
          console.error("Failed to load employees:", error);
          if (mounted) {
            // Fallback to empty array if loading fails
            setAvailableEmployees([]);
          }
        }
      };

      loadEmployees();

      return () => {
        mounted = false;
      };
    }
  }, [open]);

  const handleInputChange = (field: keyof CustomerFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handleConnectionChange = (
    index: number,
    field: keyof Connection,
    value: any,
  ) => {
    setFormData((prev) => ({
      ...prev,
      connections: prev.connections.map((conn, i) =>
        i === index ? { ...conn, [field]: value } : conn,
      ),
    }));
  };

  const addConnection = () => {
    const newConnection: Connection = {
      id: `conn-${formData.connections.length + 1}`,
      vcNumber: "",
      planName: "",
      planPrice: 0,
      isCustomPlan: false,
      isPrimary: false,
      connectionIndex: formData.connections.length,
      status: "active",
      packageAmount: 0,
      previousOutstanding: 0,
      currentOutstanding: 0,
    };

    setFormData((prev) => ({
      ...prev,
      connections: [...prev.connections, newConnection],
    }));
  };

  const removeConnection = (index: number) => {
    if (formData.connections.length > 1) {
      setFormData((prev) => ({
        ...prev,
        connections: prev.connections.filter((_, i) => i !== index),
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Customer name is required";
    if (!formData.phoneNumber.trim())
      newErrors.phoneNumber = "Phone number is required";
    if (!formData.address.trim()) newErrors.address = "Address is required";
    if (!formData.collectorName)
      newErrors.collectorName = "Employee selection is required";

    // Validate connections
    formData.connections.forEach((connection, index) => {
      if (!connection.vcNumber?.trim())
        newErrors[`vcNumber_${index}`] = "VC Number is required";
      if (!connection.planName?.trim())
        newErrors[`planName_${index}`] = "Plan name is required";
      if ((connection.planPrice || 0) <= 0)
        newErrors[`planPrice_${index}`] = "Plan price must be greater than 0";
    });

    // Validate that at least one connection is marked as primary
    const hasPrimary = formData.connections.some((conn) => conn.isPrimary);
    if (!hasPrimary) {
      newErrors.primaryConnection = "At least one connection must be primary";
    }

    // Check for duplicate VC numbers
    const vcNumbers = formData.connections
      .map((conn) => (conn.vcNumber || "").trim())
      .filter(Boolean);
    const uniqueVcNumbers = new Set(vcNumbers);
    if (vcNumbers.length !== uniqueVcNumbers.size) {
      newErrors.duplicateVcNumbers = "VC Numbers must be unique";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const totalPackageAmount = formData.connections.reduce(
        (sum, conn) => sum + (conn.planPrice || 0),
        0,
      );

      const totalCurrentOutstanding = formData.connections.reduce(
        (sum, conn) => sum + (conn.currentOutstanding || 0),
        0,
      );

      const primaryConnection = formData.connections.find(
        (conn) => conn.isPrimary,
      );

      const customerData: Customer = {
        id: customer?.id || "",
        name: formData.name.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        joinDate: formData.joinDate,
        billDueDate: formData.billDueDate,
        status: formData.status,
        collectorName: formData.collectorName,
        previousOutstanding: formData.previousOutstanding,

        // Legacy fields for backward compatibility
        vcNumber: primaryConnection?.vcNumber || "",
        currentPackage: primaryConnection?.planName || "",
        packageAmount: totalPackageAmount,
        currentOutstanding: totalCurrentOutstanding,
        lastPaymentDate: customer?.lastPaymentDate || "",
        portalBill: totalPackageAmount,
        isActive: formData.status === "active",
        activationDate: customer?.activationDate || formData.joinDate,
        deactivationDate:
          formData.status === "inactive"
            ? new Date().toISOString().split("T")[0]
            : undefined,

        // New connection-based structure
        numberOfConnections: formData.connections.length,
        connections: formData.connections.map((conn, index) => ({
          ...conn,
          connectionIndex: index,
          packageAmount: conn.planPrice || 0,
          currentOutstanding: conn.currentOutstanding || conn.planPrice || 0,
        })),

        // Custom plan for legacy compatibility
        customPlan: formData.connections.some((conn) => conn.isCustomPlan)
          ? {
              name:
                formData.connections.find((conn) => conn.isCustomPlan)
                  ?.planName || "",
              price:
                formData.connections.find((conn) => conn.isCustomPlan)
                  ?.planPrice || 0,
              description: "Custom plan",
            }
          : undefined,

        // Invoice history
        invoiceHistory: customer?.invoiceHistory || [],
      };

      await onSave(customerData);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save customer:", error);
    }
  };

  const predefinedPlans = [
    { name: "Basic", price: 299 },
    { name: "Standard", price: 499 },
    { name: "Premium HD", price: 599 },
    { name: "Premium", price: 799 },
    { name: "Ultimate", price: 999 },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {customer ? "Edit Customer" : "Add New Customer"}
          </DialogTitle>
          <DialogDescription>
            {customer
              ? "Update customer information and connections."
              : "Add a new customer with their connection details."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Customer Name *</Label>
              <Input
                id="name"
                value={formData.name || ""}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter customer name"
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number *</Label>
              <Input
                id="phoneNumber"
                value={formData.phoneNumber || ""}
                onChange={(e) =>
                  handleInputChange("phoneNumber", e.target.value)
                }
                placeholder="Enter phone number"
                className={errors.phoneNumber ? "border-red-500" : ""}
              />
              {errors.phoneNumber && (
                <p className="text-sm text-red-500">{errors.phoneNumber}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ""}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="Enter email address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="joinDate">Join Date *</Label>
              <Input
                id="joinDate"
                type="date"
                value={formData.joinDate || ""}
                onChange={(e) => handleInputChange("joinDate", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="billDueDate">Bill Due Date *</Label>
              <Select
                value={formData.billDueDate?.toString() || "1"}
                onValueChange={(value) =>
                  handleInputChange("billDueDate", parseInt(value))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select due date" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status || "active"}
                onValueChange={(value) =>
                  handleInputChange("status", value as CustomerStatus)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="demo">Demo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="collectorName">Employee *</Label>
              <Select
                value={formData.collectorName || ""}
                onValueChange={(value) =>
                  handleInputChange("collectorName", value)
                }
              >
                <SelectTrigger
                  className={errors.collectorName ? "border-red-500" : ""}
                >
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {availableEmployees.map((employee) => (
                    <SelectItem key={employee} value={employee}>
                      {employee}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.collectorName && (
                <p className="text-sm text-red-500">{errors.collectorName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="previousOutstanding">Previous Outstanding</Label>
              <Input
                id="previousOutstanding"
                type="number"
                value={formData.previousOutstanding || 0}
                onChange={(e) =>
                  handleInputChange(
                    "previousOutstanding",
                    parseFloat(e.target.value) || 0,
                  )
                }
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <Textarea
              id="address"
              value={formData.address || ""}
              onChange={(e) => handleInputChange("address", e.target.value)}
              placeholder="Enter complete address"
              className={errors.address ? "border-red-500" : ""}
              rows={3}
            />
            {errors.address && (
              <p className="text-sm text-red-500">{errors.address}</p>
            )}
          </div>

          {/* Error Messages */}
          {errors.primaryConnection && (
            <div className="p-3 border border-red-200 bg-red-50 dark:bg-red-900/20 rounded-md">
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.primaryConnection}
              </p>
            </div>
          )}

          {errors.duplicateVcNumbers && (
            <div className="p-3 border border-red-200 bg-red-50 dark:bg-red-900/20 rounded-md">
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.duplicateVcNumbers}
              </p>
            </div>
          )}

          {/* Connections */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">
                Connections ({formData.connections.length})
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addConnection}
              >
                Add Connection
              </Button>
            </div>

            {formData.connections.map((connection, index) => (
              <div
                key={connection.id}
                className="p-4 border rounded-lg space-y-4 bg-muted/30"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">
                    Connection {index + 1}
                    {connection.isPrimary && (
                      <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded">
                        PRIMARY
                      </span>
                    )}
                  </h4>
                  {formData.connections.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeConnection(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>VC Number *</Label>
                    <Input
                      value={connection.vcNumber || ""}
                      onChange={(e) =>
                        handleConnectionChange(
                          index,
                          "vcNumber",
                          e.target.value,
                        )
                      }
                      placeholder="Enter VC number"
                      className={
                        errors[`vcNumber_${index}`] ? "border-red-500" : ""
                      }
                    />
                    {errors[`vcNumber_${index}`] && (
                      <p className="text-sm text-red-500">
                        {errors[`vcNumber_${index}`]}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Plan Name *</Label>
                    <Select
                      value={connection.planName || ""}
                      onValueChange={(value) =>
                        handleConnectionChange(index, "planName", value)
                      }
                    >
                      <SelectTrigger
                        className={
                          errors[`planName_${index}`] ? "border-red-500" : ""
                        }
                      >
                        <SelectValue placeholder="Select plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {predefinedPlans.map((plan) => (
                          <SelectItem key={plan.name} value={plan.name}>
                            {plan.name} - ₹{plan.price}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">Custom Plan</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors[`planName_${index}`] && (
                      <p className="text-sm text-red-500">
                        {errors[`planName_${index}`]}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Plan Price *</Label>
                    <Input
                      type="number"
                      value={connection.planPrice || 0}
                      onChange={(e) =>
                        handleConnectionChange(
                          index,
                          "planPrice",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      placeholder="Enter price"
                      min="0"
                      step="0.01"
                      className={
                        errors[`planPrice_${index}`] ? "border-red-500" : ""
                      }
                    />
                    {errors[`planPrice_${index}`] && (
                      <p className="text-sm text-red-500">
                        {errors[`planPrice_${index}`]}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={connection.isPrimary || false}
                      onChange={(e) =>
                        handleConnectionChange(
                          index,
                          "isPrimary",
                          e.target.checked,
                        )
                      }
                      className="rounded"
                    />
                    <span className="text-sm">Primary Connection</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={connection.isCustomPlan || false}
                      onChange={(e) =>
                        handleConnectionChange(
                          index,
                          "isCustomPlan",
                          e.target.checked,
                        )
                      }
                      className="rounded"
                    />
                    <span className="text-sm">Custom Plan</span>
                  </label>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : customer ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
