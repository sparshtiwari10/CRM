import { useState, useEffect } from "react";
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  Package as PackageIcon,
  Users,
  DollarSign,
  TrendingUp,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Package, Customer } from "@/types";
import { PackageMetrics } from "@/components/packages/PackageMetrics";
import {
  packageService,
  PackageMetrics as PackageMetricsType,
} from "@/services/packageService";
import { firestoreService } from "@/services/firestoreService";
import { useAuth } from "@/contexts/AuthContext";

export default function Packages() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [metrics, setMetrics] = useState<PackageMetricsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingPackage, setViewingPackage] = useState<Package | null>(null);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Package | null>(
    null,
  );
  const [deleteValidation, setDeleteValidation] = useState<{
    canDelete: boolean;
    reason?: string;
    affectedCustomers?: string[];
  } | null>(null);
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Recalculate metrics when packages or customers change
  useEffect(() => {
    if (packages.length > 0 || customers.length > 0) {
      const calculatedMetrics = packageService.calculatePackageMetrics(
        packages,
        customers,
      );
      setMetrics(calculatedMetrics);
    }
  }, [packages, customers]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [packagesData, customersData] = await Promise.all([
        packageService.getAllPackages(),
        firestoreService.getAllCustomers(),
      ]);

      setPackages(packagesData);
      setCustomers(customersData);
    } catch (error) {
      console.error("Failed to load data:", error);
      setError(error instanceof Error ? error.message : "Failed to load data");
      toast({
        title: "Error Loading Data",
        description:
          "Failed to load packages and customer data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getCustomerCount = (packageName: string) => {
    return packageService.getCustomerCount(packageName, customers);
  };

  const getTotalRevenue = (pkg: Package) => {
    return packageService.getTotalRevenue(pkg.name, packages, customers);
  };

  const handleSavePackage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const formData = new FormData(event.currentTarget);

      const packageData = {
        name: formData.get("name") as string,
        price: parseFloat(formData.get("price") as string),
        description: formData.get("description") as string,
        channels: parseInt(formData.get("channels") as string),
        isActive: formData.get("status") === "active",
        features: (formData.get("features") as string)
          .split("\n")
          .filter((f) => f.trim()),
        portalAmount: parseFloat(formData.get("portalAmount") as string) || 0,
      };

      if (editingPackage) {
        // Update existing package
        await packageService.updatePackage(editingPackage.id, packageData);

        // Update local state
        setPackages((prev) =>
          prev.map((pkg) =>
            pkg.id === editingPackage.id ? { ...pkg, ...packageData } : pkg,
          ),
        );

        toast({
          title: "Package Updated",
          description: `${packageData.name} has been successfully updated.`,
        });
      } else {
        // Create new package
        const newPackageId = await packageService.createPackage(packageData);

        const newPackage: Package = {
          id: newPackageId,
          ...packageData,
        };

        setPackages((prev) => [...prev, newPackage]);

        toast({
          title: "Package Created",
          description: `${packageData.name} has been successfully created.`,
        });
      }

      setShowCreateModal(false);
      setEditingPackage(null);
    } catch (error) {
      console.error("Failed to save package:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save package",
        variant: "destructive",
      });
    }
  };

  const handleDeletePackage = async (pkg: Package) => {
    try {
      // Validate deletion
      const validation = await packageService.validatePackageDeletion(
        pkg.id,
        customers,
      );
      setDeleteValidation(validation);

      if (!validation.canDelete) {
        // Show validation error but still allow admin to see the delete dialog
        setShowDeleteConfirm(pkg);
        return;
      }

      setShowDeleteConfirm(pkg);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to validate package deletion",
        variant: "destructive",
      });
    }
  };

  const confirmDeletePackage = async () => {
    if (!showDeleteConfirm) return;

    try {
      await packageService.deletePackage(showDeleteConfirm.id);

      // Update local state
      setPackages((prev) =>
        prev.filter((pkg) => pkg.id !== showDeleteConfirm.id),
      );

      toast({
        title: "Package Deleted",
        description: `${showDeleteConfirm.name} has been successfully deleted.`,
      });

      setShowDeleteConfirm(null);
      setDeleteValidation(null);
    } catch (error) {
      console.error("Failed to delete package:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete package",
        variant: "destructive",
      });
    }
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setEditingPackage(null);
  };

  const closeDeleteModal = () => {
    setShowDeleteConfirm(null);
    setDeleteValidation(null);
  };

  // Show loading state
  if (loading) {
    return (
      <DashboardLayout title="Package Management">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading packages...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Show error state
  if (error) {
    return (
      <DashboardLayout title="Package Management">
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                className="ml-4"
              >
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Package Management">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Package Management
            </h2>
            <p className="text-muted-foreground">
              Manage your cable TV packages and pricing
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Package
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Packages
              </CardTitle>
              <PackageIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {metrics?.totalPackages || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics?.activePackages || 0} active,{" "}
                {metrics?.inactivePackages || 0} inactive
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Monthly Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                ₹{(metrics?.totalRevenue || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                From {metrics?.totalCustomers || 0} customers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg. Revenue per Customer
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                ₹
                {Math.round(
                  metrics?.averageRevenuePerCustomer || 0,
                ).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                ₹
                {Math.round(
                  metrics?.averageRevenuePerPackage || 0,
                ).toLocaleString()}{" "}
                per package
              </p>
            </CardContent>
          </Card>
        </div>
        {/* Packages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <Card key={pkg.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{pkg.name}</CardTitle>
                  <Badge variant={pkg.isActive ? "default" : "secondary"}>
                    {pkg.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="text-3xl font-bold text-blue-600">
                  ₹{pkg.price}
                  <span className="text-base font-normal text-gray-500">
                    /month
                  </span>
                </div>
                {pkg.portalAmount && (
                  <div className="text-sm text-gray-600">
                    Portal Amount: ₹{pkg.portalAmount}
                  </div>
                )}
              </CardHeader>

              <CardContent className="flex flex-col h-full space-y-4">
                <p className="text-muted-foreground">{pkg.description}</p>

                <div className="space-y-4">
                  {/* Channel Info */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Channels:</span>
                    <span className="font-medium text-foreground">
                      {pkg.channels}
                    </span>
                  </div>

                  {/* Package Metrics */}
                  <PackageMetrics package={pkg} customers={customers} />
                </div>

                <div className="flex space-x-2 pt-4 mt-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewingPackage(pkg)}
                    className="flex-1"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View
                  </Button>
                  {isAdmin && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setEditingPackage(pkg)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        onClick={() => handleDeletePackage(pkg)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Package Details Modal */}
        <Dialog
          open={!!viewingPackage}
          onOpenChange={() => setViewingPackage(null)}
        >
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{viewingPackage?.name} Package Details</DialogTitle>
              <DialogDescription>
                Complete information and statistics for this package
              </DialogDescription>
            </DialogHeader>

            {viewingPackage && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Package Name
                    </label>
                    <p className="text-lg font-medium text-foreground">
                      {viewingPackage.name}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Monthly Price
                    </label>
                    <p className="text-lg font-bold text-primary">
                      ₹{viewingPackage.price}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Portal Amount
                    </label>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{viewingPackage.portalAmount || 0}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Total Channels
                    </label>
                    <p className="text-lg font-medium text-foreground">
                      {viewingPackage.channels}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Status
                    </label>
                    <Badge
                      variant={
                        viewingPackage.isActive ? "default" : "secondary"
                      }
                    >
                      {viewingPackage.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Description
                  </label>
                  <p className="mt-1 text-foreground">
                    {viewingPackage.description}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Features
                  </label>
                  <ul className="mt-1 space-y-1">
                    {viewingPackage.features.map((feature, index) => (
                      <li
                        key={index}
                        className="flex items-center text-foreground"
                      >
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Current Customers
                    </label>
                    <p className="text-lg font-medium text-foreground">
                      {getCustomerCount(viewingPackage.name)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Monthly Revenue
                    </label>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{getTotalRevenue(viewingPackage).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setViewingPackage(null)}
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      setViewingPackage(null);
                      setEditingPackage(viewingPackage);
                    }}
                  >
                    Edit Package
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!showDeleteConfirm} onOpenChange={closeDeleteModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Package</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{showDeleteConfirm?.name}"?
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            {deleteValidation && !deleteValidation.canDelete && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p>{deleteValidation.reason}</p>
                    {deleteValidation.affectedCustomers && (
                      <div>
                        <p className="font-medium">Affected customers:</p>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {deleteValidation.affectedCustomers
                            .slice(0, 5)
                            .map((customer, index) => (
                              <li key={index}>{customer}</li>
                            ))}
                          {deleteValidation.affectedCustomers.length > 5 && (
                            <li>
                              ... and{" "}
                              {deleteValidation.affectedCustomers.length - 5}{" "}
                              more
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={closeDeleteModal}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeletePackage}
                disabled={deleteValidation && !deleteValidation.canDelete}
              >
                {deleteValidation && !deleteValidation.canDelete
                  ? "Cannot Delete"
                  : "Delete Package"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create/Edit Package Modal */}
        <Dialog
          open={showCreateModal || !!editingPackage}
          onOpenChange={closeModals}
        >
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingPackage ? "Edit Package" : "Create New Package"}
              </DialogTitle>
              <DialogDescription>
                {editingPackage
                  ? "Update package details and features"
                  : "Add a new package to your service offerings"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSavePackage}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">
                      Package Name
                    </label>
                    <input
                      name="name"
                      type="text"
                      required
                      className="w-full mt-1 px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring placeholder:text-muted-foreground"
                      placeholder="Enter package name"
                      defaultValue={editingPackage?.name || ""}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">
                      Monthly Price (₹)
                    </label>
                    <input
                      name="price"
                      type="number"
                      step="0.01"
                      required
                      min="0"
                      className="w-full mt-1 px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring placeholder:text-muted-foreground"
                      placeholder="0.00"
                      defaultValue={editingPackage?.price || ""}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">
                      Portal Amount (₹)
                    </label>
                    <input
                      name="portalAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full mt-1 px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring placeholder:text-muted-foreground"
                      placeholder="0.00"
                      defaultValue={editingPackage?.portalAmount || ""}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Auto-filled when customer selects package
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">
                    Description
                  </label>
                  <textarea
                    name="description"
                    className="w-full mt-1 px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring placeholder:text-muted-foreground"
                    rows={3}
                    placeholder="Package description"
                    defaultValue={editingPackage?.description || ""}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">
                      Number of Channels
                    </label>
                    <input
                      name="channels"
                      type="number"
                      required
                      min="1"
                      className="w-full mt-1 px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring placeholder:text-muted-foreground"
                      placeholder="0"
                      defaultValue={editingPackage?.channels || ""}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">
                      Status
                    </label>
                    <select
                      name="status"
                      className="w-full mt-1 px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                      defaultValue={
                        editingPackage?.isActive ? "active" : "inactive"
                      }
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">
                    Features
                  </label>
                  <textarea
                    name="features"
                    className="w-full mt-1 px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring placeholder:text-muted-foreground"
                    rows={4}
                    placeholder="Enter features, one per line"
                    defaultValue={editingPackage?.features.join("\n") || ""}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter each feature on a new line
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeModals}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingPackage ? "Update Package" : "Create Package"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
