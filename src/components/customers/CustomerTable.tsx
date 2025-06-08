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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Clock,
  User,
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
import { Customer, Invoice, CustomerStatus, StatusLog, BillingRecord } from "@/types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ActionRequest } from "@/types/auth";
import { ActionRequestModal } from "./ActionRequestModal";

interface CustomerTableProps {
  customers: Customer[];
  searchTerm: string;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onView: (customer: Customer) => void;
  onViewHistory: (customer: Customer) => void;
  onPaymentCapture: (customer: Customer) => void;
  onCustomerUpdate?: (customerId: string, updates: Partial<Customer>) => void;
}

export default function CustomerTable({
  customers,
  searchTerm,
  onEdit,
  onDelete,
  onView,
  onViewHistory,
  onPaymentCapture,
  onCustomerUpdate,
}: CustomerTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ActionRequest | null>(
    null,
  );

  const { isAdmin, user } = useAuth();
  const { toast } = useToast();

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

  // Handle status change
  const handleStatusChange = useCallback(
    async (customer: Customer, newStatus: CustomerStatus) => {
      if (!isAdmin || !onCustomerUpdate || !user) return;

      try {
        const statusLog: StatusLog = {
          id: `log_${Date.now()}`,
          previousStatus: customer.status,
          newStatus,
          changedBy: user.name,
          changedDate: new Date().toISOString(),
          reason: `Status changed from ${customer.status} to ${newStatus}`,
        };

        const updatedCustomer: Partial<Customer> = {
          status: newStatus,
          isActive: newStatus === "active",
          statusLogs: [...(customer.statusLogs || []), statusLog],
        };

        await onCustomerUpdate(customer.id, updatedCustomer);

        toast({
          title: "Status Updated",
          description: `Customer status changed to ${newStatus}`,
        });
      } catch (error) {
        console.error("Failed to update customer status:", error);
        toast({
          title: "Error",
          description: "Failed to update customer status",
          variant: "destructive",
        });
      }
    },
    [isAdmin, onCustomerUpdate, user, toast],
  );

  const enrichedCustomers = useMemo(() => {
    return customers.map((customer) => ({
      ...customer,
      // Ensure status exists, fallback to active based on isActive
      status: customer.status || (customer.isActive ? "active" : "inactive"),
    }));
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return enrichedCustomers;

    const term = searchTerm.toLowerCase();
    return enrichedCustomers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(term) ||
        customer.phoneNumber.includes(term) ||
        customer.address.toLowerCase().includes(term) ||
        customer.vcNumber.toLowerCase().includes(term) ||
        customer.collectorName.toLowerCase().includes(term) ||
        customer.email?.toLowerCase().includes(term),
    );
  }, [enrichedCustomers, searchTerm]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const formatAddress = (address: string) => {
    // Truncate long addresses for better display
    return address.length > 50 ? address.substring(0, 50) + "..." : address;
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-IN");
    } catch {
      return dateString;
    }
  };

  const formatDueDate = (day: number) => {
    return `${day}${day === 1 ? "st" : day === 2 ? "nd" : day === 3 ? "rd" : "th"} of every month`;
  };

  const getStatusBadgeVariant = (status: CustomerStatus) => {
    switch (status) {
      case "active":
        return "default";
      case "inactive":
        return "secondary";
      case "demo":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getStatusBadgeColor = (status: CustomerStatus) => {
    switch (status) {
      case "active":
        return "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200";
      case "inactive":
        return "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200";
      case "demo":
        return "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const requestPermission = (action: string, customer: Customer) => {
    const request: ActionRequest = {
      id: `req_${Date.now()}`,
      type: action as "edit" | "delete",
      resourceId: customer.id,
      resourceType: "customer",
      resourceName: customer.name,
      requestedBy: user?.name || "Employee",
      requestedAt: new Date().toISOString(),
      status: "pending",
      reason: `Request to ${action} customer: ${customer.name}`,
    };

    setSelectedRequest(request);
  };

  if (filteredCustomers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <div className="text-lg font-medium">No customers found</div>
        <div className="text-sm">
          {searchTerm
            ? "Try adjusting your search criteria"
            : "No customers have been added yet"}
        </div>
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
            {filteredCustomers.map((customer) => (
              <React.Fragment key={customer.id}>
                <TableRow className="hover:bg-muted/50">
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
                      <div className="text-sm text-muted-foreground">
                        {customer.phoneNumber}
                      </div>
                      {customer.email && (
                        <div className="text-xs text-muted-foreground/70">
                          {customer.email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{formatAddress(customer.address)}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{customer.currentPackage}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-medium">
                      {formatCurrency(customer.packageAmount)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div
                      className={cn(
                        "font-medium",
                        customer.previousOutstanding > 0
                          ? "text-red-600 dark:text-red-400"
                          : customer.previousOutstanding < 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-muted-foreground",
                      )}
                    >
                      {formatCurrency(customer.previousOutstanding)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div
                      className={cn(
                        "font-medium",
                        customer.currentOutstanding > 0
                          ? "text-red-600 dark:text-red-400"
                          : customer.currentOutstanding < 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-muted-foreground",
                      )}
                    >
                      {formatCurrency(customer.currentOutstanding)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDueDate(customer.billDueDate)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{customer.collectorName}</div>
                  </TableCell>
                  <TableCell>
                    {isAdmin ? (
                      <Select
                        value={customer.status}
                        onValueChange={(value: CustomerStatus) =>
                          handleStatusChange(customer, value)
                        }
                      >
                        <SelectTrigger className="w-24 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="demo">Demo</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge
                        variant={getStatusBadgeVariant(customer.status)}
                        className={cn(getStatusBadgeColor(customer.status))}
                      >
                        {customer.status.charAt(0).toUpperCase() +
                          customer.status.slice(1)}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      {isAdmin ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEdit(customer)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteCustomer(customer)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => requestPermission("edit", customer)}
                            title="Request Edit Permission"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => requestPermission("delete", customer)}
                            title="Request Delete Permission"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>

                {/* Expanded Row Content */}
                {expandedRows.has(customer.id) && (
                  <TableRow>
                    <TableCell colSpan={11} className="p-0">
                      <div className="p-4 bg-muted/30 dark:bg-muted/20">
                        <div className="space-y-4">
                          {/* Service Details - Moved to top */}
                          <div>
                            <h4 className="font-medium text-foreground mb-2 flex items-center">
                              <Package className="h-4 w-4 mr-2" />
                              Service Details
                            </h4>
                            <div className="bg-card dark:bg-card/50 p-3 rounded-lg space-y-2 border border-border">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Package:</span>
                                <span className="font-medium text-foreground">
                                  {customer.currentPackage}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Collector:</span>
                                <span className="text-foreground">{customer.collectorName}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Bill Due Date:</span>
                                <span className="text-foreground">{formatDueDate(customer.billDueDate)}</span>
                              </div>
                              {customer.connections &&
                                customer.connections.length > 0 && (
                                  <div className="border-t border-border pt-2">
                                    <div className="text-sm text-muted-foreground mb-1">
                                      VC Numbers:
                                    </div>
                                    {customer.connections.map((connection) => (
                                      <div
                                        key={connection.id}
                                        className="text-base font-mono text-blue-600 dark:text-blue-400 font-semibold"
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

                          {/* Financial Summary */}
                          <div>
                            <h4 className="font-medium text-foreground mb-2 flex items-center">
                              <IndianRupee className="h-4 w-4 mr-2" />
                              Financial Summary
                            </h4>
                            <div className="bg-card dark:bg-card/50 p-3 rounded-lg space-y-2 border border-border">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Package Amount:</span>
                                <span className="font-medium text-foreground">
                                  {formatCurrency(customer.packageAmount)}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Previous Outstanding:</span>
                                <span
                                  className={cn(
                                    "font-medium",
                                    customer.previousOutstanding > 0
                                      ? "text-red-600 dark:text-red-400"
                                      : customer.previousOutstanding < 0
                                        ? "text-green-600 dark:text-green-400"
                                        : "text-muted-foreground",
                                  )}
                                >
                                  {formatCurrency(customer.previousOutstanding)}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm border-t border-border pt-2">
                                <span className="font-medium text-foreground">
                                  Current Outstanding:
                                </span>
                                <span
                                  className={cn(
                                    "font-medium",
                                    customer.currentOutstanding > 0
                                      ? "text-red-600 dark:text-red-400"
                                      : customer.currentOutstanding < 0
                                        ? "text-green-600 dark:text-green-400"
                                        : "text-muted-foreground",
                                  )}
                                >
                                  {formatCurrency(customer.currentOutstanding)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Status Change Log - Admin Only */}
                          {isAdmin &&
                            customer.statusLogs &&
                            customer.statusLogs.length > 0 && (
                              <div>
                                <h4 className="font-medium text-foreground mb-2 flex items-center">
                                  <Clock className="h-4 w-4 mr-2" />
                                  Status Change Log
                                </h4>
                                <div className="bg-card dark:bg-card/50 p-3 rounded-lg border border-border">
                                  <div className="space-y-2 max-h-32 overflow-y-auto">
                                    {customer.statusLogs
                                      .slice()
                                      .reverse()
                                      .map((log) => (
                                        <div
                                          key={log.id}
                                          className="flex items-start justify-between p-2 bg-muted/50 dark:bg-muted/30 rounded-md"
                                        >
                                          <div className="flex-1">
                                            <div className="text-sm font-medium text-foreground">
                                              {log.previousStatus} → {log.newStatus}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1 flex items-center">
                                              <User className="h-3 w-3 mr-1" />
                                              Changed by {log.changedBy}
                                            </div>
                                          </div>
                                          <div className="text-xs text-muted-foreground ml-4">
                                            {formatDate(log.changedDate)}
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              </div>
                            )}

                          {/* Recent Invoices */}
                          <div>
                            <h4 className="font-medium text-foreground mb-2 flex items-center">
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
                                      className="bg-card dark:bg-card/50 p-3 rounded-lg border border-border"
                                    >
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <div className="font-medium text-sm text-foreground">
                                            #{invoice.invoiceNumber}
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            {formatDate(invoice.generatedDate)}
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            {invoice.billingMonth} {invoice.billingYear}
                                          </div>
                                          {invoice.allVcNumbers &&
                                            invoice.allVcNumbers.length > 0 && (
                                              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                                VC: {invoice.allVcNumbers.join(", ")}
                                              </div>
                                            )}
                                        </div>
                                        <div className="text-right">
                                          <div className="font-medium text-sm text-foreground">
                                            {formatCurrency(invoice.amount)}
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            By {invoice.generatedBy}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <div className="bg-card dark:bg-card/50 p-3 rounded-lg text-center text-muted-foreground text-sm border border-border">
                                No recent invoices
                              </div>
                            )}
                          </div>
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
        {filteredCustomers.map((customer) => (
          <div
            key={customer.id}
            className="bg-card dark:bg-card/80 rounded-lg border border-border shadow-sm"
          >
            {/* Card Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">
                    {customer.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {customer.phoneNumber}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {isAdmin ? (
                    <Select
                      value={customer.status}
                      onValueChange={(value: CustomerStatus) =>
                        handleStatusChange(customer, value)
                      }
                    >
                      <SelectTrigger className="w-20 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="demo">Demo</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge
                      variant={getStatusBadgeVariant(customer.status)}
                      className={cn(getStatusBadgeColor(customer.status))}
                    >
                      {customer.status.charAt(0).toUpperCase() +
                        customer.status.slice(1)}
                    </Badge>
                  )}
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
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Package
                  </div>
                  <div className="text-sm font-medium text-foreground">
                    {customer.currentPackage}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Outstanding
                  </div>
                  <div
                    className={cn(
                      "text-sm font-medium",
                      customer.currentOutstanding > 0
                        ? "text-red-600 dark:text-red-400"
                        : customer.currentOutstanding < 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-muted-foreground",
                    )}
                  >
                    {formatCurrency(customer.currentOutstanding)}
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedRows.has(customer.id) && (
                <div className="space-y-3 pt-3 border-t border-border">
                  {/* Service Details - Moved to top for mobile too */}
                  <div>
                    <h4 className="font-medium text-foreground mb-2 flex items-center">
                      <Package className="h-4 w-4 mr-2" />
                      Service Details
                    </h4>
                    <div className="bg-muted/50 dark:bg-muted/30 p-3 rounded-lg space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Collector:</span>
                        <span className="text-foreground">{customer.collectorName}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Bill Due Date:</span>
                        <span className="text-foreground">{formatDueDate(customer.billDueDate)}</span>
                      </div>
                      {customer.connections &&
                        customer.connections.length > 0 && (
                          <div className="border-t border-border pt-2">
                            <div className="text-sm text-muted-foreground mb-1">
                              VC Numbers:
                            </div>
                            {customer.connections.map((connection) => (
                              <div
                                key={connection.id}
                                className="text-base font-mono text-blue-600 dark:text-blue-400 font-semibold"
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

                  {/* Financial Summary */}
                  <div>
                    <h4 className="font-medium text-foreground mb-2 flex items-center">
                      <IndianRupee className="h-4 w-4 mr-2" />
                      Financial Summary
                    </h4>
                    <div className="bg-muted/50 dark:bg-muted/30 p-3 rounded-lg space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Package Amount:</span>
                        <span className="font-medium text-foreground">
                          {formatCurrency(customer.packageAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Previous Outstanding:</span>
                        <span
                          className={cn(
                            "font-medium",
                            customer.previousOutstanding > 0
                              ? "text-red-600 dark:text-red-400"
                              : customer.previousOutstanding < 0
                                ? "text-green-600 dark:text-green-400"
                                : "text-muted-foreground",
                          )}
                        >
                          {formatCurrency(customer.previousOutstanding)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm border-t border-border pt-2">
                        <span className="font-medium text-foreground">
                          Current Outstanding:
                        </span>
                        <span
                          className={cn(
                            "font-medium",
                            customer.currentOutstanding > 0
                              ? "text-red-600 dark:text-red-400"
                              : customer.currentOutstanding < 0
                                ? "text-green-600 dark:text-green-400"
                                : "text-muted-foreground",
                          )}
                        >
                          {formatCurrency(customer.currentOutstanding)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Change Log - Admin Only */}
                  {isAdmin && customer.statusLogs && customer.statusLogs.length > 0 && (
                    <div>
                      <h4 className="font-medium text-foreground mb-2 flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        Status Change Log
                      </h4>
                      <div className="bg-muted/50 dark:bg-muted/30 p-3 rounded-lg">
                        <div className="space-y-2 max-h-24 overflow-y-auto">
                          {customer.statusLogs
                            .slice()
                            .reverse()
                            .slice(0, 2) // Show only last 2 on mobile
                            .map((log) => (
                              <div
                                key={log.id}
                                className="text-xs p-2 bg-card dark:bg-card/50 rounded border border-border"
                              >
                                <div className="font-medium text-foreground">
                                  {log.previousStatus} → {log.newStatus}
                                </div>
                                <div className="text-muted-foreground mt-1">
                                  By {log.changedBy} • {formatDate(log.changedDate)}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recent Invoices */}
                  <div>
                    <h4 className="font-medium text-foreground mb-2 flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      Recent Invoices
                    </h4>
                    {customer.invoiceHistory &&
                    customer.invoiceHistory.length > 0 ? (
                      <div className="space-y-2">
                        {customer.invoiceHistory
                          .slice(-2)
                          .reverse()
                          .map((invoice) => (
                            <div
                              key={invoice.id}
                              className="bg-muted/50 dark:bg-muted/30 p-3 rounded-lg"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-medium text-sm text-foreground">
                                    #{invoice.invoiceNumber}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatDate(invoice.generatedDate)}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {invoice.billingMonth} {invoice.billingYear}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-medium text-sm text-foreground">
                                    {formatCurrency(invoice.amount)}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    By {invoice.generatedBy}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="bg-muted/50 dark:bg-muted/30 p-3 rounded-lg text-center text-muted-foreground text-sm">
                        No recent invoices
                      </div>
                    )}
                  </div>

                  {/* Actions for mobile */}
                  <div className="flex space-x-2">
                    {isAdmin ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEdit(customer)}
                          className="flex-1"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteCustomer(customer)}
                          className="flex-1"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => requestPermission("edit", customer)}
                          className="flex-1"
                          title="Request Edit Permission"
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Request Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => requestPermission("delete", customer)}
                          className="flex-1"
                          title="Request Delete Permission"
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Request Delete
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

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
              action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteCustomer) {
                  onDelete(deleteCustomer);
                  setDeleteCustomer(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Customer
            </AlertDialogAction>
          </AlertDialogFooter>
      </AlertDialog>

      {/* Action Request Modal */}
      {selectedRequest && (
        <ActionRequestModal
          request={selectedRequest}
          isOpen={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onSubmit={(request) => {
            console.log("Request submitted:", request);
            setSelectedRequest(null);
            toast({
              title: "Request Submitted",
              description: "Your request has been sent to an administrator.",
            });
          }}
        />
      )}
    </>
  );
}