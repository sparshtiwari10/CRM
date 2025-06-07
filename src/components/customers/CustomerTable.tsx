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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Customer } from "@/types";
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
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>VC Number</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Collector Name</TableHead>
                  <TableHead>Billing</TableHead>
                  <TableHead>Last Payment</TableHead>
                  {isAdmin && <TableHead>Portal Bill</TableHead>}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accessibleCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-medium">{customer.name}</div>
                        {customer.email && (
                          <div className="text-sm text-gray-500">
                            {customer.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm">{customer.phoneNumber}</div>
                        <div
                          className="text-xs text-gray-500 max-w-xs truncate"
                          title={customer.address}
                        >
                          {customer.address}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">
                        {customer.vcNumber}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{customer.currentPackage}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{customer.collectorName}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(getActiveStatusColor(customer.isActive))}
                      >
                        {customer.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          getBillingStatusColor(customer.billingStatus),
                        )}
                      >
                        {customer.billingStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatDate(customer.lastPaymentDate)}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <span className="font-medium">
                          ${customer.portalBill?.toFixed(2) || "0.00"}
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
                              onClick={() => handleActivationRequest(customer)}
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
                              onClick={() => handlePlanChangeRequest(customer)}
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
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-4 p-4">
            {accessibleCustomers.map((customer) => (
              <Card key={customer.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-lg">{customer.name}</h3>
                    {customer.email && (
                      <p className="text-sm text-gray-500">{customer.email}</p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Badge
                      variant="outline"
                      className={cn(getActiveStatusColor(customer.isActive))}
                    >
                      {customer.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
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
                            onClick={() => handleGenericActionRequest(customer)}
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

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">VC Number:</span>
                    <span className="font-mono">{customer.vcNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Phone:</span>
                    <span>{customer.phoneNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Package:</span>
                    <Badge variant="outline">{customer.currentPackage}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Collector:</span>
                    <span>{customer.collectorName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Billing:</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        getBillingStatusColor(customer.billingStatus),
                      )}
                    >
                      {customer.billingStatus}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Last Payment:</span>
                    <span>{formatDate(customer.lastPaymentDate)}</span>
                  </div>
                  {isAdmin && customer.portalBill && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Portal Bill:</span>
                      <span className="font-medium">
                        ${customer.portalBill.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="pt-1">
                    <span className="text-gray-500">Address:</span>
                    <p className="text-sm mt-1">{customer.address}</p>
                  </div>
                </div>

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
