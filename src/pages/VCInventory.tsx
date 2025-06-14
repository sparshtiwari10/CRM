import React, { useState, useEffect, useContext } from "react";
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Power,
  PowerOff,
  Users,
  History,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AuthContext } from "@/contexts/AuthContext";
import { VCInventoryService } from "@/services/vcInventoryService";
import { CustomerService } from "@/services/customerService";
import { PackageService } from "@/services/packageService";
import { VCInventoryItem, Customer, Package } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function VCInventory() {
  const [vcItems, setVCItems] = useState<VCInventoryItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Selected items
  const [selectedVC, setSelectedVC] = useState<VCInventoryItem | null>(null);
  const [deleteVC, setDeleteVC] = useState<VCInventoryItem | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    vcNumber: "",
    customerId: "",
    packageId: "",
    status: "inactive" as "active" | "inactive",
    reason: "",
  });

  const { user, isAdmin } = useContext(AuthContext);
  const { toast } = useToast();

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, [user, isAdmin]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Load VC items based on user role
      let vcData: VCInventoryItem[];
      if (isAdmin) {
        vcData = await VCInventoryService.getAllVCItems();
      } else {
        // Employees can only see VCs for customers in their areas
        const userAreas =
          user?.assigned_areas ||
          (user?.collector_name ? [user.collector_name] : []);
        vcData = await VCInventoryService.getVCItemsByArea(userAreas);
      }

      // Load customers and packages for reference
      const [customersData, packagesData] = await Promise.all([
        CustomerService.getAllCustomers(),
        PackageService.getAllPackages(),
      ]);

      setVCItems(vcData);
      setCustomers(customersData);
      setPackages(packagesData);
    } catch (error) {
      console.error("Failed to load VC inventory:", error);
      toast({
        title: "Error",
        description: "Failed to load VC inventory data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter VCs based on search and filters
  const filteredVCs = vcItems.filter((vc) => {
    const matchesSearch =
      !searchTerm ||
      vc.vcNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vc.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vc.packageName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || vc.status === statusFilter;

    const matchesCustomer =
      customerFilter === "all" ||
      (customerFilter === "unassigned" && !vc.customerId) ||
      vc.customerId === customerFilter;

    return matchesSearch && matchesStatus && matchesCustomer;
  });

  // Get unique customers for filter
  const assignedCustomers = Array.from(
    new Set(vcItems.filter((vc) => vc.customerId).map((vc) => vc.customerId)),
  )
    .map((customerId) => customers.find((c) => c.id === customerId))
    .filter(Boolean) as Customer[];

  const handleAddVC = () => {
    setFormData({
      vcNumber: "",
      customerId: "",
      packageId: "",
      status: "inactive",
      reason: "",
    });
    setShowAddModal(true);
  };

  const handleEditVC = (vc: VCInventoryItem) => {
    setSelectedVC(vc);
    setFormData({
      vcNumber: vc.vcNumber,
      customerId: vc.customerId,
      packageId: vc.packageId,
      status: vc.status,
      reason: "",
    });
    setShowEditModal(true);
  };

  const handleReassignVC = (vc: VCInventoryItem) => {
    setSelectedVC(vc);
    setFormData({
      vcNumber: vc.vcNumber,
      customerId: "",
      packageId: vc.packageId,
      status: vc.status,
      reason: "",
    });
    setShowReassignModal(true);
  };

  const handleChangeStatus = async (
    vc: VCInventoryItem,
    newStatus: "active" | "inactive",
  ) => {
    try {
      await VCInventoryService.changeVCStatus(
        vc.id,
        newStatus,
        `Status changed via UI`,
      );
      await loadData();
      toast({
        title: "Status Updated",
        description: `VC ${vc.vcNumber} status changed to ${newStatus}`,
      });
    } catch (error) {
      console.error("Failed to change VC status:", error);
      toast({
        title: "Error",
        description: "Failed to change VC status",
        variant: "destructive",
      });
    }
  };

  const handleSaveVC = async () => {
    try {
      if (!formData.vcNumber || !formData.packageId) {
        toast({
          title: "Validation Error",
          description: "VC number and package are required",
          variant: "destructive",
        });
        return;
      }

      const customer = customers.find((c) => c.id === formData.customerId);
      const pkg = packages.find((p) => p.id === formData.packageId);

      if (selectedVC) {
        // Update existing VC
        const updates: Partial<VCInventoryItem> = {
          packageId: formData.packageId,
          packageName: pkg?.name,
          packageAmount: pkg?.price,
        };

        await VCInventoryService.updateVCItem(selectedVC.id, updates);
        toast({
          title: "Success",
          description: "VC updated successfully",
        });
      } else {
        // Create new VC
        const vcData = {
          vcNumber: formData.vcNumber,
          customerId: formData.customerId,
          customerName: customer?.name || "",
          packageId: formData.packageId,
          packageName: pkg?.name || "",
          packageAmount: pkg?.price || 0,
          status: formData.status,
          statusHistory: [
            {
              status: formData.status,
              changedAt: new Date(),
              changedBy: user?.name || "Unknown",
              reason: "Initial creation",
            },
          ],
          ownershipHistory: formData.customerId
            ? [
                {
                  customerId: formData.customerId,
                  customerName: customer?.name || "",
                  startDate: new Date(),
                  assignedBy: user?.name || "Unknown",
                },
              ]
            : [],
        };

        await VCInventoryService.createVCItem(vcData);
        toast({
          title: "Success",
          description: "VC created successfully",
        });
      }

      await loadData();
      setShowAddModal(false);
      setShowEditModal(false);
      setSelectedVC(null);
    } catch (error) {
      console.error("Failed to save VC:", error);
      toast({
        title: "Error",
        description: "Failed to save VC",
        variant: "destructive",
      });
    }
  };

  const handleReassign = async () => {
    try {
      if (!selectedVC || !formData.customerId) {
        toast({
          title: "Validation Error",
          description: "Customer selection is required",
          variant: "destructive",
        });
        return;
      }

      const customer = customers.find((c) => c.id === formData.customerId);
      if (!customer) {
        throw new Error("Customer not found");
      }

      await VCInventoryService.reassignVC(
        selectedVC.id,
        formData.customerId,
        customer.name,
      );
      await loadData();
      setShowReassignModal(false);
      setSelectedVC(null);

      toast({
        title: "Success",
        description: `VC ${selectedVC.vcNumber} reassigned to ${customer.name}`,
      });
    } catch (error) {
      console.error("Failed to reassign VC:", error);
      toast({
        title: "Error",
        description: "Failed to reassign VC",
        variant: "destructive",
      });
    }
  };

  const handleDeleteVC = async () => {
    try {
      if (!deleteVC) return;

      await VCInventoryService.deleteVCItem(deleteVC.id);
      await loadData();
      setShowDeleteDialog(false);
      setDeleteVC(null);

      toast({
        title: "Success",
        description: `VC ${deleteVC.vcNumber} deleted successfully`,
      });
    } catch (error) {
      console.error("Failed to delete VC:", error);
      toast({
        title: "Error",
        description: "Failed to delete VC",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="VC Inventory">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="VC Inventory">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-2xl font-bold text-foreground">VC Inventory</h2>
            <p className="text-muted-foreground">
              Manage VC numbers, assignments, and status tracking
            </p>
          </div>
          {isAdmin && (
            <Button onClick={handleAddVC}>
              <Plus className="mr-2 h-4 w-4" />
              Add VC
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total VCs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{vcItems.length}</div>
              <p className="text-xs text-muted-foreground">
                {filteredVCs.length} matching filters
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active VCs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {vcItems.filter((vc) => vc.status === "active").length}
              </div>
              <p className="text-xs text-muted-foreground">
                {(
                  (vcItems.filter((vc) => vc.status === "active").length /
                    vcItems.length) *
                  100
                ).toFixed(1)}
                % of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Assigned VCs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {vcItems.filter((vc) => vc.customerId).length}
              </div>
              <p className="text-xs text-muted-foreground">
                {vcItems.filter((vc) => !vc.customerId).length} unassigned
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Monthly Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹
                {vcItems
                  .filter((vc) => vc.status === "active")
                  .reduce((sum, vc) => sum + (vc.packageAmount || 0), 0)
                  .toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">From active VCs</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search VCs, customers, packages..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select value={customerFilter} onValueChange={setCustomerFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {assignedCustomers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(searchTerm ||
                statusFilter !== "all" ||
                customerFilter !== "all") && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setCustomerFilter("all");
                  }}
                  className="px-3"
                >
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* VC Table */}
        <Card>
          <CardContent className="p-6">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>VC Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="w-16">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVCs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="text-muted-foreground">
                          {vcItems.length === 0
                            ? "No VC entries found"
                            : "No VCs match the current filters"}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredVCs.map((vc) => (
                      <TableRow key={vc.id}>
                        <TableCell className="font-medium">
                          {vc.vcNumber}
                        </TableCell>
                        <TableCell>
                          {vc.customerName ? (
                            <div>
                              <div className="font-medium">
                                {vc.customerName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {
                                  customers.find((c) => c.id === vc.customerId)
                                    ?.phoneNumber
                                }
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">
                              Unassigned
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{vc.packageName}</div>
                          </div>
                        </TableCell>
                        <TableCell>₹{vc.packageAmount || 0}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              vc.status === "active" ? "default" : "secondary"
                            }
                          >
                            {vc.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(vc.updatedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <Filter className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedVC(vc);
                                  setShowHistoryModal(true);
                                }}
                              >
                                <History className="mr-2 h-4 w-4" />
                                View History
                              </DropdownMenuItem>
                              {isAdmin && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleEditVC(vc)}
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleReassignVC(vc)}
                                  >
                                    <Users className="mr-2 h-4 w-4" />
                                    Reassign
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {vc.status === "inactive" ? (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleChangeStatus(vc, "active")
                                      }
                                      className="text-green-600"
                                    >
                                      <Power className="mr-2 h-4 w-4" />
                                      Activate
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleChangeStatus(vc, "inactive")
                                      }
                                      className="text-red-600"
                                    >
                                      <PowerOff className="mr-2 h-4 w-4" />
                                      Deactivate
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setDeleteVC(vc);
                                      setShowDeleteDialog(true);
                                    }}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Add/Edit VC Modal */}
        <Dialog
          open={showAddModal || showEditModal}
          onOpenChange={(open) => {
            setShowAddModal(false);
            setShowEditModal(false);
            if (!open) setSelectedVC(null);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedVC ? "Edit VC" : "Add New VC"}</DialogTitle>
              <DialogDescription>
                {selectedVC ? "Update VC information" : "Create a new VC entry"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="vcNumber">VC Number</Label>
                <Input
                  id="vcNumber"
                  value={formData.vcNumber}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      vcNumber: e.target.value,
                    }))
                  }
                  placeholder="Enter VC number"
                  disabled={!!selectedVC}
                />
              </div>
              <div>
                <Label htmlFor="customer">Customer</Label>
                <Select
                  value={formData.customerId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, customerId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} - {customer.phoneNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="package">Package</Label>
                <Select
                  value={formData.packageId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, packageId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select package" />
                  </SelectTrigger>
                  <SelectContent>
                    {packages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.name} - ₹{pkg.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!selectedVC && (
                <div>
                  <Label htmlFor="status">Initial Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: "active" | "inactive") =>
                      setFormData((prev) => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveVC}>
                {selectedVC ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reassign Modal */}
        <Dialog open={showReassignModal} onOpenChange={setShowReassignModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Reassign VC</DialogTitle>
              <DialogDescription>
                Reassign VC {selectedVC?.vcNumber} to a different customer
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="newCustomer">New Customer</Label>
                <Select
                  value={formData.customerId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, customerId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select new customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} - {customer.phoneNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="reason">Reason for Reassignment</Label>
                <Textarea
                  id="reason"
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, reason: e.target.value }))
                  }
                  placeholder="Enter reason for reassignment"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowReassignModal(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleReassign}>Reassign VC</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* History Modal */}
        <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>VC History - {selectedVC?.vcNumber}</DialogTitle>
              <DialogDescription>
                Complete status and ownership history for this VC
              </DialogDescription>
            </DialogHeader>
            {selectedVC && (
              <div className="space-y-6">
                {/* Status History */}
                <div>
                  <h4 className="font-semibold mb-3">Status Changes</h4>
                  <div className="space-y-2">
                    {selectedVC.statusHistory.map((entry, index) => (
                      <div key={index} className="border rounded p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Badge
                              variant={
                                entry.status === "active"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {entry.status}
                            </Badge>
                            <span className="ml-2 text-sm text-muted-foreground">
                              by {entry.changedBy}
                            </span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {new Date(entry.changedAt).toLocaleString()}
                          </span>
                        </div>
                        {entry.reason && (
                          <div className="text-sm text-muted-foreground mt-2">
                            {entry.reason}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ownership History */}
                {selectedVC.ownershipHistory.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Ownership History</h4>
                    <div className="space-y-2">
                      {selectedVC.ownershipHistory.map((entry, index) => (
                        <div key={index} className="border rounded p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium">
                                {entry.customerName}
                              </span>
                              <span className="ml-2 text-sm text-muted-foreground">
                                by {entry.assignedBy}
                              </span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {new Date(entry.startDate).toLocaleDateString()}
                              {entry.endDate &&
                                ` - ${new Date(entry.endDate).toLocaleDateString()}`}
                              {!entry.endDate && " - Current"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setShowHistoryModal(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete VC</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete VC {deleteVC?.vcNumber}? This
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteVC(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteVC}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete VC
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
