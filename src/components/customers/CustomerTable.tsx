import React, { useState, useEffect } from "react";
import {
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Power,
  PowerOff,
  RefreshCw,
  History,
  ChevronDown,
  ChevronRight,
  Phone,
  Package,
  CreditCard,
  FileText,
  Calendar,
  IndianRupee,
  ExternalLink,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Customer, BillingRecord } from "@/types";
import { ActionRequest } from "@/types/auth";
import { ActionRequestModal } from "./ActionRequestModal";
import { CustomerService } from "@/services/customerService";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { BillingCycleService } from "@/services/billingCycleService";

interface CustomerTableProps {
  customers: Customer[];
  onEdit: (customer: Customer) => void;
  onDelete: (customerId: string) => void;
  onView: (customer: Customer) => void;
  onActionRequest: (request: Omit<ActionRequest, "id">) => void;
  onViewHistory: (customer: Customer) => void;
}

export function CustomerTable({
  customers,
  onEdit,
  onDelete,
  onView,
  onActionRequest,
  onViewHistory,
}: CustomerTableProps) {
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);
  const [actionRequestCustomer, setActionRequestCustomer] =
    useState<Customer | null>(null);
  const [actionType, setActionType] = useState<
    "activation" | "deactivation" | "plan_change"
  >("activation");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [customerInvoices, setCustomerInvoices] = useState<{
    [key: string]: BillingRecord[];
  }>({});
  const [loadingInvoices, setLoadingInvoices] = useState<Set<string>>(
    new Set(),
  );
  const { user, isAdmin, canAccessCustomer } = useAuth();
  const { toast } = useToast();

  // Calculate current outstanding using BillingCycleService
  const calculateCurrentOutstanding = (customer: Customer) => {
    return BillingCycleService.calculateCurrentOutstanding(customer);
  };

  // Filter customers based on user role and permissions and ensure data integrity
  const accessibleCustomers = customers
    .filter((customer) => isAdmin || canAccessCustomer(customer.id))
    .map((customer) => ({
      ...customer,
      // Ensure all billing fields have default values and calculate current outstanding
      packageAmount: customer.packageAmount ?? 0,
      previousOutstanding: customer.previousOutstanding ?? 0,
      currentOutstanding: calculateCurrentOutstanding(customer),
      billDueDate: customer.billDueDate ?? 1,
      portalBill: customer.portalBill ?? 0,
    }));

  const getActiveStatusColor = (isActive: boolean) => {
    return isActive
      ? "bg-green-100 text-green-800 border-green-200"
      : "bg-red-100 text-red-800 border-red-200";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number | undefined | null): string => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return "₹0.00";
    }
    return `₹${Number(amount).toFixed(2)}`;
  };

  const formatVcNumbers = (customer: Customer): string => {
    if (customer.connections && customer.connections.length > 1) {
      const primary =
        customer.connections.find((conn) => conn.isPrimary)?.vcNumber ||
        customer.vcNumber;
      const secondaryCount = customer.connections.length - 1;
      return `${primary} (+${secondaryCount} more)`;
    }
    return customer.vcNumber;
  };

  const loadCustomerInvoices = async (customerId: string, vcNumber: string) => {
    if (customerInvoices[customerId] || loadingInvoices.has(customerId)) {
      return; // Already loaded or loading
    }

    setLoadingInvoices((prev) => new Set(prev).add(customerId));

    try {
      // Fetch all billing records for this customer using VC number
      const allBillingRecords = await CustomerService.getAllBillingRecords();
      const customerBillingRecords = allBillingRecords.filter(
        (record) =>
          record.vcNumber === vcNumber || record.customerId === customerId,
      );

      setCustomerInvoices((prev) => ({
        ...prev,
        [customerId]: customerBillingRecords,
      }));
    } catch (error) {
      console.error("Failed to load customer invoices:", error);
      toast({
        title: "Error",
        description: "Failed to load invoice history",
        variant: "destructive",
      });
    } finally {
      setLoadingInvoices((prev) => {
        const newSet = new Set(prev);
        newSet.delete(customerId);
        return newSet;
      });
    }
  };

  const toggleRowExpansion = async (customerId: string, vcNumber: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(customerId)) {
      newExpanded.delete(customerId);
    } else {
      newExpanded.add(customerId);
      // Load invoice history when expanding
      await loadCustomerInvoices(customerId, vcNumber);
    }
    setExpandedRows(newExpanded);
  };

  const handleDeleteConfirm = () => {
    if (deleteCustomer) {
      onDelete(deleteCustomer.id);
      setDeleteCustomer(null);
    }
  };

  const handleActionRequest = (request: Omit<ActionRequest, "id">) => {
    onActionRequest(request);
    toast({
      title: "Request submitted",
      description: "Your action request has been submitted for admin approval.",
    });
  };

  const handleActivationRequest = (customer: Customer) => {
    setActionType("activation");
    setActionRequestCustomer(customer);
  };

  const handleDeactivationRequest = (customer: Customer) => {
    setActionType("deactivation");
    setActionRequestCustomer(customer);
  };

  const handlePlanChangeRequest = (customer: Customer) => {
    setActionType("plan_change");
    setActionRequestCustomer(customer);
  };

  const handleGenericActionRequest = (customer: Customer) => {
    setActionType("activation"); // Default action type
    setActionRequestCustomer(customer);
  };

  if (!customers || customers.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-gray-500">
            <div className="text-lg font-medium mb-2">No customers found</div>
            <div className="text-sm">
              Please check your connection or try again later
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (accessibleCustomers.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-gray-500">
            <div className="text-lg font-medium mb-2">No customers found</div>
            <div className="text-sm">
              {customers.length > 0
                ? "You don't have access to any customers matching the current filters"
                : "Try adjusting your search or filters"}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Package Amount</TableHead>
                  <TableHead>Previous O/S</TableHead>
                  <TableHead>Current O/S</TableHead>
                  <TableHead>Bill Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Collector</TableHead>
                  <TableHead>Last Payment</TableHead>
                  {isAdmin ? <TableHead>Portal Bill</TableHead> : null}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accessibleCustomers.map((customer) => (
                  <React.Fragment key={customer.id}>
                    <TableRow>
                      <TableCell>
                        <Collapsible>
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() =>
                                toggleRowExpansion(
                                  customer.id,
                                  customer.vcNumber,
                                )
                              }
                            >
                              {expandedRows.has(customer.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                        </Collapsible>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="font-medium">{customer.name}</div>
                      </TableCell>
                      <TableCell>
                        <div
                          className="text-sm max-w-[200px] truncate"
                          title={customer.address}
                        >
                          {customer.address}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {customer.currentPackage}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-green-600">
                          {formatCurrency(customer.packageAmount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`font-medium ${customer.previousOutstanding < 0 ? "text-green-600" : "text-orange-600"}`}
                        >
                          {formatCurrency(customer.previousOutstanding)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`font-medium ${customer.currentOutstanding < 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {formatCurrency(customer.currentOutstanding)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          <span className="text-lg font-bold text-blue-600">
                            {customer.billDueDate}
                          </span>
                          <div className="text-xs text-gray-500">
                            of every month
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            getActiveStatusColor(customer.isActive),
                          )}
                        >
                          {customer.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {customer.collectorName}
                          </span>
                          <span className="text-xs text-gray-500">
                            Collector
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {formatDate(customer.lastPaymentDate)}
                          </span>
                          <span className="text-xs text-gray-500">
                            Last paid
                          </span>
                        </div>
                      </TableCell>
                      {isAdmin ? (
                        <TableCell>
                          <span className="font-medium">
                            {formatCurrency(customer.portalBill || 0)}
                          </span>
                        </TableCell>
                      ) : null}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {!isAdmin ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleActivationRequest(customer)
                                }
                                className="h-8 px-2"
                                title="Request Activation"
                                disabled={customer.isActive}
                              >
                                <Power className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleDeactivationRequest(customer)
                                }
                                className="h-8 px-2"
                                title="Request Deactivation"
                                disabled={!customer.isActive}
                              >
                                <PowerOff className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handlePlanChangeRequest(customer)
                                }
                                className="h-8 px-2"
                                title="Request Plan Change"
                              >
                                <RefreshCw className="h-3 w-3" />
                              </Button>
                            </>
                          ) : null}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="flex flex-col items-start p-3">
                                <div className="font-medium text-sm">
                                  VC Numbers
                                </div>
                                <div className="space-y-1">
                                  {customer.connections &&
                                  customer.connections.length > 0 ? (
                                    customer.connections.map((connection) => (
                                      <div
                                        key={connection.id}
                                        className="font-mono text-xs"
                                      >
                                        <span className="text-blue-600">
                                          {connection.vcNumber}
                                        </span>
                                        <span className="text-gray-500 ml-2">
                                          (
                                          {connection.isPrimary
                                            ? "Primary"
                                            : `Secondary ${connection.connectionIndex - 1}`}
                                          )
                                        </span>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="font-mono text-blue-600 text-sm">
                                      {customer.vcNumber}
                                    </div>
                                  )}
                                </div>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => onView(customer)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => onViewHistory(customer)}
                              >
                                <History className="mr-2 h-4 w-4" />
                                Full Billing History
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {isAdmin ? (
                                <DropdownMenuItem
                                  onClick={() => onEdit(customer)}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Customer
                                </DropdownMenuItem>
                              ) : null}
                              {!isAdmin && canAccessCustomer(customer.id) ? (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleGenericActionRequest(customer)
                                  }
                                >
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  Request Action
                                </DropdownMenuItem>
                              ) : null}
                              {isAdmin ? (
                                <DropdownMenuItem
                                  onClick={() => setDeleteCustomer(customer)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Customer
                                </DropdownMenuItem>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Enhanced Expandable Row Content - Focus on Billing & Invoice History */}
                    {expandedRows.has(customer.id) ? (
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          {isAdmin ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onEdit(customer)}
                                className="h-8"
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeleteCustomer(customer)}
                                className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            </>
                          ) : (
                            canAccessCustomer(customer.id) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleGenericActionRequest(customer)}
                                className="h-8"
                              >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Request Action
                              </Button>
                            )
                          )}
                        </div>
                      </TableCell>
                      </TableRow>
                    ) : null}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile-Friendly Customer Cards */}
          <div className="lg:hidden space-y-3 p-3">
            {accessibleCustomers.map((customer) => (
              <Card
                key={customer.id}
                className="overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <Collapsible>
                  {/* Card Header - Always Visible */}
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg text-gray-900 truncate">
                          {customer.name}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          VC:{" "}
                          <span className="font-mono text-blue-600">
                            {formatVcNumbers(customer)}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center space-x-3 ml-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs font-medium",
                            getActiveStatusColor(customer.isActive),
                          )}
                        >
                          {customer.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem className="flex flex-col items-start p-3">
                              <div className="font-medium text-sm">
                                VC Numbers
                              </div>
                              <div className="space-y-1">
                                {customer.connections &&
                                customer.connections.length > 0 ? (
                                  customer.connections.map((connection) => (
                                    <div
                                      key={connection.id}
                                      className="font-mono text-xs"
                                    >
                                      <span className="text-blue-600">
                                        {connection.vcNumber}
                                      </span>
                                      <span className="text-gray-500 ml-2">
                                        (
                                        {connection.isPrimary
                                          ? "Primary"
                                          : `Secondary ${connection.connectionIndex - 1}`}
                                        )
                                      </span>
                                    </div>
                                  ))
                                ) : (
                                  <div className="font-mono text-blue-600 text-sm">
                                    {customer.vcNumber}
                                  </div>
                                )}
                              </div>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onView(customer)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onViewHistory(customer)}
                            >
                              <History className="mr-2 h-4 w-4" />
                              Billing History
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {isAdmin ? (
                              <DropdownMenuItem
                                onClick={() => onEdit(customer)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Customer
                              </DropdownMenuItem>
                            ) : null}
                            {!isAdmin && canAccessCustomer(customer.id) ? (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleGenericActionRequest(customer)
                                }
                              >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Request Action
                              </DropdownMenuItem>
                            ) : null}
                            {isAdmin ? (
                              <DropdownMenuItem
                                onClick={() => setDeleteCustomer(customer)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Customer
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Key Information - Always Visible */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/70 rounded-lg p-3 text-center">
                        <div className="text-xs text-gray-600 font-medium">
                          Package Amount
                        </div>
                        <div className="text-lg font-bold text-green-600 mt-1">
                          {formatCurrency(customer.packageAmount)}
                        </div>
                      </div>
                      <div className="bg-white/70 rounded-lg p-3 text-center">
                        <div className="text-xs text-gray-600 font-medium">
                          Current O/S
                        </div>
                        <div
                          className={`text-lg font-bold mt-1 ${
                            customer.currentOutstanding < 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {formatCurrency(customer.currentOutstanding)}
                        </div>
                      </div>
                    </div>

                    {/* Expand Button */}
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full mt-3 text-sm hover:bg-white/50 transition-colors duration-200"
                        onClick={() =>
                          toggleRowExpansion(customer.id, customer.vcNumber)
                        }
                        aria-label={
                          expandedRows.has(customer.id)
                            ? "Show less details"
                            : "Show more details"
                        }
                      >
                        {expandedRows.has(customer.id) ? (
                          <>
                            <ChevronDown className="mr-2 h-4 w-4 transition-transform duration-200" />
                            Show Less
                          </>
                        ) : (
                          <>
                            <ChevronRight className="mr-2 h-4 w-4 transition-transform duration-200" />
                            Show More Details
                          </>
                        )}
                      </Button>
                    </CollapsibleTrigger>
                  </div>

                  {/* Expandable Content */}
                  <CollapsibleContent>
                    <div className="p-4 space-y-4 bg-white">
                      {/* Contact Information */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-sm mb-3 flex items-center text-gray-900">
                          <Phone className="h-4 w-4 mr-2 text-blue-600" />
                          Contact Information
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Phone:</span>
                            <span className="font-medium">
                              {customer.phoneNumber}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Email:</span>
                            <span className="font-medium">
                              {customer.email || "Not provided"}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-gray-600 mb-1">Address:</span>
                            <span className="font-medium text-sm leading-relaxed">
                              {customer.address}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Financial Details */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-sm mb-3 flex items-center text-gray-900">
                          <IndianRupee className="h-4 w-4 mr-2 text-green-600" />
                          Financial Summary
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="text-center p-3 bg-orange-50 rounded">
                            <div className="text-xs text-orange-600 font-medium">
                              Previous O/S
                            </div>
                            <div
                              className={`text-sm font-bold mt-1 ${
                                customer.previousOutstanding < 0
                                  ? "text-green-600"
                                  : "text-orange-600"
                              }`}
                            >
                              {formatCurrency(customer.previousOutstanding)}
                            </div>
                          </div>
                          <div className="text-center p-3 bg-blue-50 rounded">
                            <div className="text-xs text-blue-600 font-medium">
                              Bill Due Date
                            </div>
                            <div className="text-sm font-bold text-blue-600 mt-1">
                              {customer.billDueDate}{" "}
                              <span className="text-xs font-normal">
                                of month
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Service Details */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-sm mb-3 flex items-center text-gray-900">
                          <Package className="h-4 w-4 mr-2 text-purple-600" />
                          Service Details
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Package:</span>
                            <Badge variant="outline" className="text-xs">
                              {customer.currentPackage}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Collector:</span>
                            <span className="font-medium">
                              {customer.collectorName}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Last Payment:</span>
                            <span className="font-medium">
                              {formatDate(customer.lastPaymentDate)}
                            </span>
                          </div>
                          {isAdmin && customer.portalBill ? (
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                Portal Bill:
                              </span>
                              <span className="font-medium">
                                {formatCurrency(customer.portalBill)}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {/* Recent Invoices */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-sm mb-3 flex items-center text-gray-900">
                          <FileText className="h-4 w-4 mr-2 text-orange-600" />
                          Recent Invoices
                        </h4>
                        {loadingInvoices.has(customer.id) ? (
                          <div className="text-center py-4">
                            <div className="text-sm text-gray-500">
                              Loading invoices...
                            </div>
                          </div>
                        ) : customerInvoices[customer.id] &&
                          customerInvoices[customer.id].length > 0 ? (
                          <div className="space-y-2">
                            {customerInvoices[customer.id]
                              .slice(0, 3)
                              .map((invoice) => (
                                <div
                                  key={invoice.id}
                                  className="bg-white rounded p-3 border"
                                >
                                  <div className="space-y-2">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <div className="font-mono text-xs font-medium">
                                          {invoice.invoiceNumber}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                          {formatDate(invoice.generatedDate)}
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="font-medium text-sm">
                                          {formatCurrency(invoice.amount)}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-xs text-blue-600">
                                      <div className="font-mono">
                                        VC:{" "}
                                        {invoice.allVcNumbers
                                          ? invoice.allVcNumbers.join(", ")
                                          : invoice.vcNumber}
                                      </div>
                                      <div className="text-gray-500">
                                        {invoice.allVcNumbers &&
                                        invoice.allVcNumbers.length > 1
                                          ? `${invoice.allVcNumbers.length} connections`
                                          : "1 connection"}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            {customerInvoices[customer.id].length > 3 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onViewHistory(customer)}
                                className="w-full mt-2"
                              >
                                View All {customerInvoices[customer.id].length}{" "}
                                Invoices
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-500">
                            <FileText className="h-6 w-6 mx-auto mb-2 text-gray-300" />
                            <div className="text-sm">No invoices found</div>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons for Employees */}
                      {!isAdmin ? (
                        <div className="grid grid-cols-3 gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleActivationRequest(customer)}
                            disabled={customer.isActive}
                            className="text-xs"
                          >
                            <Power className="mr-1 h-3 w-3" />
                            Activate
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeactivationRequest(customer)}
                            disabled={!customer.isActive}
                            className="text-xs"
                          >
                            <PowerOff className="mr-1 h-3 w-3" />
                            Deactivate
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePlanChangeRequest(customer)}
                            className="text-xs"
                          >
                            <RefreshCw className="mr-1 h-3 w-3" />
                            Plan
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Request Modal */}
      <ActionRequestModal
        open={!!actionRequestCustomer}
        onOpenChange={(open) => {
          if (!open) {
            setActionRequestCustomer(null);
            setActionType("activation");
          }
        }}
        customer={actionRequestCustomer}
        onSubmit={handleActionRequest}
        defaultActionType={actionType}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteCustomer}
        onOpenChange={() => setDeleteCustomer(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteCustomer?.name}? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}