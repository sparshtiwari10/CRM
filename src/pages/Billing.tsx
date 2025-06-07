import { useState } from "react";
import {
  FileText,
  Download,
  Eye,
  DollarSign,
  Calendar,
  AlertCircle,
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
import { mockBillingRecords } from "@/data/mockData";
import { BillingRecord } from "@/types";
import { cn } from "@/lib/utils";

export default function Billing() {
  const [billingRecords] = useState<BillingRecord[]>(mockBillingRecords);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showInvoiceGenerator, setShowInvoiceGenerator] = useState(false);

  const filteredRecords = billingRecords.filter((record) => {
    const matchesSearch =
      record.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || record.status === statusFilter;
    return matchesSearch && matchesStatus;
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

  const totalAmount = filteredRecords.reduce(
    (sum, record) => sum + record.amount,
    0,
  );
  const paidAmount = filteredRecords
    .filter((record) => record.status === "Paid")
    .reduce((sum, record) => sum + record.amount, 0);
  const pendingAmount = filteredRecords
    .filter((record) => record.status === "Pending")
    .reduce((sum, record) => sum + record.amount, 0);
  const overdueAmount = filteredRecords
    .filter((record) => record.status === "Overdue")
    .reduce((sum, record) => sum + record.amount, 0);

  return (
    <DashboardLayout title="Billing">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Billing Management
            </h2>
            <p className="text-gray-600">Manage invoices and billing records</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button onClick={() => setShowInvoiceGenerator(true)}>
              <FileText className="mr-2 h-4 w-4" />
              Generate Invoice
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
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
                ${totalAmount.toFixed(2)}
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
                ${paidAmount.toFixed(2)}
              </div>
              <p className="text-xs text-gray-600">Successfully collected</p>
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
                ${pendingAmount.toFixed(2)}
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
                ${overdueAmount.toFixed(2)}
              </div>
              <p className="text-xs text-gray-600">Requires attention</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by customer name or invoice number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Billing Table */}
        <Card>
          <CardHeader>
            <CardTitle>Billing Records</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {record.invoiceNumber}
                    </TableCell>
                    <TableCell>{record.customerName}</TableCell>
                    <TableCell>{record.packageName}</TableCell>
                    <TableCell className="font-medium">
                      ${record.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>{formatDate(record.generatedDate)}</TableCell>
                    <TableCell>{formatDate(record.dueDate)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(getBillingStatusColor(record.status))}
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
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Invoice Generator Modal */}
        <InvoiceGenerator
          open={showInvoiceGenerator}
          onOpenChange={setShowInvoiceGenerator}
        />
      </div>
    </DashboardLayout>
  );
}
