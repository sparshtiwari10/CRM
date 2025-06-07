import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Customer } from "@/types";
import { mockPackages } from "@/data/mockData";
import { useAuth } from "@/contexts/AuthContext";

interface CustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  onSave: (customer: Customer) => void;
  isSaving?: boolean;
}

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
  isSaving = false,
}: CustomerModalProps) {
  const { isAdmin } = useAuth();
  const isEditing = !!customer;

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    phoneNumber: "",
    email: "",
    address: "",
    vcNumber: "",
    currentPackage: "",
    collectorName: "",
    billingStatus: "Pending" as const,
    isActive: true,
    portalBill: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Generate VC Number
  const generateVCNumber = () => {
    return `VC${Math.random().toString().substr(2, 6)}`;
  };

  // Reset form when modal opens/closes or customer changes
  useEffect(() => {
    if (open) {
      if (customer) {
        // Editing existing customer
        setFormData({
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
        // Creating new customer
        setFormData({
          name: "",
          phoneNumber: "",
          email: "",
          address: "",
          vcNumber: generateVCNumber(),
          currentPackage: "",
          collectorName: "",
          billingStatus: "Pending",
          isActive: true,
          portalBill: 0,
        });
      }
      setErrors({});
    }
  }, [open, customer]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.phoneNumber.trim())
      newErrors.phoneNumber = "Phone number is required";
    if (!formData.address.trim()) newErrors.address = "Address is required";
    if (!formData.vcNumber.trim()) newErrors.vcNumber = "VC Number is required";
    if (!formData.currentPackage)
      newErrors.currentPackage = "Package is required";
    if (!formData.collectorName)
      newErrors.collectorName = "Collector is required";

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const customerData: Customer = {
      id: customer?.id || Date.now().toString(),
      name: formData.name.trim(),
      phoneNumber: formData.phoneNumber.trim(),
      email: formData.email.trim() || undefined,
      address: formData.address.trim(),
      vcNumber: formData.vcNumber.trim(),
      currentPackage: formData.currentPackage,
      collectorName: formData.collectorName,
      billingStatus: formData.billingStatus,
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
          : customer?.deactivationDate,
    };

    onSave(customerData);
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
              ? "Update customer information and settings"
              : "Enter customer details to create a new account"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Enter customer name"
                    disabled={isSaving}
                    className={errors.name ? "border-red-500" : ""}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500 mt-1">{errors.name}</p>
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
                    placeholder="+1 (555) 123-4567"
                    disabled={isSaving}
                    className={errors.phoneNumber ? "border-red-500" : ""}
                  />
                  {errors.phoneNumber && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.phoneNumber}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="customer@email.com"
                    disabled={isSaving}
                    className={errors.email ? "border-red-500" : ""}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500 mt-1">{errors.email}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="vcNumber">VC Number *</Label>
                  <Input
                    id="vcNumber"
                    value={formData.vcNumber}
                    onChange={(e) =>
                      handleInputChange("vcNumber", e.target.value)
                    }
                    placeholder="VC123456"
                    disabled={isSaving}
                    className={errors.vcNumber ? "border-red-500" : ""}
                  />
                  {errors.vcNumber && (
                    <p className="text-sm text-red-500 mt-1">
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
                  placeholder="Enter full address"
                  disabled={isSaving}
                  className={errors.address ? "border-red-500" : ""}
                />
                {errors.address && (
                  <p className="text-sm text-red-500 mt-1">{errors.address}</p>
                )}
              </div>
            </div>

            {/* Service Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Service Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="currentPackage">Package *</Label>
                  <Select
                    value={formData.currentPackage}
                    onValueChange={(value) =>
                      handleInputChange("currentPackage", value)
                    }
                    disabled={isSaving}
                  >
                    <SelectTrigger
                      className={errors.currentPackage ? "border-red-500" : ""}
                    >
                      <SelectValue placeholder="Select package" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockPackages.map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.name}>
                          {pkg.name} - ${pkg.price}/month
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.currentPackage && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.currentPackage}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="collectorName">Assigned Collector *</Label>
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
                      {mockCollectors.map((collector) => (
                        <SelectItem key={collector} value={collector}>
                          {collector}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.collectorName && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.collectorName}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="billingStatus">Billing Status</Label>
                  <Select
                    value={formData.billingStatus}
                    onValueChange={(value) =>
                      handleInputChange("billingStatus", value)
                    }
                    disabled={isSaving}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isAdmin && (
                  <div>
                    <Label htmlFor="portalBill">
                      Portal Bill Amount (Admin Only)
                    </Label>
                    <div className="relative">
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
                        placeholder="0.00"
                        disabled={isSaving}
                        className="pl-8"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                        $
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Active Status */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label className="text-base">Active Status</Label>
                  <div className="text-sm text-gray-500">
                    Customer service is currently{" "}
                    {formData.isActive ? "active" : "inactive"}
                  </div>
                </div>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    handleInputChange("isActive", checked)
                  }
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
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
