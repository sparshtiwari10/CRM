import React, { useState, useEffect, useContext } from "react";
import {
  Plus,
  Calendar,
  FileText,
  Download,
  Eye,
  Filter,
  Search,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { AuthContext } from "@/contexts/AuthContext";
import { BillsService } from "@/services/billsService";
import { MonthlyBill } from "@/types";
import { useToast } from "@/hooks/use-toast";

export default function Bills() {
  const [bills, setBills] = useState<MonthlyBill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
  const [selectedBill, setSelectedBill] = useState<MonthlyBill | null>(null);

  // Generation data
  const [generateMonth, setGenerateMonth] = useState("");
  const [dueDays, setDueDays] = useState(15);
  const [isGenerating, setIsGenerating] = useState(false);

  const { user, isAdmin } = useContext(AuthContext);
  const { toast } = useToast();

  // Load bills on component mount
  useEffect(() => {
    loadBills();
  }, []);

  const loadBills = async () => {
    try {
      setIsLoading(true);
      const billsData = await BillsService.getAllBills();
      setBills(billsData);
    } catch (error) {
      console.error("Failed to load bills:", error);
      toast({
        title: "Error",
        description: "Failed to load bills data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get current month for default generation
  const getCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    return `${year}-${month}`;
  };

  // Filter bills based on search and filters
  const filteredBills = bills.filter((bill) => {
    const matchesSearch =
      !searchTerm ||
      bill.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.month.includes(searchTerm);

    const matchesMonth = monthFilter === "all" || bill.month === monthFilter;
    const matchesStatus =
      statusFilter === "all" || bill.status === statusFilter;

    return matchesSearch && matchesMonth && matchesStatus;
  });

  // Get unique months for filter
  const availableMonths = Array.from(new Set(bills.map((bill) => bill.month)))
    .sort()
    .reverse();

  const handleGenerateBills = () => {
    setGenerateMonth(getCurrentMonth());
    setShowGenerateModal(true);
  };

  const handleConfirmGeneration = () => {
    setShowGenerateModal(false);
    setShowGenerateConfirm(true);
  };

  const handleExecuteGeneration = async () => {
    try {
      setIsGenerating(true);
      setShowGenerateConfirm(false);

      console.log(`🔄 Starting bill generation for ${generateMonth}`);

      const result = await BillsService.generateMonthlyBills(
        generateMonth,
        dueDays,
      );

      console.log("✅ Bill generation completed:", result);

      await loadBills();

      toast({
        title: "Bills Generated Successfully",
        description: `Generated ${result.summary.billsGenerated} bills for ${result.summary.totalCustomers} customers. Total amount: ₹${result.summary.totalAmount.toLocaleString()}`,
      });

      if (result.failed.length > 0) {
        console.warn("Some bills failed to generate:", result.failed);
        toast({
          title: "Some Bills Failed",
          description: `${result.failed.length} bills failed to generate. Check console for details.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to generate bills:", error);
      toast({
        title: "Generation Failed",
        description:
          error instanceof Error ? error.message : "Failed to generate bills",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleViewBill = (bill: MonthlyBill) => {
    setSelectedBill(bill);
    setShowViewModal(true);
  };

  const getBillingSummary = () => {
    const totalBills = filteredBills.length;
    const totalAmount = filteredBills.reduce(
      (sum, bill) => sum + bill.totalAmount,
      0,
    );
    const paidBills = filteredBills.filter(
      (bill) => bill.status === "paid",
    ).length;
    const paidAmount = filteredBills
      .filter((bill) => bill.status === "paid")
      .reduce((sum, bill) => sum + bill.totalAmount, 0);
    const pendingAmount = totalAmount - paidAmount;

    return {
      totalBills,
      totalAmount,
      paidBills,
      paidAmount,
      pendingBills: totalBills - paidBills,
      pendingAmount,
    };
  };

  const summary = getBillingSummary();

  if (isLoading) {
    return (
      <DashboardLayout title="Bills">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Bills">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Monthly Bills
            </h2>
            <p className="text-muted-foreground">
              Generate and manage monthly customer bills
            </p>
          </div>
          {isAdmin && (
            <Button onClick={handleGenerateBills}>
              <Plus className="mr-2 h-4 w-4" />
              Generate Bills
            </Button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Bills
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalBills}</div>
              <p className="text-xs text-muted-foreground">Current filter</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Amount
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{summary.totalAmount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                All filtered bills
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Paid Bills
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {summary.paidBills}
              </div>
              <p className="text-xs text-muted-foreground">
                ₹{summary.paidAmount.toLocaleString()} collected
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Amount
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                ₹{summary.pendingAmount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {summary.pendingBills} bills pending
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by customer name or month..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {availableMonths.map((month) => (
                    <SelectItem key={month} value={month}>
                      {new Date(month + "-01").toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="generated">Generated</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>

              {(searchTerm ||
                monthFilter !== "all" ||
                statusFilter !== "all") && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setMonthFilter("all");
                    setStatusFilter("all");
                  }}
                  className="px-3"
                >
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bills Table */}
        <Card>
          <CardContent className="p-6">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead>VCs</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Generated</TableHead>
                    <TableHead className="w-16">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBills.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="text-muted-foreground">
                          {bills.length === 0
                            ? "No bills generated yet"
                            : "No bills match the current filters"}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBills.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell>
                          <div className="font-medium">{bill.customerName}</div>
                        </TableCell>
                        <TableCell>
                          {new Date(bill.month + "-01").toLocaleDateString(
                            "en-US",
                            { year: "numeric", month: "long" },
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {bill.vcBreakdown.slice(0, 2).map((vc, index) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="text-xs"
                              >
                                {vc.vcNumber}
                              </Badge>
                            ))}
                            {bill.vcBreakdown.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{bill.vcBreakdown.length - 2} more
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ₹{bill.totalAmount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              bill.status === "paid"
                                ? "default"
                                : bill.status === "partial"
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {bill.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(bill.billDueDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {new Date(bill.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewBill(bill)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Generate Bills Modal */}
        <Dialog open={showGenerateModal} onOpenChange={setShowGenerateModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Generate Monthly Bills</DialogTitle>
              <DialogDescription>
                Generate bills for all customers with active VC numbers
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="month">Billing Month</Label>
                <Input
                  id="month"
                  type="month"
                  value={generateMonth}
                  onChange={(e) => setGenerateMonth(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="dueDays">Due Days</Label>
                <Input
                  id="dueDays"
                  type="number"
                  min="1"
                  max="31"
                  value={dueDays}
                  onChange={(e) => setDueDays(parseInt(e.target.value) || 15)}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Number of days from generation to due date
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowGenerateModal(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleConfirmGeneration}>Continue</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Generation Confirmation */}
        <AlertDialog
          open={showGenerateConfirm}
          onOpenChange={setShowGenerateConfirm}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Bill Generation</AlertDialogTitle>
              <AlertDialogDescription>
                This will generate bills for all customers for {generateMonth}.
                Bills will be due {dueDays} days from generation date.
                <br />
                <br />
                <strong>Note:</strong> This process cannot be undone. Are you
                sure you want to continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowGenerateConfirm(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleExecuteGeneration}
                disabled={isGenerating}
              >
                {isGenerating ? "Generating..." : "Generate Bills"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* View Bill Modal */}
        <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Bill Details</DialogTitle>
              <DialogDescription>
                Complete bill information and VC breakdown
              </DialogDescription>
            </DialogHeader>
            {selectedBill && (
              <div className="space-y-6">
                {/* Bill Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Customer Information</h4>
                    <div className="space-y-1 text-sm">
                      <div>
                        <strong>Name:</strong> {selectedBill.customerName}
                      </div>
                      <div>
                        <strong>Bill ID:</strong> {selectedBill.id}
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Billing Information</h4>
                    <div className="space-y-1 text-sm">
                      <div>
                        <strong>Month:</strong>{" "}
                        {new Date(
                          selectedBill.month + "-01",
                        ).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                        })}
                      </div>
                      <div>
                        <strong>Due Date:</strong>{" "}
                        {new Date(
                          selectedBill.billDueDate,
                        ).toLocaleDateString()}
                      </div>
                      <div>
                        <strong>Status:</strong>{" "}
                        <Badge
                          variant={
                            selectedBill.status === "paid"
                              ? "default"
                              : selectedBill.status === "partial"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {selectedBill.status}
                        </Badge>
                      </div>
                      <div>
                        <strong>Total Amount:</strong> ₹
                        {selectedBill.totalAmount.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* VC Breakdown */}
                <div>
                  <h4 className="font-semibold mb-3">VC Breakdown</h4>
                  <div className="space-y-2">
                    {selectedBill.vcBreakdown.map((vc, index) => (
                      <div
                        key={index}
                        className="border rounded p-3 flex justify-between items-center"
                      >
                        <div>
                          <div className="font-medium">{vc.vcNumber}</div>
                          <div className="text-sm text-muted-foreground">
                            {vc.packageName}
                          </div>
                        </div>
                        <div className="font-medium">
                          ₹{vc.amount.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-3 mt-3 flex justify-between items-center font-semibold">
                    <span>Total Amount</span>
                    <span>₹{selectedBill.totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                {/* Bill Dates */}
                <div>
                  <h4 className="font-semibold mb-3">Important Dates</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Generated:</strong>{" "}
                      {new Date(selectedBill.createdAt).toLocaleString()}
                    </div>
                    <div>
                      <strong>Due Date:</strong>{" "}
                      {new Date(selectedBill.billDueDate).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setShowViewModal(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
