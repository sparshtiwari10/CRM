import React, { useState, useCallback, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronRight,
  Edit,
  Trash2,
  RefreshCw,
  CreditCard,
  Eye,
  History,
  Package,
  Phone,
  Mail,
  MapPin,
  IndianRupee,
  FileText,
  Power,
  PowerOff,
} from "lucide-react";
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
import { Customer, Invoice } from "@/types";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ActionRequest } from "@/types/auth";
import { ActionRequestModal } from "./ActionRequestModal";

interface CustomerTableProps {
  customers: Customer[];
  searchTerm: string;
  onView: (customer: Customer) => void;
  onViewHistory: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customerId: string) => void;
  onPaymentCapture: (customer: Customer) => void;
  onActionRequest: (request: Omit<ActionRequest, "id">) => void;
}

// Utility functions
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-IN");
};

const formatAddress = (address: string) => {
  return address.length > 50 ? address.substring(0, 50) + "..." : address;
};

const formatDueDate = (dayOfMonth: number) => {
  return `${dayOfMonth}${dayOfMonth === 1 ? "st" : dayOfMonth === 2 ? "nd" : dayOfMonth === 3 ? "rd" : "th"} of every month`;
};

const isOverdue = (billDueDate: number) => {
  const today = new Date();
  const currentDay = today.getDate();
  return currentDay > billDueDate;
};

export const CustomerTable: React.FC<CustomerTableProps> = ({
  customers,
  searchTerm,
  onView,
  onViewHistory,
  onEdit,
  onDelete,
  onPaymentCapture,
  onActionRequest,
}) => {
  const { user } = useCurrentUser();
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);
  const [actionRequestCustomer, setActionRequestCustomer] =
    useState<Customer | null>(null);
  const [actionType, setActionType] = useState<
    "activation" | "deactivation" | "plan_change"
  >("activation");

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(
    new Set(),
  );

  const isAdmin = user?.role === "admin";

  // Permission check for employee access
  const canAccessCustomer = useCallback(
    (customerId: string) => {
      if (isAdmin) return true;
      if (user?.role === "employee") {
        const customer = customers.find((c) => c.id === customerId);
        return customer?.collectorName === user.name;
      }
      return false;
    },
    [isAdmin, user, customers],
  );

  // Filter customers based on search term and permissions
  const filteredCustomers = useMemo(() => {
    let filtered = customers;

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((customer) => {
        // Search across all relevant fields
        const searchableText = [
          customer.name,
          customer.phoneNumber,
          customer.email,
          customer.address,
          customer.vcNumber,
          customer.currentPackage,
          customer.collectorName,
          // Include VC numbers from connections
          ...(customer.connections?.map((c) => c.vcNumber) || []),
        ]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(searchLower);
      });
    }

    // Apply permission filter for employees
    if (!isAdmin && user?.role === "employee") {
      filtered = filtered.filter(
        (customer) => customer.collectorName === user.name,
      );
    }

    return filtered;
  }, [customers, searchTerm, isAdmin, user]);

  // Toggle row expansion
  const toggleRowExpansion = useCallback((customerId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
      }
      return newSet;
    });
  }, []);

  // Toggle invoice expansion
  const toggleInvoiceExpansion = useCallback((customerId: string) => {
    setExpandedInvoices((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
      }
      return newSet;
    });
  }, []);

  const handleDeleteConfirm = () => {
    if (deleteCustomer) {
      onDelete(deleteCustomer.id);
      setDeleteCustomer(null);
    }
  };

  const handleActionRequest = (request: Omit<ActionRequest, "id">) => {
    onActionRequest(request);
    setActionRequestCustomer(null);
    setActionType("activation");

    toast.success("Request submitted", {
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

  // Calculate derived values for each customer
  const enrichedCustomers = useMemo(() => {
    return filteredCustomers.map((customer) => {
      const status = getCustomerStatus(customer);
      const financialSummary = getFinancialSummary(customer);
      const nextBillingDate = calculateNextBillingDate(customer);

      return {
        ...customer,
        status,
        financialSummary,
        nextBillingDate,
      };
    });
  }, [filteredCustomers]);

  if (enrichedCustomers.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {searchTerm
          ? "No customers found matching your search."
          : "No customers found."}
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Package</TableHead>
              <TableHead className="text-right">Package Amount</TableHead>
              <TableHead className="text-right">Previous Outstanding</TableHead>
              <TableHead className="text-right">Current Outstanding</TableHead>
              <TableHead>Bill Due Date</TableHead>
              <TableHead>Collector</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrichedCustomers.map((customer) => (
              <React.Fragment key={customer.id}>
                <TableRow className="hover:bg-gray-50">
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleRowExpansion(customer.id)}
                      className="h-8 w-8 p-0"
                    >
                      {expandedRows.has(customer.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-sm text-gray-500">
                        {customer.phoneNumber}
                      </div>
                      {customer.email && (
                        <div className="text-xs text-gray-400">
                          {customer.email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatAddress(customer.address)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">
                        {customer.currentPackage}
                      </div>
                      {customer.connections &&
                        customer.connections.length > 1 && (
                          <div className="text-xs text-blue-600">
                            {customer.connections.length} connections
                          </div>
                        )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(customer.packageAmount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn(
                        "font-medium",
                        customer.previousOutstanding > 0
                          ? "text-red-600"
                          : customer.previousOutstanding < 0
                            ? "text-green-600"
                            : "text-gray-600",
                      )}
                    >
                      {formatCurrency(customer.previousOutstanding)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn(
                        "font-medium",
                        customer.currentOutstanding > 0
                          ? "text-red-600"
                          : customer.currentOutstanding < 0
                            ? "text-green-600"
                            : "text-gray-600",
                      )}
                    >
                      {formatCurrency(customer.currentOutstanding)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDueDate(customer.billDueDate)}
                    </div>
                    {isOverdue(customer.billDueDate) && (
                      <Badge variant="destructive" className="mt-1 text-xs">
                        Overdue
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{customer.collectorName}</div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={customer.isActive ? "default" : "secondary"}
                      className={cn(
                        customer.isActive
                          ? "bg-green-100 text-green-800 hover:bg-green-200"
                          : "bg-gray-100 text-gray-800 hover:bg-gray-200",
                      )}
                    >
                      {customer.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      {isAdmin ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEdit(customer)}
                            className="h-8 px-3"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteCustomer(customer)}
                            className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200"
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
                            className="h-8 px-3"
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Request
                          </Button>
                        )
                      )}
                    </div>
                  </TableCell>
                </TableRow>

                {/* Expandable Row Content */}
                {expandedRows.has(customer.id) && (
                  <TableRow>
                    <TableCell colSpan={11} className="bg-gray-50 p-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column - Customer Info & VC Numbers */}
                        <div className="space-y-4">
                          {/* VC Numbers Section */}
                          {customer.connections &&
                          customer.connections.length > 0 ? (
                            <div className="bg-white p-4 rounded-lg border">
                              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                                <CreditCard className="h-4 w-4 mr-2" />
                                VC Numbers & Connections
                              </h4>
                              <div className="space-y-2">
                                {customer.connections.map((connection) => (
                                  <div
                                    key={connection.id}
                                    className="flex justify-between items-center p-2 bg-gray-50 rounded"
                                  >
                                    <div>
                                      <div className="font-mono text-sm text-blue-600">
                                        {connection.vcNumber}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {connection.isPrimary
                                          ? "Primary"
                                          : `Secondary ${connection.connectionIndex - 1}`}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm font-medium">
                                        {connection.planName}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {formatCurrency(connection.planPrice)}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="bg-white p-4 rounded-lg border">
                              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                                <CreditCard className="h-4 w-4 mr-2" />
                                VC Number
                              </h4>
                              <div className="font-mono text-blue-600">
                                {customer.vcNumber}
                              </div>
                            </div>
                          )}

                          {/* Additional Actions for Employees */}
                          {!isAdmin && canAccessCustomer(customer.id) && (
                            <div className="bg-white p-4 rounded-lg border">
                              <h4 className="font-medium text-gray-900 mb-3">
                                Action Requests
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleActivationRequest(customer)
                                  }
                                  className="h-8 px-3"
                                  disabled={customer.isActive}
                                >
                                  <Power className="h-3 w-3 mr-1" />
                                  Activate
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleDeactivationRequest(customer)
                                  }
                                  className="h-8 px-3"
                                  disabled={!customer.isActive}
                                >
                                  <PowerOff className="h-3 w-3 mr-1" />
                                  Deactivate
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handlePlanChangeRequest(customer)
                                  }
                                  className="h-8 px-3"
                                >
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                  Change Plan
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right Column - Invoice History */}
                        <div className="bg-white p-4 rounded-lg border">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-gray-900 flex items-center">
                              <FileText className="h-4 w-4 mr-2" />
                              Recent Invoices
                            </h4>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onView(customer)}
                                className="h-7 px-2 text-xs"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onViewHistory(customer)}
                                className="h-7 px-2 text-xs"
                              >
                                <History className="h-3 w-3 mr-1" />
                                History
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onPaymentCapture(customer)}
                                className="h-7 px-2 text-xs"
                              >
                                <CreditCard className="h-3 w-3 mr-1" />
                                Payment
                              </Button>
                            </div>
                          </div>

                          {customer.invoiceHistory &&
                          customer.invoiceHistory.length > 0 ? (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {customer.invoiceHistory
                                .slice(-5)
                                .reverse()
                                .map((invoice) => (
                                  <div
                                    key={invoice.id}
                                    className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm"
                                  >
                                    <div>
                                      <div className="font-medium">
                                        #{invoice.invoiceNumber}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {formatDate(invoice.issueDate)}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-medium">
                                        {formatCurrency(invoice.amount)}
                                      </div>
                                      {invoice.vcNumbers &&
                                        invoice.vcNumbers.length > 0 && (
                                          <div className="text-xs text-blue-600">
                                            {invoice.vcNumbers.join(", ")}
                                          </div>
                                        )}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          ) : (
                            <div className="text-center py-4 text-gray-500 text-sm">
                              No invoice history available
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {enrichedCustomers.map((customer) => (
          <div
            key={customer.id}
            className="bg-white rounded-lg border shadow-sm"
          >
            {/* Card Header with gradient */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-t-lg border-b">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {customer.name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {customer.phoneNumber}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge
                    variant={customer.isActive ? "default" : "secondary"}
                    className={cn(
                      customer.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800",
                    )}
                  >
                    {customer.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleRowExpansion(customer.id)}
                    className="h-8 w-8 p-0"
                  >
                    {expandedRows.has(customer.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Card Content */}
            <div className="p-4">
              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                    Package
                  </div>
                  <div className="font-medium text-sm">
                    {customer.currentPackage}
                  </div>
                  <div className="text-xs text-green-600 font-medium">
                    {formatCurrency(customer.packageAmount)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                    Outstanding
                  </div>
                  <div
                    className={cn(
                      "font-medium text-sm",
                      customer.currentOutstanding > 0
                        ? "text-red-600"
                        : customer.currentOutstanding < 0
                          ? "text-green-600"
                          : "text-gray-600",
                    )}
                  >
                    {formatCurrency(customer.currentOutstanding)}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 mb-4">
                {isAdmin ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(customer)}
                      className="flex-1 min-w-0"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteCustomer(customer)}
                      className="flex-1 min-w-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </>
                ) : (
                  canAccessCustomer(customer.id) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenericActionRequest(customer)}
                      className="flex-1"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Request Action
                    </Button>
                  )
                )}
              </div>

              {/* Expandable Content */}
              {expandedRows.has(customer.id) && (
                <div className="space-y-4 pt-4 border-t">
                  {/* Contact Information */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                      <Phone className="h-4 w-4 mr-2" />
                      Contact Information
                    </h4>
                    <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                      <div className="flex items-center text-sm">
                        <MapPin className="h-3 w-3 mr-2 text-gray-400" />
                        <span>{formatAddress(customer.address)}</span>
                      </div>
                      {customer.email && (
                        <div className="flex items-center text-sm">
                          <Mail className="h-3 w-3 mr-2 text-gray-400" />
                          <span>{customer.email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                      <IndianRupee className="h-4 w-4 mr-2" />
                      Financial Summary
                    </h4>
                    <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Package Amount:</span>
                        <span className="font-medium">
                          {formatCurrency(customer.packageAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Previous Outstanding:</span>
                        <span
                          className={cn(
                            "font-medium",
                            customer.previousOutstanding > 0
                              ? "text-red-600"
                              : customer.previousOutstanding < 0
                                ? "text-green-600"
                                : "text-gray-600",
                          )}
                        >
                          {formatCurrency(customer.previousOutstanding)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm border-t pt-2">
                        <span className="font-medium">
                          Current Outstanding:
                        </span>
                        <span
                          className={cn(
                            "font-medium",
                            customer.currentOutstanding > 0
                              ? "text-red-600"
                              : customer.currentOutstanding < 0
                                ? "text-green-600"
                                : "text-gray-600",
                          )}
                        >
                          {formatCurrency(customer.currentOutstanding)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Service Details */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                      <Package className="h-4 w-4 mr-2" />
                      Service Details
                    </h4>
                    <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Package:</span>
                        <span className="font-medium">
                          {customer.currentPackage}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Collector:</span>
                        <span>{customer.collectorName}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Bill Due Date:</span>
                        <span>{formatDueDate(customer.billDueDate)}</span>
                      </div>
                      {customer.connections &&
                        customer.connections.length > 0 && (
                          <div className="border-t pt-2">
                            <div className="text-xs text-gray-500 mb-1">
                              VC Numbers:
                            </div>
                            {customer.connections.map((connection) => (
                              <div
                                key={connection.id}
                                className="text-xs font-mono text-blue-600"
                              >
                                {connection.vcNumber} (
                                {connection.isPrimary ? "Primary" : "Secondary"}
                                )
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Recent Invoices */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      Recent Invoices
                    </h4>
                    {customer.invoiceHistory &&
                    customer.invoiceHistory.length > 0 ? (
                      <div className="space-y-2">
                        {customer.invoiceHistory
                          .slice(-3)
                          .reverse()
                          .map((invoice) => (
                            <div
                              key={invoice.id}
                              className="bg-gray-50 p-3 rounded-lg"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-medium text-sm">
                                    #{invoice.invoiceNumber}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {formatDate(invoice.issueDate)}
                                  </div>
                                  {invoice.vcNumbers &&
                                    invoice.vcNumbers.length > 0 && (
                                      <div className="text-xs text-blue-600 mt-1">
                                        VC: {invoice.vcNumbers.join(", ")}
                                      </div>
                                    )}
                                </div>
                                <div className="text-right">
                                  <div className="font-medium text-sm">
                                    {formatCurrency(invoice.amount)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-4 rounded-lg text-center text-gray-500 text-sm">
                        No recent invoices
                      </div>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onView(customer)}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewHistory(customer)}
                      className="flex-1"
                    >
                      <History className="h-4 w-4 mr-1" />
                      History
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPaymentCapture(customer)}
                      className="flex-1"
                    >
                      <CreditCard className="h-4 w-4 mr-1" />
                      Payment
                    </Button>
                  </div>

                  {/* Employee Action Requests */}
                  {!isAdmin && canAccessCustomer(customer.id) && (
                    <div className="pt-2 border-t">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">
                        Action Requests
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleActivationRequest(customer)}
                          disabled={customer.isActive}
                          className="flex-1"
                        >
                          <Power className="h-3 w-3 mr-1" />
                          Activate
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeactivationRequest(customer)}
                          disabled={!customer.isActive}
                          className="flex-1"
                        >
                          <PowerOff className="h-3 w-3 mr-1" />
                          Deactivate
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePlanChangeRequest(customer)}
                          className="flex-1"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Change Plan
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Action Request Modal */}
      <ActionRequestModal
        open={!!actionRequestCustomer}
        onOpenChange={() => {
          setActionRequestCustomer(null);
          setActionType("activation");
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
};
