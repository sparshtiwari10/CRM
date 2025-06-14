import React, { useState, useEffect, useContext } from "react";
import {
  Plus,
  DollarSign,
  Receipt,
  Eye,
  Search,
  Calendar,
  CreditCard,
  TrendingUp,
  FileText,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuthContext } from "@/contexts/AuthContext";
import { PaymentService } from "@/services/paymentService";
import { BillsService } from "@/services/billsService";
import { CustomerService } from "@/services/customerService";
import { PaymentInvoice, MonthlyBill, Customer } from "@/types";
import { useToast } from "@/hooks/use-toast";

export default function BillingPayments() {
  const [payments, setPayments] = useState<PaymentInvoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bills, setBills] = useState<MonthlyBill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");

  // Payment Collection Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [selectedBill, setSelectedBill] = useState<MonthlyBill | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "online" | "bank_transfer" | "cheque"
  >("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // View Modal
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentInvoice | null>(
    null,
  );

  const { user, isAdmin } = useContext(AuthContext);
  const { toast } = useToast();

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [paymentsData, customersData, billsData] = await Promise.all([
        PaymentService.getAllPayments(),
        CustomerService.getAllCustomers(),
        BillsService.getAllBills(),
      ]);

      setPayments(paymentsData);
      setCustomers(customersData);
      setBills(billsData);
    } catch (error) {
      console.error("Failed to load billing data:", error);
      toast({
        title: "Error",
        description: "Failed to load billing data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter payments based on search and filters
  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      !searchTerm ||
      payment.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.receiptNumber?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDate =
      dateFilter === "all" ||
      (() => {
        const paymentDate = new Date(payment.paidAt);
        const today = new Date();

        switch (dateFilter) {
          case "today":
            return paymentDate.toDateString() === today.toDateString();
          case "week":
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            return paymentDate >= weekAgo;
          case "month":
            const monthAgo = new Date(
              today.getTime() - 30 * 24 * 60 * 60 * 1000,
            );
            return paymentDate >= monthAgo;
          default:
            return true;
        }
      })();

    const matchesMethod =
      methodFilter === "all" || payment.paymentMethod === methodFilter;

    return matchesSearch && matchesDate && matchesMethod;
  });

  const handleCollectPayment = (customer?: Customer, bill?: MonthlyBill) => {
    setSelectedCustomer(customer || null);
    setSelectedBill(bill || null);
    setPaymentAmount(bill?.totalAmount.toString() || "");
    setPaymentMethod("cash");
    setPaymentNotes("");
    setShowPaymentModal(true);
  };

  const handleProcessPayment = async () => {
    try {
      if (
        !selectedCustomer ||
        !paymentAmount ||
        parseFloat(paymentAmount) <= 0
      ) {
        toast({
          title: "Validation Error",
          description: "Please select a customer and enter a valid amount",
          variant: "destructive",
        });
        return;
      }

      setIsProcessing(true);

      const paymentData: Omit<PaymentInvoice, "id" | "createdAt"> = {
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        billId: selectedBill?.id,
        billMonth: selectedBill?.month,
        amountPaid: parseFloat(paymentAmount),
        paymentMethod,
        paidAt: new Date(),
        collectedBy: user?.name || "Unknown",
        notes: paymentNotes || undefined,
      };

      const payment = await PaymentService.collectPayment(paymentData);

      await loadData(); // Refresh all data
      setShowPaymentModal(false);

      toast({
        title: "Payment Collected",
        description: `₹${paymentAmount} collected from ${selectedCustomer.name}. Receipt: ${payment.receiptNumber}`,
      });
    } catch (error) {
      console.error("Failed to process payment:", error);
      toast({
        title: "Error",
        description: "Failed to process payment",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewPayment = (payment: PaymentInvoice) => {
    setSelectedPayment(payment);
    setShowViewModal(true);
  };

  const getPaymentSummary = () => {
    const totalPayments = filteredPayments.length;
    const totalAmount = filteredPayments.reduce(
      (sum, payment) => sum + payment.amountPaid,
      0,
    );

    const today = new Date();
    const todayPayments = filteredPayments.filter(
      (payment) =>
        new Date(payment.paidAt).toDateString() === today.toDateString(),
    );
    const todayAmount = todayPayments.reduce(
      (sum, payment) => sum + payment.amountPaid,
      0,
    );

    const methodBreakdown = filteredPayments.reduce(
      (acc, payment) => {
        const method = payment.paymentMethod;
        acc[method] = (acc[method] || 0) + payment.amountPaid;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalPayments,
      totalAmount,
      todayPayments: todayPayments.length,
      todayAmount,
      methodBreakdown,
    };
  };

  const getOutstandingSummary = () => {
    const totalBills = bills.length;
    const totalBillAmount = bills.reduce(
      (sum, bill) => sum + bill.totalAmount,
      0,
    );
    const totalCollected = payments.reduce(
      (sum, payment) => sum + payment.amountPaid,
      0,
    );
    const totalOutstanding = totalBillAmount - totalCollected;

    const pendingBills = bills.filter((bill) => bill.status !== "paid");
    const pendingAmount = pendingBills.reduce(
      (sum, bill) => sum + bill.totalAmount,
      0,
    );

    return {
      totalBills,
      totalBillAmount,
      totalCollected,
      totalOutstanding,
      pendingBills: pendingBills.length,
      pendingAmount,
    };
  };

  const paymentSummary = getPaymentSummary();
  const outstandingSummary = getOutstandingSummary();

  if (isLoading) {
    return (
      <DashboardLayout title="Billing & Payments">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Billing & Payments">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Billing & Payments
            </h2>
            <p className="text-muted-foreground">
              Collect payments and manage billing records
            </p>
          </div>
          <Button onClick={() => handleCollectPayment()}>
            <Plus className="mr-2 h-4 w-4" />
            Collect Payment
          </Button>
        </div>

        {/* Summary Tabs */}
        <Tabs defaultValue="payments" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="payments">Payment Summary</TabsTrigger>
            <TabsTrigger value="outstanding">Outstanding Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="payments" className="space-y-6">
            {/* Payment Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Collections
                  </CardTitle>
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ₹{paymentSummary.totalAmount.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {paymentSummary.totalPayments} payments
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Today's Collections
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    ₹{paymentSummary.todayAmount.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {paymentSummary.todayPayments} payments today
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Cash Collections
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ₹
                    {(
                      paymentSummary.methodBreakdown.cash || 0
                    ).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">Cash payments</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Online Collections
                  </CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ₹
                    {(
                      paymentSummary.methodBreakdown.online || 0
                    ).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Online payments
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="outstanding" className="space-y-6">
            {/* Outstanding Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Bills
                  </CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ₹{outstandingSummary.totalBillAmount.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {outstandingSummary.totalBills} bills generated
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Collected
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    ₹{outstandingSummary.totalCollected.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(
                      (outstandingSummary.totalCollected /
                        outstandingSummary.totalBillAmount) *
                      100
                    ).toFixed(1)}
                    % collected
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Outstanding Amount
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    ₹
                    {Math.max(
                      0,
                      outstandingSummary.totalOutstanding,
                    ).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {outstandingSummary.pendingBills} pending bills
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Collection Rate
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(
                      (outstandingSummary.totalCollected /
                        outstandingSummary.totalBillAmount) *
                      100
                    ).toFixed(1)}
                    %
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Overall collection rate
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by customer name or receipt number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>

              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>

              {(searchTerm ||
                dateFilter !== "all" ||
                methodFilter !== "all") && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setDateFilter("all");
                    setMethodFilter("all");
                  }}
                  className="px-3"
                >
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payments Table */}
        <Card>
          <CardContent className="p-6">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Collected By</TableHead>
                    <TableHead>Bill Month</TableHead>
                    <TableHead className="w-16">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="text-muted-foreground">
                          {payments.length === 0
                            ? "No payments collected yet"
                            : "No payments match the current filters"}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono text-sm">
                          {payment.receiptNumber}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {payment.customerName}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          ₹{payment.amountPaid.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {PaymentService.getPaymentMethodDisplayName(
                              payment.paymentMethod,
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(payment.paidAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{payment.collectedBy}</TableCell>
                        <TableCell>
                          {payment.billMonth
                            ? new Date(
                                payment.billMonth + "-01",
                              ).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                              })
                            : "General"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewPayment(payment)}
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

        {/* Collect Payment Modal */}
        <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Collect Payment</DialogTitle>
              <DialogDescription>
                Record a payment from a customer
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="customer">Customer</Label>
                <Select
                  value={selectedCustomer?.id || ""}
                  onValueChange={(value) => {
                    const customer = customers.find((c) => c.id === value);
                    setSelectedCustomer(customer || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} - {customer.phoneNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                />
              </div>
              <div>
                <Label htmlFor="method">Payment Method</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(value: any) => setPaymentMethod(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Additional notes about the payment"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowPaymentModal(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleProcessPayment} disabled={isProcessing}>
                {isProcessing ? "Processing..." : "Collect Payment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Payment Modal */}
        <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Payment Details</DialogTitle>
              <DialogDescription>
                Complete payment information
              </DialogDescription>
            </DialogHeader>
            {selectedPayment && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Receipt Number:</strong>
                    <br />
                    <span className="font-mono">
                      {selectedPayment.receiptNumber}
                    </span>
                  </div>
                  <div>
                    <strong>Customer:</strong>
                    <br />
                    {selectedPayment.customerName}
                  </div>
                  <div>
                    <strong>Amount:</strong>
                    <br />₹{selectedPayment.amountPaid.toLocaleString()}
                  </div>
                  <div>
                    <strong>Method:</strong>
                    <br />
                    {PaymentService.getPaymentMethodDisplayName(
                      selectedPayment.paymentMethod,
                    )}
                  </div>
                  <div>
                    <strong>Date:</strong>
                    <br />
                    {new Date(selectedPayment.paidAt).toLocaleString()}
                  </div>
                  <div>
                    <strong>Collected By:</strong>
                    <br />
                    {selectedPayment.collectedBy}
                  </div>
                </div>
                {selectedPayment.billMonth && (
                  <div className="text-sm">
                    <strong>Bill Month:</strong>
                    <br />
                    {new Date(
                      selectedPayment.billMonth + "-01",
                    ).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                    })}
                  </div>
                )}
                {selectedPayment.notes && (
                  <div className="text-sm">
                    <strong>Notes:</strong>
                    <br />
                    {selectedPayment.notes}
                  </div>
                )}
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
