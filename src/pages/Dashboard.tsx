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
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  // Load customers data
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        setIsLoading(true);
        const customersData = await CustomerService.getAllCustomers();
        setCustomers(customersData);
      } catch (error) {
        console.error("Failed to load customers:", error);
        setCustomers([]); // Set empty array on error
      } finally {
        setIsLoading(false);
      }
    };

    loadCustomers();
  }, []);

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

  const recentCustomers = customers.slice(0, 5);

  // Mock payment data for today/yesterday (for employee view)
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  // For now, create mock payments from recent customers for demonstration
  const todayPayments = customers.slice(0, 3).map((customer, index) => ({
    id: `today-${index}`,
    customerId: customer.id,
    customerName: customer.name,
    amount: customer.portalBill || 0,
    date: today,
    status: "Paid" as const,
    method: "Cash" as const,
  }));

  const yesterdayPayments = customers.slice(3, 6).map((customer, index) => ({
    id: `yesterday-${index}`,
    customerId: customer.id,
    customerName: customer.name,
    amount: customer.portalBill || 0,
    date: yesterday,
    status: "Paid" as const,
    method: "Online" as const,
  }));

  const todayTotal = todayPayments.reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );
  const yesterdayTotal = yesterdayPayments.reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );

  // Combine recent payments for the Recent Payments section
  const recentPayments = [...todayPayments, ...yesterdayPayments].slice(0, 5);

  // Create empty state message when no customers exist
  const hasCustomers = customers.length > 0;

  const StatCard = ({
    title,
    value,
    icon: Icon,
    change,
    changeType,
  }: {
    title: string;
    value: string | number;
    icon: any;
    change?: string;
    changeType?: "positive" | "negative" | "neutral";
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-gray-600" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <p
            className={`text-xs ${
              changeType === "positive"
                ? "text-green-600"
                : changeType === "negative"
                  ? "text-red-600"
                  : "text-gray-600"
            }`}
          >
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  );

  // Quick action handlers for admins
  const handleAddCustomer = () => {
    if (isAdmin) {
      navigate("/customers");
      setTimeout(() => {
        toast({
          title: "Add Customer",
          description:
            "Click the 'Add New Customer' button to create a new customer.",
        });
      }, 100);
    } else {
      toast({
        title: "Access Denied",
        description: "Only administrators can add new customers.",
        variant: "destructive",
      });
    }
  };

  const handleProcessPayment = () => {
    navigate("/billing");
    toast({
      title: "Process Payment",
      description: "Navigate to payments section to process customer payments.",
    });
  };

  const handleManagePackages = () => {
    if (isAdmin) {
      navigate("/packages");
      toast({
        title: "Manage Packages",
        description: "Navigate to packages section to manage service packages.",
      });
    } else {
      toast({
        title: "Access Denied",
        description: "Only administrators can manage packages.",
        variant: "destructive",
      });
    }
  };

  const handleViewAlerts = () => {
    toast({
      title: "System Alerts",
      description: `You have ${overdueCustomers} overdue accounts and ${pendingCustomers} pending payments.`,
    });
  };

  const handleGenerateRequest = () => {
    navigate("/requests");
    toast({
      title: "Generate Request",
      description: "Navigate to requests section to create a new request.",
    });
  };

  // Render admin dashboard
  if (isAdmin) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="p-6 space-y-6">
          {/* Admin Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Customers"
              value={isLoading ? "..." : totalCustomers.toLocaleString()}
              icon={Users}
              change={
                totalCustomers > 0
                  ? `${activeCustomers} active, ${inactiveCustomers} inactive`
                  : "No customers yet"
              }
              changeType={totalCustomers > 0 ? "positive" : "neutral"}
            />
            <StatCard
              title="Active Customers"
              value={isLoading ? "..." : activeCustomers.toLocaleString()}
              icon={TrendingUp}
              change={
                activeCustomers > 0
                  ? `${pendingCustomers} pending payments`
                  : "No active customers"
              }
              changeType={activeCustomers > 0 ? "positive" : "neutral"}
            />
            <StatCard
              title="Monthly Revenue"
              value={isLoading ? "..." : `₹${totalRevenue.toLocaleString()}`}
              icon={DollarSign}
              change={
                totalRevenue > 0
                  ? `From ${totalCustomers} customers`
                  : "No revenue yet"
              }
              changeType={totalRevenue > 0 ? "positive" : "neutral"}
            />
            <StatCard
              title="Pending Payments"
              value={isLoading ? "..." : pendingCustomers}
              icon={Clock}
              change={
                overdueCustomers > 0
                  ? `${overdueCustomers} overdue`
                  : pendingCustomers > 0
                    ? "All pending on time"
                    : "No pending payments"
              }
              changeType={
                overdueCustomers > 0
                  ? "negative"
                  : pendingCustomers > 0
                    ? "neutral"
                    : "positive"
              }
            />
          </div>

          {/* Admin Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>Quick Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button
                  className="h-16 flex flex-col space-y-2 hover:bg-blue-600"
                  onClick={handleAddCustomer}
                >
                  <UserPlus className="h-6 w-6" />
                  <span>Add Customer</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-16 flex flex-col space-y-2 hover:bg-gray-50"
                  onClick={handleProcessPayment}
                >
                  <CreditCard className="h-6 w-6" />
                  <span>Process Payment</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-16 flex flex-col space-y-2 hover:bg-gray-50"
                  onClick={handleManagePackages}
                >
                  <Package className="h-6 w-6" />
                  <span>Manage Packages</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-16 flex flex-col space-y-2 hover:bg-gray-50"
                  onClick={handleViewAlerts}
                >
                  <AlertCircle className="h-6 w-6" />
                  <span>View Alerts</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Customers */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Customers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isLoading ? (
                    <div className="text-center py-4 text-gray-500">
                      Loading customers...
                    </div>
                  ) : recentCustomers.length > 0 ? (
                    recentCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        className="flex items-center justify-between py-2"
                      >
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-sm text-gray-500">
                            {customer.currentPackage}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            customer.billingStatus === "Paid"
                              ? "bg-green-100 text-green-800"
                              : customer.billingStatus === "Pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }
                        >
                          {customer.billingStatus}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p>No customers yet</p>
                      <p className="text-sm">
                        Start by adding your first customer
                      </p>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate("/customers")}
                    >
                      View All Customers
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Payments */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isLoading ? (
                    <div className="text-center py-4 text-gray-500">
                      Loading payments...
                    </div>
                  ) : recentPayments.length > 0 ? (
                    recentPayments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between py-2"
                      >
                        <div>
                          <p className="font-medium">{payment.customerName}</p>
                          <p className="text-sm text-gray-500">
                            {payment.method} •{" "}
                            {new Date(payment.date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            ₹{payment.amount.toLocaleString()}
                          </p>
                          <Badge
                            variant="outline"
                            className="bg-green-100 text-green-800"
                          >
                            {payment.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p>No payments yet</p>
                      <p className="text-sm">
                        Payments will appear here once customers are added
                      </p>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate("/billing")}
                    >
                      View All Payments
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Admin Alerts Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                <span>System Alerts</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-red-800">
                      {overdueCustomers} Overdue Accounts
                    </p>
                    <p className="text-sm text-red-600">
                      Multiple customers have overdue payments requiring
                      immediate attention.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/customers")}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    View
                  </Button>
                </div>

                <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-yellow-800">
                      {pendingCustomers} Pending Payments
                    </p>
                    <p className="text-sm text-yellow-600">
                      Payments due within the next 7 days.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/billing")}
                    className="text-yellow-600 border-yellow-300 hover:bg-yellow-50"
                  >
                    Review
                  </Button>
                </div>

                <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-green-800">
                      {totalCustomers} New Customers This Month
                    </p>
                    <p className="text-sm text-green-600">
                      Customer acquisition is up 12% compared to last month.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/customers")}
                    className="text-green-600 border-green-300 hover:bg-green-50"
                  >
                    View
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Render employee dashboard (restricted content with mobile-optimized containers)
  return (
    <DashboardLayout title="Employee Dashboard">
      <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
        {/* Employee: Compact Today & Yesterday Billing Containers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-6">
          <Card className="compact-mobile">
            <CardHeader className="pb-2 lg:pb-3">
              <CardTitle className="text-base lg:text-lg font-medium text-gray-900 flex items-center space-x-2">
                <DollarSign className="h-4 w-4 lg:h-5 lg:w-5 text-green-600" />
                <span>Today's Billing</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl lg:text-3xl font-bold text-green-600">
                ₹{todayTotal.toFixed(2)}
              </div>
              <p className="text-xs lg:text-sm text-gray-600 mt-1">
                {todayPayments.length} invoices generated today
              </p>
              <div className="mt-2 lg:mt-4 space-y-1 lg:space-y-2">
                <div className="text-xs text-gray-500">Status breakdown:</div>
                <div className="flex space-x-2 lg:space-x-4 text-xs">
                  <span className="text-green-600">
                    Paid:{" "}
                    {
                      todayPayments.filter((r) => r.status === "Completed")
                        .length
                    }
                  </span>
                  <span className="text-yellow-600">
                    Pending:{" "}
                    {todayPayments.filter((r) => r.status === "Pending").length}
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
              <div className="text-2xl lg:text-3xl font-bold text-blue-600">
                ₹{yesterdayTotal.toFixed(2)}
              </div>
              <p className="text-xs lg:text-sm text-gray-600 mt-1">
                {yesterdayPayments.length} invoices generated yesterday
              </p>
              <div className="mt-2 lg:mt-4 space-y-1 lg:space-y-2">
                <div className="text-xs text-gray-500">Status breakdown:</div>
                <div className="flex space-x-2 lg:space-x-4 text-xs">
                  <span className="text-green-600">
                    Paid:{" "}
                    {
                      yesterdayPayments.filter((r) => r.status === "Completed")
                        .length
                    }
                  </span>
                  <span className="text-yellow-600">
                    Pending:{" "}
                    {
                      yesterdayPayments.filter((r) => r.status === "Pending")
                        .length
                    }
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Employee: Action Buttons */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5" />
              <span>Employee Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                className="h-16 flex flex-col space-y-2 hover:bg-blue-600"
                onClick={() => setShowInvoiceGenerator(true)}
              >
                <FileText className="h-6 w-6" />
                <span>Generate Invoice</span>
              </Button>
              <Button
                variant="outline"
                className="h-16 flex flex-col space-y-2 hover:bg-gray-50"
                onClick={handleGenerateRequest}
              >
                <ClipboardList className="h-6 w-6" />
                <span>Generate Request</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Employee: Today's Payments */}
          <Card>
            <CardHeader>
              <CardTitle>Today's Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {todayPayments.length > 0 ? (
                  todayPayments.slice(0, 5).map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between py-2"
                    >
                      <div>
                        <p className="font-medium">{payment.customerName}</p>
                        <p className="text-sm text-gray-500">
                          {payment.method} •{" "}
                          {new Date(payment.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₹{payment.amount}</p>
                        <Badge
                          variant="outline"
                          className="bg-green-100 text-green-800"
                        >
                          {payment.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-4">
                    No payments today
                  </p>
                )}

                <div className="pt-4 border-t">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate("/billing")}
                  >
                    View Today's Billing
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employee: Yesterday's Payments */}
          <Card>
            <CardHeader>
              <CardTitle>Yesterday's Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {yesterdayPayments.length > 0 ? (
                  yesterdayPayments.slice(0, 5).map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between py-2"
                    >
                      <div>
                        <p className="font-medium">{payment.customerName}</p>
                        <p className="text-sm text-gray-500">
                          {payment.method} •{" "}
                          {new Date(payment.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₹{payment.amount}</p>
                        <Badge
                          variant="outline"
                          className="bg-green-100 text-green-800"
                        >
                          {payment.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-4">
                    No payments yesterday
                  </p>
                )}

                <div className="pt-4 border-t">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate("/billing")}
                  >
                    View Yesterday's Billing
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoice Generator Modal */}
        <InvoiceGenerator
          open={showInvoiceGenerator}
          onOpenChange={setShowInvoiceGenerator}
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
