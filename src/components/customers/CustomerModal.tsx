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
import { firestoreService } from "@/services/firestoreService";
import { AreaService } from "@/services/areaService";
import { VCSelector } from "./VCSelector";
import { VCInventoryService } from "@/services/vcInventoryService";

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
  const [availableAreas, setAvailableAreas] = useState<string[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [customerVCs, setCustomerVCs] = useState<string[]>([]);

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
              ? customer.connections
              : [
                  {
                    id: "conn-1",
                    vcNumber: customer.vcNumber || "",
                    planName: customer.currentPackage || "",
                    planPrice: customer.packageAmount || 0,
                    isCustomPlan: false,
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
        // Creating new customer
        setFormData(initialFormData);
      }
      setErrors({});
      setIsSaving(false);
    }
  }, [open, customer]);

  // Load available areas and packages
  useEffect(() => {
    if (open) {
      const loadData = async () => {
        try {
          // Load managed areas from AreaService
          const areaNames = await AreaService.getAreaNames();

          if (areaNames.length > 0) {
            setAvailableAreas(areaNames);
            console.log("📍 Loaded managed areas:", areaNames);
          } else {
            // Fallback: Load areas from existing data if no managed areas
            const customers = await firestoreService.getAllCustomers();
            const areas = customers
              .map((c) => c.collectorName)
              .filter(Boolean)
              .filter((area, index, arr) => arr.indexOf(area) === index)
              .sort();

            const employees = await authService.getAllEmployees();
            const employeeAreas = employees
              .map((e) => e.collector_name)
              .filter(Boolean);

            // Combine and deduplicate
            const allAreas = [...new Set([...areas, ...employeeAreas])].sort();
            setAvailableAreas(allAreas);

            console.log("📍 Fallback areas from existing data:", allAreas);
          }
        } catch (error) {
          console.error("Failed to load areas:", error);
          // Set some default areas if loading fails
          setAvailableAreas(["Downtown", "Suburbs", "Industrial"]);
        }

        try {
          // Load packages
          const packagesData = await firestoreService.getAllPackages();
          setPackages(packagesData);
        } catch (error) {
          console.error("Failed to load packages:", error);
          setPackages([]);
        }
      };

      loadData();
    }
  }, [open]);

  const handleInputChange = (field: string, value: any) => {
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

  const handleConnectionChange = (index: number, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      connections: prev.connections.map((conn, i) =>
        i === index ? { ...conn, [field]: value } : conn,
      ),
    }));
  };

  const addConnection = () => {
    const newConnectionIndex = formData.connections.length;
    setFormData((prev) => ({
      ...prev,
      connections: [
        ...prev.connections,
        {
          id: `conn-${newConnectionIndex + 1}`,
          vcNumber: "",
          planName: "",
          planPrice: 0,
          isCustomPlan: false,
          isPrimary: false,
          connectionIndex: newConnectionIndex,
          status: "active",
          packageAmount: 0,
          previousOutstanding: 0,
          currentOutstanding: 0,
        },
      ],
    }));
  };

  const removeConnection = (index: number) => {
    if (formData.connections.length > 1) {
      setFormData({
        name: customer.name,
        phoneNumber: customer.phoneNumber,
        email: customer.email || "",
        address: customer.address || "",
        joinDate: customer.joinDate
          ? new Date(customer.joinDate).toISOString().split("T")[0]
          : "",
        billDueDate: customer.billDueDate || 5,
        status: customer.status || "active",
        collectorName: customer.collectorName || "",
        previousOutstanding: customer.previousOS || 0,
        connections: customer.connections || [],
      });

      // Load customer VCs
      if (customer.id) {
        const loadVCs = async () => {
          try {
            const vcItems = await VCInventoryService.getVCItemsByCustomer(
              customer.id,
            );
            setCustomerVCs(vcItems.map((vc) => vc.id));
          } catch (error) {
            console.error("Error loading customer VCs:", error);
          }
        };
        loadVCs();
      }
    } else {
      setFormData(initialFormData);
      setCustomerVCs([]);
    }
  };

  const validateForm = (): boolean => {
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

    if (!formData.collectorName.trim()) {
      newErrors.collectorName = "Area selection is required";
    }

    // Validate connections
    formData.connections.forEach((conn, index) => {
      if (!conn.vcNumber.trim()) {
        newErrors[`connection_${index}_vcNumber`] = "VC Number is required";
      }

      if (!conn.planName.trim()) {
        newErrors[`connection_${index}_planName`] = "Plan is required";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || isSaving) {
      return;
    }

    try {
      setIsSaving(true);

      const primaryConnection =
        formData.connections.find((conn) => conn.isPrimary) ||
        formData.connections[0];

      const customerData: Customer = {
        id: customer?.id || "",
        name: formData.name.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        joinDate: formData.joinDate,
        billDueDate: formData.billDueDate,
        status: formData.status,
        isActive: formData.status === "active",
        collectorName: formData.collectorName.trim(),
        previousOutstanding: formData.previousOutstanding,
        currentOutstanding: primaryConnection?.currentOutstanding || 0,
        vcNumber: primaryConnection?.vcNumber || "",
        currentPackage: primaryConnection?.planName || "",
        packageAmount: primaryConnection?.packageAmount || 0,
        connections: formData.connections,
        numberOfConnections: formData.connections.length,
        portalBill: primaryConnection?.packageAmount || 0,
        billingStatus: "Pending",
        lastPaymentDate: new Date().toISOString().split("T")[0],
      };

      // Call the onSave function and wait for it to complete
      await onSave(customerData);

      // Only close modal if save was successful
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving customer:", error);
      // Error is handled by parent component, don't close modal
    } finally {
      setIsSaving(false);
    }
  };

  const billDueDateOptions = Array.from({ length: 28 }, (_, i) => i + 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {customer ? "Edit Customer" : "Add New Customer"}
          </DialogTitle>
          <DialogDescription>
            {customer
              ? "Update customer information and connections"
              : "Add a new customer to the system"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Customer Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
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
                  value={formData.phoneNumber}
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
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="Enter email address (optional)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="collectorName">Area *</Label>
                <Select
                  value={formData.collectorName || ""}
                  onValueChange={(value) =>
                    handleInputChange("collectorName", value)
                  }
                >
                  <SelectTrigger
                    className={errors.collectorName ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select an area" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAreas.map((area) => (
                      <SelectItem key={area} value={area}>
                        {area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.collectorName && (
                  <p className="text-sm text-red-500">{errors.collectorName}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                placeholder="Enter full address"
                className={errors.address ? "border-red-500" : ""}
                rows={3}
              />
              {errors.address && (
                <p className="text-sm text-red-500">{errors.address}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="joinDate">Join Date</Label>
                <Input
                  id="joinDate"
                  type="date"
                  value={formData.joinDate}
                  onChange={(e) =>
                    handleInputChange("joinDate", e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="billDueDate">Bill Due Date</Label>
                <Select
                  value={formData.billDueDate.toString()}
                  onValueChange={(value) =>
                    handleInputChange("billDueDate", parseInt(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {billDueDateOptions.map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        {day}
                        {day === 1
                          ? "st"
                          : day === 2
                            ? "nd"
                            : day === 3
                              ? "rd"
                              : "th"}{" "}
                        of month
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: CustomerStatus) =>
                    handleInputChange("status", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="demo">Demo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="previousOutstanding">Previous Outstanding</Label>
              <Input
                id="previousOutstanding"
                type="number"
                step="0.01"
                min="0"
                value={formData.previousOutstanding}
                onChange={(e) =>
                  handleInputChange(
                    "previousOutstanding",
                    parseFloat(e.target.value) || 0,
                  )
                }
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Connections */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Connections</h3>
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
                key={index}
                className="border rounded-lg p-4 space-y-4 relative"
              >
                {formData.connections.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => removeConnection(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}

                <div className="flex items-center justify-between">
                  <h4 className="font-medium">
                    Connection {index + 1}
                    {connection.isPrimary && (
                      <span className="ml-2 text-sm text-blue-600">
                        (Primary)
                      </span>
                    )}
                  </h4>
                  {index > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleConnectionChange(index, "isPrimary", true)
                      }
                    >
                      Make Primary
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>VC Number *</Label>
                    <Input
                      value={connection.vcNumber}
                      onChange={(e) =>
                        handleConnectionChange(
                          index,
                          "vcNumber",
                          e.target.value,
                        )
                      }
                      placeholder="Enter VC number"
                      className={
                        errors[`connection_${index}_vcNumber`]
                          ? "border-red-500"
                          : ""
                      }
                    />
                    {errors[`connection_${index}_vcNumber`] && (
                      <p className="text-sm text-red-500">
                        {errors[`connection_${index}_vcNumber`]}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Package *</Label>
                    <Select
                      value={connection.planName}
                      onValueChange={(value) => {
                        const selectedPackage = packages.find(
                          (pkg) => pkg.name === value,
                        );
                        handleConnectionChange(index, "planName", value);
                        if (selectedPackage) {
                          handleConnectionChange(
                            index,
                            "packageAmount",
                            selectedPackage.price,
                          );
                          handleConnectionChange(
                            index,
                            "planPrice",
                            selectedPackage.price,
                          );
                        }
                      }}
                    >
                      <SelectTrigger
                        className={
                          errors[`connection_${index}_planName`]
                            ? "border-red-500"
                            : ""
                        }
                      >
                        <SelectValue placeholder="Select package" />
                      </SelectTrigger>
                      <SelectContent>
                        {packages.map((pkg) => (
                          <SelectItem key={pkg.id} value={pkg.name}>
                            {pkg.name} - ₹{pkg.price}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors[`connection_${index}_planName`] && (
                      <p className="text-sm text-red-500">
                        {errors[`connection_${index}_planName`]}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Package Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={connection.packageAmount}
                      onChange={(e) =>
                        handleConnectionChange(
                          index,
                          "packageAmount",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Previous Outstanding</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={connection.previousOutstanding}
                      onChange={(e) =>
                        handleConnectionChange(
                          index,
                          "previousOutstanding",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Current Outstanding</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={connection.currentOutstanding}
                      onChange={(e) =>
                        handleConnectionChange(
                          index,
                          "currentOutstanding",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={connection.status}
                      onValueChange={(value: CustomerStatus) =>
                        handleConnectionChange(index, "status", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="demo">Demo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* VC Management Section - Only show for existing customers */}
          {customer && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">VC Management</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Assigned VC Numbers</Label>
                    <p className="text-sm text-muted-foreground">
                      Manage VC number assignments for this customer
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowVCSelector(true)}
                  >
                    <Hash className="mr-2 h-4 w-4" />
                    Manage VCs
                  </Button>
                </div>

                {customerVCs.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Currently assigned: {customerVCs.length} VC
                    {customerVCs.length !== 1 ? "s" : ""}
                  </div>
                )}
              </div>
            </div>
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
              {isSaving ? "Saving..." : customer ? "Update" : "Create"} Customer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* VC Selector Modal */}
      {customer && (
        <VCSelector
          customerId={customer.id}
          customerName={customer.name}
          selectedVCs={customerVCs}
          onVCsChange={setCustomerVCs}
          onClose={() => setShowVCSelector(false)}
          isOpen={showVCSelector}
        />
      )}
    </Dialog>
  );
}
