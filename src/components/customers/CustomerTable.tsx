import React, { useState, useCallback, useMemo, useEffect } from "react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  MoreHorizontal,
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
import {
  Customer,
  Invoice,
  CustomerStatus,
  StatusLog,
  BillingRecord,
} from "@/types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ActionRequest } from "@/types/auth";
import { ActionRequestModal } from "./ActionRequestModal";
import { CustomerService } from "@/services/customerService";

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
  const [customerInvoices, setCustomerInvoices] = useState<
    Record<string, BillingRecord[]>
  >({});

  const { isAdmin, user } = useAuth();
  const { toast } = useToast();

  // Fetch recent invoices for expanded customers
  useEffect(() => {
    const fetchInvoicesForExpandedCustomers = async () => {
      for (const customerId of expandedRows) {
        if (!customerInvoices[customerId]) {
          try {
            const invoices =
              await CustomerService.getBillingRecordsByCustomer(customerId);
            setCustomerInvoices((prev) => ({
              ...prev,
              [customerId]: invoices || [], // Ensure we always have an array
            }));
          } catch (error) {
            console.error(
              "Failed to fetch invoices for customer:",
              customerId,
              error,
            );
            // Set empty array on error to prevent repeated attempts
            setCustomerInvoices((prev) => ({
              ...prev,
              [customerId]: [],
            }));
          }
        }
      }
    };

    if (expandedRows.size > 0) {
      fetchInvoicesForExpandedCustomers();
    }
  }, [expandedRows, customerInvoices]);

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

  // Calculate VC status for a customer
  const calculateVCStatus = useCallback((customer: Customer) => {
    if (!customer.connections || customer.connections.length === 0) {
      return customer.status || (customer.isActive ? "active" : "inactive");
    }

    const activeVCs = customer.connections.filter(
      (conn) => conn.isPrimary || customer.isActive,
    );
    const inactiveVCs = customer.connections.filter(
      (conn) => !conn.isPrimary && !customer.isActive,
    );

    if (activeVCs.length === customer.connections.length) return "active";
    if (inactiveVCs.length === customer.connections.length) return "inactive";
    return "mixed"; // Some active, some inactive
  }, []);

  // Calculate current outstanding for active VCs only
  const calculateCurrentOutstanding = useCallback((customer: Customer) => {
    if (!customer.connections || customer.connections.length === 0) {
      return customer.currentOutstanding || 0;
    }

    // Only calculate outstanding for active VCs
    const activeConnections = customer.connections.filter(
      (conn) => customer.status === "active" || customer.status === "demo",
    );

    if (activeConnections.length === 0) return 0;

    // For now, return the customer's current outstanding
    // In a full implementation, this would sum up outstanding amounts per VC
    return customer.currentOutstanding || 0;
  }, []);

  // Handle status change (now affects VC status)
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
          reason: `VC Status changed from ${customer.status} to ${newStatus}`,
        };

        const updatedCustomer: Partial<Customer> = {
          status: newStatus,
          isActive: newStatus === "active" || newStatus === "demo",
          statusLogs: [...(customer.statusLogs || []), statusLog],
        };

        await onCustomerUpdate(customer.id, updatedCustomer);

        toast({
          title: "VC Status Updated",
          description: `VC Status changed to ${newStatus}`,
        });
      } catch (error) {
        console.error("Failed to update VC status:", error);
        toast({
          title: "Error",
          description: "Failed to update VC status",
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
      vcStatus: calculateVCStatus(customer),
      calculatedOutstanding: calculateCurrentOutstanding(customer),
    }));
  }, [customers, calculateVCStatus, calculateCurrentOutstanding]);

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
        customer.email?.toLowerCase().includes(term) ||
        (customer.connections &&
          customer.connections.some((conn) =>
            conn.vcNumber.toLowerCase().includes(term),
          )),
    );
  }, [enrichedCustomers, searchTerm]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const formatAddress = (address: string) => {
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

  const getStatusBadgeVariant = (status: CustomerStatus | string) => {
    switch (status) {
      case "active":
        return "default";
      case "inactive":
        return "secondary";
      case "demo":
        return "outline";
      case "mixed":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getStatusBadgeColor = (status: CustomerStatus | string) => {
    switch (status) {
      case "active":
        return "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200";
      case "inactive":
        return "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200";
      case "demo":
        return "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200";
      case "mixed":
        return "bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusDisplayText = (customer: any) => {
    if (!customer.connections || customer.connections.length <= 1) {
      return customer.status.charAt(0).toUpperCase() + customer.status.slice(1);
    }

    const activeCount = customer.connections.filter(
      (conn: any) => customer.status === "active",
    ).length;
    const inactiveCount = customer.connections.length - activeCount;

    if (activeCount === customer.connections.length) return "All Active";
    if (inactiveCount === customer.connections.length) return "All Inactive";
    return `${activeCount} Active, ${inactiveCount} Inactive`;
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
              <TableHead>VC Status</TableHead>
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
                    <div className="text-sm">
                      {formatAddress(customer.address)}
                    </div>
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
                        customer.calculatedOutstanding > 0
                          ? "text-red-600 dark:text-red-400"
                          : customer.calculatedOutstanding < 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-muted-foreground",
                      )}
                    >
                      {formatCurrency(customer.calculatedOutstanding)}
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
                        variant={getStatusBadgeVariant(customer.vcStatus)}
                        className={cn(getStatusBadgeColor(customer.vcStatus))}
                      >
                        {getStatusDisplayText(customer)}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-1">
                      {isAdmin ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEdit(customer)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
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
                              <DropdownMenuItem
                                onClick={() => onPaymentCapture(customer)}
                              >
                                <CreditCard className="mr-2 h-4 w-4" />
                                Payment
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeleteCustomer(customer)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                requestPermission("edit", customer)
                              }
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Request Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                requestPermission("delete", customer)
                              }
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Request Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </TableCell>
                </TableRow>

                {/* Expanded Row Content - Optimized */}
                {expandedRows.has(customer.id) && (
                  <TableRow>
                    <TableCell colSpan={11} className="p-0">
                      <div className="p-3 bg-muted/30 dark:bg-muted/20">
                        <div className="space-y-3">
                          {/* Service Details - Moved to top */}
                          <div>
                            <h4 className="font-medium text-foreground mb-2 flex items-center">
                              <Package className="h-4 w-4 mr-2" />
                              Service Details
                            </h4>
                            <div className="bg-card dark:bg-card/50 p-2 rounded-lg space-y-2 border border-border">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    Package:
                                  </span>
                                  <span className="font-medium text-foreground">
                                    {customer.currentPackage}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    Collector:
                                  </span>
                                  <span className="text-foreground">
                                    {customer.collectorName}
                                  </span>
                                </div>
                              </div>
                              {customer.connections &&
                                customer.connections.length > 0 && (
                                  <div className="border-t border-border pt-2">
                                    <div className="text-sm text-muted-foreground mb-1">
                                      VC Numbers:
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {customer.connections.map(
                                        (connection) => (
                                          <Badge
                                            key={connection.id}
                                            variant="outline"
                                            className="text-sm font-mono"
                                          >
                                            {connection.vcNumber}
                                          </Badge>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                )}
                            </div>
                          </div>

                          {/* Financial Summary - Compact */}
                          <div>
                            <h4 className="font-medium text-foreground mb-2 flex items-center">
                              <IndianRupee className="h-4 w-4 mr-2" />
                              Financial Summary
                            </h4>
                            <div className="bg-card dark:bg-card/50 p-2 rounded-lg border border-border">
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div className="text-center">
                                  <div className="text-xs text-muted-foreground">
                                    Package Amount
                                  </div>
                                  <div className="font-medium text-foreground">
                                    {formatCurrency(customer.packageAmount)}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xs text-muted-foreground">
                                    Previous O/S
                                  </div>
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
                                    {formatCurrency(
                                      customer.previousOutstanding,
                                    )}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xs text-muted-foreground">
                                    Current O/S
                                  </div>
                                  <div
                                    className={cn(
                                      "font-medium",
                                      customer.calculatedOutstanding > 0
                                        ? "text-red-600 dark:text-red-400"
                                        : customer.calculatedOutstanding < 0
                                          ? "text-green-600 dark:text-green-400"
                                          : "text-muted-foreground",
                                    )}
                                  >
                                    {formatCurrency(
                                      customer.calculatedOutstanding,
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Recent Invoices - Enhanced with Firestore data */}
                          <div>
                            <h4 className="font-medium text-foreground mb-2 flex items-center">
                              <FileText className="h-4 w-4 mr-2" />
                              Recent Invoices
                            </h4>
                            {customerInvoices[customer.id] &&
                            customerInvoices[customer.id].length > 0 ? (
                              <div className="space-y-1">
                                {customerInvoices[customer.id].map(
                                  (invoice) => (
                                    <div
                                      key={invoice.id}
                                      className="bg-card dark:bg-card/50 p-2 rounded border border-border"
                                    >
                                      <div className="flex justify-between items-center">
                                        <div className="flex-1">
                                          <div className="flex items-center space-x-2">
                                            <span className="font-medium text-sm text-foreground">
                                              #{invoice.invoiceNumber}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                              {formatDate(
                                                invoice.generatedDate,
                                              )}
                                            </span>
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            {invoice.billingMonth}{" "}
                                            {invoice.billingYear}
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <div className="font-medium text-sm text-foreground">
                                            {formatCurrency(invoice.amount)}
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            {invoice.generatedBy}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ),
                                )}
                              </div>
                            ) : (
                              <div className="bg-card dark:bg-card/50 p-2 rounded text-center text-muted-foreground text-sm border border-border">
                                No recent invoices
                              </div>
                            )}
                          </div>

                          {/* Status Change Log - Admin Only - Compact */}
                          {isAdmin &&
                            customer.statusLogs &&
                            customer.statusLogs.length > 0 && (
                              <div>
                                <h4 className="font-medium text-foreground mb-2 flex items-center">
                                  <Clock className="h-4 w-4 mr-2" />
                                  VC Status Changes
                                </h4>
                                <div className="bg-card dark:bg-card/50 p-2 rounded border border-border">
                                  <div className="space-y-1 max-h-24 overflow-y-auto">
                                    {customer.statusLogs
                                      .slice()
                                      .reverse()
                                      .slice(0, 3)
                                      .map((log) => (
                                        <div
                                          key={log.id}
                                          className="flex justify-between items-center p-1 bg-muted/50 dark:bg-muted/30 rounded text-xs"
                                        >
                                          <span className="font-medium text-foreground">
                                            {log.previousStatus} →{" "}
                                            {log.newStatus}
                                          </span>
                                          <span className="text-muted-foreground">
                                            {log.changedBy} •{" "}
                                            {formatDate(log.changedDate)}
                                          </span>
                                        </div>
                                      ))}
                                  </div>
                                </div>
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

      {/* Mobile Cards - Optimized */}
      <div className="md:hidden space-y-3">
        {filteredCustomers.map((customer) => (
          <div
            key={customer.id}
            className="bg-card dark:bg-card/80 rounded-lg border border-border shadow-sm"
          >
            {/* Card Header - Compact */}
            <div className="p-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">
                    {customer.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
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
                      variant={getStatusBadgeVariant(customer.vcStatus)}
                      className={cn(getStatusBadgeColor(customer.vcStatus))}
                    >
                      {getStatusDisplayText(customer)}
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

            {/* Card Content - Compact */}
            <div className="p-3">
              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 gap-3 mb-3">
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
                      customer.calculatedOutstanding > 0
                        ? "text-red-600 dark:text-red-400"
                        : customer.calculatedOutstanding < 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-muted-foreground",
                    )}
                  >
                    {formatCurrency(customer.calculatedOutstanding)}
                  </div>
                </div>
              </div>

              {/* Expanded Content for Mobile */}
              {expandedRows.has(customer.id) && (
                <div className="space-y-3 pt-3 border-t border-border">
                  {/* VC Numbers - Clean display */}
                  {customer.connections && customer.connections.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-foreground mb-1">
                        VC Numbers
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {customer.connections.map((connection) => (
                          <Badge
                            key={connection.id}
                            variant="outline"
                            className="text-sm font-mono"
                          >
                            {connection.vcNumber}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Invoices - Mobile */}
                  <div>
                    <div className="text-sm font-medium text-foreground mb-1">
                      Recent Invoices
                    </div>
                    {customerInvoices[customer.id] &&
                    customerInvoices[customer.id].length > 0 ? (
                      <div className="space-y-1">
                        {customerInvoices[customer.id]
                          .slice(0, 2)
                          .map((invoice) => (
                            <div
                              key={invoice.id}
                              className="bg-muted/50 dark:bg-muted/30 p-2 rounded"
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="font-medium text-sm text-foreground">
                                    #{invoice.invoiceNumber}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatDate(invoice.generatedDate)}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-medium text-sm text-foreground">
                                    {formatCurrency(invoice.amount)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="bg-muted/50 dark:bg-muted/30 p-2 rounded text-center text-muted-foreground text-sm">
                        No recent invoices
                      </div>
                    )}
                  </div>

                  {/* Actions - Optimized for mobile */}
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => onViewHistory(customer)}
                            >
                              <History className="mr-2 h-4 w-4" />
                              History
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onPaymentCapture(customer)}
                            >
                              <CreditCard className="mr-2 h-4 w-4" />
                              Payment
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteCustomer(customer)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            <MoreHorizontal className="h-4 w-4 mr-1" />
                            Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => requestPermission("edit", customer)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Request Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              requestPermission("delete", customer)
                            }
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Request Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
        </AlertDialogContent>
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
