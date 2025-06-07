import { useState } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Customer, BillingRecord } from "@/types";
import { ActionRequest } from "@/types/auth";
import { ActionRequestModal } from "./ActionRequestModal";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
  const { user, isAdmin, canAccessCustomer } = useAuth();
  const { toast } = useToast();

  // Filter customers based on user role and permissions
  const accessibleCustomers = customers.filter(
    (customer) => isAdmin || canAccessCustomer(customer.id),
  );

  const getBillingStatusColor = (status: Customer["billingStatus"]) => {
    switch (status) {
      case "Paid":
        return "bg-green-100 text-green-800 border-green-200";
      case "Pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Overdue":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

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

  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  const toggleRowExpansion = (customerId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(customerId)) {
      newExpanded.delete(customerId);
    } else {
      newExpanded.add(customerId);
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
                  <TableHead className="w-8"></TableHead> {/* Expand button */}
                  <TableHead>Customer</TableHead>
                  <TableHead>VC Number</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Package Amount</TableHead>
                  <TableHead>Previous O/S</TableHead>
                  <TableHead>Plan Bill</TableHead>
                  <TableHead>Current O/S</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Collector</TableHead>
                  <TableHead>Last Payment</TableHead>
                  {isAdmin && <TableHead>Portal Bill</TableHead>}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accessibleCustomers.map((customer) => (
                  <>
                    <TableRow key={customer.id}>
                      <TableCell>
                        <Collapsible>
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => toggleRowExpansion(customer.id)}
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
                        <span className="font-mono text-sm">
                          {customer.vcNumber}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {customer.currentPackage}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-green-600">
                          {formatCurrency(customer.packageAmount || 0)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-orange-600">
                          {formatCurrency(customer.previousOutstanding)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-blue-600">
                          {formatCurrency(customer.planBill)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-red-600">
                          {formatCurrency(customer.currentOutstanding)}
                        </span>
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
                      {isAdmin && (
                        <TableCell>
                          <span className="font-medium">
                            {formatCurrency(customer.portalBill || 0)}
                          </span>
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {/* Quick Action Buttons - Only for employees */}
                          {!isAdmin && (
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
                          )}

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
                                View History
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {/* Edit Customer - Admin Only */}
                              {isAdmin && (
                                <DropdownMenuItem
                                  onClick={() => onEdit(customer)}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Customer
                                </DropdownMenuItem>
                              )}
                              {/* Request Action - Employees Only */}
                              {!isAdmin && canAccessCustomer(customer.id) && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleGenericActionRequest(customer)
                                  }
                                >
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  Request Action
                                </DropdownMenuItem>
                              )}
                              {/* Delete Customer - Admin Only */}
                              {isAdmin && (
                                <DropdownMenuItem
                                  onClick={() => setDeleteCustomer(customer)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Customer
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expandable Row Content */}
                    {expandedRows.has(customer.id) && (
                      <TableRow>
                        <TableCell colSpan={isAdmin ? 12 : 11}>
                          <div className="p-4 bg-gray-50 border-t">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                              {/* Contact Information */}
                              <Card className="p-4">
                                <div className="flex items-center space-x-2 mb-2">
                                  <Phone className="h-4 w-4 text-blue-600" />
                                  <h4 className="font-medium text-sm">
                                    Contact
                                  </h4>
                                </div>
                                <div className="space-y-1 text-sm">
                                  <div>
                                    <span className="text-gray-500">
                                      Phone:
                                    </span>
                                    <br />
                                    <span className="font-medium">
                                      {customer.phoneNumber}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">
                                      Address:
                                    </span>
                                    <br />
                                    <span className="text-xs">
                                      {customer.address}
                                    </span>
                                  </div>
                                </div>
                              </Card>

                              {/* Package Information */}
                              <Card className="p-4">
                                <div className="flex items-center space-x-2 mb-2">
                                  <Package className="h-4 w-4 text-green-600" />
                                  <h4 className="font-medium text-sm">
                                    Package
                                  </h4>
                                </div>
                                <div className="space-y-1 text-sm">
                                  <div>
                                    <span className="text-gray-500">
                                      Current:
                                    </span>
                                    <br />
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {customer.currentPackage}
                                    </Badge>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">
                                      Monthly:
                                    </span>
                                    <br />
                                    <span className="font-medium text-green-600">
                                      {formatCurrency(customer.planBill)}
                                    </span>
                                  </div>
                                </div>
                              </Card>

                              {/* VC Information */}
                              <Card className="p-4">
                                <div className="flex items-center space-x-2 mb-2">
                                  <CreditCard className="h-4 w-4 text-purple-600" />
                                  <h4 className="font-medium text-sm">
                                    VC Details
                                  </h4>
                                </div>
                                <div className="space-y-1 text-sm">
                                  <div>
                                    <span className="text-gray-500">
                                      VC Number:
                                    </span>
                                    <br />
                                    <span className="font-mono font-medium">
                                      {customer.vcNumber}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">
                                      Connections:
                                    </span>
                                    <br />
                                    <span className="font-medium">
                                      {customer.numberOfConnections}
                                    </span>
                                  </div>
                                </div>
                              </Card>

                              {/* Billing Summary */}
                              <Card className="p-4">
                                <div className="flex items-center space-x-2 mb-2">
                                  <FileText className="h-4 w-4 text-orange-600" />
                                  <h4 className="font-medium text-sm">
                                    Billing
                                  </h4>
                                </div>
                                <div className="space-y-1 text-sm">
                                  <div>
                                    <span className="text-gray-500">
                                      Outstanding:
                                    </span>
                                    <br />
                                    <span className="font-medium text-red-600">
                                      {formatCurrency(
                                        customer.currentOutstanding,
                                      )}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">
                                      Last Payment:
                                    </span>
                                    <br />
                                    <span className="text-xs">
                                      {formatDate(customer.lastPaymentDate)}
                                    </span>
                                  </div>
                                </div>
                              </Card>
                            </div>

                            {/* Previous Invoices Section */}
                            {customer.invoiceHistory &&
                              customer.invoiceHistory.length > 0 && (
                                <div className="mt-4">
                                  <h4 className="font-medium text-sm mb-2 text-gray-900">
                                    Previous Invoices
                                  </h4>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="border-b">
                                          <th className="text-left p-2">
                                            Invoice #
                                          </th>
                                          <th className="text-left p-2">
                                            Date
                                          </th>
                                          <th className="text-left p-2">
                                            Amount
                                          </th>
                                          <th className="text-left p-2">
                                            Status
                                          </th>
                                          <th className="text-left p-2">
                                            Due Date
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {customer.invoiceHistory
                                          .slice(0, 5)
                                          .map((invoice) => (
                                            <tr
                                              key={invoice.id}
                                              className="border-b"
                                            >
                                              <td className="p-2 font-mono">
                                                {invoice.invoiceNumber}
                                              </td>
                                              <td className="p-2">
                                                {formatDate(
                                                  invoice.generatedDate,
                                                )}
                                              </td>
                                              <td className="p-2 font-medium">
                                                {formatCurrency(invoice.amount)}
                                              </td>
                                              <td className="p-2">
                                                <Badge
                                                  variant="outline"
                                                  className={cn(
                                                    "text-xs",
                                                    getBillingStatusColor(
                                                      invoice.status,
                                                    ),
                                                  )}
                                                >
                                                  {invoice.status}
                                                </Badge>
                                              </td>
                                              <td className="p-2">
                                                {formatDate(invoice.dueDate)}
                                              </td>
                                            </tr>
                                          ))}
                                      </tbody>
                                    </table>
                                    {customer.invoiceHistory.length > 5 && (
                                      <div className="text-center py-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            onViewHistory(customer)
                                          }
                                          className="text-xs"
                                        >
                                          View All{" "}
                                          {customer.invoiceHistory.length}{" "}
                                          Invoices
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-4 p-4">
            {accessibleCustomers.map((customer) => (
              <Card key={customer.id} className="p-4">
                <Collapsible>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-lg">{customer.name}</h3>
                      {customer.email && (
                        <p className="text-sm text-gray-500">
                          {customer.email}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant="outline"
                        className={cn(getActiveStatusColor(customer.isActive))}
                      >
                        {customer.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => toggleRowExpansion(customer.id)}
                        >
                          {expandedRows.has(customer.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
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
                          <DropdownMenuItem onClick={() => onView(customer)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onViewHistory(customer)}
                          >
                            <History className="mr-2 h-4 w-4" />
                            View History
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {/* Edit Customer - Admin Only */}
                          {isAdmin && (
                            <DropdownMenuItem onClick={() => onEdit(customer)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Customer
                            </DropdownMenuItem>
                          )}
                          {/* Request Action - Employees Only */}
                          {!isAdmin && canAccessCustomer(customer.id) && (
                            <DropdownMenuItem
                              onClick={() =>
                                handleGenericActionRequest(customer)
                              }
                            >
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Request Action
                            </DropdownMenuItem>
                          )}
                          {/* Delete Customer - Admin Only */}
                          {isAdmin && (
                            <DropdownMenuItem
                              onClick={() => setDeleteCustomer(customer)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Customer
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    {/* Key Info Section */}
                    <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded-lg border">
                      <div className="text-center">
                        <div className="text-xs text-gray-500 font-medium">
                          PREV O/S
                        </div>
                        <div className="font-medium text-orange-600 mt-1">
                          {formatCurrency(customer.previousOutstanding)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-500 font-medium">
                          PLAN BILL
                        </div>
                        <div className="font-medium text-blue-600 mt-1">
                          {formatCurrency(customer.planBill)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-500 font-medium">
                          CURRENT O/S
                        </div>
                        <div className="font-medium text-red-600 mt-1">
                          {formatCurrency(customer.currentOutstanding)}
                        </div>
                      </div>
                    </div>

                    {/* Other Details */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-500">VC Number:</span>
                        <span className="font-mono">{customer.vcNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Package:</span>
                        <Badge variant="outline">
                          {customer.currentPackage}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Collector:</span>
                        <span>{customer.collectorName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Last Payment:</span>
                        <span>{formatDate(customer.lastPaymentDate)}</span>
                      </div>
                      {isAdmin && customer.portalBill && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Portal Bill:</span>
                          <span className="font-medium">
                            {formatCurrency(customer.portalBill)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expandable Content for Mobile */}
                  <CollapsibleContent>
                    <div className="mt-4 pt-4 border-t space-y-4">
                      {/* Contact Details */}
                      <div>
                        <h4 className="font-medium text-sm mb-2 flex items-center">
                          <Phone className="h-4 w-4 mr-2 text-blue-600" />
                          Contact Information
                        </h4>
                        <div className="text-sm space-y-1">
                          <div>
                            <span className="text-gray-500">Phone:</span>{" "}
                            {customer.phoneNumber}
                          </div>
                          <div>
                            <span className="text-gray-500">Address:</span>{" "}
                            {customer.address}
                          </div>
                        </div>
                      </div>

                      {/* Package Details */}
                      <div>
                        <h4 className="font-medium text-sm mb-2 flex items-center">
                          <Package className="h-4 w-4 mr-2 text-green-600" />
                          Package Details
                        </h4>
                        <div className="text-sm space-y-1">
                          <div>
                            <span className="text-gray-500">
                              Current Package:
                            </span>{" "}
                            {customer.currentPackage}
                          </div>
                          <div>
                            <span className="text-gray-500">VC Number:</span>{" "}
                            {customer.vcNumber}
                          </div>
                          <div>
                            <span className="text-gray-500">Connections:</span>{" "}
                            {customer.numberOfConnections}
                          </div>
                        </div>
                      </div>

                      {/* Recent Invoices */}
                      {customer.invoiceHistory &&
                        customer.invoiceHistory.length > 0 && (
                          <div>
                            <h4 className="font-medium text-sm mb-2 flex items-center">
                              <FileText className="h-4 w-4 mr-2 text-orange-600" />
                              Recent Invoices
                            </h4>
                            <div className="space-y-2">
                              {customer.invoiceHistory
                                .slice(0, 3)
                                .map((invoice) => (
                                  <div
                                    key={invoice.id}
                                    className="flex justify-between items-center text-xs p-2 bg-gray-50 rounded"
                                  >
                                    <div>
                                      <div className="font-mono">
                                        {invoice.invoiceNumber}
                                      </div>
                                      <div className="text-gray-500">
                                        {formatDate(invoice.generatedDate)}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-medium">
                                        {formatCurrency(invoice.amount)}
                                      </div>
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "text-xs",
                                          getBillingStatusColor(invoice.status),
                                        )}
                                      >
                                        {invoice.status}
                                      </Badge>
                                    </div>
                                  </div>
                                ))}
                              {customer.invoiceHistory.length > 3 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onViewHistory(customer)}
                                  className="w-full text-xs"
                                >
                                  View All {customer.invoiceHistory.length}{" "}
                                  Invoices
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  </CollapsibleContent>

                  {/* Mobile Action Buttons */}
                  {!isAdmin && (
                    <div className="flex space-x-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleActivationRequest(customer)}
                        className="flex-1"
                        disabled={customer.isActive}
                      >
                        <Power className="mr-2 h-4 w-4" />
                        Activate
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeactivationRequest(customer)}
                        className="flex-1"
                        disabled={!customer.isActive}
                      >
                        <PowerOff className="mr-2 h-4 w-4" />
                        Deactivate
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePlanChangeRequest(customer)}
                        className="flex-1"
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Change Plan
                      </Button>
                    </div>
                  )}
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
            setActionType("activation"); // Reset action type
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
