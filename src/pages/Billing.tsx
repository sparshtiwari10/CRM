import { useState, useEffect, useContext } from "react";
import {
  FileText,
  Download,
  Eye,
  DollarSign,
  Calendar,
  AlertCircle,
  User,
  Plus,
  CreditCard,
  TrendingUp,
  CheckCircle,
} from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvoiceGenerator } from "@/components/invoice/InvoiceGenerator";
import { CustomerService } from "@/services/customerService";
import { AuthContext } from "@/contexts/AuthContext";
import { mockPayments } from "@/data/mockData";
import { BillingRecord, Payment } from "@/types";
import { cn } from "@/lib/utils";

export default function Billing() {
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [payments] = useState<Payment[]>(mockPayments);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentSearchTerm, setPaymentSearchTerm] = useState("");
  const [showInvoiceGenerator, setShowInvoiceGenerator] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("billing");
  const { user, isAdmin } = useContext(AuthContext);

  // Load billing records
  useEffect(() => {
    const loadBillingRecords = async () => {
      setIsLoading(true);
      try {
        const records = await CustomerService.getAllBillingRecords();
        setBillingRecords(records);
      } catch (error) {
        console.error("Error loading billing records:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBillingRecords();
  }, []);

  // Refresh billing records when invoice generator closes
  const handleInvoiceGeneratorClose = async (open: boolean) => {
    setShowInvoiceGenerator(open);
    if (!open) {
      // Refresh billing records
      const records = await CustomerService.getAllBillingRecords();
      setBillingRecords(records);
    }
  };

  // Filter billing records
  const filteredBillingRecords = billingRecords.filter((record) => {
    const matchesSearch =
      record.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.vcNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      !statusFilter || statusFilter === "all" || record.status === statusFilter;
    const matchesEmployee =
      !employeeFilter ||
      employeeFilter === "all" ||
      record.employeeId === employeeFilter;

    // For employees, only show their own records
    const hasAccess = isAdmin || record.employeeId === user?.id;

    return matchesSearch && matchesStatus && matchesEmployee && hasAccess;
  });

  // Filter payments
  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.customerName
        .toLowerCase()
        .includes(paymentSearchTerm.toLowerCase()) ||
      payment.invoiceNumber
        .toLowerCase()
        .includes(paymentSearchTerm.toLowerCase());
    const matchesStatus =
      !paymentStatusFilter ||
      paymentStatusFilter === "all" ||
      payment.status === paymentStatusFilter;
    const matchesMethod =
      !paymentMethodFilter ||
      paymentMethodFilter === "all" ||
      payment.method === paymentMethodFilter;
    return matchesSearch && matchesStatus && matchesMethod;
  });

  // Get unique employees from billing records for filter dropdown
  const uniqueEmployees = Array.from(
    new Set(
      billingRecords.map(
        (record) => `${record.employeeId}:${record.generatedBy}`,
      ),
    ),
  ).map((emp) => {
    const [id, name] = emp.split(":");
    return { id, name };
  });

  const getBillingStatusColor = (status: BillingRecord["status"]) => {
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

  const getPaymentStatusColor = (status: Payment["status"]) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "Pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Failed":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getMethodColor = (method: Payment["method"]) => {
    switch (method) {
      case "Card":
        return "bg-blue-100 text-blue-800";
      case "Cash":
        return "bg-green-100 text-green-800";
      case "Bank Transfer":
        return "bg-purple-100 text-purple-800";
      case "Online":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Billing stats
  const billingTotalAmount = filteredBillingRecords.reduce(
    (sum, record) => sum + record.amount,
    0,
  );
  const billingPaidAmount = filteredBillingRecords
    .filter((record) => record.status === "Paid")
    .reduce((sum, record) => sum + record.amount, 0);
  const billingPendingAmount = filteredBillingRecords
    .filter((record) => record.status === "Pending")
    .reduce((sum, record) => sum + record.amount, 0);
  const billingOverdueAmount = filteredBillingRecords
    .filter((record) => record.status === "Overdue")
    .reduce((sum, record) => sum + record.amount, 0);

  // Payment stats
  const paymentTotalAmount = filteredPayments.reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );
  const completedPayments = filteredPayments.filter(
    (p) => p.status === "Completed",
  );
  const paymentCompletedAmount = completedPayments.reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );
  const paymentPendingAmount = filteredPayments
    .filter((p) => p.status === "Pending")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const averagePayment =
    filteredPayments.length > 0
      ? paymentTotalAmount / filteredPayments.length
      : 0;

  return (
    <DashboardLayout title="Billing & Payments">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Billing & Payment Management
            </h2>
            <p className="text-gray-600">
              Manage invoices, billing records, and payments
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </Button>
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
            <Button onClick={() => setShowInvoiceGenerator(true)}>
              <FileText className="mr-2 h-4 w-4" />
              Generate Invoice
            </Button>
          </div>
        </div>

        {/* Tabs for Billing and Payments */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger
              value="billing"
              className="flex items-center space-x-2"
            >
              <FileText className="h-4 w-4" />
              <span>Billing & Invoices</span>
            </TabsTrigger>
            <TabsTrigger
              value="payments"
              className="flex items-center space-x-2"
            >
              <CreditCard className="h-4 w-4" />
              <span>Payment History</span>
            </TabsTrigger>
          </TabsList>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            {/* Billing Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Total Billing
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-gray-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${billingTotalAmount.toFixed(2)}
                  </div>
                  <p className="text-xs text-gray-600">All billing records</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Paid Amount
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    ${billingPaidAmount.toFixed(2)}
                  </div>
                  <p className="text-xs text-gray-600">
                    Successfully collected
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Pending Amount
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    ${billingPendingAmount.toFixed(2)}
                  </div>
                  <p className="text-xs text-gray-600">Awaiting payment</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Overdue Amount
                  </CardTitle>
                  <AlertCircle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    ${billingOverdueAmount.toFixed(2)}
                  </div>
                  <p className="text-xs text-gray-600">Requires attention</p>
                </CardContent>
              </Card>
            </div>

            {/* Billing Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search by customer name, invoice number, or VC number..."
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
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                  {isAdmin && (
                    <Select
                      value={employeeFilter}
                      onValueChange={setEmployeeFilter}
                    >
                      <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder="Filter by employee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Employees</SelectItem>
                        {uniqueEmployees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Billing Table */}
            <Card>
              <CardHeader>
                <CardTitle>Billing Records & Invoices</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>VC Number</TableHead>
                      <TableHead>Package</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Generated</TableHead>
                      <TableHead>Due Date</TableHead>
                      {isAdmin && <TableHead>Generated By</TableHead>}
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell
                          colSpan={isAdmin ? 11 : 10}
                          className="text-center py-8"
                        >
                          Loading billing records...
                        </TableCell>
                      </TableRow>
                    ) : filteredBillingRecords.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={isAdmin ? 11 : 10}
                          className="text-center py-8"
                        >
                          No billing records found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredBillingRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">
                            {record.invoiceNumber}
                          </TableCell>
                          <TableCell>{record.customerName}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {record.vcNumber}
                          </TableCell>
                          <TableCell>{record.packageName}</TableCell>
                          <TableCell className="font-medium">
                            ${record.amount.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {record.billingMonth} {record.billingYear}
                          </TableCell>
                          <TableCell>
                            {formatDate(record.generatedDate)}
                          </TableCell>
                          <TableCell>{formatDate(record.dueDate)}</TableCell>
                          {isAdmin && (
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                <User className="h-3 w-3 text-gray-400" />
                                <span className="text-sm">
                                  {record.generatedBy}
                                </span>
                              </div>
                            </TableCell>
                          )}
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                getBillingStatusColor(record.status),
                              )}
                            >
                              {record.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-6">
            {/* Payment Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Total Payments
                  </CardTitle>
                  <CreditCard className="h-4 w-4 text-gray-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${paymentTotalAmount.toFixed(2)}
                  </div>
                  <p className="text-xs text-gray-600">
                    {filteredPayments.length} transactions
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Completed
                  </CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    ${paymentCompletedAmount.toFixed(2)}
                  </div>
                  <p className="text-xs text-gray-600">
                    {completedPayments.length} completed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Pending
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    ${paymentPendingAmount.toFixed(2)}
                  </div>
                  <p className="text-xs text-gray-600">
                    {
                      filteredPayments.filter((p) => p.status === "Pending")
                        .length
                    }{" "}
                    pending
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Average Payment
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-gray-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${averagePayment.toFixed(2)}
                  </div>
                  <p className="text-xs text-gray-600">Per transaction</p>
                </CardContent>
              </Card>
            </div>

            {/* Payment Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row space-y-2 lg:space-y-0 lg:space-x-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search by customer name or invoice number..."
                      value={paymentSearchTerm}
                      onChange={(e) => setPaymentSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select
                    value={paymentStatusFilter}
                    onValueChange={setPaymentStatusFilter}
                  >
                    <SelectTrigger className="w-full lg:w-[150px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={paymentMethodFilter}
                    onValueChange={setPaymentMethodFilter}
                  >
                    <SelectTrigger className="w-full lg:w-[150px]">
                      <SelectValue placeholder="Filter by method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Methods</SelectItem>
                      <SelectItem value="Card">Card</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Bank Transfer">
                        Bank Transfer
                      </SelectItem>
                      <SelectItem value="Online">Online</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Payment Table */}
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          No payment records found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">
                            {payment.invoiceNumber}
                          </TableCell>
                          <TableCell>{payment.customerName}</TableCell>
                          <TableCell className="font-medium">
                            ${payment.amount.toFixed(2)}
                          </TableCell>
                          <TableCell>{formatDate(payment.date)}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(getMethodColor(payment.method))}
                            >
                              {payment.method}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                getPaymentStatusColor(payment.status),
                              )}
                            >
                              {payment.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Payment Methods Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Methods Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {["Card", "Cash", "Bank Transfer", "Online"].map((method) => {
                    const methodPayments = filteredPayments.filter(
                      (p) => p.method === method,
                    );
                    const methodTotal = methodPayments.reduce(
                      (sum, p) => sum + p.amount,
                      0,
                    );
                    const percentage =
                      filteredPayments.length > 0
                        ? (
                            (methodPayments.length / filteredPayments.length) *
                            100
                          ).toFixed(1)
                        : 0;

                    return (
                      <div
                        key={method}
                        className="text-center p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="text-2xl font-bold">
                          {methodPayments.length}
                        </div>
                        <div className="text-sm text-gray-600">{method}</div>
                        <div className="text-lg font-medium text-blue-600">
                          ${methodTotal.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {percentage}% of transactions
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Invoice Generator Modal */}
        <InvoiceGenerator
          open={showInvoiceGenerator}
          onOpenChange={handleInvoiceGeneratorClose}
        />
      </div>
    </DashboardLayout>
  );
}
