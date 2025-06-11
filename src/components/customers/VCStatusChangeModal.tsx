import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tv, Power, PowerOff } from "lucide-react";
import { Customer, Connection, CustomerStatus } from "@/types";
import { cn } from "@/lib/utils";

interface VCStatusChangeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  requestedStatus: CustomerStatus;
  onConfirm: (
    customer: Customer,
    newStatus: CustomerStatus,
    selectedVCs: string[],
  ) => Promise<void>;
}

export function VCStatusChangeModal({
  open,
  onOpenChange,
  customer,
  requestedStatus,
  onConfirm,
}: VCStatusChangeModalProps) {
  const [selectedVCs, setSelectedVCs] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset selection when modal opens
  React.useEffect(() => {
    if (open && customer) {
      // If customer has only one VC or no connections, select the primary VC
      if (!customer.connections || customer.connections.length <= 1) {
        setSelectedVCs([customer.vcNumber]);
      } else {
        // For multiple connections, start with none selected
        setSelectedVCs([]);
      }
    }
  }, [open, customer]);

  if (!customer) return null;

  // Get all VC numbers (primary + connections)
  const getAllVCs = (): Array<{
    vcNumber: string;
    connection?: Connection;
    isPrimary: boolean;
    currentStatus: CustomerStatus;
  }> => {
    const vcs = [];

    // Add primary VC
    if (customer.vcNumber) {
      vcs.push({
        vcNumber: customer.vcNumber,
        isPrimary: true,
        currentStatus: customer.status || "inactive",
      });
    }

    // Add connection VCs
    if (customer.connections && customer.connections.length > 0) {
      customer.connections.forEach((conn) => {
        // Avoid duplicating primary VC if it's also in connections
        if (conn.vcNumber !== customer.vcNumber) {
          vcs.push({
            vcNumber: conn.vcNumber,
            connection: conn,
            isPrimary: conn.isPrimary || false,
            currentStatus: conn.status || "inactive",
          });
        }
      });
    }

    return vcs;
  };

  const allVCs = getAllVCs();
  const hasMultipleVCs = allVCs.length > 1;

  const handleVCToggle = (vcNumber: string, checked: boolean) => {
    if (checked) {
      setSelectedVCs((prev) => [...prev, vcNumber]);
    } else {
      setSelectedVCs((prev) => prev.filter((vc) => vc !== vcNumber));
    }
  };

  const handleSelectAll = () => {
    const eligibleVCs = allVCs
      .filter((vc) => {
        // Only include VCs that would actually change status
        return requestedStatus === "active"
          ? vc.currentStatus !== "active"
          : vc.currentStatus !== "inactive";
      })
      .map((vc) => vc.vcNumber);

    setSelectedVCs(eligibleVCs);
  };

  const handleDeselectAll = () => {
    setSelectedVCs([]);
  };

  const handleConfirm = async () => {
    if (selectedVCs.length === 0) return;

    setIsProcessing(true);
    try {
      await onConfirm(customer, requestedStatus, selectedVCs);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update VC status:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const actionText = requestedStatus === "active" ? "Activate" : "Deactivate";
  const actionColor =
    requestedStatus === "active" ? "text-green-600" : "text-red-600";
  const ActionIcon = requestedStatus === "active" ? Power : PowerOff;

  // Filter VCs that would actually change
  const eligibleVCs = allVCs.filter((vc) => {
    return requestedStatus === "active"
      ? vc.currentStatus !== "active"
      : vc.currentStatus !== "inactive";
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle
            className={cn("flex items-center space-x-2", actionColor)}
          >
            <ActionIcon className="h-5 w-5" />
            <span>{actionText} VC Numbers</span>
          </DialogTitle>
          <DialogDescription>
            {hasMultipleVCs
              ? `Select which VC numbers to ${actionText.toLowerCase()} for ${customer.name}`
              : `Confirm ${actionText.toLowerCase()} for ${customer.name}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selection controls for multiple VCs */}
          {hasMultipleVCs && eligibleVCs.length > 1 && (
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={selectedVCs.length === eligibleVCs.length}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeselectAll}
                disabled={selectedVCs.length === 0}
              >
                Deselect All
              </Button>
            </div>
          )}

          {/* VC List */}
          <div className="space-y-3">
            {allVCs.map((vc) => {
              const canChange =
                requestedStatus === "active"
                  ? vc.currentStatus !== "active"
                  : vc.currentStatus !== "inactive";

              const isSelected = selectedVCs.includes(vc.vcNumber);

              return (
                <div
                  key={vc.vcNumber}
                  className={cn(
                    "border rounded-lg p-3",
                    canChange ? "bg-background" : "bg-muted",
                    !canChange && "opacity-60",
                  )}
                >
                  <div className="flex items-center space-x-3">
                    {canChange && hasMultipleVCs && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          handleVCToggle(vc.vcNumber, checked as boolean)
                        }
                      />
                    )}

                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Tv className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{vc.vcNumber}</span>

                        {vc.isPrimary && (
                          <Badge variant="default" className="text-xs">
                            Primary
                          </Badge>
                        )}

                        <Badge
                          variant={
                            vc.currentStatus === "active"
                              ? "default"
                              : vc.currentStatus === "demo"
                                ? "secondary"
                                : "destructive"
                          }
                          className="text-xs"
                        >
                          {vc.currentStatus}
                        </Badge>
                      </div>

                      {vc.connection && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {vc.connection.planName} - ₹{vc.connection.planPrice}
                          /month
                        </div>
                      )}

                      {!canChange && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Already {requestedStatus}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {eligibleVCs.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              All VC numbers are already {requestedStatus}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedVCs.length === 0 || isProcessing}
            className={
              requestedStatus === "active"
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-600 hover:bg-red-700"
            }
          >
            {isProcessing
              ? "Processing..."
              : `${actionText} Selected (${selectedVCs.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
