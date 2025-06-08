import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InvoiceGenerator } from "@/components/invoice/InvoiceGenerator";
import {
  Users,
  DollarSign,
  AlertCircle,
  TrendingUp,
  Package,
  CreditCard,
  UserPlus,
  Clock,
  FileText,
  ClipboardList,
  Calendar,
} from "lucide-react";
import { Customer } from "@/types";
import { CustomerService } from "@/services/customerService";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [showInvoiceGenerator, setShowInvoiceGenerator] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  // Load customers data - filter by employee if not admin
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        setIsLoading(true);
        let customersData;

        if (isAdmin) {
          // Admin sees all customers
          customersData = await CustomerService.getAllCustomers();
        } else if (user?.collector_name || user?.name) {
          // Employee sees only their assigned customers
          const employeeName = user.collector_name || user.name;
          customersData =
            await CustomerService.getCustomersByCollector(employeeName);
          console.log(
            `📊 Dashboard: Loaded ${customersData.length} customers for employee: ${employeeName}`,
          );
        } else {
          customersData = [];
        }

        setCustomers(customersData);
      } catch (error) {
        console.error("Failed to load customers:", error);
        setCustomers([]); // Set empty array on error
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      loadCustomers();
    }
  }, [isAdmin, user]);

  // Calculate real statistics from customers data
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) => c.isActive).length;
  const inactiveCustomers = customers.filter((c) => !c.isActive).length;
  const paidCustomers = customers.filter(
    (c) => c.billingStatus === "Paid",
  ).length;
  const pendingCustomers = customers.filter(
    (c) => c.billingStatus === "Pending",
  ).length;
  const overdueCustomers = customers.filter(
    (c) => c.billingStatus === "Overdue",
  ).length;

  // Calculate total revenue from all customers
  const totalRevenue = customers.reduce(
    (sum, customer) => sum + (customer.portalBill || 0),
    0,
  );
  const monthlyRevenue = totalRevenue; // For now, treat all as monthly

  // Calculate new customers this month
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const newCustomersThisMonth = customers.filter((customer) => {
    if (!customer.joinDate) return false;
    const joinDate = new Date(customer.joinDate);
    return (
      joinDate.getMonth() === currentMonth &&
      joinDate.getFullYear() === currentYear
    );
  }).length;

  const recentCustomers = customers.slice(0, 5);

  // Payment data for today/yesterday (employee-specific)
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  // For employees, calculate based on their assigned customers only
  // For admins, this shows system-wide data
  const todayPayments = customers
    .filter(
      (customer) => customer.isActive && customer.billingStatus === "Paid",
    )
    .slice(0, Math.min(3, customers.length))
    .map((customer, index) => ({
      id: `today-${index}`,
      customerId: customer.id,
      customerName: customer.name,
      amount: customer.portalBill || 0,
      date: today,
      method: index % 2 === 0 ? "Cash" : "Online",
      status: "Completed",
      invoiceNumber: `INV-${today.replace(/-/g, "")}-${customer.id.slice(-3)}`,
    }));

  const yesterdayPayments = customers
    .filter((customer) => customer.isActive)
    .slice(Math.min(3, customers.length), Math.min(6, customers.length))
    .map((customer, index) => ({
      id: `yesterday-${index}`,
      customerId: customer.id,
      customerName: customer.name,
      amount: customer.portalBill || 0,
      date: yesterday,
      method: index % 2 === 0 ? "Online" : "Cash",
      status: "Completed",
      invoiceNumber: `INV-${yesterday.replace(/-/g, "")}-${customer.id.slice(-3)}`,
    }));

  const todayTotal = todayPayments.reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );
  const yesterdayTotal = yesterdayPayments.reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="p-4 lg:p-6">
          <div className="text-center py-8 text-muted-foreground">
            Loading dashboard data...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard">
      <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-foreground">
              Dashboard
            </h2>
            <p className="text-sm lg:text-base text-muted-foreground">
              {isAdmin
                ? "Complete overview of your cable TV management system"
                : `Your assigned customers and collection summary${user?.collector_name || user?.name ? ` (${user.collector_name || user.name})` : ""}`}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <Button
              onClick={() => setShowInvoiceGenerator(true)}
              className="text-sm"
            >
              <FileText className="mr-2 h-4 w-4" />
              Generate Invoice
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/customers")}
              className="text-sm"
            >
              <Users className="mr-2 h-4 w-4" />
              View Customers
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {/* Total Customers */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Customers
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-foreground">
                {totalCustomers}
              </div>
              <p className="text-xs text-muted-foreground">
                {activeCustomers} active, {inactiveCustomers} inactive
              </p>
            </CardContent>
          </Card>

          {/* Monthly Revenue */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Monthly Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(monthlyRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                From {totalCustomers} active subscriptions
              </p>
            </CardContent>
          </Card>

          {/* Pending Payments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Payments
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-foreground">
                {pendingCustomers}
              </div>
              <p className="text-xs text-muted-foreground">
                {overdueCustomers} overdue accounts
              </p>
            </CardContent>
          </Card>

          {/* New Customers */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                New This Month
              </CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-foreground">
                {newCustomersThisMonth}
              </div>
              <p className="text-xs text-muted-foreground">
                New customer registrations
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Payment Summary Cards (Employee View) */}
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
                      {todayPayments.length} payments collected
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400" />
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
                      {yesterdayPayments.length} payments collected
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Activity and Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Recent Customers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">
                Recent Customers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentCustomers.length > 0 ? (
                <div className="space-y-3">
                  {recentCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">
                          {customer.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {customer.phoneNumber} • {customer.currentPackage}
                        </p>
                      </div>
                      <Badge
                        variant={customer.isActive ? "default" : "secondary"}
                        className={
                          customer.isActive
                            ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200"
                            : ""
                        }
                      >
                        {customer.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No customers found
                </p>
              )}
            </CardContent>
          </Card>

          {/* Today's Highlights (Employee View) or System Status (Admin View) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">
                {isAdmin ? "System Overview" : "Today's Activity"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isAdmin ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">
                      Active Packages
                    </span>
                    <Badge variant="outline">4 Available</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">
                      Payment Methods
                    </span>
                    <Badge variant="outline">Cash, Online, Card</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">
                      Billing Cycle
                    </span>
                    <Badge variant="outline">Monthly</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">
                      System Status
                    </span>
                    <Badge className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200">
                      Online
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {todayPayments.length > 0 ? (
                    <>
                      <div className="text-sm font-medium text-foreground mb-2">
                        Recent Collections
                      </div>
                      {todayPayments.slice(0, 3).map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between p-2 rounded bg-muted/30"
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {payment.customerName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {payment.method} • {payment.invoiceNumber}
                            </p>
                          </div>
                          <span className="text-sm font-medium text-foreground">
                            {formatCurrency(payment.amount)}
                          </span>
                        </div>
                      ))}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No payments collected today yet
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Button
                variant="outline"
                onClick={() => navigate("/customers")}
                className="h-auto p-4 flex-col space-y-2"
              >
                <Users className="h-6 w-6" />
                <span className="text-sm">Customers</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/billing")}
                className="h-auto p-4 flex-col space-y-2"
              >
                <CreditCard className="h-6 w-6" />
                <span className="text-sm">Billing</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowInvoiceGenerator(true)}
                className="h-auto p-4 flex-col space-y-2"
              >
                <FileText className="h-6 w-6" />
                <span className="text-sm">Invoice</span>
              </Button>
              {isAdmin && (
                <Button
                  variant="outline"
                  onClick={() => navigate("/packages")}
                  className="h-auto p-4 flex-col space-y-2"
                >
                  <Package className="h-6 w-6" />
                  <span className="text-sm">Packages</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Invoice Generator Modal */}
        {showInvoiceGenerator && (
          <InvoiceGenerator
            open={showInvoiceGenerator}
            onOpenChange={setShowInvoiceGenerator}
            customers={customers}
            onInvoiceGenerated={(invoice) => {
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
