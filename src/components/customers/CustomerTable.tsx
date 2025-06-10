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
        currentPlan: customer.currentPackage,
        currentStatus: customer.status,
        reason: `Status change request to ${status}`,
        status: "pending",
        requestDate: new Date().toISOString().split("T")[0],
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
        toast({
          title: "Error",
          description: "Failed to update customer status",
          variant: "destructive",
        });
      }
    },
    [isAdmin, onCustomerUpdate, toast],
  );

  // Load billing history for a customer
  const loadBillingHistory = useCallback(
    async (customerId: string) => {
      if (billingHistory[customerId]) return; // Already loaded

      setLoadingBilling((prev) => new Set(prev).add(customerId));

      try {
        const history = await CustomerService.getBillingHistory(customerId);
        setBillingHistory((prev) => ({
          ...prev,
          [customerId]: history,
        }));
      } catch (error) {
        console.error("Failed to load billing history:", error);
        setBillingHistory((prev) => ({
          ...prev,
          [customerId]: [],
        }));
      } finally {
        setLoadingBilling((prev) => {
          const newSet = new Set(prev);
          newSet.delete(customerId);
          return newSet;
        });
      }
    },
    [billingHistory],
  );

  // Toggle row expansion
  const toggleRowExpansion = useCallback(
    (customerId: string) => {
      setExpandedRows((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(customerId)) {
          newSet.delete(customerId);
        } else {
          newSet.add(customerId);
          // Load billing history when expanding
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
              <TableHead>Contact</TableHead>
              <TableHead>Package</TableHead>
              <TableHead>Area</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Outstanding</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.map((customer) => {
              const isExpanded = expandedRows.has(customer.id);
              const totalOutstanding = calculateTotalOutstanding(customer);

              return (
                <React.Fragment key={customer.id}>
                  <TableRow
                    className={cn(
                      "cursor-pointer hover:bg-muted/50",
                      isExpanded && "bg-muted/30",
                    )}
                  >
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => toggleRowExpansion(customer.id)}
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
                        <div className="text-sm text-muted-foreground">
                          VC: {customer.vcNumber}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center text-sm">
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
                      <div className="space-y-1">
                        <div className="flex items-center">
                          <Package className="mr-1 h-3 w-3" />
                          {customer.currentPackage}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(customer.packageAmount)}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center">
                        <User className="mr-1 h-3 w-3" />
                        {customer.collectorName}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={getStatusVariant(customer.status)}
                        className="flex items-center gap-1 w-fit"
                      >
                        {getStatusIcon(customer.status)}
                        {customer.status}
                      </Badge>
                    </TableCell>

                    <TableCell>
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

                          {(isAdmin ||
                            customer.collectorName === user?.collector_name ||
                            customer.collectorName === user?.name) && (
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
                              className="text-orange-600 dark:text-orange-400"
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
                              className="text-green-600 dark:text-green-400"
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

                  {/* Expanded Row Content */}
                  {isExpanded && (
                    <TableRow>
                      <TableCell colSpan={8} className="p-0">
                        <div className="px-6 py-4 bg-muted/30 border-t">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Address */}
                            <div className="space-y-2">
                              <h4 className="font-medium flex items-center">
                                <MapPin className="mr-2 h-4 w-4" />
                                Address
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {customer.address}
                              </p>
                            </div>

                            {/* Package Details */}
                            <div className="space-y-2">
                              <h4 className="font-medium flex items-center">
                                <Package className="mr-2 h-4 w-4" />
                                Package Details
                              </h4>
                              <div className="text-sm space-y-1">
                                <div>Package: {customer.currentPackage}</div>
                                <div>
                                  Amount:{" "}
                                  {formatCurrency(customer.packageAmount)}
                                </div>
                                <div>Due Date: {customer.billDueDate}th</div>
                              </div>
                            </div>

                            {/* Connections */}
                            {customer.connections &&
                              customer.connections.length > 1 && (
                                <div className="space-y-2">
                                  <h4 className="font-medium flex items-center">
                                    <Tv className="mr-2 h-4 w-4" />
                                    Connections ({customer.connections.length})
                                  </h4>
                                  <div className="text-sm space-y-1">
                                    {customer.connections.map((conn, index) => (
                                      <div
                                        key={index}
                                        className="flex justify-between"
                                      >
                                        <span>
                                          {conn.isPrimary
                                            ? "Primary"
                                            : "Secondary"}{" "}
                                          - {conn.vcNumber}
                                        </span>
                                        <span>{conn.planName}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                          </div>

                          {/* Recent Billing History */}
                          <div className="mt-4 pt-4 border-t">
                            <h4 className="font-medium mb-2 flex items-center">
                              <FileText className="mr-2 h-4 w-4" />
                              Recent Billing
                              {loadingBilling.has(customer.id) && (
                                <RefreshCw className="ml-2 h-3 w-3 animate-spin" />
                              )}
                            </h4>

                            {billingHistory[customer.id] ? (
                              billingHistory[customer.id].length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {billingHistory[customer.id]
                                    .slice(0, 3)
                                    .map((bill, index) => (
                                      <div
                                        key={index}
                                        className="text-sm p-2 bg-background rounded border"
                                      >
                                        <div className="flex justify-between">
                                          <span>{bill.billingMonth}</span>
                                          <Badge
                                            variant={
                                              bill.status === "Paid"
                                                ? "default"
                                                : bill.status === "Pending"
                                                  ? "secondary"
                                                  : "destructive"
                                            }
                                            className="text-xs"
                                          >
                                            {bill.status}
                                          </Badge>
                                        </div>
                                        <div className="font-medium">
                                          {formatCurrency(bill.amount)}
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  No billing history available
                                </p>
                              )
                            ) : (
                              <div className="flex items-center text-sm text-muted-foreground">
                                <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                                Loading billing history...
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

                              {(isAdmin ||
                                customer.collectorName ===
                                  user?.collector_name ||
                                customer.collectorName === user?.name) && (
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
          onOpenChange={() => setSelectedRequest(null)}
          request={selectedRequest}
          onSave={async (request) => {
            // Handle request submission
            try {
              // Here you would typically save the request to your backend
              console.log("Submitting request:", request);

              toast({
                title: "Request Submitted",
                description:
                  "Your request has been submitted for admin approval.",
              });

              setSelectedRequest(null);
            } catch (error) {
              toast({
                title: "Error",
                description: "Failed to submit request",
                variant: "destructive",
              });
            }
          }}
        />
      )}

      {/* Status Change Confirmation Dialog */}
      <AlertDialog
        open={!!statusChangeCustomer}
        onOpenChange={() => setStatusChangeCustomer(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change {statusChangeCustomer?.name}'s
              status to {newStatus}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setStatusChangeCustomer(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (statusChangeCustomer) {
                  handleDirectStatusChange(statusChangeCustomer, newStatus);
                  setStatusChangeCustomer(null);
                }
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
