import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Customer } from "@/types";
import { mockPackages } from "@/data/mockData";

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
  const isEditing = !!customer;

  // Initialize form state with customer data or defaults
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    vcNumber: "",
    currentPackage: "",
    collectorName: "",
    isInitialized: false,
  });

  // Initialize form when modal opens with customer data
  if (open && customer && !formData.isInitialized) {
    setFormData({
      name: customer.name || "",
      phone: customer.phoneNumber || "",
      email: customer.email || "",
      address: customer.address || "",
      vcNumber: customer.vcNumber || "",
      currentPackage: customer.currentPackage || "",
      collectorName: customer.collectorName || "",
      isInitialized: true,
    });
  }

  // Initialize form for new customer
  if (open && !customer && !formData.isInitialized) {
    setFormData({
      name: "",
      phone: "",
      email: "",
      address: "",
      vcNumber: `VC${Math.random().toString().substr(2, 6)}`,
      currentPackage: "",
      collectorName: "",
      isInitialized: true,
    });
  }

  // Reset when modal closes
  if (!open && formData.isInitialized) {
    setFormData({
      name: "",
      phone: "",
      email: "",
      address: "",
      vcNumber: "",
      currentPackage: "",
      collectorName: "",
      isInitialized: false,
    });
  }

  function handleInputChange(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (
      !formData.name.trim() ||
      !formData.phone.trim() ||
      !formData.address.trim()
    ) {
      alert("Please fill in required fields (Name, Phone, Address)");
      return;
    }

    if (!formData.vcNumber.trim()) {
      alert("VC Number is required");
      return;
    }

    if (!formData.currentPackage) {
      alert("Please select a package");
      return;
    }

    if (!formData.collectorName) {
      alert("Please select a collector");
      return;
    }

    const customerData: Customer = {
      id: customer?.id || Date.now().toString(),
      name: formData.name.trim(),
      phoneNumber: formData.phone.trim(),
      email: formData.email.trim() || undefined,
      address: formData.address.trim(),
      vcNumber: formData.vcNumber.trim(),
      currentPackage: formData.currentPackage,
      collectorName: formData.collectorName,
      billingStatus: customer?.billingStatus || "Pending",
      isActive: customer?.isActive !== undefined ? customer.isActive : true,
      portalBill: customer?.portalBill || 0,
      lastPaymentDate:
        customer?.lastPaymentDate || new Date().toISOString().split("T")[0],
      joinDate: customer?.joinDate || new Date().toISOString().split("T")[0],
      activationDate: customer?.activationDate,
      deactivationDate: customer?.deactivationDate,
    };

    onSave(customerData);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Customer" : "Add Customer"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  disabled={isSaving}
                  placeholder="Customer name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  disabled={isSaving}
                  placeholder="+1 (555) 123-4567"
                  required
                />
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
                  placeholder="customer@email.com"
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
                  placeholder="VC123456"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                disabled={isSaving}
                placeholder="Full address"
                required
              />
            </div>
          </div>

          {/* Service Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Service Information</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="currentPackage">Package *</Label>
                <Select
                  value={formData.currentPackage}
                  onValueChange={(value) =>
                    handleInputChange("currentPackage", value)
                  }
                  disabled={isSaving}
                >
                  <SelectTrigger>
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
              </div>

              <div>
                <Label htmlFor="collectorName">Collector Name *</Label>
                <Select
                  value={formData.collectorName}
                  onValueChange={(value) =>
                    handleInputChange("collectorName", value)
                  }
                  disabled={isSaving}
                >
                  <SelectTrigger>
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
              </div>
            </div>
          </div>

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
