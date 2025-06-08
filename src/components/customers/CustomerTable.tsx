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
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestModalCustomer, setRequestModalCustomer] =
    useState<Customer | null>(null);
  const [requestActionType, setRequestActionType] = useState<
    "activation" | "deactivation" | "plan_change"
  >("activation");

  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  // Clear search results when search term changes
  useEffect(() => {
    if (!searchTerm) {
      setExpandedRows(new Set());
    }
  }, [searchTerm]);

  // Calculate VC status for a customer
  const calculateVCStatus = useCallback((customer: Customer) => {
    if (!customer.connections || customer.connections.length === 0) {
      return customer.status || (customer.isActive ? "active" : "inactive");
    }

    const activeVCs = customer.connections.filter(
      (conn) => (conn.status || customer.status) === "active",
    );
    const inactiveVCs = customer.connections.filter(
      (conn) => (conn.status || customer.status) !== "active",
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
      (conn) =>
        (conn.status || customer.status) === "active" ||
        (conn.status || customer.status) === "demo",
    );

    if (activeConnections.length === 0) return 0;

    // Sum up outstanding amounts from active connections
    return activeConnections.reduce((total, conn) => {
      return (
        total + (conn.currentOutstanding || customer.currentOutstanding || 0)
      );
    }, 0);
  }, []);

  // Handle primary VC status change
  const handlePrimaryVCStatusChange = useCallback(
    async (customer: Customer, newStatus: CustomerStatus) => {
      if (!isAdmin || !onCustomerUpdate || !user) return;

      try {
        const statusLog: StatusLog = {
          id: `log_${Date.now()}`,
          previousStatus: customer.status,
          newStatus,
          changedBy: user.name,
          changedDate: new Date().toISOString(),
          reason: `Primary VC Status changed from ${customer.status} to ${newStatus}`,
        };

        const updatedCustomer: Partial<Customer> = {
          status: newStatus,
          isActive: newStatus === "active" || newStatus === "demo",
          statusLogs: [...(customer.statusLogs || []), statusLog],
        };

        await onCustomerUpdate(customer.id, updatedCustomer);

        toast({
          title: "Primary VC Status Updated",
          description: `Primary VC ${customer.vcNumber} status changed to ${newStatus}`,
        });
      } catch (error) {
        console.error("Failed to update primary VC status:", error);
        toast({
          title: "Error",
          description: "Failed to update primary VC status",
          variant: "destructive",
        });
      }
    },
    [isAdmin, onCustomerUpdate, user, toast],
  );

  // Handle secondary VC status change
  const handleSecondaryVCStatusChange = useCallback(
    async (
      customer: Customer,
      connectionIndex: number,
      newStatus: CustomerStatus,
    ) => {
      if (!isAdmin || !onCustomerUpdate || !user) return;

      try {
        const updatedConnections = [...(customer.connections || [])];
        const connection = updatedConnections[connectionIndex];

        if (!connection) {
          console.error("Connection not found at index:", connectionIndex);
          return;
        }

        const oldStatus = connection.status || customer.status;

        // Update the specific connection status
        updatedConnections[connectionIndex] = {
          ...connection,
          status: newStatus,
        };

        const statusLog: StatusLog = {
          id: `log_${Date.now()}`,
          previousStatus: oldStatus,
          newStatus,
          changedBy: user.name,
          changedDate: new Date().toISOString(),
          reason: `Secondary VC ${connection.vcNumber} status changed from ${oldStatus} to ${newStatus}`,
        };

        const updatedCustomer: Partial<Customer> = {
          connections: updatedConnections,
          statusLogs: [...(customer.statusLogs || []), statusLog],
        };

        await onCustomerUpdate(customer.id, updatedCustomer);

        toast({
          title: "Secondary VC Status Updated",
          description: `Secondary VC ${connection.vcNumber} status changed to ${newStatus}`,
        });
      } catch (error) {
        console.error("Failed to update secondary VC status:", error);
        toast({
          title: "Error",
          description: "Failed to update secondary VC status",
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
        customer.currentPackage.toLowerCase().includes(term),
    );
  }, [enrichedCustomers, searchTerm]);

  const toggleRow = (customerId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(customerId)) {
      newExpanded.delete(customerId);
    } else {
      newExpanded.add(customerId);
    }
    setExpandedRows(newExpanded);
  };

  const getStatusBadgeVariant = (
    status: CustomerStatus | string,
  ): "default" | "secondary" | "destructive" | "outline" => {
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

  const getStatusBadgeColor = (status: CustomerStatus | string): string => {
    switch (status) {
      case "active":
        return "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800";
      case "inactive":
        return "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800";
      case "demo":
        return "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800";
      case "mixed":
        return "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800";
      default:
        return "";
    }
  };

  const getStatusDisplayText = (customer: Customer): string => {
    if (customer.vcStatus === "mixed") {
      return "Mixed";
    }
    return customer.status?.charAt(0).toUpperCase() + customer.status?.slice(1);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const formatAddress = (address: string): string => {
    const maxLength = 40;
    return address.length > maxLength
      ? address.substring(0, maxLength) + "..."
      : address;
  };

  const formatDueDate = (dueDate: number): string => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Create due date for current month
    const dueDateThisMonth = new Date(currentYear, currentMonth, dueDate);

    // If due date has passed this month, show next month
    if (dueDateThisMonth < currentDate) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dueDateNextMonth = new Date(nextYear, nextMonth, dueDate);
      return dueDateNextMonth.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      });
    }

    return dueDateThisMonth.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  };

  const handleActionRequest = (
    customer: Customer,
    actionType: "activation" | "deactivation" | "plan_change",
  ) => {
    setRequestModalCustomer(customer);
    setRequestActionType(actionType);
    setShowRequestModal(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8 text-muted-foreground">
          Loading customers...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Customer Info</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Package</TableHead>
              <TableHead className="text-right">Monthly Amount</TableHead>
              <TableHead className="text-right">Previous O/S</TableHead>
              <TableHead className="text-right">Current O/S</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Primary VC Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8">
                  {customers.length === 0
                    ? "No customers found"
                    : "No customers match your search criteria"}
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((customer) => (
                <React.Fragment key={customer.id}>
                  {/* Main Row */}
                  <TableRow className="group">
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => toggleRow(customer.id)}
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
                        <div className="font-medium text-foreground">
                          {customer.name}
                        </div>
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
                      <div className="text-sm text-foreground">
                        {formatAddress(customer.address)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-foreground">
                        {customer.currentPackage}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-medium text-foreground">
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
                      <div className="text-sm text-foreground">
                        {formatDueDate(customer.billDueDate)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-foreground">
                        {customer.collectorName}
                      </div>
                    </TableCell>
                    <TableCell>
                      {isAdmin ? (
                        <Select
                          value={customer.status}
                          onValueChange={(value: CustomerStatus) =>
                            handlePrimaryVCStatusChange(customer, value)
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
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
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
                                <DropdownMenuItem
                                  onClick={() => onDelete(customer)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onView(customer)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Requests</DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleActionRequest(customer, "activation")
                                  }
                                >
                                  <Power className="mr-2 h-4 w-4" />
                                  Request Activation
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleActionRequest(
                                      customer,
                                      "deactivation",
                                    )
                                  }
                                >
                                  <PowerOff className="mr-2 h-4 w-4" />
                                  Request Deactivation
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleActionRequest(customer, "plan_change")
                                  }
                                >
                                  <Package className="mr-2 h-4 w-4" />
                                  Request Plan Change
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Expanded Row - Service Details with Individual VC Status */}
                  {expandedRows.has(customer.id) && (
                    <TableRow>
                      <TableCell colSpan={11} className="bg-muted/30 p-6">
                        <div className="space-y-6">
                          {/* Customer Summary */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                                <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-foreground">
                                  Primary VC Number
                                </div>
                                <div className="text-lg font-bold text-foreground">
                                  {customer.vcNumber}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                                <IndianRupee className="h-5 w-5 text-green-600 dark:text-green-400" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-foreground">
                                  Total Monthly
                                </div>
                                <div className="text-lg font-bold text-foreground">
                                  {formatCurrency(customer.packageAmount)}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                                <Tv className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-foreground">
                                  Total Connections
                                </div>
                                <div className="text-lg font-bold text-foreground">
                                  {customer.numberOfConnections}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Service Details with Individual VC Status */}
                          <div>
                            <h4 className="text-lg font-semibold text-foreground mb-4">
                              Service Details & VC Status
                            </h4>

                            {/* Primary VC */}
                            <div className="border rounded-lg p-4 bg-white dark:bg-gray-800 mb-4">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                                <div>
                                  <div className="text-sm text-muted-foreground">
                                    VC Number
                                  </div>
                                  <div className="font-mono font-medium">
                                    {customer.vcNumber}
                                  </div>
                                  <Badge variant="default" className="mt-1">
                                    Primary
                                  </Badge>
                                </div>
                                <div>
                                  <div className="text-sm text-muted-foreground">
                                    Package
                                  </div>
                                  <div className="font-medium">
                                    {customer.currentPackage}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-sm text-muted-foreground">
                                    VC Status
                                  </div>
                                  {isAdmin ? (
                                    <Select
                                      value={customer.status}
                                      onValueChange={(value: CustomerStatus) =>
                                        handlePrimaryVCStatusChange(
                                          customer,
                                          value,
                                        )
                                      }
                                    >
                                      <SelectTrigger className="w-24 h-8">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="active">
                                          Active
                                        </SelectItem>
                                        <SelectItem value="inactive">
                                          Inactive
                                        </SelectItem>
                                        <SelectItem value="demo">
                                          Demo
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <Badge
                                      variant={getStatusBadgeVariant(
                                        customer.status,
                                      )}
                                      className={cn(
                                        getStatusBadgeColor(customer.status),
                                      )}
                                    >
                                      {customer.status}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="text-sm text-muted-foreground">
                                    Monthly Amount
                                  </div>
                                  <div className="font-bold">
                                    {formatCurrency(customer.packageAmount)}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Secondary VCs */}
                            {customer.connections &&
                              customer.connections.length > 1 && (
                                <div className="space-y-3">
                                  {customer.connections.map(
                                    (connection, index) =>
                                      !connection.isPrimary && (
                                        <div
                                          key={connection.id}
                                          className="border rounded-lg p-4 bg-white dark:bg-gray-800"
                                        >
                                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                                            <div>
                                              <div className="text-sm text-muted-foreground">
                                                VC Number
                                              </div>
                                              <div className="font-mono font-medium">
                                                {connection.vcNumber}
                                              </div>
                                              <Badge
                                                variant="outline"
                                                className="mt-1"
                                              >
                                                Secondary
                                              </Badge>
                                            </div>
                                            <div>
                                              <div className="text-sm text-muted-foreground">
                                                Package
                                              </div>
                                              <div className="font-medium">
                                                {connection.planName}
                                              </div>
                                            </div>
                                            <div>
                                              <div className="text-sm text-muted-foreground">
                                                VC Status
                                              </div>
                                              {isAdmin ? (
                                                <Select
                                                  value={
                                                    connection.status ||
                                                    customer.status
                                                  }
                                                  onValueChange={(
                                                    value: CustomerStatus,
                                                  ) =>
                                                    handleSecondaryVCStatusChange(
                                                      customer,
                                                      index,
                                                      value,
                                                    )
                                                  }
                                                >
                                                  <SelectTrigger className="w-24 h-8">
                                                    <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="active">
                                                      Active
                                                    </SelectItem>
                                                    <SelectItem value="inactive">
                                                      Inactive
                                                    </SelectItem>
                                                    <SelectItem value="demo">
                                                      Demo
                                                    </SelectItem>
                                                  </SelectContent>
                                                </Select>
                                              ) : (
                                                <Badge
                                                  variant={getStatusBadgeVariant(
                                                    connection.status ||
                                                      customer.status,
                                                  )}
                                                  className={cn(
                                                    getStatusBadgeColor(
                                                      connection.status ||
                                                        customer.status,
                                                    ),
                                                  )}
                                                >
                                                  {connection.status ||
                                                    customer.status}
                                                </Badge>
                                              )}
                                            </div>
                                            <div className="text-right">
                                              <div className="text-sm text-muted-foreground">
                                                Monthly Amount
                                              </div>
                                              <div className="font-bold">
                                                {formatCurrency(
                                                  connection.planPrice,
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ),
                                  )}
                                </div>
                              )}
                          </div>

                          {/* Contact Information */}
                          <div>
                            <h4 className="text-lg font-semibold text-foreground mb-4">
                              Contact Information
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="flex items-center space-x-3">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <div className="text-sm text-muted-foreground">
                                    Phone
                                  </div>
                                  <div className="font-medium text-foreground">
                                    {customer.phoneNumber}
                                  </div>
                                </div>
                              </div>
                              {customer.email && (
                                <div className="flex items-center space-x-3">
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <div className="text-sm text-muted-foreground">
                                      Email
                                    </div>
                                    <div className="font-medium text-foreground">
                                      {customer.email}
                                    </div>
                                  </div>
                                </div>
                              )}
                              <div className="flex items-start space-x-3">
                                <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                                <div>
                                  <div className="text-sm text-muted-foreground">
                                    Address
                                  </div>
                                  <div className="font-medium text-foreground">
                                    {customer.address}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Financial Summary */}
                          <div>
                            <h4 className="text-lg font-semibold text-foreground mb-4">
                              Financial Summary
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                                <div className="text-sm text-blue-600 dark:text-blue-400">
                                  Monthly Package
                                </div>
                                <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
                                  {formatCurrency(customer.packageAmount)}
                                </div>
                              </div>
                              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                                <div className="text-sm text-red-600 dark:text-red-400">
                                  Previous Outstanding
                                </div>
                                <div className="text-xl font-bold text-red-700 dark:text-red-300">
                                  {formatCurrency(customer.previousOutstanding)}
                                </div>
                              </div>
                              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                                <div className="text-sm text-orange-600 dark:text-orange-400">
                                  Current Outstanding
                                </div>
                                <div className="text-xl font-bold text-orange-700 dark:text-orange-300">
                                  {formatCurrency(
                                    customer.calculatedOutstanding,
                                  )}
                                </div>
                              </div>
                              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                                <div className="text-sm text-green-600 dark:text-green-400">
                                  Due Date
                                </div>
                                <div className="text-xl font-bold text-green-700 dark:text-green-300">
                                  {formatDueDate(customer.billDueDate)}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* VC Status Changes */}
                          {customer.statusLogs &&
                            customer.statusLogs.length > 0 && (
                              <div>
                                <h4 className="text-lg font-semibold text-foreground mb-4">
                                  VC Status Changes
                                </h4>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                  {customer.statusLogs
                                    .slice(-5)
                                    .reverse()
                                    .map((log, index) => (
                                      <div
                                        key={log.id}
                                        className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded border"
                                      >
                                        <div className="flex items-center space-x-3">
                                          <RefreshCw className="h-4 w-4 text-muted-foreground" />
                                          <div>
                                            <div className="text-sm font-medium text-foreground">
                                              {log.reason}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                              {new Date(
                                                log.changedDate,
                                              ).toLocaleDateString()}{" "}
                                              by {log.changedBy}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <Badge
                                            variant="outline"
                                            className="text-xs"
                                          >
                                            {log.previousStatus} →{" "}
                                            {log.newStatus}
                                          </Badge>
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
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Action Request Modal */}
      <ActionRequestModal
        open={showRequestModal}
        onOpenChange={setShowRequestModal}
        customers={requestModalCustomer ? [requestModalCustomer] : []}
        customer={requestModalCustomer}
        defaultActionType={requestActionType}
        onSuccess={() => {
          setShowRequestModal(false);
          toast({
            title: "Request Submitted",
            description:
              "Your action request has been submitted for admin review.",
          });
        }}
      />
    </div>
  );
}
