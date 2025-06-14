import React, { useState, useEffect } from "react";
import { Search, Check, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VCInventoryService } from "@/services/vcInventoryService";
import { packageService } from "@/services/packageService";
import { VCInventoryItem, Package } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface VCSelectorProps {
  customerId: string;
  customerName: string;
  selectedVCs: string[];
  onVCsChange: (vcIds: string[]) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function VCSelector({
  customerId,
  customerName,
  selectedVCs,
  onVCsChange,
  onClose,
  isOpen,
}: VCSelectorProps) {
  const { toast } = useToast();
  const [availableVCs, setAvailableVCs] = useState<VCInventoryItem[]>([]);
  const [currentVCs, setCurrentVCs] = useState<VCInventoryItem[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [tempSelectedVCs, setTempSelectedVCs] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setTempSelectedVCs(selectedVCs);
      loadData();
    }
  }, [isOpen, selectedVCs]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [available, current, packagesData] = await Promise.all([
        VCInventoryService.getAvailableVCs(),
        VCInventoryService.getVCItemsByCustomer(customerId),
        packageService.getAllPackages(),
      ]);

      setAvailableVCs(available);
      setCurrentVCs(current);
      setPackages(packagesData);
    } catch (error) {
      console.error("Error loading VC data:", error);
      toast({
        title: "Error",
        description: "Failed to load VC inventory data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredVCs = availableVCs.filter((vc) =>
    vc.vcNumber.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleVCToggle = (vcId: string) => {
    setTempSelectedVCs((prev) => {
      if (prev.includes(vcId)) {
        return prev.filter((id) => id !== vcId);
      } else {
        return [...prev, vcId];
      }
    });
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      // Find VCs to assign (new selections)
      const vcsToAssign = tempSelectedVCs.filter(
        (vcId) => !selectedVCs.includes(vcId),
      );

      // Find VCs to unassign (removed selections)
      const vcsToUnassign = selectedVCs.filter(
        (vcId) => !tempSelectedVCs.includes(vcId),
      );

      // Assign new VCs
      if (vcsToAssign.length > 0) {
        await VCInventoryService.assignVCsToCustomer(
          vcsToAssign,
          customerId,
          customerName,
        );
      }

      // Unassign removed VCs
      if (vcsToUnassign.length > 0) {
        await VCInventoryService.unassignVCsFromCustomer(vcsToUnassign);
      }

      onVCsChange(tempSelectedVCs);
      onClose();

      toast({
        title: "Success",
        description: `VC assignments updated for ${customerName}`,
      });
    } catch (error) {
      console.error("Error updating VC assignments:", error);
      toast({
        title: "Error",
        description: "Failed to update VC assignments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getVCDetails = (vcId: string) => {
    return (
      availableVCs.find((vc) => vc.id === vcId) ||
      currentVCs.find((vc) => vc.id === vcId)
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Assign VC Numbers</DialogTitle>
          <DialogDescription>
            Select VC numbers to assign to {customerName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto">
          {/* Current VCs */}
          {currentVCs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Currently Assigned VCs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {currentVCs.map((vc) => (
                    <Badge key={vc.id} variant="secondary">
                      {vc.vcNumber}
                      <span className="ml-1 text-xs">({vc.status})</span>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search VC numbers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Available VCs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Available VC Numbers</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading VCs...</div>
              ) : filteredVCs.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  {searchTerm
                    ? "No VCs found matching search"
                    : "No available VCs"}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto">
                  {filteredVCs.map((vc) => (
                    <div
                      key={vc.id}
                      className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent cursor-pointer"
                      onClick={() => handleVCToggle(vc.id)}
                    >
                      <Checkbox
                        checked={tempSelectedVCs.includes(vc.id)}
                        onChange={() => handleVCToggle(vc.id)}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{vc.vcNumber}</div>
                        <div className="text-sm text-muted-foreground">
                          Area: {vc.area}
                        </div>
                        {vc.packageName && (
                          <div className="text-xs text-muted-foreground">
                            Package: {vc.packageName}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline">{vc.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selected VCs Summary */}
          {tempSelectedVCs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Selected VCs ({tempSelectedVCs.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {tempSelectedVCs.map((vcId) => {
                    const vc = getVCDetails(vcId);
                    return (
                      <Badge key={vcId} variant="default">
                        {vc?.vcNumber || vcId}
                        <button
                          onClick={() => handleVCToggle(vcId)}
                          className="ml-2 hover:bg-destructive/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save VC Assignments"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
