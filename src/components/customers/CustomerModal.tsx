import React, { useState, useEffect, useCallback, useMemo } from "react";
import { authService } from "@/services/authService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { Customer, Connection } from "@/types";
import { mockPackages } from "@/data/mockData";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface CustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  onSave: (customer: Customer) => void;
  isSaving?: boolean;
}

interface FormData {
  name: string;
  phoneNumber: string;
  email: string;
  address: string;
  vcNumber: string;
  currentPackage: string;
  collectorName: string;
  isActive: boolean;
  portalBill: number;
  numberOfConnections: number | string;
  connections: Connection[];
  customPlan: {
    name: string;
    price: number;
    description: string;
  } | null;
  packageAmount: number;
  previousOutstanding: number;
  currentOutstanding: number;
  billDueDate: number;
}

const initialFormData: FormData = {
  name: "",
  phoneNumber: "",
  email: "",
  address: "",
  vcNumber: "",
  currentPackage: "",
  collectorName: "",
  isActive: true,
  portalBill: 0,
  numberOfConnections: 1,
  connections: [],
  customPlan: null,
  packageAmount: 0,
  previousOutstanding: 0,
  currentOutstanding: 0,
  billDueDate: 1,
};

export function CustomerModal({
  open,
  onOpenChange,
  customer,
  onSave,
  isSaving = false,
}: CustomerModalProps) {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const isEditing = !!customer;

  // Simple state management
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [showCustomPlan, setShowCustomPlan] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableCollectors, setAvailableCollectors] = useState<string[]>([
    "System Administrator",
  ]);

  // Initialize form data based on customer prop
  const initializeFormData = useCallback(() => {
    if (customer) {
      return {
        name: customer.name || "",
        phoneNumber: customer.phoneNumber || "",
        email: customer.email || "",
        address: customer.address || "",
        vcNumber: customer.vcNumber || "",
        currentPackage: customer.currentPackage || "",
        collectorName: customer.collectorName || "",
        isActive: customer.isActive !== undefined ? customer.isActive : true,
        portalBill: customer.portalBill || 0,
        numberOfConnections: customer.numberOfConnections || 1,
        connections: customer.connections || [],
        customPlan: customer.customPlan || null,
        packageAmount: customer.packageAmount || 0,
        previousOutstanding: customer.previousOutstanding || 0,
        currentOutstanding: customer.currentOutstanding || 0,
        billDueDate: customer.billDueDate || 1,
      };
    }
    return initialFormData;
  }, [customer]);

  // Reset form when modal opens or customer changes
  useEffect(() => {
    if (open) {
      const newFormData = initializeFormData();
      setFormData(newFormData);
      setShowCustomPlan(!!customer?.customPlan);
      setErrors({});
    }
  }, [open, customer?.id, initializeFormData]);

  // Load collectors only once when modal opens
  useEffect(() => {
    if (open) {
      let mounted = true;

      const loadCollectors = async () => {
        try {
          const users = await authService.getAllUsers();
          const employees = users
            .filter((user) => user.role === "employee" && user.is_active)
            .map((user) => user.name);

          const collectors = ["System Administrator"];
          if (employees.length > 0) {
            collectors.push(...employees);
          }

          if (mounted) {
            setAvailableCollectors(collectors);
          }
        } catch (error) {
          console.error("Failed to load collectors:", error);
          if (mounted) {
            setAvailableCollectors(["System Administrator"]);
          }
        }
      };

      loadCollectors();

      return () => {
        mounted = false;
      };
    }
  }, [open]);

  // Clear form when modal closes
  useEffect(() => {
    if (!open) {
      setFormData(initialFormData);
      setShowCustomPlan(false);
      setErrors({});
    }
  }, [open]);

  const handleInputChange = useCallback(
    (field: string, value: any) => {
      setFormData((prev) => ({ ...prev, [field]: value }));

      // Clear error for this field
      if (errors[field]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    },
    [errors],
  );

  const handleConnectionsChange = useCallback(
    (newCountStr: string) => {
      const newCount = newCountStr === "" ? 1 : parseInt(newCountStr) || 1;

      if (newCount < 1) {
        setFormData((prev) => ({
          ...prev,
          numberOfConnections: 1,
          connections: [],
        }));
        return;
      }

      const connections: Connection[] = [];
      for (let i = 0; i < newCount; i++) {
        const existingConnection = formData.connections[i];
        const isPrimary = i === 0;

        let vcNumber;
        if (isPrimary) {
          vcNumber = existingConnection?.vcNumber || formData.vcNumber;
        } else {
          const suffix = i === 1 ? "SEC" : `SEC${i - 1}`;
          const baseVc = formData.vcNumber || "VC000000";
          vcNumber = existingConnection?.vcNumber || `${baseVc}-${suffix}`;
        }

        connections.push({
          id: existingConnection?.id || `conn-${i + 1}`,
          vcNumber: vcNumber,
          planName:
            existingConnection?.planName || formData.currentPackage || "",
          planPrice:
            existingConnection?.planPrice ||
            mockPackages.find((p) => p.name === formData.currentPackage)
              ?.price ||
            0,
          isCustomPlan: existingConnection?.isCustomPlan || false,
          isPrimary: isPrimary,
          connectionIndex: i + 1,
        });
      }

      setFormData((prev) => ({
        ...prev,
        numberOfConnections: newCount,
        connections,
      }));
    },
    [formData.connections, formData.currentPackage, formData.vcNumber],
  );

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Customer name is required";
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required";
    }

    if (!formData.address.trim()) {
      newErrors.address = "Address is required";
    }

    if (!formData.vcNumber.trim()) {
      newErrors.vcNumber = "VC Number is required";
    }

    if (!formData.collectorName) {
      newErrors.collectorName = "Collector selection is required";
    }

    if (!formData.currentPackage && !showCustomPlan) {
      newErrors.currentPackage = "Package selection is required";
    }

    if (
      showCustomPlan &&
      (!formData.customPlan?.name || !formData.customPlan?.price)
    ) {
      newErrors.customPlan = "Custom plan details are required";
    }

    if (formData.billDueDate < 1 || formData.billDueDate > 31) {
      newErrors.billDueDate = "Bill due date must be between 1 and 31";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, showCustomPlan]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) return;

      const finalNumberOfConnections =
        typeof formData.numberOfConnections === "number"
          ? formData.numberOfConnections
          : parseInt(formData.numberOfConnections as string) || 1;

      const customerData: Customer = {
        id: customer?.id || Date.now().toString(),
        name: formData.name.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        address: formData.address.trim(),
        vcNumber: formData.vcNumber.trim(),
        currentPackage: showCustomPlan
          ? formData.customPlan?.name || "Custom"
          : formData.currentPackage,
        collectorName: formData.collectorName,
        isActive: formData.isActive,
        portalBill: formData.portalBill,
        lastPaymentDate:
          customer?.lastPaymentDate || new Date().toISOString().split("T")[0],
        joinDate: customer?.joinDate || new Date().toISOString().split("T")[0],
        activationDate: formData.isActive
          ? customer?.activationDate || new Date().toISOString().split("T")[0]
          : customer?.activationDate,
        deactivationDate:
          !formData.isActive && customer?.isActive
            ? new Date().toISOString().split("T")[0]
            : customer?.deactivationDate || undefined,
        numberOfConnections: finalNumberOfConnections,
        connections: formData.connections.slice(0, finalNumberOfConnections),
        packageAmount: formData.packageAmount,
        previousOutstanding: formData.previousOutstanding,
        currentOutstanding: formData.currentOutstanding,
        billDueDate: formData.billDueDate,
      };

      // Add optional fields
      if (formData.email && formData.email.trim() !== "") {
        customerData.email = formData.email.trim();
      }

      if (showCustomPlan && formData.customPlan) {
        customerData.customPlan = formData.customPlan;
      }

      onSave(customerData);
    },
    [formData, showCustomPlan, customer, validateForm, onSave],
  );

  const handlePackageChange = useCallback((packageName: string) => {
    const selectedPackage = mockPackages.find(
      (pkg) => pkg.name === packageName,
    );
    if (selectedPackage) {
      setFormData((prev) => ({
        ...prev,
        currentPackage: packageName,
        packageAmount: selectedPackage.price,
        portalBill: selectedPackage.portalAmount || selectedPackage.price,
      }));
    }
  }, []);

  const handleCustomPlanChange = useCallback((field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      customPlan: {
        ...prev.customPlan,
        [field]: value,
      } as any,
      packageAmount: field === "price" ? value || 0 : prev.packageAmount,
      portalBill: field === "price" ? value || 0 : prev.portalBill,
    }));
  }, []);

  // Memoize expensive computations
  const connectionOptions = useMemo(() => {
    return Array.from({ length: 10 }, (_, i) => i + 1);
  }, []);

  const billDueDateOptions = useMemo(() => {
    return Array.from({ length: 31 }, (_, i) => i + 1);
  }, []);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? `Edit Customer - ${customer?.name}`
              : "Add New Customer"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Customer Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    disabled={isSaving}
                    className={errors.name ? "border-red-500" : ""}
                  />
                  {errors.name && (
                    <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phoneNumber">Phone Number *</Label>
                  <Input
                    id="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={(e) =>
                      handleInputChange("phoneNumber", e.target.value)
                    }
                    disabled={isSaving}
                    className={errors.phoneNumber ? "border-red-500" : ""}
                  />
                  {errors.phoneNumber && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.phoneNumber}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <Label htmlFor="vcNumber">VC Number *</Label>
                  <Input
                    id="vcNumber"
                    value={formData.vcNumber}
                    onChange={(e) =>
                      handleInputChange("vcNumber", e.target.value)
                    }
                    disabled={isSaving}
                    className={errors.vcNumber ? "border-red-500" : ""}
                    placeholder="e.g., VC001234"
                  />
                  {errors.vcNumber && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.vcNumber}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  disabled={isSaving}
                  className={errors.address ? "border-red-500" : ""}
                />
                {errors.address && (
                  <p className="text-red-500 text-xs mt-1">{errors.address}</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="collectorName">Collector *</Label>
                  <Select
                    value={formData.collectorName}
                    onValueChange={(value) =>
                      handleInputChange("collectorName", value)
                    }
                    disabled={isSaving}
                  >
                    <SelectTrigger
                      className={errors.collectorName ? "border-red-500" : ""}
                    >
                      <SelectValue placeholder="Select collector" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCollectors.map((collector) => (
                        <SelectItem key={collector} value={collector}>
                          {collector}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.collectorName && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.collectorName}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="numberOfConnections">
                    Number of Connections
                  </Label>
                  <Select
                    value={formData.numberOfConnections.toString()}
                    onValueChange={(value) => handleConnectionsChange(value)}
                    disabled={isSaving}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {connectionOptions.map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} Connection{num > 1 ? "s" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      handleInputChange("isActive", checked)
                    }
                    disabled={isSaving}
                  />
                  <Label>Active Customer</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Package Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Package Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={showCustomPlan}
                  onCheckedChange={setShowCustomPlan}
                  disabled={isSaving}
                />
                <Label>Use Custom Plan</Label>
              </div>

              {!showCustomPlan ? (
                <div>
                  <Label htmlFor="currentPackage">Select Package *</Label>
                  <Select
                    value={formData.currentPackage}
                    onValueChange={handlePackageChange}
                    disabled={isSaving}
                  >
                    <SelectTrigger
                      className={errors.currentPackage ? "border-red-500" : ""}
                    >
                      <SelectValue placeholder="Choose a package" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockPackages.map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.name}>
                          {pkg.name} - ₹{pkg.price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.currentPackage && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.currentPackage}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customPlanName">Custom Plan Name *</Label>
                      <Input
                        id="customPlanName"
                        value={formData.customPlan?.name || ""}
                        onChange={(e) =>
                          handleCustomPlanChange("name", e.target.value)
                        }
                        disabled={isSaving}
                      />
                    </div>
                    <div>
                      <Label htmlFor="customPlanPrice">Price (₹) *</Label>
                      <Input
                        id="customPlanPrice"
                        type="number"
                        value={formData.customPlan?.price || ""}
                        onChange={(e) =>
                          handleCustomPlanChange(
                            "price",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="customPlanDescription">Description</Label>
                    <Input
                      id="customPlanDescription"
                      value={formData.customPlan?.description || ""}
                      onChange={(e) =>
                        handleCustomPlanChange("description", e.target.value)
                      }
                      disabled={isSaving}
                    />
                  </div>
                  {errors.customPlan && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.customPlan}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Billing Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Billing Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="packageAmount">Package Amount (₹)</Label>
                  <Input
                    id="packageAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.packageAmount}
                    onChange={(e) =>
                      handleInputChange(
                        "packageAmount",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <Label htmlFor="billDueDate">Bill Due Date</Label>
                  <Select
                    value={formData.billDueDate.toString()}
                    onValueChange={(value) =>
                      handleInputChange("billDueDate", parseInt(value))
                    }
                    disabled={isSaving}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {billDueDateOptions.map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          {day}{" "}
                          {day === 1
                            ? "st"
                            : day === 2
                              ? "nd"
                              : day === 3
                                ? "rd"
                                : "th"}{" "}
                          of every month
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.billDueDate && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.billDueDate}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="previousOutstanding">
                    Previous Outstanding (₹)
                  </Label>
                  <Input
                    id="previousOutstanding"
                    type="number"
                    step="0.01"
                    value={formData.previousOutstanding}
                    onChange={(e) =>
                      handleInputChange(
                        "previousOutstanding",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <Label htmlFor="currentOutstanding">
                    Current Outstanding (₹)
                  </Label>
                  <Input
                    id="currentOutstanding"
                    type="number"
                    step="0.01"
                    value={formData.currentOutstanding}
                    onChange={(e) =>
                      handleInputChange(
                        "currentOutstanding",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    disabled={isSaving}
                  />
                </div>
              </div>

              {isAdmin && (
                <div>
                  <Label htmlFor="portalBill">Portal Bill (₹)</Label>
                  <Input
                    id="portalBill"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.portalBill}
                    onChange={(e) =>
                      handleInputChange(
                        "portalBill",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    disabled={isSaving}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving
                ? "Saving..."
                : isEditing
                  ? "Update Customer"
                  : "Add Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
