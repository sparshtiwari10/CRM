import { useState } from "react";
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  Package as PackageIcon,
  Users,
  DollarSign,
  TrendingUp,
} from "lucide-react";
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
import { mockPackages, mockCustomers } from "@/data/mockData";
import { Package, Customer } from "@/types";

export default function Packages() {
  const [packages] = useState<Package[]>(mockPackages);
  const [customers] = useState<Customer[]>(mockCustomers);
  const [viewingPackage, setViewingPackage] = useState<Package | null>(null);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const getCustomerCount = (packageName: string) => {
    return customers.filter(
      (customer) => customer.currentPackage === packageName,
    ).length;
  };

  const getTotalRevenue = (pkg: Package) => {
    const customerCount = getCustomerCount(pkg.name);
    return customerCount * pkg.price;
  };

  const totalPackages = packages.length;
  const activePackages = packages.filter((pkg) => pkg.isActive).length;
  const totalCustomers = customers.length;
  const totalRevenue = packages.reduce(
    (sum, pkg) => sum + getTotalRevenue(pkg),
    0,
  );
  const averageRevenuePerCustomer =
    totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

  const handleSavePackage = () => {
    // In a real app, this would save to backend
    console.log("Saving package...");
    setShowCreateModal(false);
    setEditingPackage(null);
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setEditingPackage(null);
  };

  return (
    <DashboardLayout title="Package Management">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Package Management
            </h2>
            <p className="text-gray-600">
              Manage your cable TV packages and pricing
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Package
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Packages
              </CardTitle>
              <PackageIcon className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPackages}</div>
              <p className="text-xs text-gray-600">
                {activePackages} active packages
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Customers
              </CardTitle>
              <Users className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCustomers}</div>
              <p className="text-xs text-gray-600">Across all packages</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Monthly Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${totalRevenue.toFixed(2)}
              </div>
              <p className="text-xs text-gray-600">From all packages</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Avg. Revenue per Customer
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${averageRevenuePerCustomer.toFixed(2)}
              </div>
              <p className="text-xs text-gray-600">Monthly average</p>
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
                  ${pkg.price}
                  <span className="text-base font-normal text-gray-500">
                    /month
                  </span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-gray-600">{pkg.description}</p>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Channels:</span>
                    <span className="font-medium">{pkg.channels}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Customers:</span>
                    <span className="font-medium">
                      {getCustomerCount(pkg.name)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Monthly Revenue:</span>
                    <span className="font-medium">
                      ${getTotalRevenue(pkg).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-900">
                    Features:
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {pkg.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex space-x-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewingPackage(pkg)}
                    className="flex-1"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View
                  </Button>
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
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
                    <label className="text-sm font-medium text-gray-500">
                      Package Name
                    </label>
                    <p className="text-lg font-medium">{viewingPackage.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Monthly Price
                    </label>
                    <p className="text-lg font-bold text-blue-600">
                      ${viewingPackage.price}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Total Channels
                    </label>
                    <p className="text-lg font-medium">
                      {viewingPackage.channels}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
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
                  <label className="text-sm font-medium text-gray-500">
                    Description
                  </label>
                  <p className="mt-1 text-gray-900">
                    {viewingPackage.description}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Features
                  </label>
                  <ul className="mt-1 space-y-1">
                    {viewingPackage.features.map((feature, index) => (
                      <li
                        key={index}
                        className="flex items-center text-gray-900"
                      >
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Current Customers
                    </label>
                    <p className="text-lg font-medium">
                      {getCustomerCount(viewingPackage.name)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Monthly Revenue
                    </label>
                    <p className="text-lg font-bold text-green-600">
                      ${getTotalRevenue(viewingPackage).toFixed(2)}
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

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Package Name</label>
                  <input
                    type="text"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter package name"
                    defaultValue={editingPackage?.name || ""}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    Monthly Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                    defaultValue={editingPackage?.price || ""}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Package description"
                  defaultValue={editingPackage?.description || ""}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">
                    Number of Channels
                  </label>
                  <input
                    type="number"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                    defaultValue={editingPackage?.channels || ""}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <select
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="text-sm font-medium">Features</label>
                <textarea
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Enter features, one per line"
                  defaultValue={editingPackage?.features.join("\n") || ""}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter each feature on a new line
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeModals}>
                Cancel
              </Button>
              <Button onClick={handleSavePackage}>
                {editingPackage ? "Update Package" : "Create Package"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
