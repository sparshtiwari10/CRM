import { PaymentInvoice, MonthlyBill, Customer } from "@/types";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { authService } from "./authService";
import { BillsService } from "./billsService";

export class PaymentService {
  private static readonly COLLECTION_NAME = "invoices";

  // ================== PAYMENT CRUD ==================

  static async getAllPayments(): Promise<PaymentInvoice[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        orderBy("paymentDate", "desc"),
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        paymentDate: doc.data().paymentDate || new Date().toISOString(),
        createdAt: doc.data().createdAt || new Date().toISOString(),
      })) as PaymentInvoice[];
    } catch (error: any) {
      console.error("Failed to get payments:", error);

      // Check if it's a permissions error
      if (error.code === "permission-denied") {
        console.warn(
          "🚨 Permission denied for invoices collection. This may be because:",
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

  static async getPaymentsByBill(billId: string): Promise<PaymentInvoice[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where("billId", "==", billId),
        orderBy("paidAt", "desc"),
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        paidAt: doc.data().paidAt?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as PaymentInvoice[];
    } catch (error) {
      console.error("Failed to get payments for bill:", error);
      throw error;
    }
  }

  static async createPayment(paymentData: any): Promise<string> {
    try {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      const newPayment = {
        ...paymentData,
        createdAt: Timestamp.now(),
        paidAt: paymentData.paidAt
          ? Timestamp.fromDate(new Date(paymentData.paidAt))
          : Timestamp.now(),
        collectedBy: currentUser.uid,
      };

      const docRef = await addDoc(
        collection(db, this.COLLECTION_NAME),
        newPayment,
      );
      return docRef.id;
    } catch (error) {
      console.error("Failed to create payment:", error);
      throw error;
    }
  }

  static async updatePayment(
    paymentId: string,
    updates: Partial<PaymentInvoice>,
  ): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, paymentId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error("Failed to update payment:", error);
      throw error;
    }
  }

  static async deletePayment(paymentId: string): Promise<void> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser || currentUser.role !== "admin") {
        throw new Error("Only administrators can delete payments/invoices");
      }

      const docRef = doc(db, this.COLLECTION_NAME, paymentId);
      await deleteDoc(docRef);
      console.log(`✅ Payment/Invoice ${paymentId} deleted successfully`);
    } catch (error) {
      console.error("Failed to delete payment:", error);
      throw error;
    }
  }

  static async getPayment(paymentId: string): Promise<PaymentInvoice> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, paymentId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error("Payment not found");
      }

      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        paidAt: data.paidAt?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
      } as PaymentInvoice;
    } catch (error) {
      console.error("Failed to get payment:", error);
      throw error;
    }
  }

  static async getPaymentsByCustomer(
    customerId: string,
  ): Promise<PaymentInvoice[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where("customerId", "==", customerId),
        orderBy("paidAt", "desc"),
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        paidAt: doc.data().paidAt?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as PaymentInvoice[];
    } catch (error: any) {
      console.error("Failed to get payments for customer:", error);

      // If it's an index error, fall back to simple query
      if (error.message && error.message.includes("requires an index")) {
        console.warn(
          "🔄 Index not ready, using simple query for customer payments...",
        );
        const q = query(
          collection(db, this.COLLECTION_NAME),
          where("customerId", "==", customerId),
        );
        const querySnapshot = await getDocs(q);

        const payments = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          paidAt: doc.data().paidAt?.toDate() || new Date(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        })) as PaymentInvoice[];

        // Sort in memory
        payments.sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime());
        return payments;
      }

      throw error;
    }
  }

  // ================== PAYMENT COLLECTION ==================

  static async collectPayment(
    paymentData: Omit<PaymentInvoice, "id" | "createdAt">,
  ): Promise<PaymentInvoice> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error(
          "User not authenticated. Please log in to collect payments.",
        );
      }

      // Check if db is available
      if (!db) {
        throw new Error(
          "Database connection not available. Please check your internet connection.",
        );
      }

      console.log(
        `🔄 Processing payment: ₹${paymentData.amountPaid} for ${paymentData.customerName}`,
      );

      // Generate receipt number if not provided
      const receiptNumber =
        paymentData.receiptNumber ||
        `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

      // Ensure customerArea is set for permissions
      const customerArea =
        paymentData.customerArea ||
        currentUser.collector_name ||
        currentUser.assigned_areas?.[0] ||
        "unknown";

      const docData = {
        ...paymentData,
        customerArea, // Ensure this field is set for Firestore rules
        receiptNumber,
        collectedBy: currentUser.name,
        collectedByUid: currentUser.id,
        paidAt: Timestamp.fromDate(paymentData.paidAt),
        createdAt: Timestamp.now(),
      };

      console.log("Creating payment document with data:", {
        ...docData,
        paidAt: "[Date object]",
        createdAt: "[Timestamp object]",
      });

      const docRef = await addDoc(
        collection(db, this.COLLECTION_NAME),
        docData,
      );

      const payment: PaymentInvoice = {
        id: docRef.id,
        ...paymentData,
        receiptNumber,
        collectedBy: currentUser.name,
        createdAt: new Date(),
      };

      // Update customer outstanding and bill status
      await this.processPaymentEffects(payment);

      console.log(
        `✅ Payment collected: ${receiptNumber} - ₹${paymentData.amountPaid}`,
      );

      return payment;
    } catch (error) {
      console.error("Failed to collect payment:", error);
      throw error;
    }
  }

  private static async processPaymentEffects(
    payment: PaymentInvoice,
  ): Promise<void> {
    try {
      // Update customer outstanding
      await BillsService.updateCustomerOutstanding(payment.customerId);

      // Update bill status if payment is linked to a specific bill
      if (payment.billId) {
        await this.updateBillStatusBasedOnPayments(payment.billId);
      }

      // Update all bills for customer to check if any are now fully paid
      const customerBills = await BillsService.getBillsByCustomer(
        payment.customerId,
      );
      for (const bill of customerBills) {
        await this.updateBillStatusBasedOnPayments(bill.id);
      }
    } catch (error) {
      console.error("Failed to process payment effects:", error);
      // Don't throw here to avoid rolling back the payment
    }
  }

  private static async updateBillStatusBasedOnPayments(
    billId: string,
  ): Promise<void> {
    try {
      const bill = await BillsService.getBill(billId);
      const payments = await this.getPaymentsByBill(billId);

      const totalPaid = payments.reduce(
        (sum, payment) => sum + payment.amountPaid,
        0,
      );

      let newStatus: "generated" | "partial" | "paid";

      if (totalPaid >= bill.totalAmount) {
        newStatus = "paid";
      } else if (totalPaid > 0) {
        newStatus = "partial";
      } else {
        newStatus = "generated";
      }

      if (newStatus !== bill.status) {
        await BillsService.updateBillStatus(billId, newStatus);
        console.log(`✅ Bill ${billId} status updated to ${newStatus}`);
      }
    } catch (error) {
      console.error(`Failed to update bill status for ${billId}:`, error);
    }
  }

  // ================== PAYMENT ANALYTICS ==================

  static async getPaymentsSummary(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalPayments: number;
    totalAmount: number;
    paymentsByMethod: { [key: string]: { count: number; amount: number } };
    paymentsByEmployee: { [key: string]: { count: number; amount: number } };
  }> {
    try {
      let payments = await this.getAllPayments();

      // Filter by date range if provided
      if (startDate || endDate) {
        payments = payments.filter((payment) => {
          const paymentDate = payment.paidAt;
          if (startDate && paymentDate < startDate) return false;
          if (endDate && paymentDate > endDate) return false;
          return true;
        });
      }

      const totalPayments = payments.length;
      const totalAmount = payments.reduce(
        (sum, payment) => sum + payment.amountPaid,
        0,
      );

      // Group by payment method
      const paymentsByMethod: {
        [key: string]: { count: number; amount: number };
      } = {};
      for (const payment of payments) {
        const method = payment.paymentMethod;
        if (!paymentsByMethod[method]) {
          paymentsByMethod[method] = { count: 0, amount: 0 };
        }
        paymentsByMethod[method].count++;
        paymentsByMethod[method].amount += payment.amountPaid;
      }

      // Group by employee
      const paymentsByEmployee: {
        [key: string]: { count: number; amount: number };
      } = {};
      for (const payment of payments) {
        const employee = payment.collectedBy;
        if (!paymentsByEmployee[employee]) {
          paymentsByEmployee[employee] = { count: 0, amount: 0 };
        }
        paymentsByEmployee[employee].count++;
        paymentsByEmployee[employee].amount += payment.amountPaid;
      }

      return {
        totalPayments,
        totalAmount,
        paymentsByMethod,
        paymentsByEmployee,
      };
    } catch (error) {
      console.error("Failed to get payments summary:", error);
      throw error;
    }
  }

  static async getDailyCollections(date: Date): Promise<{
    totalCollections: number;
    totalAmount: number;
    collections: PaymentInvoice[];
  }> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const payments = await this.getAllPayments();
      const dailyPayments = payments.filter(
        (payment) => payment.paidAt >= startOfDay && payment.paidAt <= endOfDay,
      );

      const totalAmount = dailyPayments.reduce(
        (sum, payment) => sum + payment.amountPaid,
        0,
      );

      return {
        totalCollections: dailyPayments.length,
        totalAmount,
        collections: dailyPayments,
      };
    } catch (error) {
      console.error("Failed to get daily collections:", error);
      throw error;
    }
  }

  // ================== BULK OPERATIONS ==================

  static async bulkCollectPayments(
    payments: Omit<PaymentInvoice, "id" | "createdAt">[],
  ): Promise<{
    success: PaymentInvoice[];
    failed: { payment: any; error: string }[];
  }> {
    const success: PaymentInvoice[] = [];
    const failed: { payment: any; error: string }[] = [];

    for (const paymentData of payments) {
      try {
        const payment = await this.collectPayment(paymentData);
        success.push(payment);
      } catch (error) {
        failed.push({
          payment: paymentData,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return { success, failed };
  }

  // ================== HELPER METHODS ==================

  static async getCustomerPaymentHistory(customerId: string): Promise<{
    payments: PaymentInvoice[];
    totalPaid: number;
    lastPaymentDate?: Date;
    averagePayment: number;
  }> {
    try {
      const payments = await this.getPaymentsByCustomer(customerId);

      const totalPaid = payments.reduce(
        (sum, payment) => sum + payment.amountPaid,
        0,
      );

      const lastPaymentDate =
        payments.length > 0 ? payments[0].paidAt : undefined;
      const averagePayment =
        payments.length > 0 ? totalPaid / payments.length : 0;

      return {
        payments,
        totalPaid,
        lastPaymentDate,
        averagePayment,
      };
    } catch (error) {
      console.error("Failed to get customer payment history:", error);
      throw error;
    }
  }

  static generateReceiptNumber(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `RCP-${timestamp}-${random}`;
  }

  static validatePaymentAmount(amount: number): boolean {
    return amount > 0 && amount <= 100000; // Max ₹1,00,000 per transaction
  }

  static getPaymentMethodDisplayName(method: string): string {
    const methodNames = {
      cash: "Cash",
      online: "Online",
      bank_transfer: "Bank Transfer",
      cheque: "Cheque",
    };
    return methodNames[method as keyof typeof methodNames] || method;
  }
}
