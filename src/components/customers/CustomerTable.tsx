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
  Tv,
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
  Connection,
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
  onCustomerUpdate?: (
    customerId: string,
    updates: Partial<Customer>,
  ) => Promise<void>;
  isLoading?: boolean;
}

export default function CustomerTable({
  customers,
  searchTerm,
  onEdit,
  onDelete,
  onView,
  onViewHistory,
  onCustomerUpdate,
  isLoading = false,
}: CustomerTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedRequest, setSelectedRequest] = useState<ActionRequest | null>(
    null,
  );
  const [statusChangeCustomer, setStatusChangeCustomer] =
    useState<Customer | null>(null);
  const [newStatus, setNewStatus] = useState<CustomerStatus>("active");
  const [billingHistory, setBillingHistory] = useState<
    Record<string, BillingRecord[]>
  >({});
  const [loadingBilling, setLoadingBilling] = useState<Set<string>>(new Set());

  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  // Check if current user can edit a specific customer
  const canEditCustomer = useCallback(
    (customer: Customer): boolean => {
      if (!user) return false;

      // Admins can edit all customers
      if (isAdmin) return true;

      // Employees can only edit customers in their assigned areas
      const userAreas =
        user.assigned_areas ||
        (user.collector_name ? [user.collector_name] : []);
      return userAreas.includes(customer.collectorName);
    },
    [user, isAdmin],
  );

  // Generate status change request
  const handleStatusChangeRequest = useCallback(
    (customer: Customer, status: CustomerStatus) => {
      if (!user) return;

      const request: ActionRequest = {
        id: `status-${customer.id}-${Date.now()}`,
        customerId: customer.id,
        customerName: customer.name,
        vcNumber: customer.vcNumber,
        employeeId: user.id,
        employeeName: user.name,
        actionType: status === "active" ? "activation" : "deactivation",
        currentStatus: customer.status,
        reason: `Status change from ${customer.status} to ${status}`,
        status: "pending",
        requestDate: new Date().toISOString(),
      };

      setSelectedRequest(request);
    },
    [user],
  );

  // Handle direct status change (admin only)
  const handleDirectStatusChange = useCallback(
    async (customer: Customer, status: CustomerStatus) => {
      if (!isAdmin || !onCustomerUpdate) return;

      try {
        await onCustomerUpdate(customer.id, { status });
        toast({
          title: "Status Updated",
          description: `${customer.name} status changed to ${status}`,
        });
      } catch (error) {
        console.error("Failed to update status:", error);
        toast({
          title: "Error",
          description: "Failed to update customer status",
          variant: "destructive",
        });
      }
    },
    [isAdmin, onCustomerUpdate, toast],
  );

  // Load billing history for expanded customer
  const loadBillingHistory = useCallback(
    async (customerId: string) => {
      if (billingHistory[customerId]) return; // Already loaded

      setLoadingBilling((prev) => new Set([...prev, customerId]));

      try {
        const history = await CustomerService.getBillingHistory(customerId);
        setBillingHistory((prev) => ({
          ...prev,
          [customerId]: history,
        }));
      } catch (error) {
        console.error("Failed to load billing history:", error);
        toast({
          title: "Error",
          description: "Failed to load billing history",
          variant: "destructive",
        });
      } finally {
        setLoadingBilling((prev) => {
          const newSet = new Set(prev);
          newSet.delete(customerId);
          return newSet;
        });
      }
    },
    [billingHistory, toast],
  );

  // Toggle row expansion and load billing history
  const toggleRowExpansion = useCallback(
    (customerId: string) => {
      setExpandedRows((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(customerId)) {
          newSet.delete(customerId);
        } else {
          newSet.add(customerId);
          loadBillingHistory(customerId);
        }
        return newSet;
      });
    },
    [loadBillingHistory],
  );

  // Filter customers based on search term
  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customers;

    const term = searchTerm.toLowerCase();
    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(term) ||
        customer.phoneNumber.toLowerCase().includes(term) ||
        customer.address.toLowerCase().includes(term) ||
        customer.vcNumber.toLowerCase().includes(term) ||
        customer.collectorName.toLowerCase().includes(term) ||
        customer.currentPackage.toLowerCase().includes(term),
    );
  }, [customers, searchTerm]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusVariant = (status: CustomerStatus) => {
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

  const getStatusIcon = (status: CustomerStatus) => {
    switch (status) {
      case "active":
        return <Power className="h-3 w-3" />;
      case "inactive":
        return <PowerOff className="h-3 w-3" />;
      case "demo":
        return <Clock className="h-3 w-3" />;
      default:
        return <PowerOff className="h-3 w-3" />;
    }
  };

  const calculateTotalOutstanding = (customer: Customer): number => {
    // Calculate from primary connection
    let total = customer.currentOutstanding || 0;

    // Add outstanding from secondary connections
    if (customer.connections && customer.connections.length > 1) {
      customer.connections.forEach((conn) => {
        if (!conn.isPrimary) {
          total += conn.currentOutstanding || 0;
        }
      });
    }

    return total;
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-2 text-muted-foreground">Loading customers...</p>
      </div>
    );
  }

  if (filteredCustomers.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          {searchTerm
            ? "No customers match your search."
            : "No customers found."}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>VC Number</TableHead>
              <TableHead>Package</TableHead>
              <TableHead>Area</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.map((customer) => {
              const isExpanded = expandedRows.has(customer.id);
              const totalOutstanding = calculateTotalOutstanding(customer);
              const customerBilling = billingHistory[customer.id] || [];
              const isLoadingBilling = loadingBilling.has(customer.id);

              return (
                <React.Fragment key={customer.id}>
                  <TableRow className="group">
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRowExpansion(customer.id)}
                        className="h-8 w-8 p-0"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{customer.name}</div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Phone className="mr-1 h-3 w-3" />
                          {customer.phoneNumber}
                        </div>
                        {customer.email && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Mail className="mr-1 h-3 w-3" />
                            {customer.email}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center">
                        <Tv className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span className="font-mono">{customer.vcNumber}</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center">
                          <Package className="mr-2 h-4 w-4 text-muted-foreground" />
                          {customer.currentPackage}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(customer.packageAmount || 0)}/month
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center">
                        <User className="mr-2 h-4 w-4 text-muted-foreground" />
                        {customer.collectorName}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={getStatusVariant(customer.status)}
                        className="capitalize"
                      >
                        {getStatusIcon(customer.status)}
                        <span className="ml-1">{customer.status}</span>
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <div
                        className={cn(
                          "font-medium",
                          totalOutstanding > 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-green-600 dark:text-green-400",
                        )}
                      >
                        {formatCurrency(totalOutstanding)}
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />

                          <DropdownMenuItem onClick={() => onView(customer)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>

                          {canEditCustomer(customer) && (
                            <DropdownMenuItem onClick={() => onEdit(customer)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Customer
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem
                            onClick={() => onViewHistory(customer)}
                          >
                            <History className="mr-2 h-4 w-4" />
                            View History
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          {/* Status Change Options */}
                          {customer.status === "active" ? (
                            <DropdownMenuItem
                              onClick={() => {
                                if (isAdmin) {
                                  handleDirectStatusChange(
                                    customer,
                                    "inactive",
                                  );
                                } else {
                                  handleStatusChangeRequest(
                                    customer,
                                    "inactive",
                                  );
                                }
                              }}
                            >
                              <PowerOff className="mr-2 h-4 w-4" />
                              {isAdmin ? "Deactivate" : "Request Deactivation"}
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => {
                                if (isAdmin) {
                                  handleDirectStatusChange(customer, "active");
                                } else {
                                  handleStatusChangeRequest(customer, "active");
                                }
                              }}
                            >
                              <Power className="mr-2 h-4 w-4" />
                              {isAdmin ? "Activate" : "Request Activation"}
                            </DropdownMenuItem>
                          )}

                          {isAdmin && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => onDelete(customer)}
                                className="text-red-600 dark:text-red-400"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Customer
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>

                  {/* Expanded row content */}
                  {isExpanded && (
                    <TableRow>
                      <TableCell colSpan={8} className="p-0">
                        <div className="border-t bg-muted/25 p-6">
                          {/* Customer Details */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                              <h4 className="font-semibold mb-3 flex items-center">
                                <User className="mr-2 h-4 w-4" />
                                Customer Information
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    Join Date:
                                  </span>
                                  <span>{customer.joinDate}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    Last Payment:
                                  </span>
                                  <span>{customer.lastPaymentDate}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    Bill Due:
                                  </span>
                                  <span>
                                    {customer.billDueDate}
                                    {customer.billDueDate === 1
                                      ? "st"
                                      : customer.billDueDate === 2
                                        ? "nd"
                                        : customer.billDueDate === 3
                                          ? "rd"
                                          : "th"}{" "}
                                    of month
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div>
                              <h4 className="font-semibold mb-3 flex items-center">
                                <MapPin className="mr-2 h-4 w-4" />
                                Address
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {customer.address}
                              </p>
                            </div>
                          </div>

                          {/* Connections */}
                          {customer.connections &&
                            customer.connections.length > 1 && (
                              <div className="mb-6">
                                <h4 className="font-semibold mb-3 flex items-center">
                                  <Tv className="mr-2 h-4 w-4" />
                                  Additional Connections
                                </h4>
                                <div className="grid gap-3">
                                  {customer.connections
                                    .filter((conn) => !conn.isPrimary)
                                    .map((connection, index) => (
                                      <div
                                        key={connection.id}
                                        className="flex items-center justify-between p-3 border rounded-lg bg-background"
                                      >
                                        <div>
                                          <div className="font-medium">
                                            VC: {connection.vcNumber}
                                          </div>
                                          <div className="text-sm text-muted-foreground">
                                            {connection.planName} -{" "}
                                            {formatCurrency(
                                              connection.packageAmount || 0,
                                            )}
                                            /month
                                          </div>
                                        </div>
                                        <Badge
                                          variant={getStatusVariant(
                                            connection.status || "active",
                                          )}
                                        >
                                          {getStatusIcon(
                                            connection.status || "active",
                                          )}
                                          <span className="ml-1">
                                            {connection.status || "active"}
                                          </span>
                                        </Badge>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}

                          {/* Billing History */}
                          <div className="mb-6">
                            <h4 className="font-semibold mb-3 flex items-center">
                              <CreditCard className="mr-2 h-4 w-4" />
                              Recent Billing History
                            </h4>
                            {isLoadingBilling ? (
                              <div className="flex items-center text-sm text-muted-foreground">
                                <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                                Loading billing history...
                              </div>
                            ) : customerBilling.length > 0 ? (
                              <div className="space-y-2">
                                {customerBilling.slice(0, 5).map((record) => (
                                  <div
                                    key={record.id}
                                    className="flex items-center justify-between p-3 border rounded-lg bg-background"
                                  >
                                    <div>
                                      <div className="font-medium">
                                        {record.billingMonth}
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        {record.paymentMethod} •{" "}
                                        {record.paymentDate}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-medium">
                                        {formatCurrency(record.amountPaid)}
                                      </div>
                                      <Badge
                                        variant={
                                          record.paymentStatus === "Paid"
                                            ? "default"
                                            : "destructive"
                                        }
                                        className="text-xs"
                                      >
                                        {record.paymentStatus}
                                      </Badge>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex items-center text-sm text-muted-foreground">
                                <FileText className="mr-2 h-3 w-3" />
                                No billing history available
                              </div>
                            )}
                          </div>

                          {/* Quick Actions */}
                          <div className="mt-4 pt-4 border-t">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onView(customer)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Full Details
                              </Button>

                              {canEditCustomer(customer) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => onEdit(customer)}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </Button>
                              )}

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onViewHistory(customer)}
                              >
                                <History className="mr-2 h-4 w-4" />
                                History
                              </Button>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Action Request Modal */}
      {selectedRequest && (
        <ActionRequestModal
          open={!!selectedRequest}
          onOpenChange={(open) => !open && setSelectedRequest(null)}
          request={selectedRequest}
          onRequestSubmitted={() => {
            setSelectedRequest(null);
            toast({
              title: "Request Submitted",
              description:
                "Your request has been submitted for admin approval.",
            });
          }}
        />
      )}
    </>
  );
}
