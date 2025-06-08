import { Users, DollarSign, TrendingUp, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Customer } from "@/types";

interface PackageMetricsProps {
  package: Package;
  customers: Customer[];
}

export function PackageMetrics({
  package: pkg,
  customers,
}: PackageMetricsProps) {
  // Calculate metrics
  const customerCount = customers.filter(
    (customer) => customer.currentPackage === pkg.name,
  ).length;

  const monthlyRevenue = customerCount * pkg.price;
  const yearlyRevenue = monthlyRevenue * 12;

  // Calculate average revenue per customer (should be same as package price, but good for consistency)
  const avgRevenuePerCustomer =
    customerCount > 0 ? monthlyRevenue / customerCount : 0;

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
              <div className="p-2 bg-blue-50 rounded-lg">
                <Users className="h-4 w-4 text-blue-600" />
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
                  ${monthlyRevenue.toFixed(2)}
                </p>
              </div>
              <div className="p-2 bg-green-50 rounded-lg">
                <DollarSign className="h-4 w-4 text-green-600" />
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
            ${yearlyRevenue.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Revenue per Customer:</span>
          <span className="font-medium text-foreground">
            ${avgRevenuePerCustomer.toFixed(2)}/mo
          </span>
        </div>
      </div>

      {/* No customers warning */}
      {customerCount === 0 && (
        <div className="flex items-center justify-center text-xs text-amber-600">
          <AlertCircle className="h-3 w-3 mr-1" />
          No customers
        </div>
      )}

      {/* Market Share Info */}
      {customers.length > 0 && (
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Market Share:</span>
            <span className="font-medium">
              {((customerCount / customers.length) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(customerCount / customers.length) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
