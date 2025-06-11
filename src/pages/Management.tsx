import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CustomerService } from "@/services/customerService";
import { packageService } from "@/services/packageService";
import { Customer, Package } from "@/types";
import {
  Settings,
  Users,
  Package as PackageIcon,
  Edit,
  Filter,
  Download,
  Upload,
  CheckSquare,
  Square,
  Search,
  MapPin,
  Zap,
} from "lucide-react";

export default function Management() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterArea, setFilterArea] = useState("");
  const [filterPackage, setFilterPackage] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Bulk update states
  const [showBulkAreaDialog, setShowBulkAreaDialog] = useState(false);
  const [showBulkPackageDialog, setShowBulkPackageDialog] = useState(false);
  const [newArea, setNewArea] = useState("");
  const [newPackage, setNewPackage] = useState("");
  const [newPackageAmount, setNewPackageAmount] = useState("");

  const { toast } = useToast();

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [customersData, packagesData] = await Promise.all([
        CustomerService.getAllCustomers(),
        packageService.getAllPackages(),
      ]);
      setCustomers(customersData);
      setPackages(packagesData);
    } catch (error) {
      console.error("Failed to load management data:", error);
      toast({
        title: "Error",
        description: "Failed to load data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter customers based on search and filter criteria
  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phoneNumber.includes(searchTerm) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.vcNumber?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesArea =
      !filterArea ||
      filterArea === "ALL_AREAS" ||
      customer.collectorName === filterArea;
    const matchesPackage =
      !filterPackage ||
      filterPackage === "ALL_PACKAGES" ||
      customer.currentPackage === filterPackage;
    const matchesStatus =
      !filterStatus ||
      filterStatus === "ALL_STATUSES" ||
      customer.status === filterStatus;

    return matchesSearch && matchesArea && matchesPackage && matchesStatus;
  });

  // Get unique areas from customers
  const areas = [...new Set(customers.map((c) => c.collectorName))].filter(
    Boolean,
  );

  // Get unique package names
  const packageNames = [
    ...new Set(customers.map((c) => c.currentPackage)),
  ].filter(Boolean);

  // Handle individual customer selection
  const handleCustomerSelect = (customerId: string, checked: boolean) => {
    if (checked) {
      setSelectedCustomers((prev) => [...prev, customerId]);
    } else {
      setSelectedCustomers((prev) => prev.filter((id) => id !== customerId));
    }
  };

  // Handle select all customers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCustomers(filteredCustomers.map((c) => c.id));
    } else {
      setSelectedCustomers([]);
    }
  };

  // Check if all filtered customers are selected
  const isAllSelected =
    filteredCustomers.length > 0 &&
    selectedCustomers.length === filteredCustomers.length &&
    filteredCustomers.every((c) => selectedCustomers.includes(c.id));

  // Bulk update area
  const handleBulkAreaUpdate = async () => {
    if (!newArea || selectedCustomers.length === 0) {
      toast({
        title: "Error",
        description: "Please select customers and enter a new area.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);

      // Update each selected customer
      await Promise.all(
        selectedCustomers.map(async (customerId) => {
          const customer = customers.find((c) => c.id === customerId);
          if (customer) {
            const updatedCustomer = {
              ...customer,
              collectorName: newArea,
            };
            await CustomerService.updateCustomer(customerId, updatedCustomer);
          }
        }),
      );

      // Refresh data
      await loadData();

      toast({
        title: "Success",
        description: `Updated area for ${selectedCustomers.length} customers.`,
      });

      // Reset state
      setSelectedCustomers([]);
      setNewArea("");
      setShowBulkAreaDialog(false);
    } catch (error) {
      console.error("Failed to bulk update areas:", error);
      toast({
        title: "Error",
        description: "Failed to update customer areas. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Bulk update package
  const handleBulkPackageUpdate = async () => {
    if (!newPackage || selectedCustomers.length === 0) {
      toast({
        title: "Error",
        description: "Please select customers and enter a new package.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);

      // Update each selected customer
      await Promise.all(
        selectedCustomers.map(async (customerId) => {
          const customer = customers.find((c) => c.id === customerId);
          if (customer) {
            const updatedCustomer = {
              ...customer,
              currentPackage: newPackage,
              packageAmount: newPackageAmount
                ? parseFloat(newPackageAmount)
                : customer.packageAmount,
            };
            await CustomerService.updateCustomer(customerId, updatedCustomer);
          }
        }),
      );

      // Refresh data
      await loadData();

      toast({
        title: "Success",
        description: `Updated package for ${selectedCustomers.length} customers.`,
      });

      // Reset state
      setSelectedCustomers([]);
      setNewPackage("");
      setNewPackageAmount("");
      setShowBulkPackageDialog(false);
    } catch (error) {
      console.error("Failed to bulk update packages:", error);
      toast({
        title: "Error",
        description: "Failed to update customer packages. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setFilterArea("");
    setFilterPackage("");
    setFilterStatus("");
    setSelectedCustomers([]);
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Management">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Management">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Bulk Management
            </h2>
            <p className="text-muted-foreground">
              Manage customer areas and packages in bulk
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary">
              {selectedCustomers.length} selected
            </Badge>
            <Badge variant="outline">{filteredCustomers.length} total</Badge>
          </div>
        </div>

        {/* Filters and Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filters & Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="search">Search Customers</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="search"
                    placeholder="Name, phone, email, VC..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="filterArea">Filter by Area</Label>
                <Select value={filterArea} onValueChange={setFilterArea}>
                  <SelectTrigger>
                    <SelectValue placeholder="All areas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL_AREAS">All areas</SelectItem>
                    {areas.map((area) => (
                      <SelectItem key={area} value={area}>
                        {area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="filterPackage">Filter by Package</Label>
                <Select value={filterPackage} onValueChange={setFilterPackage}>
                  <SelectTrigger>
                    <SelectValue placeholder="All packages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL_PACKAGES">All packages</SelectItem>
                    {packageNames.map((pkg) => (
                      <SelectItem key={pkg} value={pkg}>
                        {pkg}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="filterStatus">Filter by Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL_STATUSES">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="demo">Demo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>

            <Separator />

            {/* Bulk Actions */}
            <div className="flex flex-wrap gap-2">
              <Dialog
                open={showBulkAreaDialog}
                onOpenChange={setShowBulkAreaDialog}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={selectedCustomers.length === 0}
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    Bulk Update Area
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Bulk Update Customer Area</DialogTitle>
                    <DialogDescription>
                      Change the area assignment for {selectedCustomers.length}{" "}
                      selected customers.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="newArea">New Area</Label>
                      <Input
                        id="newArea"
                        placeholder="Enter new area name"
                        value={newArea}
                        onChange={(e) => setNewArea(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowBulkAreaDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleBulkAreaUpdate}
                      disabled={isSaving || !newArea}
                    >
                      {isSaving ? "Updating..." : "Update Area"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog
                open={showBulkPackageDialog}
                onOpenChange={setShowBulkPackageDialog}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={selectedCustomers.length === 0}
                  >
                    <PackageIcon className="mr-2 h-4 w-4" />
                    Bulk Update Package
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Bulk Update Customer Package</DialogTitle>
                    <DialogDescription>
                      Change the package and pricing for{" "}
                      {selectedCustomers.length} selected customers.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="newPackage">New Package</Label>
                      <Input
                        id="newPackage"
                        placeholder="Enter package name"
                        value={newPackage}
                        onChange={(e) => setNewPackage(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="newPackageAmount">
                        Package Amount (₹)
                      </Label>
                      <Input
                        id="newPackageAmount"
                        type="number"
                        placeholder="Enter package amount (optional)"
                        value={newPackageAmount}
                        onChange={(e) => setNewPackageAmount(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Leave empty to keep existing amount
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowBulkPackageDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleBulkPackageUpdate}
                      disabled={isSaving || !newPackage}
                    >
                      {isSaving ? "Updating..." : "Update Package"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button
                variant="outline"
                onClick={() => setSelectedCustomers([])}
                disabled={selectedCustomers.length === 0}
              >
                Clear Selection
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Customer Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Customer List</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all customers"
                      />
                    </TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="text-muted-foreground">
                          {customers.length === 0
                            ? "No customers found"
                            : "No customers match the current filters"}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedCustomers.includes(customer.id)}
                            onCheckedChange={(checked) =>
                              handleCustomerSelect(
                                customer.id,
                                checked as boolean,
                              )
                            }
                            aria-label={`Select ${customer.name}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-sm text-muted-foreground">
                              VC: {customer.vcNumber || "N/A"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="text-sm">
                              {customer.phoneNumber}
                            </div>
                            {customer.email && (
                              <div className="text-xs text-muted-foreground">
                                {customer.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {customer.collectorName}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {customer.currentPackage}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            ₹{customer.packageAmount || 0}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              customer.status === "active"
                                ? "default"
                                : customer.status === "inactive"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {customer.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
