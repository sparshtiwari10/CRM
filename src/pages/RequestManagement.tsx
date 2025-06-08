import { useState, useEffect, useContext } from "react";
import { Check, X, Clock, Eye, Filter, Plus, Send } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ActionRequestModal } from "@/components/customers/ActionRequestModal";
import { AuthContext } from "@/contexts/AuthContext";
import { CustomerService } from "@/services/customerService";
import { ActionRequest } from "@/types/auth";
import { Customer } from "@/types";
import { mockActionRequests } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function RequestManagement() {
  const [requests, setRequests] = useState<ActionRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<ActionRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<ActionRequest | null>(
    null,
  );
  const [adminNotes, setAdminNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user, isAdmin } = useContext(AuthContext);

  // Debug logging
  useEffect(() => {
    console.log("RequestManagement - User:", user);
    console.log("RequestManagement - IsAdmin:", isAdmin);
    console.log("RequestManagement - Mock requests:", mockActionRequests);
  }, [user, isAdmin]);

  // Load requests dynamically from Firebase
  useEffect(() => {
    const loadRequests = async () => {
      try {
        console.log("Loading action requests from Firebase...");
        const requestsData = await CustomerService.getAllRequests();
        setRequests(requestsData || []);
        console.log("Loaded requests:", requestsData.length);
      } catch (error) {
        console.error("Error loading requests:", error);
        // Fallback to empty array if Firebase fails
        setRequests([]);
        toast({
          title: "Loading Error",
          description: "Failed to load requests. Using offline mode.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadRequests();
  }, []);

  // Load customers for employees to create requests
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        let customerData;
        if (isAdmin) {
          customerData = await CustomerService.getAllCustomers();
        } else if (user?.name) {
          // For employees, get only their assigned customers
          customerData = await CustomerService.getCustomersByCollector(
            user.name,
          );
        } else {
          customerData = [];
        }
        setCustomers(customerData);
        console.log("Loaded customers:", customerData.length);
      } catch (error) {
        console.error("Error loading customers:", error);
        setCustomers([]);
      }
    };

    if (user) {
      loadCustomers();
    }
  }, [isAdmin, user]);

  // Filter requests based on user role
  useEffect(() => {
    let filtered = requests;
    console.log("Filtering requests. Total requests:", requests.length);

    // For employees, show only their own requests
    if (!isAdmin && user) {
      filtered = filtered.filter((request) => request.employeeId === user.id);
      console.log("Employee filtered requests:", filtered.length);
    }

    // Apply search and status filters
    if (searchTerm) {
      filtered = filtered.filter(
        (request) =>
          request.customerName
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          request.employeeName.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    if (statusFilter && statusFilter !== "all") {
      filtered = filtered.filter((request) => request.status === statusFilter);
    }

    console.log("Final filtered requests:", filtered.length);
    setFilteredRequests(filtered);
  }, [requests, searchTerm, statusFilter, isAdmin, user]);

  const getStatusColor = (status: ActionRequest["status"]) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "approved":
        return "bg-green-100 text-green-800 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getActionTypeLabel = (actionType: ActionRequest["actionType"]) => {
    switch (actionType) {
      case "activation":
        return "Customer Activation";
      case "deactivation":
        return "Customer Deactivation";
      case "plan_change":
        return "Plan Change";
      default:
        return actionType;
    }
  };

  const handleRequestAction = async (
    requestId: string,
    action: "approve" | "reject",
  ) => {
    setIsProcessing(true);

    try {
      const request = requests.find((r) => r.id === requestId);
      if (!request) {
        throw new Error("Request not found");
      }

      const updatedRequest = {
        ...request,
        status: action === "approve" ? "approved" : "rejected",
        reviewDate: new Date().toISOString().split("T")[0],
        reviewedBy: user?.name || "System Administrator",
        adminNotes: adminNotes || `Request ${action}ed by admin`,
      };

      // Save to Firebase
      await CustomerService.updateRequest(requestId, updatedRequest);

      // If request is approved and it's an activation/deactivation, update VC status
      if (
        action === "approve" &&
        (request.actionType === "activation" ||
          request.actionType === "deactivation")
      ) {
        try {
          // Get the customer
          const customer = customers.find((c) => c.id === request.customerId);
          if (customer) {
            const newVCStatus =
              request.actionType === "activation" ? "active" : "inactive";

            console.log(
              `🔄 Updating VC ${request.vcNumber} status to ${newVCStatus} for customer ${customer.name}`,
            );

            // Check if it's primary VC or secondary VC
            if (request.vcNumber === customer.vcNumber) {
              // Primary VC - update customer status
              await CustomerService.updateCustomer(customer.id, {
                status: newVCStatus,
                isActive: newVCStatus === "active",
              });
              console.log(
                `✅ Primary VC ${request.vcNumber} status updated to ${newVCStatus}`,
              );
            } else {
              // Secondary VC - update connection status
              const updatedConnections =
                customer.connections?.map((conn) =>
                  conn.vcNumber === request.vcNumber
                    ? { ...conn, status: newVCStatus }
                    : conn,
                ) || [];

              await CustomerService.updateCustomer(customer.id, {
                connections: updatedConnections,
              });
              console.log(
                `✅ Secondary VC ${request.vcNumber} status updated to ${newVCStatus}`,
              );
            }

            toast({
              title: "VC Status Updated",
              description: `VC ${request.vcNumber} status changed to ${newVCStatus} as requested.`,
            });
          }
        } catch (vcUpdateError) {
          console.error("Failed to update VC status:", vcUpdateError);
          toast({
            title: "Warning",
            description:
              "Request approved but failed to update VC status. Please update manually.",
            variant: "destructive",
          });
        }
      }

      // Update local state
      setRequests((prevRequests) =>
        prevRequests.map((req) =>
          req.id === requestId ? updatedRequest : req,
        ),
      );

      toast({
        title: "Request Updated",
        description: `Request has been ${action}ed successfully and saved to database.`,
      });

      setSelectedRequest(null);
      setAdminNotes("");
    } catch (error) {
      console.error(`Failed to ${action} request:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} request. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNewRequestClose = async () => {
    setShowNewRequestModal(false);

    try {
      // Refresh requests from Firebase to show the new request
      const updatedRequests = await CustomerService.getAllRequests();
      setRequests(updatedRequests || []);

      toast({
        title: "Request Submitted",
        description:
          "Your request has been submitted and saved to database. It is pending admin review.",
      });
    } catch (error) {
      console.error("Failed to refresh requests:", error);
      toast({
        title: "Request Submitted",
        description:
          "Your request has been submitted but failed to refresh the list. Please reload the page.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const pendingCount = filteredRequests.filter(
    (r) => r.status === "pending",
  ).length;
  const approvedCount = filteredRequests.filter(
    (r) => r.status === "approved",
  ).length;
  const rejectedCount = filteredRequests.filter(
    (r) => r.status === "rejected",
  ).length;

  // Show loading state
  if (isLoading) {
    return (
      <DashboardLayout title="Request Management">
        <div className="p-6">
          <div className="text-center py-8">
            <div className="text-lg">Loading requests...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Show error if user is not authenticated
  if (!user) {
    return (
      <DashboardLayout title="Request Management">
        <div className="p-6">
          <div className="text-center py-8">
            <div className="text-lg text-red-600">
              Please log in to view requests
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Request Management">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Request Management
            </h2>
            <p className="text-muted-foreground">
              {isAdmin
                ? "Review and manage employee action requests"
                : "View your request status and submit new requests"}
            </p>
          </div>
          {!isAdmin && (
            <Button onClick={() => setShowNewRequestModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Request
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Requests
              </CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {pendingCount}
              </div>
              <p className="text-xs text-muted-foreground">Awaiting review</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Approved Requests
              </CardTitle>
              <Check className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {approvedCount}
              </div>
              <p className="text-xs text-muted-foreground">
                Successfully approved
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Rejected Requests
              </CardTitle>
              <X className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {rejectedCount}
              </div>
              <p className="text-xs text-muted-foreground">Rejected requests</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by customer or employee name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Requests Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {isAdmin ? "All Action Requests" : "My Requests"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>VC Number</TableHead>
                  <TableHead>Action Type</TableHead>
                  <TableHead>Current Status</TableHead>
                  {isAdmin && <TableHead>Employee</TableHead>}
                  <TableHead>Request Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Review Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isAdmin ? 9 : 8}
                      className="text-center py-8"
                    >
                      {requests.length === 0
                        ? "No requests available"
                        : "No requests match your filters"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        {request.customerName}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {request.vcNumber}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getActionTypeLabel(request.actionType)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            request.currentStatus === "active"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {request.currentStatus || "unknown"}
                        </Badge>
                      </TableCell>
                      {isAdmin && <TableCell>{request.employeeName}</TableCell>}
                      <TableCell>{formatDate(request.requestDate)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(getStatusColor(request.status))}
                        >
                          {request.status.charAt(0).toUpperCase() +
                            request.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {request.reviewDate
                          ? formatDate(request.reviewDate)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedRequest(request)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {isAdmin && request.status === "pending" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600 hover:text-green-700"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  // Auto-approve could be added here
                                }}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  // Auto-reject could be added here
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Request Details Modal */}
        <Dialog
          open={!!selectedRequest}
          onOpenChange={() => setSelectedRequest(null)}
        >
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Request Details</DialogTitle>
              <DialogDescription>
                {isAdmin
                  ? "Review and manage this action request"
                  : "View request details and status"}
              </DialogDescription>
            </DialogHeader>

            {selectedRequest && (
              <div className="space-y-6">
                {/* Request Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Customer
                    </label>
                    <p className="text-lg font-medium">
                      {selectedRequest.customerName}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Action Type
                    </label>
                    <p className="text-lg font-medium">
                      {getActionTypeLabel(selectedRequest.actionType)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Requested By
                    </label>
                    <p className="text-lg font-medium">
                      {selectedRequest.employeeName}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Request Date
                    </label>
                    <p className="text-lg font-medium">
                      {formatDate(selectedRequest.requestDate)}
                    </p>
                  </div>
                </div>

                {/* Current Status */}
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Status
                  </label>
                  <div className="mt-1">
                    <Badge
                      variant="outline"
                      className={cn(getStatusColor(selectedRequest.status))}
                    >
                      {selectedRequest.status.charAt(0).toUpperCase() +
                        selectedRequest.status.slice(1)}
                    </Badge>
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Reason
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedRequest.reason}
                  </p>
                </div>

                {/* Plan Change Details */}
                {selectedRequest.actionType === "plan_change" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Current Plan
                      </label>
                      <p className="text-lg font-medium">
                        {selectedRequest.currentPlan}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Requested Plan
                      </label>
                      <p className="text-lg font-medium">
                        {selectedRequest.requestedPlan}
                      </p>
                    </div>
                  </div>
                )}

                {/* Review Information */}
                {selectedRequest.reviewDate && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Reviewed By
                        </label>
                        <p className="text-lg font-medium">
                          {selectedRequest.reviewedBy}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Review Date
                        </label>
                        <p className="text-lg font-medium">
                          {formatDate(selectedRequest.reviewDate)}
                        </p>
                      </div>
                    </div>

                    {selectedRequest.adminNotes && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Admin Notes
                        </label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedRequest.adminNotes}
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* Admin Actions */}
                {isAdmin && selectedRequest.status === "pending" && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="admin-notes">
                        Admin Notes (Optional)
                      </Label>
                      <Textarea
                        id="admin-notes"
                        placeholder="Add notes about this request..."
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {isAdmin && selectedRequest?.status === "pending" && (
              <DialogFooter className="space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedRequest(null)}
                  disabled={isProcessing}
                >
                  Close
                </Button>
                <Button
                  variant="destructive"
                  onClick={() =>
                    handleRequestAction(selectedRequest.id, "reject")
                  }
                  disabled={isProcessing}
                >
                  {isProcessing ? "Processing..." : "Reject"}
                </Button>
                <Button
                  onClick={() =>
                    handleRequestAction(selectedRequest.id, "approve")
                  }
                  disabled={isProcessing}
                >
                  {isProcessing ? "Processing..." : "Approve"}
                </Button>
              </DialogFooter>
            )}

            {(!isAdmin || selectedRequest?.status !== "pending") && (
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setSelectedRequest(null)}
                >
                  Close
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>

        {/* New Request Modal for Employees */}
        {!isAdmin && (
          <ActionRequestModal
            open={showNewRequestModal}
            onOpenChange={setShowNewRequestModal}
            customers={customers}
            onSuccess={handleNewRequestClose}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
