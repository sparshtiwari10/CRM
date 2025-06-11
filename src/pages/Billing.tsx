import { useState, useEffect, useContext } from "react";
import {
  FileText,
  Download,
  Eye,
  DollarSign,
  Calendar,
  AlertCircle,
  User,
  Search,
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
import { authService } from "@/services/authService";
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
  const [allEmployees, setAllEmployees] = useState<
    Array<{ id: string; name: string; role: string }>
  >([]);
  const { user, isAdmin } = useContext(AuthContext);
  const { toast } = useToast();

  // Load billing records
  useEffect(() => {
    const loadBillingRecords = async () => {
      try {
        setIsLoading(true);
        const records = await CustomerService.getAllBillingRecords();
        setBillingRecords(records);
      } catch (error) {
        console.error("Failed to load billing records:", error);
        toast({
          title: "Error",
          description: "Failed to load billing records",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadBillingRecords();
  }, [toast]);

  // Load all employees for admin filter dropdown
  useEffect(() => {
    const loadEmployees = async () => {
      if (isAdmin) {
        try {
          console.log("🔄 Loading employees for billing filter...");
          const employees = await authService.getAllEmployees();
          setAllEmployees(employees);

          if (employees.length === 0) {
            toast({
              title: "No Employees Found",
              description:
                "No employee accounts found in Firebase. Create employees in Employee Management.",
              variant: "destructive",
            });
          } else {
            console.log(
              `✅ Loaded ${employees.length} employees for filter dropdown`,
            );
          }
        } catch (error) {
          console.error("Failed to load employees:", error);
          toast({
            title: "Employee Loading Error",
            description:
              "Failed to load employees from Firebase. Check connection.",
            variant: "destructive",
          });
        }
      }
    };

    loadEmployees();
  }, [isAdmin, toast]);

  // Filter billing records
  const filteredRecords = billingRecords.filter((record) => {
    const matchesSearch =
      record.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.vcNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || record.status === statusFilter;

    const matchesEmployee =
      employeeFilter === "all" || record.generatedBy === employeeFilter;

    const matchesDateRange =
      (!fromDate || record.generatedDate >= fromDate) &&
      (!toDate || record.generatedDate <= toDate);

    return (
      matchesSearch && matchesStatus && matchesEmployee && matchesDateRange
    );
  });

  // Calculate today's and yesterday's collections
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const todayRecords = billingRecords.filter(
    (record) => record.generatedDate === today,
  );
  const yesterdayRecords = billingRecords.filter(
    (record) => record.generatedDate === yesterday,
  );

  const todayTotal = todayRecords.reduce(
    (sum, record) => sum + record.amount,
    0,
  );
  const yesterdayTotal = yesterdayRecords.reduce(
    (sum, record) => sum + record.amount,
    0,
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-IN");
    } catch {
      return dateString;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Paid":
        return "default";
      case "Pending":
        return "secondary";
      case "Overdue":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Paid":
        return "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200";
      case "Pending":
        return "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200";
      case "Overdue":
        return "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  // Export billing data to CSV
  const handleExportStatement = () => {
    try {
      const filteredData = filteredRecords;

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
          "Status",
          "Invoice Number",
          "Generated By",
          "Package",
        ].join(","),
        // CSV Data
        ...filteredData.map((record) =>
          [
            record.generatedDate,
            `"${record.customerName}"`,
            record.vcNumber || "",
            record.amount,
            record.status,
            record.invoiceNumber || "",
            `"${record.generatedBy || ""}"`,
            `"${record.packageName || ""}"`,
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
        description: `Exported ${filteredData.length} billing records to CSV`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export billing data",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Billing & Payments">
        <div className="p-4 lg:p-6">
          <div className="text-center py-8 text-muted-foreground">
            Loading billing records...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Billing & Payments">
      <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-foreground">
              Billing & Payments
            </h2>
            <p className="text-sm lg:text-base text-muted-foreground">
              {isAdmin
                ? "Comprehensive billing management and payment tracking"
                : "Your billing activities and payment collections"}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <Button
              variant="outline"
              onClick={handleExportStatement}
              className="text-sm"
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button
              onClick={() => setShowInvoiceGenerator(true)}
              className="text-sm"
            >
              <FileText className="mr-2 h-4 w-4" />
              Generate Invoice
            </Button>
          </div>
        </div>

        {/* Collection Summary - Employee View */}
        {!isAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {/* Today's Collection Summary */}
            <Card className="bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      Today's Collection
                    </p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                      {formatCurrency(todayTotal)}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-300">
                      {todayRecords.length} invoices generated today
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <div className="mt-2 lg:mt-4 space-y-1 lg:space-y-2">
                  <div className="text-xs text-muted-foreground">
                    Status breakdown:
                  </div>
                  <div className="flex space-x-2 lg:space-x-4 text-xs">
                    <span className="text-green-600 dark:text-green-400">
                      Paid:{" "}
                      {todayRecords.filter((r) => r.status === "Paid").length}
                    </span>
                    <span className="text-yellow-600 dark:text-yellow-400">
                      Pending:{" "}
                      {
                        todayRecords.filter((r) => r.status === "Pending")
                          .length
                      }
                    </span>
                    <span className="text-red-600 dark:text-red-400">
                      Overdue:{" "}
                      {
                        todayRecords.filter((r) => r.status === "Overdue")
                          .length
                      }
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Yesterday's Collection Summary */}
            <Card className="bg-blue-100 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Yesterday's Collection
                    </p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                      {formatCurrency(yesterdayTotal)}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-300">
                      {yesterdayRecords.length} invoices generated yesterday
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="mt-2 lg:mt-4 space-y-1 lg:space-y-2">
                  <div className="text-xs text-muted-foreground">
                    Status breakdown:
                  </div>
                  <div className="flex space-x-2 lg:space-x-4 text-xs">
                    <span className="text-green-600 dark:text-green-400">
                      Paid:{" "}
                      {
                        yesterdayRecords.filter((r) => r.status === "Paid")
                          .length
                      }
                    </span>
                    <span className="text-yellow-600 dark:text-yellow-400">
                      Pending:{" "}
                      {
                        yesterdayRecords.filter((r) => r.status === "Pending")
                          .length
                      }
                    </span>
                    <span className="text-red-600 dark:text-red-400">
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
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by customer name, invoice number, or VC number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full lg:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>

              {/* Employee Filter (Admin Only) - Now uses Firebase users */}
              {isAdmin && (
                <Select
                  value={employeeFilter}
                  onValueChange={setEmployeeFilter}
                >
                  <SelectTrigger className="w-full lg:w-[180px]">
                    <SelectValue placeholder="Filter by employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {allEmployees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.name}>
                        {employee.name} ({employee.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Date Range Filters */}
              <div className="flex space-x-2">
                <Input
                  type="date"
                  placeholder="From Date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full lg:w-auto"
                />
                <Input
                  type="date"
                  placeholder="To Date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full lg:w-auto"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <span className="font-medium">
              Showing {filteredRecords.length} of {billingRecords.length}{" "}
              billing records
            </span>
            <span className="ml-4">
              Total Amount:{" "}
              {formatCurrency(
                filteredRecords.reduce((sum, record) => sum + record.amount, 0),
              )}
            </span>
          </div>
        </div>

        {/* Billing Records Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Generated By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="text-muted-foreground">
                          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <div className="font-medium">
                            No billing records found
                          </div>
                          <div className="text-sm">
                            {searchTerm
                              ? "Try adjusting your search criteria"
                              : "No billing records have been generated yet"}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecords.map((record) => (
                      <TableRow key={record.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          {formatDate(record.generatedDate)}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-foreground">
                              {record.customerName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              VC: {record.vcNumber}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-foreground">
                          {record.invoiceNumber}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {record.packageName}
                        </TableCell>
                        <TableCell className="text-right font-medium text-foreground">
                          {formatCurrency(record.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getStatusBadgeVariant(record.status)}
                            className={cn(getStatusBadgeColor(record.status))}
                          >
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-foreground">
                              {record.generatedBy}
                            </span>
                          </div>
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
            </div>
          </CardContent>
        </Card>

        {/* Invoice Generator Modal */}
        {showInvoiceGenerator && (
          <InvoiceGenerator
            open={showInvoiceGenerator}
            onOpenChange={setShowInvoiceGenerator}
            customers={[]} // Pass customers if needed
            onInvoiceGenerated={(invoice) => {
              // Refresh billing records
              CustomerService.getAllBillingRecords().then(setBillingRecords);
              toast({
                title: "Invoice Generated",
                description: `Invoice ${invoice.invoiceNumber} has been created successfully.`,
              });
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
