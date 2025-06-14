import React, { useState, useEffect, useContext } from "react";
import {
  Plus,
  Calendar,
  FileText,
  DollarSign,
  Users,
  Settings,
  Play,
  Pause,
  AlertCircle,
  CheckCircle,
  Trash2,
  AlertTriangle,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuthContext } from "@/contexts/AuthContext";
import { BillsService } from "@/services/billsService";
import { CustomerService } from "@/services/customerService";
import { MonthlyBill, Customer } from "@/types";
import { useToast } from "@/hooks/use-toast";

export default function Bills() {
  const { user } = useContext(AuthContext) as { user: any };
  const { toast } = useToast();
  const [bills, setBills] = useState<MonthlyBill[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Auto billing settings
  const [autoBillingEnabled, setAutoBillingEnabled] = useState(false);
  const [lastAutoRun, setLastAutoRun] = useState<Date | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(false);

  // Summary stats
  const [summaryStats, setSummaryStats] = useState({
    totalBills: 0,
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    thisMonth: 0,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [billsData, customersData, autoBillingSettings] = await Promise.all(
        [
          BillsService.getAllBills().catch(() => []),
          CustomerService.getAllCustomers().catch(() => []),
          BillsService.getAutoBillingSettings().catch(() => ({
            enabled: false,
            dayOfMonth: 1,
          })),
        ],
      );

      setBills(billsData);
      setCustomers(customersData);
      setAutoBillingEnabled(autoBillingSettings.enabled);
      setLastAutoRun(autoBillingSettings.lastRunDate || null);

      // Calculate summary statistics
      const totalBills = billsData.length;
      const totalAmount = billsData.reduce(
        (sum, bill) => sum + bill.totalAmount,
        0,
      );
      const paidAmount = billsData
        .filter((bill) => bill.status === "paid")
        .reduce((sum, bill) => sum + bill.totalAmount, 0);
      const pendingAmount = totalAmount - paidAmount;

      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const thisMonth = billsData.filter(
        (bill) => bill.month === currentMonth,
      ).length;

      setSummaryStats({
        totalBills,
        totalAmount,
        paidAmount,
        pendingAmount,
        thisMonth,
      });
    } catch (error) {
      console.error("Error loading bills data:", error);
      toast({
        title: "Error",
        description: "Failed to load bills data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Check auto billing on page load
    BillsService.runAutoBillingCheck().catch(console.error);
  }, []);

  const handleGenerateBills = async () => {
    try {
      setGenerating(true);

      const targetCustomers = selectAll ? undefined : selectedCustomers;

      // Check if bills already exist and offer force regenerate
      const currentMonth = new Date().toISOString().slice(0, 7);
      const existingBills = await BillsService.getBillsByMonth(
        currentMonth,
      ).catch(() => []);

      if (existingBills.length > 0) {
        const shouldForceRegenerate = confirm(
          `Bills for ${currentMonth} already exist (${existingBills.length} bills found). Do you want to force regenerate? This will delete existing bills and create new ones.`,
        );

        if (!shouldForceRegenerate) {
          setGenerating(false);
          return;
        }

        // Delete existing bills for the month
        console.log(
          `🗑️ Deleting ${existingBills.length} existing bills for force regeneration...`,
        );
        for (const bill of existingBills) {
          try {
            await BillsService.deleteBill(bill.id);
          } catch (error) {
            console.warn(`Failed to delete bill ${bill.id}:`, error);
          }
        }
      }

      const result = await BillsService.generateMonthlyBills(
        undefined, // Use current month
        targetCustomers.length > 0 ? targetCustomers : undefined,
      );

      toast({
        title: "Bill Generation Complete",
        description: `Generated ${result.success.length} bills successfully. ${result.failed.length} failed.`,
      });

      if (result.failed.length > 0) {
        console.warn("Failed bills:", result.failed);
      }

      setShowGenerateDialog(false);
      setSelectedCustomers([]);
      setSelectAll(false);
      loadData(); // Reload data
    } catch (error) {
      console.error("Error generating bills:", error);
      toast({
        title: "Error",
        description: "Failed to generate bills",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleAutoBilling = async () => {
    try {
      setLoadingSettings(true);
      const newState = !autoBillingEnabled;

      await BillsService.updateAutoBillingSettings({
        enabled: newState,
        dayOfMonth: 1, // First day of month
      });

      setAutoBillingEnabled(newState);

      toast({
        title: "Auto Billing Updated",
        description: `Auto billing ${newState ? "enabled" : "disabled"}`,
      });
    } catch (error) {
      console.error("Error updating auto billing:", error);
      toast({
        title: "Error",
        description: "Failed to update auto billing settings",
        variant: "destructive",
      });
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleCustomerSelection = (customerId: string, checked: boolean) => {
    if (checked) {
      setSelectedCustomers((prev) => [...prev, customerId]);
    } else {
      setSelectedCustomers((prev) => prev.filter((id) => id !== customerId));
      setSelectAll(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedCustomers(customers.map((c) => c.id));
    } else {
      setSelectedCustomers([]);
    }
  };

  // Filter functions
  const getFilteredBills = () => {
    let filtered = bills;

    if (filterMonth !== "all") {
      filtered = filtered.filter((bill) => bill.month === filterMonth);
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((bill) => bill.status === filterStatus);
    }

    return filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  };

  const getMonthOptions = () => {
    const months = new Set(bills.map((bill) => bill.month));
    return Array.from(months).sort().reverse();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading bills data...</p>
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
            <h1 className="text-3xl font-bold text-foreground">
              Bills Management
            </h1>
            <p className="text-muted-foreground">
              Generate and manage monthly customer bills
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              onClick={() => setShowGenerateDialog(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Generate Bills
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bills</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summaryStats.totalBills}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Amount
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{summaryStats.totalAmount.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid Amount</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ₹{summaryStats.paidAmount.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                ₹{summaryStats.pendingAmount.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryStats.thisMonth}</div>
            </CardContent>
          </Card>
        </div>

        {/* Auto Billing Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              Auto Billing Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="auto-billing">
                  Automatic Monthly Bill Generation
                </Label>
                <p className="text-sm text-muted-foreground">
                  Generate bills automatically on the 1st of each month
                  {lastAutoRun && (
                    <span className="block">
                      Last run: {lastAutoRun.toLocaleDateString()}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-billing"
                  checked={autoBillingEnabled}
                  onCheckedChange={handleToggleAutoBilling}
                  disabled={loadingSettings}
                />
                {autoBillingEnabled ? (
                  <Play className="h-4 w-4 text-green-600" />
                ) : (
                  <Pause className="h-4 w-4 text-gray-400" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bills Table */}
        <Card>
          <CardHeader>
            <CardTitle>Bills History</CardTitle>

            {/* Filters */}
            <div className="flex space-x-4">
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {getMonthOptions().map((month) => (
                    <SelectItem key={month} value={month}>
                      {new Date(month + "-01").toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="generated">Generated</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead>VCs</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-16">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getFilteredBills().map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell className="font-mono text-sm">
                        {bill.id.slice(-8)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{bill.customerName}</div>
                      </TableCell>
                      <TableCell>
                        {new Date(bill.month + "-01").toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                          },
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {bill.vcBreakdown.length} VC
                          {bill.vcBreakdown.length !== 1 ? "s" : ""}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          ₹{bill.totalAmount.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            bill.status === "paid"
                              ? "default"
                              : bill.status === "partial"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {bill.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(bill.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {getFilteredBills().length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No bills found matching your criteria
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Generate Bills Dialog */}
        <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Generate Monthly Bills</DialogTitle>
              <DialogDescription>
                Select customers to generate bills for the current month
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="select-all"
                  checked={selectAll}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="select-all">Select All Customers</Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto">
                {customers.map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center space-x-3 p-3 border rounded-lg"
                  >
                    <input
                      type="checkbox"
                      id={`customer-${customer.id}`}
                      checked={selectedCustomers.includes(customer.id)}
                      onChange={(e) =>
                        handleCustomerSelection(customer.id, e.target.checked)
                      }
                      className="rounded"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {customer.phoneNumber} • {customer.collectorName}
                      </div>
                    </div>
                    <Badge variant="outline">{customer.status}</Badge>
                  </div>
                ))}
              </div>

              <div className="text-sm text-muted-foreground">
                {selectAll
                  ? `All ${customers.length} customers selected`
                  : `${selectedCustomers.length} customers selected`}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowGenerateDialog(false)}
                disabled={generating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerateBills}
                disabled={
                  generating || (!selectAll && selectedCustomers.length === 0)
                }
                className="bg-blue-600 hover:bg-blue-700"
              >
                {generating ? "Generating..." : "Generate Bills"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
