import { useState, useEffect } from "react";
import { Check, X, Clock, Eye, Filter } from "lucide-react";
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
import { ActionRequest } from "@/types/auth";
import { mockActionRequests } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function RequestManagement() {
  const [requests, setRequests] = useState<ActionRequest[]>(mockActionRequests);
  const [filteredRequests, setFilteredRequests] = useState<ActionRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<ActionRequest | null>(
    null,
  );
  const [adminNotes, setAdminNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Filter requests based on status and search
  useEffect(() => {
    let filtered = requests;

    if (statusFilter) {
      filtered = filtered.filter((request) => request.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (request) =>
          request.customerName
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          request.employeeName
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          request.reason.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    setFilteredRequests(filtered);
  }, [requests, statusFilter, searchTerm]);

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

  const getActionTypeColor = (actionType: ActionRequest["actionType"]) => {
    switch (actionType) {
      case "activation":
        return "bg-green-100 text-green-800";
      case "deactivation":
        return "bg-red-100 text-red-800";
      case "plan_change":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleViewRequest = (request: ActionRequest) => {
    setSelectedRequest(request);
    setAdminNotes(request.adminNotes || "");
  };

  const handleApproveRequest = async (requestId: string) => {
    setIsProcessing(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setRequests((prev) =>
        prev.map((request) =>
          request.id === requestId
            ? {
                ...request,
                status: "approved",
                reviewDate: new Date().toISOString().split("T")[0],
                reviewedBy: "System Administrator",
                adminNotes: adminNotes || "Request approved by admin",
              }
            : request,
        ),
      );

      toast({
        title: "Request Approved",
        description:
          "The action request has been approved and will be processed.",
      });

      setSelectedRequest(null);
      setAdminNotes("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!adminNotes.trim()) {
      toast({
        title: "Rejection reason required",
        description: "Please provide a reason for rejecting this request.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setRequests((prev) =>
        prev.map((request) =>
          request.id === requestId
            ? {
                ...request,
                status: "rejected",
                reviewDate: new Date().toISOString().split("T")[0],
                reviewedBy: "System Administrator",
                adminNotes: adminNotes,
              }
            : request,
        ),
      );

      toast({
        title: "Request Rejected",
        description: "The action request has been rejected with feedback.",
      });

      setSelectedRequest(null);
      setAdminNotes("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const rejectedCount = requests.filter((r) => r.status === "rejected").length;

  return (
    <DashboardLayout title="Request Management">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Request Management
            </h2>
            <p className="text-gray-600">
              Review and manage employee action requests
            </p>
          </div>
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
                Approved
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
                Rejected
              </CardTitle>
              <X className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {rejectedCount}
              </div>
              <p className="text-xs text-gray-600">Declined requests</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by customer, employee, or reason..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
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
            <CardTitle>Action Requests</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop Table */}
            <div className="hidden lg:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Review Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {request.customerName}
                          </div>
                          {request.actionType === "plan_change" && (
                            <div className="text-sm text-gray-500">
                              {request.currentPlan} → {request.requestedPlan}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{request.employeeName}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(getActionTypeColor(request.actionType))}
                        >
                          {request.actionType.replace("_", " ").toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(request.requestDate)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(getStatusColor(request.status))}
                        >
                          {request.status.toUpperCase()}
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
                            onClick={() => handleViewRequest(request)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {request.status === "pending" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApproveRequest(request.id)}
                                className="text-green-600 hover:text-green-700"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewRequest(request)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-4 p-4">
              {filteredRequests.map((request) => (
                <Card key={request.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-lg">
                        {request.customerName}
                      </h3>
                      <p className="text-sm text-gray-500">
                        by {request.employeeName}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(getStatusColor(request.status))}
                    >
                      {request.status.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Action:</span>
                      <Badge
                        variant="outline"
                        className={cn(getActionTypeColor(request.actionType))}
                      >
                        {request.actionType.replace("_", " ").toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Requested:</span>
                      <span>{formatDate(request.requestDate)}</span>
                    </div>
                    {request.reviewDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Reviewed:</span>
                        <span>{formatDate(request.reviewDate)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewRequest(request)}
                      className="flex-1"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </Button>
                    {request.status === "pending" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApproveRequest(request.id)}
                          className="flex-1 text-green-600 hover:text-green-700"
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewRequest(request)}
                          className="flex-1 text-red-600 hover:text-red-700"
                        >
                          <X className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Request Detail Modal */}
        <Dialog
          open={!!selectedRequest}
          onOpenChange={() => setSelectedRequest(null)}
        >
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Review Action Request</DialogTitle>
              <DialogDescription>
                Review and respond to the employee action request
              </DialogDescription>
            </DialogHeader>

            {selectedRequest && (
              <div className="space-y-4">
                {/* Request Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">
                      Customer
                    </Label>
                    <p className="text-lg font-medium">
                      {selectedRequest.customerName}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">
                      Employee
                    </Label>
                    <p className="text-lg">{selectedRequest.employeeName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">
                      Action Type
                    </Label>
                    <div className="mt-1">
                      <Badge
                        variant="outline"
                        className={cn(
                          getActionTypeColor(selectedRequest.actionType),
                        )}
                      >
                        {selectedRequest.actionType
                          .replace("_", " ")
                          .toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">
                      Current Status
                    </Label>
                    <div className="mt-1">
                      <Badge
                        variant="outline"
                        className={cn(getStatusColor(selectedRequest.status))}
                      >
                        {selectedRequest.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>

                {selectedRequest.actionType === "plan_change" && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">
                      Plan Change
                    </Label>
                    <p className="text-lg">
                      {selectedRequest.currentPlan} →{" "}
                      {selectedRequest.requestedPlan}
                    </p>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Employee Reason
                  </Label>
                  <p className="text-sm mt-1 p-3 bg-gray-50 rounded-lg">
                    {selectedRequest.reason}
                  </p>
                </div>

                {selectedRequest.status === "pending" && (
                  <div>
                    <Label htmlFor="adminNotes">Admin Notes</Label>
                    <Textarea
                      id="adminNotes"
                      placeholder="Add notes for this decision..."
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                )}

                {selectedRequest.adminNotes && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">
                      Admin Notes
                    </Label>
                    <p className="text-sm mt-1 p-3 bg-gray-50 rounded-lg">
                      {selectedRequest.adminNotes}
                    </p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSelectedRequest(null)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              {selectedRequest?.status === "pending" && (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => handleRejectRequest(selectedRequest.id)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Processing..." : "Reject"}
                  </Button>
                  <Button
                    onClick={() => handleApproveRequest(selectedRequest.id)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Processing..." : "Approve"}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
