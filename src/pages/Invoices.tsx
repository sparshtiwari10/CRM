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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

interface PaymentModalData {
  customerId: string;
  customerName: string;
  outstandingAmount: number;
  bills: MonthlyBill[];
}

export default function Invoices() {
  const { user } = useContext(AuthContext) as { user: any };
  const { toast } = useToast();
  const [payments, setPayments] = useState<PaymentInvoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] =
    useState<PaymentModalData | null>(null);

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Summary stats
  const [summaryStats, setSummaryStats] = useState({
    todayCollection: 0,
    weekCollection: 0,
    monthCollection: 0,
    totalOutstanding: 0,
    totalCustomers: 0,
    collectionRate: 0,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [paymentsData, customersData] = await Promise.all([
        PaymentService.getAllPayments(),
        CustomerService.getAllCustomers(),
      ]);

      setPayments(paymentsData);
      setCustomers(customersData);

      // Calculate summary statistics
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      const todayCollection = paymentsData
        .filter((p) => new Date(p.paymentDate) >= today)
        .reduce((sum, p) => sum + p.amount, 0);

      const weekCollection = paymentsData
        .filter((p) => new Date(p.paymentDate) >= weekAgo)
        .reduce((sum, p) => sum + p.amount, 0);

      const monthCollection = paymentsData
        .filter((p) => new Date(p.paymentDate) >= monthAgo)
        .reduce((sum, p) => sum + p.amount, 0);

      const totalOutstanding = customersData.reduce(
        (sum, c) => sum + (c.currentOS || 0),
        0,
      );
      const totalBilled =
        customersData.reduce((sum, c) => sum + (c.currentOS || 0), 0) +
        paymentsData.reduce((sum, p) => sum + p.amount, 0);
      const collectionRate =
        totalBilled > 0
          ? (paymentsData.reduce((sum, p) => sum + p.amount, 0) / totalBilled) *
            100
          : 0;

      setSummaryStats({
        todayCollection,
        weekCollection,
        monthCollection,
        totalOutstanding,
        totalCustomers: customersData.length,
        collectionRate,
      });
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load payment data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCollectPayment = async (customer: Customer) => {
    try {
      // Get customer's outstanding bills
      const bills = await BillsService.getCustomerBills(customer.id);
      const unpaidBills = bills.filter((bill) => bill.status !== "paid");

      setSelectedCustomer({
        customerId: customer.id,
        customerName: customer.name,
        outstandingAmount: customer.currentOS || 0,
        bills: unpaidBills,
      });
      setShowPaymentModal(true);
      setPaymentAmount(String(customer.currentOS || 0));
    } catch (error) {
      console.error("Error loading customer bills:", error);
      toast({
        title: "Error",
        description: "Failed to load customer bill details",
        variant: "destructive",
      });
    }
  };

  const handleSubmitPayment = async () => {
    if (!selectedCustomer || !paymentAmount) return;

    try {
      setSubmitting(true);

      const amount = parseFloat(paymentAmount);
      if (amount <= 0) {
        toast({
          title: "Invalid Amount",
          description: "Payment amount must be greater than 0",
          variant: "destructive",
        });
        return;
      }

      if (amount > selectedCustomer.outstandingAmount) {
        toast({
          title: "Invalid Amount",
          description: "Payment amount cannot exceed outstanding balance",
          variant: "destructive",
        });
        return;
      }

      // Create payment record
      await PaymentService.createPayment({
        customerId: selectedCustomer.customerId,
        amount,
        paymentMethod,
        notes: paymentNotes,
        collectedBy: user?.email || "",
        appliedToBills: selectedCustomer.bills.map((bill) => ({
          billId: bill.id,
          amount: Math.min(amount, bill.dueAmount),
        })),
      });

      toast({
        title: "Payment Recorded",
        description: `Payment of ₹${amount} recorded successfully`,
      });

      // Reset form and reload data
      setShowPaymentModal(false);
      setSelectedCustomer(null);
      setPaymentAmount("");
      setPaymentMethod("cash");
      setPaymentNotes("");
      loadData();
    } catch (error) {
      console.error("Error recording payment:", error);
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Filter functions
  const getFilteredPayments = () => {
    let filtered = payments;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (payment) =>
          payment.customerName
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          payment.receiptNumber
            .toLowerCase()
            .includes(searchTerm.toLowerCase()),
      );
    }

    // Apply period filter
    const now = new Date();
    if (filterPeriod === "today") {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filtered = filtered.filter(
        (payment) => new Date(payment.paymentDate) >= today,
      );
    } else if (filterPeriod === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(
        (payment) => new Date(payment.paymentDate) >= weekAgo,
      );
    } else if (filterPeriod === "month") {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(
        (payment) => new Date(payment.paymentDate) >= monthAgo,
      );
    }

    return filtered.sort(
      (a, b) =>
        new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime(),
    );
  };

  const getCustomersWithOutstanding = () => {
    return customers
      .filter((customer) => (customer.currentOS || 0) > 0)
      .filter(
        (customer) =>
          searchTerm === "" ||
          customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.phoneNumber.includes(searchTerm),
      )
      .sort((a, b) => (b.currentOS || 0) - (a.currentOS || 0));
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-muted-foreground">
              Loading invoice data...
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Invoices</h1>
            <p className="text-muted-foreground">
              Manage payment collection and customer invoices
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Today's Collection
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{summaryStats.todayCollection.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{summaryStats.monthCollection.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Outstanding
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                ₹{summaryStats.totalOutstanding.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Collection Rate
              </CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summaryStats.collectionRate.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="collect" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="collect">Payment Collection</TabsTrigger>
            <TabsTrigger value="history">Payment History</TabsTrigger>
          </TabsList>

          {/* Payment Collection Tab */}
          <TabsContent value="collect" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Customers with Outstanding Amounts</CardTitle>
                <CardDescription>
                  Collect payments from customers with pending dues
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Search */}
                <div className="flex items-center space-x-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search customers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Outstanding Customers Table */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Outstanding Amount</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getCustomersWithOutstanding().map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{customer.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {customer.area}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{customer.phoneNumber}</TableCell>
                          <TableCell>
                            <span className="font-medium text-red-600">
                              ₹{(customer.currentOS || 0).toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => handleCollectPayment(customer)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Receipt className="h-4 w-4 mr-2" />
                              Collect Payment
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {getCustomersWithOutstanding().length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      {searchTerm
                        ? "No customers found matching your search"
                        : "No customers with outstanding amounts"}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>View all payment transactions</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex items-center space-x-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search payments..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Payments</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Payments Table */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Receipt No.</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Collected By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredPayments().map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-mono">
                            {payment.receiptNumber}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {payment.customerName}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-green-600">
                              ₹{payment.amount.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {payment.paymentMethod}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(payment.paymentDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {payment.collectedBy}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {getFilteredPayments().length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No payments found matching your criteria
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Payment Collection Modal */}
        <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Collect Payment</DialogTitle>
              <DialogDescription>
                Record payment for {selectedCustomer?.customerName}
              </DialogDescription>
            </DialogHeader>

            {selectedCustomer && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Customer:</span>
                    <div className="font-medium">
                      {selectedCustomer.customerName}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Outstanding:</span>
                    <div className="font-medium text-red-600">
                      ₹{selectedCustomer.outstandingAmount.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Payment Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="Enter amount"
                      min="0"
                      max={selectedCustomer.outstandingAmount}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="method">Payment Method</Label>
                    <Select
                      value={paymentMethod}
                      onValueChange={setPaymentMethod}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="bank_transfer">
                          Bank Transfer
                        </SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Add any notes about this payment..."
                    rows={3}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowPaymentModal(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitPayment}
                disabled={submitting || !paymentAmount}
                className="bg-green-600 hover:bg-green-700"
              >
                {submitting ? "Recording..." : "Record Payment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
