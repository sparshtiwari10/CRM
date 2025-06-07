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
  const { toast } = useToast();
  const isEditing = !!customer;

  // Initialize with either customer data or empty form
  const initialData = customer
    ? {
        name: customer.name || "",
        phoneNumber: customer.phoneNumber || "",
        email: customer.email || "",
        address: customer.address || "",
        vcNumber: customer.vcNumber || "",
        currentPackage: customer.currentPackage || "",
        collectorName: customer.collectorName || "",
        billingStatus: customer.billingStatus || "Pending",
        isActive: customer.isActive !== undefined ? customer.isActive : true,
        portalBill: customer.portalBill || 0,
        numberOfConnections: customer.numberOfConnections || "",
        connections: customer.connections || [],
        customPlan: customer.customPlan || null,
        packageAmount: customer.packageAmount || 0,
        previousOutstanding: customer.previousOutstanding || 0,
        currentOutstanding: customer.currentOutstanding || 0,
        isInitialized: false,
      }
    : {
        name: "",
        phoneNumber: "",
        email: "",
        address: "",
        vcNumber: `VC${Math.random().toString().substr(2, 6)}`,
        currentPackage: "",
        collectorName: "",
        billingStatus: "Pending" as const,
        isActive: true,
        portalBill: 0,
        numberOfConnections: "",
        connections: [] as Connection[],
        customPlan: null,
        packageAmount: 0,
        previousOutstanding: 0,
        currentOutstanding: 0,
        isInitialized: false,
      };

  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCustomPlan, setShowCustomPlan] = useState(!!customer?.customPlan);

  // Reset form when modal opens with different customer
  if (open && customer && formData.vcNumber !== customer.vcNumber) {
    setFormData({
      name: customer.name || "",
      phoneNumber: customer.phoneNumber || "",
      email: customer.email || "",
      address: customer.address || "",
      vcNumber: customer.vcNumber || "",
      currentPackage: customer.currentPackage || "",
      collectorName: customer.collectorName || "",
      billingStatus: customer.billingStatus || "Pending",
      isActive: customer.isActive !== undefined ? customer.isActive : true,
      portalBill: customer.portalBill || 0,
      numberOfConnections: customer.numberOfConnections || "",
      connections: customer.connections || [],
      customPlan: customer.customPlan || null,
      packageAmount: customer.packageAmount || 0,
      previousOutstanding: customer.previousOutstanding || 0,
      currentOutstanding: customer.currentOutstanding || 0,
      isInitialized: true,
    });
    setShowCustomPlan(!!customer.customPlan);
    setErrors({});
  }

  // Reset form when switching from edit to add mode
  if (open && !customer && !formData.isInitialized) {
    setFormData({
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
      numberOfConnections: "",
      connections: [],
      customPlan: null,
      packageAmount: 0,
      previousOutstanding: 0,
      currentOutstanding: 0,
      isInitialized: true,
    });
    setShowCustomPlan(false);
    setErrors({});
  }

  function handleInputChange(field: string, value: any) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  }

  function handleConnectionsChange(newCountStr: string) {
    const newCount = newCountStr === "" ? 0 : parseInt(newCountStr) || 1;

    if (newCount < 1) {
      setFormData((prev) => ({
        ...prev,
        numberOfConnections: "",
        connections: [],
      }));
      return;
    }

    const connections: Connection[] = [];
    for (let i = 0; i < newCount; i++) {
      const existingConnection = formData.connections[i];
      connections.push({
        id: existingConnection?.id || `conn-${i + 1}`,
        vcNumber:
          existingConnection?.vcNumber ||
          (i === 0 ? formData.vcNumber : `${formData.vcNumber}-${i + 1}`),
        planName: existingConnection?.planName || formData.currentPackage || "",
        planPrice:
          existingConnection?.planPrice ||
          mockPackages.find((p) => p.name === formData.currentPackage)?.price ||
          0,
        isCustomPlan: existingConnection?.isCustomPlan || false,
        customPlanName: existingConnection?.customPlanName || "",
        customPlanPrice: existingConnection?.customPlanPrice || 0,
        customPlanDescription: existingConnection?.customPlanDescription || "",
      });
    }

    setFormData((prev) => ({
      ...prev,
      numberOfConnections: newCountStr,
      connections,
    }));
  }

  function handleConnectionChange(index: number, field: string, value: any) {
    const newConnections = [...formData.connections];
    newConnections[index] = { ...newConnections[index], [field]: value };
    setFormData((prev) => ({ ...prev, connections: newConnections }));
  }

  function toggleConnectionCustomPlan(index: number, isCustom: boolean) {
    const newConnections = [...formData.connections];
    newConnections[index] = {
      ...newConnections[index],
      isCustomPlan: isCustom,
      planName: isCustom ? "" : formData.currentPackage,
      planPrice: isCustom
        ? 0
        : mockPackages.find((p) => p.name === formData.currentPackage)?.price ||
          0,
      customPlanName: isCustom
        ? newConnections[index].customPlanName || ""
        : "",
      customPlanPrice: isCustom
        ? newConnections[index].customPlanPrice || 0
        : 0,
      customPlanDescription: isCustom
        ? newConnections[index].customPlanDescription || ""
        : "",
    };
    setFormData((prev) => ({ ...prev, connections: newConnections }));
  }

  function handleCustomPlanChange(field: string, value: any) {
    setFormData((prev) => ({
      ...prev,
      customPlan: prev.customPlan
        ? { ...prev.customPlan, [field]: value }
        : { name: "", price: 0, description: "", [field]: value },
    }));
  }

  function validateForm() {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.phoneNumber.trim())
      newErrors.phoneNumber = "Phone number is required";
    if (!formData.address.trim()) newErrors.address = "Address is required";
    if (!formData.vcNumber.trim()) newErrors.vcNumber = "VC Number is required";
    if (!formData.currentPackage && !showCustomPlan)
      newErrors.currentPackage = "Package is required";
    if (!formData.collectorName)
      newErrors.collectorName = "Collector is required";

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (showCustomPlan && formData.customPlan) {
      if (!formData.customPlan.name.trim())
        newErrors.customPlanName = "Custom plan name is required";
      if (formData.customPlan.price <= 0)
        newErrors.customPlanPrice = "Custom plan price must be greater than 0";
    }

    // Validate connections
    if (
      formData.numberOfConnections !== "" &&
      parseInt(formData.numberOfConnections) > 0
    ) {
      formData.connections.forEach((conn, index) => {
        if (conn.isCustomPlan) {
          if (!conn.customPlanName?.trim()) {
            newErrors[`conn${index}CustomName`] =
              `Connection ${index + 1} custom plan name is required`;
          }
          if (!conn.customPlanPrice || conn.customPlanPrice <= 0) {
            newErrors[`conn${index}CustomPrice`] =
              `Connection ${index + 1} custom plan price must be greater than 0`;
          }
        } else {
          if (!conn.planName) {
            newErrors[`conn${index}Plan`] =
              `Connection ${index + 1} plan is required`;
          }
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) return;

    const finalNumberOfConnections =
      formData.numberOfConnections === ""
        ? 1
        : parseInt(formData.numberOfConnections) || 1;

    const customerData: Customer = {
      id: customer?.id || Date.now().toString(),
      name: formData.name.trim(),
      phoneNumber: formData.phoneNumber.trim(),
      email: formData.email.trim() || undefined,
      address: formData.address.trim(),
      vcNumber: formData.vcNumber.trim(),
      currentPackage: showCustomPlan
        ? formData.customPlan?.name || "Custom"
        : formData.currentPackage,
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
          : customer?.deactivationDate || null,
      numberOfConnections: finalNumberOfConnections,
      connections: formData.connections.slice(0, finalNumberOfConnections),
      customPlan: showCustomPlan ? formData.customPlan || undefined : undefined,
    };

    onSave(customerData);

    // Show toast notification at bottom for mobile
    toast({
      title: isEditing ? "Customer Updated" : "Customer Added",
      description: `${customerData.name} has been successfully ${isEditing ? "updated" : "added"}.`,
      className:
        "lg:bottom-4 lg:right-4 bottom-2 right-2 left-2 lg:left-auto lg:max-w-sm",
    });
  }

  const finalConnections = parseInt(formData.numberOfConnections) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Customer" : "Add Customer"}
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
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    disabled={isSaving}
                    className={errors.name ? "border-red-500" : ""}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phoneNumber">Phone *</Label>
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
                    <p className="text-sm text-red-500 mt-1">
                      {errors.phoneNumber}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
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
                  disabled={isSaving}
                  className={errors.address ? "border-red-500" : ""}
                />
                {errors.address && (
                  <p className="text-sm text-red-500 mt-1">{errors.address}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Service Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Service Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="collectorName">Collector Name *</Label>
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
                  <Label htmlFor="numberOfConnections">
                    Number of Connections
                  </Label>
                  <Input
                    id="numberOfConnections"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.numberOfConnections}
                    onChange={(e) => handleConnectionsChange(e.target.value)}
                    disabled={isSaving}
                    placeholder="Enter number (default: 1)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty for default single connection
                  </p>
                </div>
              </div>

              {/* Package Selection */}
              <div className="space-y-2">
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
                    <Label htmlFor="currentPackage">Package *</Label>
                    <Select
                      value={formData.currentPackage}
                      onValueChange={(value) =>
                        handleInputChange("currentPackage", value)
                      }
                      disabled={isSaving}
                    >
                      <SelectTrigger
                        className={
                          errors.currentPackage ? "border-red-500" : ""
                        }
                      >
                        <SelectValue placeholder="Select package" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockPackages.map((pkg) => (
                          <SelectItem key={pkg.id} value={pkg.name}>
                            {pkg.name} - ₹{pkg.price}/month
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
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="customPlanName">Custom Plan Name *</Label>
                      <Input
                        id="customPlanName"
                        value={formData.customPlan?.name || ""}
                        onChange={(e) =>
                          handleCustomPlanChange("name", e.target.value)
                        }
                        disabled={isSaving}
                        className={
                          errors.customPlanName ? "border-red-500" : ""
                        }
                      />
                      {errors.customPlanName && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.customPlanName}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="customPlanPrice">Price (₹) *</Label>
                      <Input
                        id="customPlanPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.customPlan?.price || 0}
                        onChange={(e) =>
                          handleCustomPlanChange(
                            "price",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        disabled={isSaving}
                        className={
                          errors.customPlanPrice ? "border-red-500" : ""
                        }
                      />
                      {errors.customPlanPrice && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.customPlanPrice}
                        </p>
                      )}
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
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
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
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>Active Status</Label>
                  <div className="text-sm text-gray-500">
                    Service is {formData.isActive ? "active" : "inactive"}
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
            </CardContent>
          </Card>

          {/* Multiple Connections (if more than 1) */}
          {finalConnections > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Connection Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.from({ length: finalConnections }, (_, index) => (
                    <div
                      key={index}
                      className="p-4 border rounded-lg space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Connection {index + 1}</h4>
                        <div className="flex items-center space-x-2">
                          <Label className="text-sm">Use Custom Plan</Label>
                          <Switch
                            checked={
                              formData.connections[index]?.isCustomPlan || false
                            }
                            onCheckedChange={(checked) =>
                              toggleConnectionCustomPlan(index, checked)
                            }
                            disabled={isSaving}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>VC Number</Label>
                          <Input
                            value={
                              formData.connections[index]?.vcNumber ||
                              `${formData.vcNumber}-${index + 1}`
                            }
                            onChange={(e) =>
                              handleConnectionChange(
                                index,
                                "vcNumber",
                                e.target.value,
                              )
                            }
                            disabled={isSaving}
                          />
                        </div>

                        {!formData.connections[index]?.isCustomPlan ? (
                          <>
                            <div>
                              <Label>Plan</Label>
                              <Select
                                value={
                                  formData.connections[index]?.planName ||
                                  formData.currentPackage
                                }
                                onValueChange={(value) => {
                                  const pkg = mockPackages.find(
                                    (p) => p.name === value,
                                  );
                                  handleConnectionChange(
                                    index,
                                    "planName",
                                    value,
                                  );
                                  handleConnectionChange(
                                    index,
                                    "planPrice",
                                    pkg?.price || 0,
                                  );
                                }}
                                disabled={isSaving}
                              >
                                <SelectTrigger
                                  className={
                                    errors[`conn${index}Plan`]
                                      ? "border-red-500"
                                      : ""
                                  }
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {mockPackages.map((pkg) => (
                                    <SelectItem key={pkg.id} value={pkg.name}>
                                      {pkg.name} - ₹{pkg.price}/month
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {errors[`conn${index}Plan`] && (
                                <p className="text-sm text-red-500 mt-1">
                                  {errors[`conn${index}Plan`]}
                                </p>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <Label>Custom Plan Name *</Label>
                              <Input
                                value={
                                  formData.connections[index]?.customPlanName ||
                                  ""
                                }
                                onChange={(e) =>
                                  handleConnectionChange(
                                    index,
                                    "customPlanName",
                                    e.target.value,
                                  )
                                }
                                disabled={isSaving}
                                className={
                                  errors[`conn${index}CustomName`]
                                    ? "border-red-500"
                                    : ""
                                }
                              />
                              {errors[`conn${index}CustomName`] && (
                                <p className="text-sm text-red-500 mt-1">
                                  {errors[`conn${index}CustomName`]}
                                </p>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      {formData.connections[index]?.isCustomPlan && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Price (₹) *</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={
                                formData.connections[index]?.customPlanPrice ||
                                0
                              }
                              onChange={(e) =>
                                handleConnectionChange(
                                  index,
                                  "customPlanPrice",
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              disabled={isSaving}
                              className={
                                errors[`conn${index}CustomPrice`]
                                  ? "border-red-500"
                                  : ""
                              }
                            />
                            {errors[`conn${index}CustomPrice`] && (
                              <p className="text-sm text-red-500 mt-1">
                                {errors[`conn${index}CustomPrice`]}
                              </p>
                            )}
                          </div>
                          <div>
                            <Label>Description</Label>
                            <Input
                              value={
                                formData.connections[index]
                                  ?.customPlanDescription || ""
                              }
                              onChange={(e) =>
                                handleConnectionChange(
                                  index,
                                  "customPlanDescription",
                                  e.target.value,
                                )
                              }
                              disabled={isSaving}
                            />
                          </div>
                        </div>
                      )}

                      <div className="text-right">
                        <span className="text-sm font-medium">
                          Monthly Price: ₹
                          {formData.connections[index]?.isCustomPlan
                            ? (
                                formData.connections[index]?.customPlanPrice ||
                                0
                              ).toFixed(2)
                            : (
                                formData.connections[index]?.planPrice || 0
                              ).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}

                  {finalConnections > 1 && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="text-sm font-medium text-blue-800">
                        Total Monthly Billing: ₹
                        {formData.connections
                          .slice(0, finalConnections)
                          .reduce((sum, conn) => {
                            const price = conn?.isCustomPlan
                              ? conn.customPlanPrice || 0
                              : conn?.planPrice || 0;
                            return sum + price;
                          }, 0)
                          .toFixed(2)}
                      </div>
                      <div className="text-xs text-blue-600">
                        All connections will be billed as one combined invoice
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

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
