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
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { authService } from "./authService";
import { VCInventoryService } from "./vcInventoryService";
import { PackageService } from "./packageService";
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
        billDueDate: doc.data().billDueDate?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as MonthlyBill[];
    } catch (error) {
      console.error("Failed to get bills:", error);
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
    } catch (error) {
      console.error("Failed to get bills for customer:", error);
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
    } catch (error) {
      console.error("Failed to get bills for month:", error);
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

  // ================== BILL GENERATION ==================

  static async generateMonthlyBills(
    month: string, // Format: YYYY-MM
    dueDays: number = 15, // Days from generation to due date
  ): Promise<{
    success: string[];
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

      console.log(`🔄 Starting bill generation for ${month}`);

      // Check if bills already exist for this month
      const existingBills = await this.getBillsByMonth(month);
      if (existingBills.length > 0) {
        throw new Error(`Bills for ${month} already exist`);
      }

      // Get all customers
      const customers = await CustomerService.getAllCustomers();
      console.log(`📋 Found ${customers.length} customers`);

      const success: string[] = [];
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
            success.push(customer.id);
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
      // Get active VCs for this customer
      const activeVCs = await VCInventoryService.getActiveVCsForCustomer(
        customer.id,
      );

      if (activeVCs.length === 0) {
        console.log(`⚠️ No active VCs for ${customer.name}, skipping bill`);
        return null;
      }

      // Get all packages for pricing
      const packages = await PackageService.getAllPackages();
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
        billDueDate: Timestamp.fromDate(dueDate),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

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
      const customerBills = await this.getBillsByCustomer(customerId);
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
      const packages = await PackageService.getAllPackages();
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
