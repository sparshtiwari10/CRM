import { Package, Customer } from "@/types";
import { firestoreService } from "./firestoreService";

export interface PackageMetrics {
  totalPackages: number;
  activePackages: number;
  inactivePackages: number;
  totalCustomers: number;
  totalRevenue: number;
  averageRevenuePerCustomer: number;
  averageRevenuePerPackage: number;
  packageUsageStats: PackageUsageStats[];
}

export interface PackageUsageStats {
  packageId: string;
  packageName: string;
  price: number;
  customerCount: number;
  revenue: number;
  isActive: boolean;
  usagePercentage: number;
}

class PackageService {
  /**
   * Get all packages from Firestore
   */
  async getAllPackages(): Promise<Package[]> {
    try {
      console.log("📦 Fetching packages from Firestore...");
      const packages = await firestoreService.getAllPackages();
      console.log(`✅ Successfully loaded ${packages.length} packages`);
      return packages;
    } catch (error) {
      console.error("❌ Failed to fetch packages:", error);
      throw error;
    }
  }

  /**
   * Get a specific package by ID
   */
  async getPackage(packageId: string): Promise<Package> {
    try {
      return await firestoreService.getPackage(packageId);
    } catch (error) {
      console.error("❌ Failed to fetch package:", error);
      throw error;
    }
  }

  /**
   * Create a new package
   */
  async createPackage(packageData: Omit<Package, "id">): Promise<string> {
    try {
      return await firestoreService.addPackage(packageData);
    } catch (error) {
      console.error("❌ Failed to create package:", error);
      throw error;
    }
  }

  /**
   * Update an existing package
   */
  async updatePackage(
    packageId: string,
    packageData: Partial<Package>,
  ): Promise<void> {
    try {
      await firestoreService.updatePackage(packageId, packageData);
    } catch (error) {
      console.error("❌ Failed to update package:", error);
      throw error;
    }
  }

  /**
   * Delete a package
   */
  async deletePackage(packageId: string): Promise<void> {
    try {
      await firestoreService.deletePackage(packageId);
    } catch (error) {
      console.error("❌ Failed to delete package:", error);
      throw error;
    }
  }

  /**
   * Calculate comprehensive package metrics
   */
  calculatePackageMetrics(
    packages: Package[],
    customers: Customer[],
  ): PackageMetrics {
    const totalPackages = packages.length;
    const activePackages = packages.filter((pkg) => pkg.isActive).length;
    const inactivePackages = totalPackages - activePackages;

    // Calculate package usage statistics
    const packageUsageStats: PackageUsageStats[] = packages.map((pkg) => {
      const customerCount = this.getCustomerCount(pkg.name, customers);
      const revenue = customerCount * pkg.price;
      const usagePercentage =
        customers.length > 0 ? (customerCount / customers.length) * 100 : 0;

      return {
        packageId: pkg.id,
        packageName: pkg.name,
        price: pkg.price,
        customerCount,
        revenue,
        isActive: pkg.isActive,
        usagePercentage,
      };
    });

    // Calculate totals
    const totalCustomers = customers.length;
    const totalRevenue = packageUsageStats.reduce(
      (sum, stat) => sum + stat.revenue,
      0,
    );
    const averageRevenuePerCustomer =
      totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
    const averageRevenuePerPackage =
      totalPackages > 0 ? totalRevenue / totalPackages : 0;

    return {
      totalPackages,
      activePackages,
      inactivePackages,
      totalCustomers,
      totalRevenue,
      averageRevenuePerCustomer,
      averageRevenuePerPackage,
      packageUsageStats,
    };
  }

  /**
   * Get customer count for a specific package
   */
  getCustomerCount(packageName: string, customers: Customer[]): number {
    let count = 0;

    customers.forEach((customer) => {
      // Check primary package
      if (customer.currentPackage === packageName) {
        count++;
      } else {
        // Check secondary connections
        customer.connections?.forEach((connection) => {
          if (connection.planName === packageName && !connection.isPrimary) {
            count++;
          }
        });
      }
    });

    return count;
  }

  /**
   * Get total revenue for a specific package
   */
  getTotalRevenue(
    packageName: string,
    packages: Package[],
    customers: Customer[],
  ): number {
    const pkg = packages.find((p) => p.name === packageName);
    if (!pkg) return 0;

    const customerCount = this.getCustomerCount(packageName, customers);
    return customerCount * pkg.price;
  }

  /**
   * Get packages with their usage statistics
   */
  getPackagesWithStats(
    packages: Package[],
    customers: Customer[],
  ): (Package & {
    customerCount: number;
    revenue: number;
    usagePercentage: number;
  })[] {
    return packages.map((pkg) => {
      const customerCount = this.getCustomerCount(pkg.name, customers);
      const revenue = customerCount * pkg.price;
      const usagePercentage =
        customers.length > 0 ? (customerCount / customers.length) * 100 : 0;

      return {
        ...pkg,
        customerCount,
        revenue,
        usagePercentage,
      };
    });
  }

  /**
   * Get most popular packages (by customer count)
   */
  getMostPopularPackages(
    packages: Package[],
    customers: Customer[],
    limit: number = 5,
  ): (Package & { customerCount: number; revenue: number })[] {
    const packagesWithStats = this.getPackagesWithStats(packages, customers);

    return packagesWithStats
      .sort((a, b) => b.customerCount - a.customerCount)
      .slice(0, limit)
      .map(({ usagePercentage, ...pkg }) => pkg);
  }

  /**
   * Get highest revenue packages
   */
  getHighestRevenuePackages(
    packages: Package[],
    customers: Customer[],
    limit: number = 5,
  ): (Package & { customerCount: number; revenue: number })[] {
    const packagesWithStats = this.getPackagesWithStats(packages, customers);

    return packagesWithStats
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)
      .map(({ usagePercentage, ...pkg }) => pkg);
  }

  /**
   * Get package utilization report
   */
  getPackageUtilizationReport(
    packages: Package[],
    customers: Customer[],
  ): {
    totalPackages: number;
    activePackages: number;
    unusedPackages: Package[];
    mostUsedPackages: Package[];
    leastUsedPackages: Package[];
    revenueDistribution: {
      packageName: string;
      revenue: number;
      percentage: number;
    }[];
  } {
    const packagesWithStats = this.getPackagesWithStats(packages, customers);
    const totalRevenue = packagesWithStats.reduce(
      (sum, pkg) => sum + pkg.revenue,
      0,
    );

    const unusedPackages = packagesWithStats.filter(
      (pkg) => pkg.customerCount === 0,
    );
    const usedPackages = packagesWithStats.filter(
      (pkg) => pkg.customerCount > 0,
    );

    const mostUsedPackages = usedPackages
      .sort((a, b) => b.customerCount - a.customerCount)
      .slice(0, 3);

    const leastUsedPackages = usedPackages
      .sort((a, b) => a.customerCount - b.customerCount)
      .slice(0, 3);

    const revenueDistribution = packagesWithStats.map((pkg) => ({
      packageName: pkg.name,
      revenue: pkg.revenue,
      percentage: totalRevenue > 0 ? (pkg.revenue / totalRevenue) * 100 : 0,
    }));

    return {
      totalPackages: packages.length,
      activePackages: packages.filter((pkg) => pkg.isActive).length,
      unusedPackages,
      mostUsedPackages,
      leastUsedPackages,
      revenueDistribution,
    };
  }

  /**
   * Validate package can be deleted safely
   */
  async validatePackageDeletion(
    packageId: string,
    customers: Customer[],
  ): Promise<{
    canDelete: boolean;
    reason?: string;
    affectedCustomers?: string[];
  }> {
    try {
      const pkg = await this.getPackage(packageId);
      const affectedCustomers: string[] = [];

      customers.forEach((customer) => {
        // Check primary package
        if (customer.currentPackage === pkg.name) {
          affectedCustomers.push(
            `${customer.name} (Primary: ${customer.vcNumber})`,
          );
        }

        // Check secondary connections
        customer.connections?.forEach((connection) => {
          if (connection.planName === pkg.name && !connection.isPrimary) {
            affectedCustomers.push(
              `${customer.name} (Secondary: ${connection.vcNumber})`,
            );
          }
        });
      });

      if (affectedCustomers.length > 0) {
        return {
          canDelete: false,
          reason: `Package "${pkg.name}" is currently assigned to ${affectedCustomers.length} customer connection(s)`,
          affectedCustomers,
        };
      }

      return { canDelete: true };
    } catch (error) {
      return {
        canDelete: false,
        reason:
          "Failed to validate package deletion: " + (error as Error).message,
      };
    }
  }
}

export const packageService = new PackageService();
