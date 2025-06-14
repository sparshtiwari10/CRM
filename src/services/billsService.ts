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
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { authService } from "./authService";
import { VCInventoryService } from "./vcInventoryService";
import { packageService } from "./packageService";
import { CustomerService } from "./customerService";

export class BillsService {
  private static readonly COLLECTION_NAME = "bills";

  // ================== BILL CRUD ==================

  static async getAllBills(): Promise<MonthlyBill[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        orderBy("createdAt", "desc"),
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        billDueDate: doc.data().billDueDate || new Date().toISOString(),
        createdAt: doc.data().createdAt || new Date().toISOString(),
        updatedAt: doc.data().updatedAt || new Date().toISOString(),
      })) as MonthlyBill[];
    } catch (error: any) {
      console.error("Failed to get bills:", error);

      // Check if it's a permissions error
      if (error.code === "permission-denied") {
        console.warn(
          "🚨 Permission denied for bills collection. This may be because:",
        );
        console.warn("1. Firestore rules need to be updated");
        console.warn("2. Collection doesn't exist yet");
        console.warn("3. User doesn't have proper access");

        // Return empty array as fallback for permission errors
        return [];
      }

      throw error;
    }
  }

  static async getBillsByCustomer(customerId: string): Promise<MonthlyBill[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where("customerId", "==", customerId),
        orderBy("createdAt", "desc"),
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        billDueDate: doc.data().billDueDate?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as MonthlyBill[];
    } catch (error: any) {
      console.error("Failed to get bills for customer:", error);

      // If it's an index error, fall back to optimized query
      if (error.message && error.message.includes("requires an index")) {
        console.warn("🔄 Index not ready, falling back to optimized query...");
        const { BillsServiceOptimized } = await import(
          "./billsServiceOptimized"
        );
        return await BillsServiceOptimized.getBillsByCustomerOptimized(
          customerId,
        );
      }

      throw error;
    }
  }

  static async getBillsByMonth(month: string): Promise<MonthlyBill[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where("month", "==", month),
        orderBy("createdAt", "desc"),
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        billDueDate: doc.data().billDueDate?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as MonthlyBill[];
    } catch (error: any) {
      console.error("Failed to get bills for month:", error);

      // If it's an index error, fall back to optimized query
      if (error.message && error.message.includes("requires an index")) {
        console.warn("🔄 Index not ready, falling back to optimized query...");
        const { BillsServiceOptimized } = await import(
          "./billsServiceOptimized"
        );
        return await BillsServiceOptimized.getBillsByMonthOptimized(month);
      }

      throw error;
    }
  }

  static async getBill(billId: string): Promise<MonthlyBill> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, billId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error("Bill not found");
      }

      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        billDueDate: data.billDueDate?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as MonthlyBill;
    } catch (error) {
      console.error("Failed to get bill:", error);
      throw error;
    }
  }

  // ================== AUTO BILLING SETTINGS ==================

  static async getAutoBillingSettings(): Promise<{
    enabled: boolean;
    lastRunDate?: Date;
    dayOfMonth: number;
  }> {
    try {
      const settingsRef = doc(db, "settings", "auto_billing");
      const settingsDoc = await getDoc(settingsRef);

      if (!settingsDoc.exists()) {
        return { enabled: false, dayOfMonth: 1 };
      }

      const data = settingsDoc.data();
      return {
        enabled: data.enabled || false,
        lastRunDate: data.lastRunDate?.toDate(),
        dayOfMonth: data.dayOfMonth || 1,
      };
    } catch (error) {
      console.error("Failed to get auto billing settings:", error);
      return { enabled: false, dayOfMonth: 1 };
    }
  }

  static async updateAutoBillingSettings(settings: {
    enabled: boolean;
    dayOfMonth?: number;
  }): Promise<void> {
    try {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser || currentUser.role !== "admin") {
        throw new Error("Only admins can modify auto billing settings");
      }

      const settingsRef = doc(db, "settings", "auto_billing");

      // Use setDoc to create or update the document
      await setDoc(
        settingsRef,
        {
          enabled: settings.enabled,
          dayOfMonth: settings.dayOfMonth || 1,
          updatedAt: Timestamp.now(),
          updatedBy: currentUser.uid,
        },
        { merge: true },
      );
    } catch (error) {
      console.error("Failed to update auto billing settings:", error);
      throw error;
    }
  }

  static async runAutoBillingCheck(): Promise<boolean> {
    try {
      const settings = await this.getAutoBillingSettings();

      if (!settings.enabled) {
        return false;
      }

      const now = new Date();
      const currentDay = now.getDate();

      // Check if we should run auto billing today
      if (currentDay !== settings.dayOfMonth) {
        return false;
      }

      // Check if we already ran this month
      if (settings.lastRunDate) {
        const lastRun = new Date(settings.lastRunDate);
        if (
          lastRun.getFullYear() === now.getFullYear() &&
          lastRun.getMonth() === now.getMonth()
        ) {
          return false; // Already ran this month
        }
      }

      // Run auto billing
      const result = await this.generateMonthlyBills();

      // Update last run date
      const settingsRef = doc(db, "settings", "auto_billing");
      await updateDoc(settingsRef, {
        lastRunDate: Timestamp.now(),
      });

      console.log(
        `🤖 Auto billing completed: ${result.success.length} bills generated`,
      );
      return true;
    } catch (error) {
      console.error("Failed to run auto billing check:", error);
      return false;
    }
  }

  // ================== BILL GENERATION ==================

  static async generateMonthlyBills(
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
        throw new Error("User not authenticated");
      }

      // If no target month provided, use current month
      const month = targetMonth || new Date().toISOString().slice(0, 7); // YYYY-MM format
      const dueDays = 15; // Default due date: 15th of the month

      console.log(`🔄 Starting bill generation for ${month}`);

      // Check if bills already exist for this month
      let existingBills;
      try {
        existingBills = await this.getBillsByMonth(month);
      } catch (error: any) {
        if (error.message && error.message.includes("requires an index")) {
          console.warn(
            "🔄 Index not ready, using optimized bill generation...",
          );
          const { BillsServiceOptimized } = await import(
            "./billsServiceOptimized"
          );
          return await BillsServiceOptimized.generateMonthlyBillsOptimized(
            targetMonth,
            customerIds,
          );
        }
        throw error;
      }

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
          const bill = await this.generateBillForCustomer(
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
        `✅ Bill generation completed: ${success.length} bills created`,
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
      console.error("Failed to generate monthly bills:", error);
      throw error;
    }
  }

  private static async generateBillForCustomer(
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

      // Update customer's current outstanding
      await this.updateCustomerOutstanding(customer.id);

      return bill;
    } catch (error) {
      console.error(
        `Failed to generate bill for customer ${customer.id}:`,
        error,
      );
      throw error;
    }
  }

  // ================== FINANCIAL CALCULATIONS ==================

  static async updateCustomerOutstanding(customerId: string): Promise<void> {
    try {
      console.log(`🔄 Updating outstanding for customer ${customerId}`);

      // Get all unpaid bills for this customer
      let customerBills;
      try {
        customerBills = await this.getBillsByCustomer(customerId);
      } catch (error: any) {
        if (error.message && error.message.includes("requires an index")) {
          console.warn(
            "🔄 Index not ready, using optimized query for customer bills...",
          );
          const { BillsServiceOptimized } = await import(
            "./billsServiceOptimized"
          );
          await BillsServiceOptimized.updateCustomerOutstandingOptimized(
            customerId,
          );
          return;
        }
        throw error;
      }

      const unpaidBills = customerBills.filter(
        (bill) => bill.status !== "paid",
      );
      const totalUnpaidBills = unpaidBills.reduce(
        (sum, bill) => sum + bill.totalAmount,
        0,
      );

      // Get all payments for this customer
      const { PaymentService } = await import("./paymentService");
      const payments = await PaymentService.getPaymentsByCustomer(customerId);
      const totalPayments = payments.reduce(
        (sum, payment) => sum + payment.amountPaid,
        0,
      );

      // Calculate current outstanding
      const currentOS = totalUnpaidBills - totalPayments;

      // Update customer record
      await CustomerService.updateCustomer(customerId, {
        currentOutstanding: Math.max(0, currentOS), // Ensure non-negative
      });

      console.log(
        `✅ Customer ${customerId} outstanding updated: ₹${currentOS}`,
      );
    } catch (error) {
      console.error("Failed to update customer outstanding:", error);
      throw error;
    }
  }

  static async getCustomerFinancialSummary(
    customerId: string,
  ): Promise<CustomerFinancialSummary> {
    try {
      const customer = await CustomerService.getCustomer(customerId);
      const bills = await this.getBillsByCustomer(customerId);
      const activeVCs =
        await VCInventoryService.getActiveVCsForCustomer(customerId);

      // Get payments
      const { PaymentService } = await import("./paymentService");
      const payments = await PaymentService.getPaymentsByCustomer(customerId);

      // Calculate totals
      const totalUnpaidBills = bills
        .filter((bill) => bill.status !== "paid")
        .reduce((sum, bill) => sum + bill.totalAmount, 0);

      const totalPayments = payments.reduce(
        (sum, payment) => sum + payment.amountPaid,
        0,
      );

      const currentOS = Math.max(0, totalUnpaidBills - totalPayments);

      // Get monthly amount from active VCs
      const packages = await packageService.getAllPackages();
      const packageMap = new Map(packages.map((p) => [p.id, p]));

      const monthlyAmount = activeVCs.reduce((sum, vc) => {
        const pkg = packageMap.get(vc.packageId);
        return sum + (pkg?.price || 0);
      }, 0);

      // Find last billed date and next due date
      const latestBill = bills.length > 0 ? bills[0] : null;
      const lastBilledDate = latestBill?.createdAt || undefined;
      const nextDueDate = latestBill?.billDueDate || undefined;

      return {
        customerId,
        previousOS: customer.previousOutstanding || 0,
        currentOS,
        lastBilledDate,
        nextDueDate,
        totalUnpaidBills,
        totalPayments,
        activeVCCount: activeVCs.length,
        monthlyAmount,
      };
    } catch (error) {
      console.error("Failed to get customer financial summary:", error);
      throw error;
    }
  }

  // ================== UTILITY METHODS ==================

  static async updateBillStatus(
    billId: string,
    status: "generated" | "partial" | "paid",
  ): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, billId);
      await updateDoc(docRef, {
        status,
        updatedAt: Timestamp.now(),
      });

      console.log(`✅ Bill ${billId} status updated to ${status}`);
    } catch (error) {
      console.error("Failed to update bill status:", error);
      throw error;
    }
  }

  static async getBillingSummary(month?: string): Promise<{
    totalBills: number;
    totalAmount: number;
    paidBills: number;
    paidAmount: number;
    pendingBills: number;
    pendingAmount: number;
  }> {
    try {
      let bills: MonthlyBill[];

      if (month) {
        bills = await this.getBillsByMonth(month);
      } else {
        bills = await this.getAllBills();
      }

      const totalBills = bills.length;
      const totalAmount = bills.reduce(
        (sum, bill) => sum + bill.totalAmount,
        0,
      );

      const paidBills = bills.filter((bill) => bill.status === "paid");
      const paidAmount = paidBills.reduce(
        (sum, bill) => sum + bill.totalAmount,
        0,
      );

      const pendingBills = bills.filter((bill) => bill.status !== "paid");
      const pendingAmount = pendingBills.reduce(
        (sum, bill) => sum + bill.totalAmount,
        0,
      );

      return {
        totalBills,
        totalAmount,
        paidBills: paidBills.length,
        paidAmount,
        pendingBills: pendingBills.length,
        pendingAmount,
      };
    } catch (error) {
      console.error("Failed to get billing summary:", error);
      throw error;
    }
  }

  static formatMonth(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    return `${year}-${month}`;
  }

  static getCurrentMonth(): string {
    return this.formatMonth(new Date());
  }

  static getNextMonth(): string {
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    return this.formatMonth(next);
  }
}
