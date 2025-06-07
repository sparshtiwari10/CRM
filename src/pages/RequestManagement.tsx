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
  const [statusFilter, setStatusFilter] = useState<string>("");
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

  // Initialize requests from mock data
  useEffect(() => {
    try {
      console.log("Loading mock action requests...");
      setRequests(mockActionRequests || []);
      setIsLoading(false);
    } catch (error) {
      console.error("Error loading requests:", error);
      setRequests([]);
      setIsLoading(false);
    }
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

    if (statusFilter) {
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
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setRequests((prevRequests) =>
        prevRequests.map((request) =>
          request.id === requestId
            ? {
                ...request,
                status: action === "approve" ? "approved" : "rejected",
                reviewDate: new Date().toISOString().split("T")[0],
                reviewedBy: "System Administrator",
                adminNotes: adminNotes || `Request ${action}ed by admin`,
              }
            : request,
        ),
      );

      toast({
        title: "Request Updated",
        description: `Request has been ${action}ed successfully.`,
      });

      setSelectedRequest(null);
      setAdminNotes("");
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${action} request. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNewRequestClose = () => {
    setShowNewRequestModal(false);
    // Refresh requests - in a real app this would come from the backend
    toast({
      title: "Request Submitted",
      description:
        "Your request has been submitted and is pending admin review.",
    });
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
        {/* Debug Info - Remove in production */}
        <div className="bg-gray-100 p-4 rounded text-sm">
          <div>
            User: {user?.name} ({user?.role})
          </div>
          <div>Total Requests: {requests.length}</div>
          <div>Filtered Requests: {filteredRequests.length}</div>
          <div>Is Admin: {isAdmin ? "Yes" : "No"}</div>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Request Management
            </h2>
            <p className="text-gray-600">
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
              <CardTitle className="text-sm font-medium text-gray-600">
                Pending Requests
              </CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {pendingCount}
              </div>
              <p className="text-xs text-gray-600">Awaiting review</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Approved Requests
              </CardTitle>
              <Check className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {approvedCount}
              </div>
              <p className="text-xs text-gray-600">Successfully approved</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Rejected Requests
              </CardTitle>
              <X className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {rejectedCount}
              </div>
              <p className="text-xs text-gray-600">Rejected requests</p>
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
                  <SelectItem value="">All Status</SelectItem>
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
                  <TableHead>Action Type</TableHead>
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
                      colSpan={isAdmin ? 7 : 6}
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
                      <TableCell>
                        <Badge variant="outline">
                          {getActionTypeLabel(request.actionType)}
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
