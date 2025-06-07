import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  DollarSign,
  AlertCircle,
  TrendingUp,
  Package,
  CreditCard,
  UserPlus,
  Clock,
} from "lucide-react";
import {
  mockDashboardStats,
  mockCustomers,
  mockPayments,
} from "@/data/mockData";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const stats = mockDashboardStats;
  const recentCustomers = mockCustomers.slice(0, 5);
  const recentPayments = mockPayments.slice(0, 5);

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

  // Quick action handlers
  const handleAddCustomer = () => {
    if (isAdmin) {
      navigate("/customers");
      // Small delay to ensure navigation completes, then trigger add customer
      setTimeout(() => {
        // This would trigger the add customer modal
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
    navigate("/payments");
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
      description: `You have ${stats.overdueAccounts} overdue accounts and ${stats.pendingPayments} pending payments.`,
    });
  };

  return (
    <DashboardLayout title="Dashboard">
      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Customers"
            value={stats.totalCustomers.toLocaleString()}
            icon={Users}
            change="+5.2% from last month"
            changeType="positive"
          />
          <StatCard
            title="Active Customers"
            value={stats.activeCustomers.toLocaleString()}
            icon={TrendingUp}
            change="+2.1% from last month"
            changeType="positive"
          />
          <StatCard
            title="Monthly Revenue"
            value={`$${stats.monthlyRevenue.toLocaleString()}`}
            icon={DollarSign}
            change="+8.3% from last month"
            changeType="positive"
          />
          <StatCard
            title="Pending Payments"
            value={stats.pendingPayments}
            icon={Clock}
            change="3 less than yesterday"
            changeType="positive"
          />
        </div>

        {/* Quick Actions */}
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
                {recentCustomers.map((customer) => (
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
                ))}

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
                {recentPayments.map((payment) => (
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
                      <p className="font-medium">${payment.amount}</p>
                      <Badge
                        variant="outline"
                        className="bg-green-100 text-green-800"
                      >
                        {payment.status}
                      </Badge>
                    </div>
                  </div>
                ))}

                <div className="pt-4 border-t">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate("/payments")}
                  >
                    View All Payments
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts Section */}
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
                    {stats.overdueAccounts} Overdue Accounts
                  </p>
                  <p className="text-sm text-red-600">
                    Multiple customers have overdue payments requiring immediate
                    attention.
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
                    {stats.pendingPayments} Pending Payments
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
                    {stats.newCustomersThisMonth} New Customers This Month
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
