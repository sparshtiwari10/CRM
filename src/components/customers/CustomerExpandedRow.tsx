import React, { useState, useEffect } from "react";
import {
  Receipt,
  FileText,
  History,
  Calendar,
  DollarSign,
  Package,
  User,
  ChevronRight,
  Eye,
  Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaymentService } from "@/services/paymentService";
import { BillsService } from "@/services/billsService";
import { VCInventoryService } from "@/services/vcInventoryService";
import {
  Customer,
  PaymentInvoice,
  MonthlyBill,
  VCInventoryItem,
} from "@/types";

interface CustomerExpandedRowProps {
  customer: Customer;
}

export function CustomerExpandedRow({ customer }: CustomerExpandedRowProps) {
  const [invoices, setInvoices] = useState<PaymentInvoice[]>([]);
  const [bills, setBills] = useState<MonthlyBill[]>([]);
  const [vcHistory, setVCHistory] = useState<VCInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomerData();
  }, [customer.id]);

  const loadCustomerData = async () => {
    try {
      setLoading(true);

      const [invoicesData, billsData, vcData] = await Promise.all([
        PaymentService.getPaymentsByCustomer(customer.id).catch(() => []),
        BillsService.getBillsByCustomer(customer.id).catch(() => []),
        VCInventoryService.getVCItemsByCustomer(customer.id).catch(() => []),
      ]);

      setInvoices(invoicesData);
      setBills(billsData);
      setVCHistory(vcData);
    } catch (error) {
      console.error("Error loading customer data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 border-t bg-muted/30">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span className="ml-2 text-sm text-muted-foreground">
            Loading customer details...
          </span>
        </div>
      </div>
    );
  }

  const totalPaid = invoices.reduce(
    (sum, inv) => sum + (inv.amount || inv.amountPaid || 0),
    0,
  );
  const totalBilled = bills.reduce((sum, bill) => sum + bill.totalAmount, 0);
  const activeVCs = vcHistory.filter((vc) => vc.status === "active");

  return (
    <div className="border-t bg-muted/30">
      <Tabs defaultValue="invoices" className="w-full">
        <div className="px-6 pt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="invoices" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Invoices ({invoices.length})
            </TabsTrigger>
            <TabsTrigger value="bills" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Bills ({bills.length})
            </TabsTrigger>
            <TabsTrigger value="vc-history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              VC History ({vcHistory.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Summary Cards */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Paid
                </CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-green-600">
                  ₹{totalPaid.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Billed
                </CardTitle>
                <FileText className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-blue-600">
                  ₹{totalBilled.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Outstanding
                </CardTitle>
                <Receipt className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-red-600">
                  ₹{(customer.currentOS || 0).toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active VCs
                </CardTitle>
                <Package className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-purple-600">
                  {activeVCs.length}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="px-6 pb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No payment invoices found</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Receipt No.</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Collected By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-mono">
                            {invoice.receiptNumber ||
                              `INV-${invoice.id.slice(-6)}`}
                          </TableCell>
                          <TableCell>
                            {new Date(
                              invoice.paymentDate || invoice.paidAt,
                            ).toLocaleDateString()}
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
                          <TableCell className="text-sm text-muted-foreground">
                            {invoice.collectedBy}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bills Tab */}
        <TabsContent value="bills" className="px-6 pb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Monthly Bills</CardTitle>
            </CardHeader>
            <CardContent>
              {bills.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No bills generated yet</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bill ID</TableHead>
                        <TableHead>Month</TableHead>
                        <TableHead>VCs</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Due Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bills.map((bill) => (
                        <TableRow key={bill.id}>
                          <TableCell className="font-mono">
                            {bill.id.slice(-8)}
                          </TableCell>
                          <TableCell>
                            {new Date(bill.month + "-01").toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "long",
                              },
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {bill.vcBreakdown.length} VC
                              {bill.vcBreakdown.length !== 1 ? "s" : ""}
                            </span>
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
                            {new Date(bill.billDueDate).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* VC History Tab */}
        <TabsContent value="vc-history" className="px-6 pb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                VC Number History & Status Changes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {vcHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No VC assignments found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {vcHistory.map((vc) => (
                    <Card key={vc.id} className="border-l-4 border-l-blue-500">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="font-mono">
                              {vc.vcNumber}
                            </Badge>
                            <Badge
                              variant={
                                vc.status === "active"
                                  ? "default"
                                  : vc.status === "inactive"
                                    ? "destructive"
                                    : "secondary"
                              }
                            >
                              {vc.status}
                            </Badge>
                            {vc.packageName && (
                              <span className="text-sm text-muted-foreground">
                                {vc.packageName} - ₹{vc.packageAmount}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Assigned:{" "}
                            {new Date(vc.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {/* Status History */}
                        {vc.statusHistory && vc.statusHistory.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-muted-foreground">
                              Status Changes:
                            </h4>
                            <div className="space-y-1">
                              {vc.statusHistory
                                .slice(0, 3)
                                .map((status, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between text-sm"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Badge
                                        variant={
                                          status.status === "active"
                                            ? "default"
                                            : "secondary"
                                        }
                                        className="text-xs"
                                      >
                                        {status.status}
                                      </Badge>
                                      <span className="text-muted-foreground">
                                        {status.reason || "Status change"}
                                      </span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(
                                        status.changedAt,
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>
                                ))}
                              {vc.statusHistory.length > 3 && (
                                <div className="text-xs text-muted-foreground">
                                  +{vc.statusHistory.length - 3} more changes
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Ownership History */}
                        {vc.ownershipHistory &&
                          vc.ownershipHistory.length > 0 && (
                            <div className="space-y-2 mt-4">
                              <h4 className="text-sm font-medium text-muted-foreground">
                                Assignment History:
                              </h4>
                              <div className="space-y-1">
                                {vc.ownershipHistory
                                  .slice(0, 2)
                                  .map((ownership, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-between text-sm"
                                    >
                                      <span className="font-medium">
                                        {ownership.customerName}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(
                                          ownership.startDate,
                                        ).toLocaleDateString()}
                                        {ownership.endDate && (
                                          <span>
                                            {" "}
                                            -{" "}
                                            {new Date(
                                              ownership.endDate,
                                            ).toLocaleDateString()}
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
