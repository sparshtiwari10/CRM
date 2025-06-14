import {
  MonthlyBill,
  VCBillBreakdown,
  Customer,
  VCInventoryItem,
  Package,
  CustomerFinancialSummary,
} from "@/types";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  setDoc,
  query,
  where,
  orderBy,
  Timestamp,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { authService } from "./authService";
import { VCInventoryService } from "./vcInventoryService";
import { packageService } from "./packageService";
import { CustomerService } from "./customerService";

/**
 * Optimized Bills Service with queries that don't require composite indexes
 * This is a temporary solution while the Firestore indexes are being created
 */
export class BillsServiceOptimized {
  private static readonly COLLECTION_NAME = "bills";

  // ================== OPTIMIZED QUERIES ==================

  /**
   * Get bills by customer (optimized to avoid composite index requirement)
   * This fetches all bills and filters in memory temporarily
   */
  static async getBillsByCustomerOptimized(
    customerId: string,
  ): Promise<MonthlyBill[]> {
    try {
      console.log(`🔍 Getting bills for customer ${customerId} (optimized)`);

      // Simple query without orderBy to avoid composite index requirement
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where("customerId", "==", customerId),
      );
      const querySnapshot = await getDocs(q);

      const bills = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        billDueDate: doc.data().billDueDate?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as MonthlyBill[];

      // Sort in memory instead of using Firestore orderBy
      bills.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      console.log(`✅ Found ${bills.length} bills for customer ${customerId}`);
      return bills;
    } catch (error) {
      console.error("Failed to get bills for customer (optimized):", error);
      throw error;
    }
  }

  /**
   * Get bills by month (optimized to avoid composite index requirement)
   */
  static async getBillsByMonthOptimized(month: string): Promise<MonthlyBill[]> {
    try {
      console.log(`🔍 Getting bills for month ${month} (optimized)`);

      // Simple query without orderBy to avoid composite index requirement
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where("month", "==", month),
      );
      const querySnapshot = await getDocs(q);

      const bills = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        billDueDate: doc.data().billDueDate?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as MonthlyBill[];

      // Sort in memory instead of using Firestore orderBy
      bills.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      console.log(`✅ Found ${bills.length} bills for month ${month}`);
      return bills;
    } catch (error) {
      console.error("Failed to get bills for month (optimized):", error);
      throw error;
    }
  }

  /**
   * Get all bills with basic query (no composite index needed)
   */
  static async getAllBillsOptimized(): Promise<MonthlyBill[]> {
    try {
      console.log(`🔍 Getting all bills (optimized)`);

      // Get all bills without complex sorting
      const querySnapshot = await getDocs(collection(db, this.COLLECTION_NAME));

      const bills = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        billDueDate: doc.data().billDueDate?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as MonthlyBill[];

      // Sort in memory
      bills.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      console.log(`✅ Found ${bills.length} total bills`);
      return bills;
    } catch (error) {
      console.error("Failed to get all bills (optimized):", error);
      throw error;
    }
  }

  // ================== BILL GENERATION (OPTIMIZED) ==================

  static async generateMonthlyBillsOptimized(
    targetMonth?: string,
    customerIds?: string[],
  ): Promise<{
    success: MonthlyBill[];
    failed: { customerId: string; customerName: string; error: string }[];
    summary: {
      totalCustomers: number;
      billsGenerated: number;
      totalAmount: number;
    };
  }> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error(
          "User not authenticated. Please log in to generate bills.",
        );
      }

      // Check if db is available
      if (!db) {
        throw new Error(
          "Database connection not available. Please check your internet connection.",
        );
      }

      // If no target month provided, use current month
      const month = targetMonth || new Date().toISOString().slice(0, 7); // YYYY-MM format
      const dueDays = 15; // Default due date: 15th of the month

      console.log(`🔄 Starting optimized bill generation for ${month}`);

      // Check if bills already exist for this month (using optimized query)
      const existingBills = await this.getBillsByMonthOptimized(month);
      if (existingBills.length > 0) {
        throw new Error(`Bills for ${month} already exist`);
      }

      // Get all customers or filtered customers
      let customers = await CustomerService.getAllCustomers();

      // Filter customers if specific customer IDs provided
      if (customerIds && customerIds.length > 0) {
        customers = customers.filter((customer) =>
          customerIds.includes(customer.id),
        );
      }

      console.log(`📋 Found ${customers.length} customers`);

      const success: MonthlyBill[] = [];
      const failed: {
        customerId: string;
        customerName: string;
        error: string;
      }[] = [];
      let totalAmount = 0;

      // Calculate due date
      const [year, monthNum] = month.split("-");
      const dueDate = new Date(parseInt(year), parseInt(monthNum), dueDays);

      for (const customer of customers) {
        try {
          const bill = await this.generateBillForCustomerOptimized(
            customer,
            month,
            dueDate,
          );

          if (bill) {
            success.push(bill);
            totalAmount += bill.totalAmount;
            console.log(
              `✅ Bill generated for ${customer.name}: ₹${bill.totalAmount}`,
            );
          }
        } catch (error) {
          console.error(
            `❌ Failed to generate bill for ${customer.name}:`,
            error,
          );
          failed.push({
            customerId: customer.id,
            customerName: customer.name,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      console.log(
        `✅ Optimized bill generation completed: ${success.length} bills created`,
      );

      return {
        success,
        failed,
        summary: {
          totalCustomers: customers.length,
          billsGenerated: success.length,
          totalAmount,
        },
      };
    } catch (error) {
      console.error("Failed to generate monthly bills (optimized):", error);
      throw error;
    }
  }

  private static async generateBillForCustomerOptimized(
    customer: Customer,
    month: string,
    dueDate: Date,
  ): Promise<MonthlyBill | null> {
    try {
      // Check if db is available
      if (!db) {
        throw new Error(
          "Database connection not available. Please check your internet connection.",
        );
      }

      // Validate inputs
      if (!customer || !customer.id) {
        throw new Error("Invalid customer data provided.");
      }

      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        throw new Error("Invalid month format. Expected YYYY-MM format.");
      }

      console.log(
        `🔄 Generating bill for ${customer.name} (${customer.id}) for month ${month}`,
      );

      // Get active VCs for this customer
      const activeVCs = await VCInventoryService.getActiveVCsByCustomer(
        customer.id,
      ).catch((error) => {
        console.warn(`Failed to get VCs for ${customer.name}:`, error);
        return [];
      });

      if (activeVCs.length === 0) {
        console.log(`⚠️ No active VCs for ${customer.name}, skipping bill`);
        return null;
      }

      // Get all packages for pricing
      const packages = await packageService.getAllPackages().catch((error) => {
        console.warn(`Failed to get packages:`, error);
        return [];
      });

      if (packages.length === 0) {
        throw new Error(
          "No packages available. Please configure packages first.",
        );
      }

      const packageMap = new Map(packages.map((p) => [p.id, p]));

      // Build VC breakdown
      const vcBreakdown: VCBillBreakdown[] = [];
      let totalAmount = 0;

      for (const vc of activeVCs) {
        const pkg = packageMap.get(vc.packageId);
        if (!pkg) {
          console.warn(`Package not found for VC ${vc.vcNumber}`);
          continue;
        }

        const vcBill: VCBillBreakdown = {
          vcNumber: vc.vcNumber,
          packageId: vc.packageId,
          packageName: pkg.name,
          amount: pkg.price,
        };

        vcBreakdown.push(vcBill);
        totalAmount += pkg.price;
      }

      if (vcBreakdown.length === 0) {
        console.log(`⚠️ No valid packages for ${customer.name}, skipping bill`);
        return null;
      }

      // Create bill document
      const billData: Omit<MonthlyBill, "id"> = {
        customerId: customer.id,
        customerName: customer.name,
        month,
        vcBreakdown,
        totalAmount,
        billDueDate: dueDate,
        status: "generated",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const docData = {
        ...billData,
        customerArea: customer.collectorName || "unknown", // Add for Firestore rules
        billDueDate: Timestamp.fromDate(dueDate),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      console.log(`📝 Creating bill document for ${customer.name}:`, {
        ...docData,
        billDueDate: "[Date object]",
        createdAt: "[Timestamp object]",
        updatedAt: "[Timestamp object]",
      });

      const docRef = await addDoc(
        collection(db, this.COLLECTION_NAME),
        docData,
      );

      const bill: MonthlyBill = {
        id: docRef.id,
        ...billData,
      };

      // Update customer's current outstanding (using optimized query)
      await this.updateCustomerOutstandingOptimized(customer.id);

      return bill;
    } catch (error) {
      console.error(
        `Failed to generate bill for customer ${customer.id}:`,
        error,
      );
      throw error;
    }
  }

  // ================== FINANCIAL CALCULATIONS (OPTIMIZED) ==================

  static async updateCustomerOutstandingOptimized(
    customerId: string,
  ): Promise<void> {
    try {
      console.log(
        `🔄 Updating outstanding for customer ${customerId} (optimized)`,
      );

      // Get all unpaid bills for this customer (using optimized query)
      const customerBills = await this.getBillsByCustomerOptimized(customerId);
      const unpaidBills = customerBills.filter(
        (bill) => bill.status !== "paid",
      );
      const totalUnpaidBills = unpaidBills.reduce(
        (sum, bill) => sum + bill.totalAmount,
        0,
      );

      // Get all payments for this customer (simplified approach)
      // Note: This is a simplified version to avoid complex queries
      const totalPaid = 0; // Placeholder - would need separate payment tracking

      const currentOutstanding = totalUnpaidBills - totalPaid;

      console.log(
        `💰 Customer ${customerId} outstanding: ₹${currentOutstanding}`,
      );

      // Update customer record
      await CustomerService.updateCustomer(customerId, {
        currentOutstanding,
        updatedAt: new Date(),
      });

      console.log(`✅ Customer outstanding updated successfully`);
    } catch (error) {
      console.error(
        "Failed to update customer outstanding (optimized):",
        error,
      );
      // Don't throw error here to avoid breaking bill generation
      console.warn("⚠️ Continuing without updating customer outstanding");
    }
  }
}
