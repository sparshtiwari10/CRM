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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  CheckCircle,
  XCircle,
  AlertCircle,
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

interface EnhancedCustomerTableProps {
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

interface CustomerRowData extends Customer {
  primaryConnection?: Connection;
  secondaryConnections?: Connection[];
  statusLogs?: StatusLog[];
  billingHistory?: BillingRecord[];
}

export default function EnhancedCustomerTable({
  customers,
  searchTerm,
  onEdit,
  onDelete,
  onView,
  onViewHistory,
  onCustomerUpdate,
  isLoading = false,
}: EnhancedCustomerTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedRequest, setSelectedRequest] = useState<ActionRequest | null>(
    null,
  );
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestingCustomer, setRequestingCustomer] = useState<Customer | null>(
    null,
  );
  const [customerDetails, setCustomerDetails] = useState<
    Map<string, CustomerRowData>
  >(new Map());

  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  // Permission check function
  const canEditCustomer = useCallback(
    (customer: Customer): boolean => {
      if (!user) return false;
      if (isAdmin) return true;

      const userAreas =
        user.assigned_areas ||
        (user.collector_name ? [user.collector_name] : []);
      return userAreas.includes(customer.collectorName);
    },
    [user, isAdmin],
  );

  // Determine primary connection and VC number
  const getPrimaryConnection = (
    customer: Customer,
  ): { vcNumber: string; status: CustomerStatus; connection?: Connection } => {
    if (customer.connections && customer.connections.length > 0) {
      // Find primary connection
      const primary = customer.connections.find(
        (conn) => conn.isPrimary && conn.status === "active",
      );
      if (primary) {
        return {
          vcNumber: primary.vcNumber,
          status: primary.status,
          connection: primary,
        };
      }

      // If no active primary, find first active connection
      const activeConnection = customer.connections.find(
        (conn) => conn.status === "active",
      );
      if (activeConnection) {
        return {
          vcNumber: activeConnection.vcNumber,
          status: activeConnection.status,
          connection: activeConnection,
        };
      }

      // If no active connections, return first connection
      const firstConnection = customer.connections[0];
      return {
        vcNumber: firstConnection.vcNumber,
        status: firstConnection.status,
        connection: firstConnection,
      };
    }

    // Fallback to legacy VC number
    return {
      vcNumber: customer.vcNumber || "N/A",
      status: customer.status || "inactive",
    };
  };

  // Load additional customer details when row is expanded
  const loadCustomerDetails = async (customerId: string) => {
    if (customerDetails.has(customerId)) return;

    try {
      // In a real implementation, you would load:
      // - Status change logs
      // - Billing history
      // - Associated requests

      // For now, we'll use mock data
      const customer = customers.find((c) => c.id === customerId);
      if (customer) {
        const details: CustomerRowData = {
          ...customer,
          statusLogs: [
            {
              id: `${customerId}-log-1`,
              customerId,
              previousStatus: "inactive",
              newStatus: "active",
              changedBy: "Admin User",
              changedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              reason: "Account activation",
              requestId: "req-001",
            },
            {
              id: `${customerId}-log-2`,
              customerId,
              previousStatus: "demo",
              newStatus: "inactive",
              changedBy: "System",
              changedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
              reason: "Demo period ended",
            },
          ],
          billingHistory: [
            {
              id: `${customerId}-bill-1`,
              customerId,
              amount: customer.packageAmount || 0,
              billingMonth: "2024-01",
              paymentDate: new Date(),
              paymentStatus: "Paid",
              amountPaid: customer.packageAmount || 0,
              paymentMethod: "Cash",
            },
          ],
        };

        setCustomerDetails((prev) => new Map(prev.set(customerId, details)));
      }
    } catch (error) {
      console.error("Failed to load customer details:", error);
    }
  };

  // Toggle row expansion
  const toggleRowExpansion = (customerId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(customerId)) {
      newExpanded.delete(customerId);
    } else {
      newExpanded.add(customerId);
      loadCustomerDetails(customerId);
    }
    setExpandedRows(newExpanded);
  };

  // Handle status change requests
  const handleStatusChangeRequest = (
    customer: Customer,
    newStatus: CustomerStatus,
  ) => {
    if (isAdmin) {
      // Admins can change status directly
      handleDirectStatusChange(customer, newStatus);
    } else {
      // Employees must request status changes
      const request: ActionRequest = {
        id: `req-${Date.now()}`,
        customerId: customer.id,
        customerName: customer.name,
        vcNumber: customer.vcNumber || "",
        currentStatus: customer.status || "inactive",
        requestedStatus: newStatus,
        requestedBy: user?.name || "Unknown",
        requestedAt: new Date(),
        reason: `${newStatus === "active" ? "Activate" : "Deactivate"} customer service`,
        status: "pending",
        area: customer.collectorName,
      };

      setSelectedRequest(request);
      setRequestingCustomer(customer);
      setShowRequestModal(true);
    }
  };

  // Handle direct status change (admin only)
  const handleDirectStatusChange = async (
    customer: Customer,
    newStatus: CustomerStatus,
  ) => {
    try {
      if (!onCustomerUpdate) {
        throw new Error("Customer update function not provided");
      }

      const updates = { status: newStatus };
      await onCustomerUpdate(customer.id, updates);

      // Log the status change
      console.log(
        `Status changed for ${customer.name}: ${customer.status} → ${newStatus}`,
      );

      toast({
        title: "Status Updated",
        description: `Customer status changed to ${newStatus}`,
      });
    } catch (error) {
      console.error("Failed to update status:", error);
      toast({
        title: "Error",
        description: "Failed to update customer status",
        variant: "destructive",
      });
    }
  };

  // Filter customers based on search term
  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customers;

    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phoneNumber.includes(searchTerm) ||
        customer.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.vcNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.currentPackage
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        customer.collectorName.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [customers, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Area</TableHead>
              <TableHead className="text-right">Previous O/S</TableHead>
              <TableHead>Package</TableHead>
              <TableHead className="text-right">Current O/S</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-16">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <div className="text-muted-foreground">
                    {customers.length === 0
                      ? "No customers found"
                      : "No customers match the search criteria"}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((customer) => {
                const { vcNumber, status, connection } =
                  getPrimaryConnection(customer);
                const isExpanded = expandedRows.has(customer.id);
                const details = customerDetails.get(customer.id);

                return (
                  <React.Fragment key={customer.id}>
                    <TableRow className="hover:bg-muted/50">
                      {/* Expand/Collapse Toggle */}
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRowExpansion(customer.id)}
                          className="h-6 w-6 p-0"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>

                      {/* Name */}
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div>
                            <div className="font-medium">{customer.name}</div>
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{customer.phoneNumber}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Address */}
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm">{customer.address}</span>
                        </div>
                      </TableCell>

                      {/* Area */}
                      <TableCell>
                        <Badge variant="outline">
                          {customer.collectorName}
                        </Badge>
                      </TableCell>

                      {/* Previous Outstanding */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <IndianRupee className="h-4 w-4 text-muted-foreground" />
                          <span
                            className={cn(
                              "font-medium",
                              (customer.previousOutstanding || 0) > 0
                                ? "text-red-600"
                                : "text-green-600",
                            )}
                          >
                            {customer.previousOutstanding || 0}
                          </span>
                        </div>
                      </TableCell>

                      {/* Package */}
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">
                              {customer.currentPackage}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              ₹{customer.packageAmount || 0}/month
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Current Outstanding */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <IndianRupee className="h-4 w-4 text-muted-foreground" />
                          <span
                            className={cn(
                              "font-medium",
                              (customer.currentOutstanding || 0) > 0
                                ? "text-red-600"
                                : "text-green-600",
                            )}
                          >
                            {customer.currentOutstanding || 0}
                          </span>
                        </div>
                      </TableCell>

                      {/* Status (with Primary VC) */}
                      <TableCell>
                        <div className="space-y-1">
                          <Badge
                            variant={
                              status === "active"
                                ? "default"
                                : status === "demo"
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {status}
                          </Badge>
                          <div className="text-xs text-muted-foreground flex items-center space-x-1">
                            <Tv className="h-3 w-3" />
                            <span>{vcNumber}</span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
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
                            {canEditCustomer(customer) && (
                              <DropdownMenuItem
                                onClick={() => onEdit(customer)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Customer
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {/* Status Change Actions */}
                            {status !== "active" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleStatusChangeRequest(customer, "active")
                                }
                                className="text-green-600"
                              >
                                <Power className="mr-2 h-4 w-4" />
                                Activate
                              </DropdownMenuItem>
                            )}
                            {status !== "inactive" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleStatusChangeRequest(
                                    customer,
                                    "inactive",
                                  )
                                }
                                className="text-red-600"
                              >
                                <PowerOff className="mr-2 h-4 w-4" />
                                Deactivate
                              </DropdownMenuItem>
                            )}
                            {isAdmin && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => onDelete(customer)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>

                    {/* Expanded Row Details */}
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={9} className="bg-muted/30 p-6">
                          <div className="space-y-6">
                            {/* All VC Numbers */}
                            <div>
                              <h4 className="font-semibold mb-3 flex items-center">
                                <Tv className="mr-2 h-4 w-4" />
                                All VC Numbers
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {customer.connections?.map((conn) => (
                                  <div
                                    key={conn.id}
                                    className="border rounded p-3 bg-background"
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="font-medium">
                                        {conn.vcNumber}
                                      </span>
                                      <div className="flex items-center space-x-2">
                                        {conn.isPrimary && (
                                          <Badge
                                            variant="default"
                                            className="text-xs"
                                          >
                                            Primary
                                          </Badge>
                                        )}
                                        <Badge
                                          variant={
                                            conn.status === "active"
                                              ? "default"
                                              : conn.status === "demo"
                                                ? "secondary"
                                                : "destructive"
                                          }
                                          className="text-xs"
                                        >
                                          {conn.status}
                                        </Badge>
                                      </div>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      <div>{conn.planName}</div>
                                      <div>₹{conn.planPrice}/month</div>
                                    </div>
                                  </div>
                                )) || (
                                  <div className="text-muted-foreground">
                                    Legacy VC:{" "}
                                    {customer.vcNumber || "Not specified"}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Recent Billing History */}
                            {details?.billingHistory &&
                              details.billingHistory.length > 0 && (
                                <div>
                                  <h4 className="font-semibold mb-3 flex items-center">
                                    <CreditCard className="mr-2 h-4 w-4" />
                                    Recent Billing History
                                  </h4>
                                  <div className="space-y-2">
                                    {details.billingHistory
                                      .slice(0, 3)
                                      .map((bill) => (
                                        <div
                                          key={bill.id}
                                          className="border rounded p-3 bg-background"
                                        >
                                          <div className="flex items-center justify-between">
                                            <div>
                                              <span className="font-medium">
                                                ₹{bill.amount}
                                              </span>
                                              <span className="text-sm text-muted-foreground ml-2">
                                                ({bill.billingMonth})
                                              </span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                              <Badge
                                                variant={
                                                  bill.paymentStatus === "Paid"
                                                    ? "default"
                                                    : "destructive"
                                                }
                                              >
                                                {bill.paymentStatus}
                                              </Badge>
                                              <span className="text-xs text-muted-foreground">
                                                {new Date(
                                                  bill.paymentDate,
                                                ).toLocaleDateString()}
                                              </span>
                                            </div>
                                          </div>
                                          {bill.paymentMethod && (
                                            <div className="text-sm text-muted-foreground mt-1">
                                              Payment Method:{" "}
                                              {bill.paymentMethod}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              )}

                            {/* Status Change History - Compact */}
                            {details?.statusLogs &&
                              details.statusLogs.length > 0 && (
                                <div>
                                  <h4 className="font-semibold mb-2 flex items-center">
                                    <Clock className="mr-2 h-4 w-4" />
                                    Status Change History
                                  </h4>
                                  <div className="space-y-1">
                                    {details.statusLogs.map((log) => (
                                      <div
                                        key={log.id}
                                        className="border rounded p-2 bg-background"
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center space-x-2">
                                            <Badge
                                              variant="outline"
                                              className="text-xs px-1 py-0"
                                            >
                                              {log.previousStatus}
                                            </Badge>
                                            <span className="text-xs">→</span>
                                            <Badge
                                              variant="outline"
                                              className="text-xs px-1 py-0"
                                            >
                                              {log.newStatus}
                                            </Badge>
                                          </div>
                                          <span className="text-xs text-muted-foreground">
                                            {new Date(
                                              log.changedAt,
                                            ).toLocaleDateString()}
                                          </span>
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                          <span>{log.changedBy}</span>
                                          {log.reason && (
                                            <span className="ml-2">
                                              • {log.reason}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Action Request Modal for Employees */}
      <ActionRequestModal
        open={showRequestModal}
        onOpenChange={setShowRequestModal}
        customer={requestingCustomer}
        request={selectedRequest}
        onSubmitRequest={async (request) => {
          try {
            // Submit request for admin approval
            console.log("Submitting request:", request);

            toast({
              title: "Request Submitted",
              description: `Status change request submitted for ${request.customerName}`,
            });

            setShowRequestModal(false);
            setSelectedRequest(null);
            setRequestingCustomer(null);
          } catch (error) {
            console.error("Failed to submit request:", error);
            toast({
              title: "Error",
              description: "Failed to submit request",
              variant: "destructive",
            });
          }
        }}
      />
    </>
  );
}
