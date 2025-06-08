import { useState, useEffect, useContext } from "react";
import {
  FileText,
  Download,
  Eye,
  DollarSign,
  Calendar,
  AlertCircle,
  User,
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
import { InvoiceGenerator } from "@/components/invoice/InvoiceGenerator";
import { CustomerService } from "@/services/customerService";
import { AuthContext } from "@/contexts/AuthContext";
import { BillingRecord } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Billing() {
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showInvoiceGenerator, setShowInvoiceGenerator] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const { user, isAdmin } = useContext(AuthContext);
  const { toast } = useToast();

  // Export billing data to CSV
  const handleExportStatement = () => {
    try {
      const filteredData = billingRecords;

      if (filteredData.length === 0) {
        toast({
          title: "No Data",
          description: "No billing records to export",
          variant: "destructive",
        });
        return;
      }

      const csvContent = [
        // CSV Headers
        [
          "Date",
          "Customer Name",
          "VC Number",
          "Amount (₹)",
          "Payment Method",
          "Status",
          "Invoice Number",
          "Collector",
        ].join(","),
        // CSV Data
        ...filteredData.map((record) =>
          [
            record.date,
            `"${record.customerName}"`,
            record.vcNumber || "",
            record.amount,
            record.paymentMethod || "",
            record.status,
            record.invoiceNumber || "",
            `"${record.collectorName || ""}"`,
          ].join(","),
        ),
      ].join("\n");

      // Create and download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `billing-statement-${new Date().toISOString().split("T")[0]}.csv`,
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Successful",
        description: `Exported ${filteredData.length} billing records`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export billing statement",
        variant: "destructive",
      });
    }
  };

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
      const records = await CustomerService.getAllBillingRecords();
      setBillingRecords(records);

      // Show toast notification at bottom for mobile
      toast({
        title: "Bill Generated",
        description: "Invoice has been successfully generated.",
        className:
          "lg:bottom-4 lg:right-4 bottom-2 right-2 left-2 lg:left-auto lg:max-w-sm",
      });
    }
  };

  // Get today and yesterday dates
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  // Filter billing records based on user role and date filters
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

    // Date range filtering
    const matchesDateRange = (() => {
      if (!fromDate && !toDate) return true;

      const recordDate = record.generatedDate || record.date;
      if (!recordDate) return true;

      if (fromDate && recordDate < fromDate) return false;
      if (toDate && recordDate > toDate) return false;

      return true;
    })();

    // For employees, only show their own records for today and yesterday (unless date filter is applied)
    let hasAccess = isAdmin || record.employeeId === user?.id;

    if (!isAdmin && !fromDate && !toDate) {
      // Employees only see records from today and yesterday when no date filter is applied
      hasAccess =
        hasAccess &&
        (record.generatedDate === today || record.generatedDate === yesterday);
    }

    return (
      matchesSearch &&
      matchesStatus &&
      matchesEmployee &&
      matchesDateRange &&
      hasAccess
    );
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Calculate billing stats
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

  // Employee-specific stats for today and yesterday
  const todayRecords = billingRecords.filter(
    (record) =>
      record.generatedDate === today &&
      (isAdmin || record.employeeId === user?.id),
  );
  const yesterdayRecords = billingRecords.filter(
    (record) =>
      record.generatedDate === yesterday &&
      (isAdmin || record.employeeId === user?.id),
  );

  const todayTotal = todayRecords.reduce(
    (sum, record) => sum + record.amount,
    0,
  );
  const yesterdayTotal = yesterdayRecords.reduce(
    (sum, record) => sum + record.amount,
    0,
  );

  // Admin: Group today's and yesterday's billing by employee
  const getEmployeeBilling = (date: string) => {
    const employeeBilling: {
      [key: string]: { name: string; total: number; count: number };
    } = {};

    billingRecords
      .filter((record) => record.generatedDate === date)
      .forEach((record) => {
        if (!employeeBilling[record.employeeId]) {
          employeeBilling[record.employeeId] = {
            name: record.generatedBy,
            total: 0,
            count: 0,
          };
        }
        employeeBilling[record.employeeId].total += record.amount;
        employeeBilling[record.employeeId].count += 1;
      });

    return Object.entries(employeeBilling).map(([id, data]) => ({
      employeeId: id,
      employeeName: data.name,
      total: data.total,
      count: data.count,
    }));
  };

  const todayEmployeeBilling = getEmployeeBilling(today);
  const yesterdayEmployeeBilling = getEmployeeBilling(yesterday);

  // Render admin billing page
  if (isAdmin) {
    return (
      <DashboardLayout title="Billing & Invoices">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Billing & Invoice Management
              </h2>
              <p className="text-muted-foreground">
                Manage invoices and billing records
              </p>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleExportStatement}>
                <Download className="mr-2 h-4 w-4" />
                Export Statement
              </Button>
              <Button onClick={() => setShowInvoiceGenerator(true)}>
                <FileText className="mr-2 h-4 w-4" />
                Generate Invoice
              </Button>
            </div>
          </div>

          {/* Admin Billing Stats Cards - Simplified */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Invoices Generated Today
                </CardTitle>
                <FileText className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {todayRecords.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total: ₹{todayTotal.toFixed(2)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Invoices
                </CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {filteredBillingRecords.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  In current period
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Admin: Today's and Yesterday's Billing Grouped by Employee */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <span>Today's Billing by Employee</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {todayEmployeeBilling.length > 0 ? (
                    todayEmployeeBilling.map((emp) => (
                      <div
                        key={emp.employeeId}
                        className="flex items-center justify-between p-3 bg-green-50 rounded-lg"
                      >
                        <div>
                          <div className="font-medium">{emp.employeeName}</div>
                          <div className="text-sm text-gray-500">
                            {emp.count} invoices
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-700">
                            ₹{emp.total.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-4">
                      No billing today
                    </p>
                  )}
                  <div className="pt-3 border-t border-green-200 dark:border-green-800 bg-green-100 dark:bg-green-900/20 rounded-lg p-3">
                    <div className="flex justify-between font-bold text-green-800 dark:text-green-200">
                      <span>Today's Total:</span>
                      <span>₹{todayTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <span>Yesterday's Billing by Employee</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {yesterdayEmployeeBilling.length > 0 ? (
                    yesterdayEmployeeBilling.map((emp) => (
                      <div
                        key={emp.employeeId}
                        className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
                      >
                        <div>
                          <div className="font-medium">{emp.employeeName}</div>
                          <div className="text-sm text-gray-500">
                            {emp.count} invoices
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-blue-700">
                            ₹{emp.total.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-4">
                      No billing yesterday
                    </p>
                  )}
                  <div className="pt-3 border-t border-blue-200 dark:border-blue-800 bg-blue-100 dark:bg-blue-900/20 rounded-lg p-3">
                    <div className="flex justify-between font-bold text-blue-800 dark:text-blue-200">
                      <span>Yesterday's Total:</span>
                      <span>₹{yesterdayTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Billing Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Search and Status Filters */}
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
                </div>

                {/* Date Range Filters */}
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                  <div className="flex flex-col space-y-1">
                    <label className="text-sm font-medium text-gray-700">
                      From Date
                    </label>
                    <Input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full sm:w-[180px]"
                    />
                  </div>
                  <div className="flex flex-col space-y-1">
                    <label className="text-sm font-medium text-gray-700">
                      To Date
                    </label>
                    <Input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full sm:w-[180px]"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFromDate("");
                        setToDate("");
                      }}
                      className="text-sm"
                    >
                      Clear Dates
                    </Button>
                  </div>
                </div>
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
                    <TableHead>Generated By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        Loading billing records...
                      </TableCell>
                    </TableRow>
                  ) : filteredBillingRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
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
                          ₹{record.amount.toFixed(2)}
                          {record.customAmount && (
                            <span className="text-xs text-orange-600 ml-1">
                              (Custom)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {record.billingMonth} {record.billingYear}
                        </TableCell>
                        <TableCell>
                          {formatDate(record.generatedDate)}
                        </TableCell>
                        <TableCell>{formatDate(record.dueDate)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <User className="h-3 w-3 text-gray-400" />
                            <span className="text-sm">
                              {record.generatedBy}
                            </span>
                          </div>
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

          {/* Invoice Generator Modal */}
          <InvoiceGenerator
            open={showInvoiceGenerator}
            onOpenChange={handleInvoiceGeneratorClose}
          />
        </div>
      </DashboardLayout>
    );
  }

  // Render employee billing page (restricted to today and yesterday)
  return (
    <DashboardLayout title="Employee Billing">
      <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-gray-900">
              Billing & Invoices
            </h2>
            <p className="text-sm lg:text-base text-gray-600">
              View billing records for today and yesterday
            </p>
          </div>
          <Button
            onClick={() => setShowInvoiceGenerator(true)}
            className="h-8 lg:h-10"
          >
            <FileText className="mr-2 h-3 w-3 lg:h-4 lg:w-4" />
            <span className="text-sm lg:text-base">Generate Invoice</span>
          </Button>
        </div>

        {/* Employee: Compact Today and Yesterday Billing Containers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-6">
          <Card className="compact-mobile">
            <CardHeader className="pb-2 lg:pb-3">
              <CardTitle className="text-base lg:text-lg font-medium text-gray-900 flex items-center space-x-2">
                <DollarSign className="h-4 w-4 lg:h-5 lg:w-5 text-green-600" />
                <span>Today's Billing</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl lg:text-3xl font-bold text-green-600">
                ₹{todayTotal.toFixed(2)}
              </div>
              <p className="text-xs lg:text-sm text-gray-600 mt-1">
                {todayRecords.length} invoices generated today
              </p>
              <div className="mt-2 lg:mt-4 space-y-1 lg:space-y-2">
                <div className="text-xs text-gray-500">Status breakdown:</div>
                <div className="flex space-x-2 lg:space-x-4 text-xs">
                  <span className="text-green-600">
                    Paid:{" "}
                    {todayRecords.filter((r) => r.status === "Paid").length}
                  </span>
                  <span className="text-yellow-600">
                    Pending:{" "}
                    {todayRecords.filter((r) => r.status === "Pending").length}
                  </span>
                  <span className="text-red-600">
                    Overdue:{" "}
                    {todayRecords.filter((r) => r.status === "Overdue").length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="compact-mobile">
            <CardHeader className="pb-2 lg:pb-3">
              <CardTitle className="text-base lg:text-lg font-medium text-gray-900 flex items-center space-x-2">
                <Calendar className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600" />
                <span>Yesterday's Billing</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl lg:text-3xl font-bold text-blue-600">
                ₹{yesterdayTotal.toFixed(2)}
              </div>
              <p className="text-xs lg:text-sm text-gray-600 mt-1">
                {yesterdayRecords.length} invoices generated yesterday
              </p>
              <div className="mt-2 lg:mt-4 space-y-1 lg:space-y-2">
                <div className="text-xs text-gray-500">Status breakdown:</div>
                <div className="flex space-x-2 lg:space-x-4 text-xs">
                  <span className="text-green-600">
                    Paid:{" "}
                    {yesterdayRecords.filter((r) => r.status === "Paid").length}
                  </span>
                  <span className="text-yellow-600">
                    Pending:{" "}
                    {
                      yesterdayRecords.filter((r) => r.status === "Pending")
                        .length
                    }
                  </span>
                  <span className="text-red-600">
                    Overdue:{" "}
                    {
                      yesterdayRecords.filter((r) => r.status === "Overdue")
                        .length
                    }
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Employee Billing Filters */}
        <Card>
          <CardContent className="pt-4 lg:pt-6">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by customer name, invoice number, or VC number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-sm lg:text-base"
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
            </div>
          </CardContent>
        </Card>

        {/* Employee Billing Table (Today & Yesterday only) */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Billing Records (Today & Yesterday)</CardTitle>
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      Loading billing records...
                    </TableCell>
                  </TableRow>
                ) : filteredBillingRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      No billing records found for today and yesterday
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
                        ₹{record.amount.toFixed(2)}
                        {record.customAmount && (
                          <span className="text-xs text-orange-600 ml-1">
                            (Custom)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {record.billingMonth} {record.billingYear}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{formatDate(record.generatedDate)}</span>
                          <span className="text-xs text-gray-500">
                            {record.generatedDate === today
                              ? "Today"
                              : "Yesterday"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(record.dueDate)}</TableCell>
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

        {/* Invoice Generator Modal */}
        <InvoiceGenerator
          open={showInvoiceGenerator}
          onOpenChange={handleInvoiceGeneratorClose}
        />
      </div>

      {/* Add CSS for mobile optimization */}
      <style jsx>{`
        @media (max-width: 768px) {
          .compact-mobile .card-header {
            padding: 12px 16px 8px 16px;
          }
          .compact-mobile .card-content {
            padding: 0 16px 12px 16px;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}
