import { Users, DollarSign, TrendingUp, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Customer } from "@/types";
import { packageService } from "@/services/packageService";

interface PackageMetricsProps {
  package: Package;
  customers: Customer[];
}

export function PackageMetrics({
  package: pkg,
  customers,
}: PackageMetricsProps) {
  // Calculate metrics using packageService
  const customerCount = packageService.getCustomerCount(pkg.name, customers);
  const monthlyRevenue = packageService.getTotalRevenue(
    pkg.name,
    [pkg],
    customers,
  );
  const yearlyRevenue = monthlyRevenue * 12;

  // Calculate average revenue per customer (should be same as package price, but good for consistency)
  const avgRevenuePerCustomer =
    customerCount > 0 ? monthlyRevenue / customerCount : 0;

  // Calculate market share
  const marketSharePercentage =
    customers.length > 0 ? (customerCount / customers.length) * 100 : 0;

  return (
    <div className="space-y-3">
      {/* Primary Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Customers</p>
                <p className="text-xl font-bold text-foreground">
                  {customerCount}
                </p>
              </div>
              <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Monthly Revenue
                </p>
                <p className="text-xl font-bold text-foreground">
                  ₹{monthlyRevenue.toLocaleString()}
                </p>
              </div>
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950 rounded-lg">
                <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center">
            <TrendingUp className="h-3 w-3 mr-1" />
            Yearly Revenue:
          </span>
          <span className="font-medium text-foreground">
            ₹{yearlyRevenue.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Revenue per Customer:</span>
          <span className="font-medium text-foreground">
            ₹{Math.round(avgRevenuePerCustomer).toLocaleString()}/mo
          </span>
        </div>
      </div>

      {/* No customers warning */}
      {customerCount === 0 && (
        <div className="flex items-center justify-center text-xs text-amber-600 dark:text-amber-400">
          <AlertCircle className="h-3 w-3 mr-1" />
          No customers using this package
        </div>
      )}

      {/* Market Share Info */}
      {customers.length > 0 && (
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Market Share:</span>
            <span className="font-medium text-foreground">
              {marketSharePercentage.toFixed(1)}%
            </span>
          </div>
          <div className="mt-1 w-full bg-muted rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${marketSharePercentage}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
