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
import { CustomerSearchSelector } from "@/components/customers/CustomerSearchSelector";
import { PaymentInvoice, MonthlyBill, Customer } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface InvoiceFormData {
  customerId: string;
  customerName: string;
  billId?: string;
  amountPaid: number;
  paymentMethod: "cash" | "online" | "cheque" | "bank_transfer";
  notes?: string;
}

const initialInvoiceData: InvoiceFormData = {
  customerId: "",
  customerName: "",
  billId: "no-bill",
  amountPaid: 0,
  paymentMethod: "cash",
  notes: "",
};

export default function Invoices() {
  const { user } = useContext(AuthContext) as { user: any };
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<PaymentInvoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bills, setBills] = useState<MonthlyBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceForm, setInvoiceForm] =
    useState<InvoiceFormData>(initialInvoiceData);
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

      console.log("🔍 Loading invoice data...");

      const [invoicesData, customersData, billsData] = await Promise.all([
        PaymentService.getAllPayments().catch((error) => {
          console.error("Failed to get invoices:", error);
          return [];
        }),
        CustomerService.getAllCustomers().catch((error) => {
          console.error("Failed to get customers:", error);
          return [];
        }),
        BillsService.getAllBills().catch((error) => {
          console.error("Failed to get bills:", error);
          return [];
        }),
      ]);

      setInvoices(invoicesData);
      setCustomers(customersData);
      setBills(billsData);

      // Calculate summary statistics
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      const todayCollection = invoicesData
        .filter((invoice) => {
          const invoiceDate = new Date(invoice.paymentDate || invoice.paidAt);
          return invoiceDate >= today;
        })
        .reduce(
          (sum, invoice) => sum + (invoice.amount || invoice.amountPaid || 0),
          0,
        );

      const weekCollection = invoicesData
        .filter((invoice) => {
          const invoiceDate = new Date(invoice.paymentDate || invoice.paidAt);
          return invoiceDate >= weekAgo;
        })
        .reduce(
          (sum, invoice) => sum + (invoice.amount || invoice.amountPaid || 0),
          0,
        );

      const monthCollection = invoicesData
        .filter((invoice) => {
          const invoiceDate = new Date(invoice.paymentDate || invoice.paidAt);
          return invoiceDate >= monthAgo;
        })
        .reduce(
          (sum, invoice) => sum + (invoice.amount || invoice.amountPaid || 0),
          0,
        );

      const totalOutstanding = customersData.reduce(
        (sum, c) => sum + (c.currentOS || 0),
        0,
      );
      const totalBilled =
        customersData.reduce((sum, c) => sum + (c.currentOS || 0), 0) +
        invoicesData.reduce(
          (sum, invoice) => sum + (invoice.amount || invoice.amountPaid || 0),
          0,
        );
      const collectionRate =
        totalBilled > 0
          ? (invoicesData.reduce(
              (sum, invoice) =>
                sum + (invoice.amount || invoice.amountPaid || 0),
              0,
            ) /
              totalBilled) *
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
        description: "Failed to load invoice data. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateInvoice = async () => {
    try {
      setSubmitting(true);

      // Validation
      if (
        !invoiceForm.customerId ||
        !invoiceForm.amountPaid ||
        invoiceForm.amountPaid <= 0
      ) {
        toast({
          title: "Validation Error",
          description:
            "Please select a customer and enter a valid payment amount",
          variant: "destructive",
        });
        return;
      }

      const customer = customers.find((c) => c.id === invoiceForm.customerId);
      if (!customer) {
        toast({
          title: "Error",
          description: "Selected customer not found",
          variant: "destructive",
        });
        return;
      }

      // Create invoice data (remove undefined fields)
      const invoiceData: any = {
        customerId: invoiceForm.customerId,
        customerName: customer.name,
        customerArea: customer.collectorName || customer.area || "Unknown",
        amount: invoiceForm.amountPaid,
        amountPaid: invoiceForm.amountPaid,
        paymentMethod: invoiceForm.paymentMethod,
        paymentDate: new Date().toISOString(),
        paidAt: new Date(),
        collectedBy: user?.uid || user?.email || "Unknown",
        notes: invoiceForm.notes || "",
      };

      // Only add billId if it's not "no-bill" to avoid undefined fields
      if (invoiceForm.billId && invoiceForm.billId !== "no-bill") {
        invoiceData.billId = invoiceForm.billId;
      }

      // Add additional required fields
      invoiceData.receiptNumber = `RCP-${Date.now()}`;
      invoiceData.createdAt = new Date();

      console.log("Creating invoice with data:", invoiceData);

      // Create the invoice
      const invoiceId = await PaymentService.createPayment(invoiceData);
      console.log("Invoice created with ID:", invoiceId);

      // Update customer's outstanding amount
      const newCurrentOS = Math.max(
        0,
        (customer.currentOS || 0) - invoiceForm.amountPaid,
      );

      await CustomerService.updateCustomer(customer.id, {
        previousOS: customer.currentOS || 0,
        currentOS: newCurrentOS,
      });

      console.log("Customer outstanding updated:", {
        customerId: customer.id,
        previousOS: customer.currentOS || 0,
        newCurrentOS,
      });

      toast({
        title: "Invoice Created",
        description: `Payment of ₹${invoiceForm.amountPaid} recorded for ${customer.name}`,
      });

      // Reset form and reload data
      setInvoiceForm(initialInvoiceData);
      setShowInvoiceModal(false);
      loadData();
    } catch (error) {
      console.error("Error creating invoice:", error);
      toast({
        title: "Error",
        description: `Failed to create invoice: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCustomerSelect = (customerId: string, customer: Customer) => {
    setInvoiceForm((prev) => ({
      ...prev,
      customerId,
      customerName: customer.name,
      // Auto-fill amount with customer's outstanding if available
      amountPaid: customer.currentOS || 0,
    }));
  };

  // Filter functions
  const getFilteredInvoices = () => {
    let filtered = invoices;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (invoice) =>
          invoice.customerName
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (invoice.receiptNumber &&
            invoice.receiptNumber
              .toLowerCase()
              .includes(searchTerm.toLowerCase())),
      );
    }

    // Apply period filter
    const now = new Date();
    if (filterPeriod === "today") {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filtered = filtered.filter((invoice) => {
        const invoiceDate = new Date(invoice.paymentDate || invoice.paidAt);
        return invoiceDate >= today;
      });
    } else if (filterPeriod === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter((invoice) => {
        const invoiceDate = new Date(invoice.paymentDate || invoice.paidAt);
        return invoiceDate >= weekAgo;
      });
    } else if (filterPeriod === "month") {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter((invoice) => {
        const invoiceDate = new Date(invoice.paymentDate || invoice.paidAt);
        return invoiceDate >= monthAgo;
      });
    }

    return filtered.sort((a, b) => {
      const dateA = new Date(a.paymentDate || a.paidAt);
      const dateB = new Date(b.paymentDate || b.paidAt);
      return dateB.getTime() - dateA.getTime();
    });
  };

  const getCustomersWithOutstanding = () => {
    return customers
      .filter((customer) => (customer.currentOS || 0) > 0)
      .filter(
        (customer) =>
          searchTerm === "" ||
          customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.phoneNumber.includes(searchTerm) ||
          customer.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.vcNumber?.toLowerCase().includes(searchTerm.toLowerCase()),
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
          <Button
            onClick={() => setShowInvoiceModal(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
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
        <Tabs defaultValue="history" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="history">Invoice History</TabsTrigger>
            <TabsTrigger value="collect">Outstanding Collection</TabsTrigger>
          </TabsList>

          {/* Invoice History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Invoice History</CardTitle>
                <CardDescription>
                  View all payment transactions and invoices
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex items-center space-x-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search invoices..."
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
                      <SelectItem value="all">All Invoices</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Invoices Table */}
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
                        <TableHead className="w-16">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredInvoices().map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-mono">
                            {invoice.receiptNumber ||
                              `INV-${invoice.id.slice(-6)}`}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {invoice.customerName}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-green-600">
                              ₹
                              {(
                                invoice.amount ||
                                invoice.amountPaid ||
                                0
                              ).toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {invoice.paymentMethod}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(
                              invoice.paymentDate || invoice.paidAt,
                            ).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {invoice.collectedBy}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {getFilteredInvoices().length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No invoices found matching your criteria
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Outstanding Collection Tab */}
          <TabsContent value="collect" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Customers with Outstanding Amounts</CardTitle>
                <CardDescription>
                  Quick payment collection for customers with pending dues
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
                                {customer.collectorName || customer.area}
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
                              onClick={() => {
                                setInvoiceForm({
                                  ...initialInvoiceData,
                                  customerId: customer.id,
                                  customerName: customer.name,
                                  amountPaid: customer.currentOS || 0,
                                });
                                setShowInvoiceModal(true);
                              }}
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
        </Tabs>

        {/* Create Invoice Modal */}
        <Dialog open={showInvoiceModal} onOpenChange={setShowInvoiceModal}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Invoice</DialogTitle>
              <DialogDescription>
                Record a payment and create an invoice
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer">Customer *</Label>
                <CustomerSearchSelector
                  customers={customers}
                  selectedCustomerId={invoiceForm.customerId}
                  onCustomerSelect={handleCustomerSelect}
                  placeholder="Search by name, address, or VC number..."
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bill">Link to Bill (Optional)</Label>
                <Select
                  value={invoiceForm.billId || "no-bill"}
                  onValueChange={(value) =>
                    setInvoiceForm((prev) => ({
                      ...prev,
                      billId: value === "no-bill" ? "" : value,
                    }))
                  }
                  disabled={submitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select bill (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-bill">No specific bill</SelectItem>
                    {bills
                      .filter(
                        (bill) => bill.customerId === invoiceForm.customerId,
                      )
                      .map((bill) => (
                        <SelectItem key={bill.id} value={bill.id}>
                          {bill.month} - ₹{bill.totalAmount.toLocaleString()}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount Paid *</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={invoiceForm.amountPaid}
                    onChange={(e) =>
                      setInvoiceForm((prev) => ({
                        ...prev,
                        amountPaid: parseFloat(e.target.value) || 0,
                      }))
                    }
                    placeholder="Enter amount"
                    min="0"
                    step="0.01"
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="method">Payment Method *</Label>
                  <Select
                    value={invoiceForm.paymentMethod}
                    onValueChange={(
                      value: "cash" | "online" | "cheque" | "bank_transfer",
                    ) =>
                      setInvoiceForm((prev) => ({
                        ...prev,
                        paymentMethod: value,
                      }))
                    }
                    disabled={submitting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="online">Online/UPI</SelectItem>
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
                  value={invoiceForm.notes}
                  onChange={(e) =>
                    setInvoiceForm((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  placeholder="Add any notes about this payment..."
                  rows={3}
                  disabled={submitting}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowInvoiceModal(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateInvoice}
                disabled={
                  submitting ||
                  !invoiceForm.customerId ||
                  invoiceForm.amountPaid <= 0
                }
                className="bg-green-600 hover:bg-green-700"
              >
                {submitting ? "Creating..." : "Create Invoice"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
