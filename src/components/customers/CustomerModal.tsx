import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Customer } from "@/types";

interface CustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  onSave: (customer: Customer) => void;
  isSaving?: boolean;
}

export function CustomerModal({
  open,
  onOpenChange,
  customer,
  onSave,
  isSaving = false,
}: CustomerModalProps) {
  const isEditing = !!customer;

  // Simple form state
  const [name, setName] = useState(customer?.name || "");
  const [phone, setPhone] = useState(customer?.phoneNumber || "");
  const [email, setEmail] = useState(customer?.email || "");
  const [address, setAddress] = useState(customer?.address || "");

  // Reset form when customer changes
  if (open && customer && name !== customer.name) {
    setName(customer.name || "");
    setPhone(customer.phoneNumber || "");
    setEmail(customer.email || "");
    setAddress(customer.address || "");
  }

  // Reset for new customer
  if (open && !customer && name !== "") {
    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim() || !phone.trim() || !address.trim()) {
      alert("Please fill in required fields");
      return;
    }

    const customerData: Customer = {
      id: customer?.id || Date.now().toString(),
      name: name.trim(),
      phoneNumber: phone.trim(),
      email: email.trim() || undefined,
      address: address.trim(),
      vcNumber:
        customer?.vcNumber || `VC${Math.random().toString().substr(2, 6)}`,
      currentPackage: customer?.currentPackage || "Basic",
      collectorName: customer?.collectorName || "John Collector",
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Customer" : "Add Customer"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSaving}
              placeholder="Customer name"
              required
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone *</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isSaving}
              placeholder="Phone number"
              required
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSaving}
              placeholder="Email address"
            />
          </div>

          <div>
            <Label htmlFor="address">Address *</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={isSaving}
              placeholder="Full address"
              required
            />
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
              {isSaving ? "Saving..." : isEditing ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
