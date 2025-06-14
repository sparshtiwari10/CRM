import { PaymentInvoice, MonthlyBill, Customer } from "@/types";
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
      if (error.code === 'permission-denied') {
        console.warn("🚨 Permission denied for invoices collection. This may be because:");
        console.warn("1. Firestore rules need to be updated");
        console.warn("2. Collection doesn't exist yet");
        console.warn("3. User doesn't have proper access");

        // Return empty array as fallback for permission errors
        return [];
      }

      throw error;
    }
  }

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
      })) as PaymentInvoice[];
    } catch (error: any) {
      console.error("Error fetching payments:", error);

      // Check if it's a permissions error
      if (error.code === 'permission-denied') {
        console.warn("🚨 Permission denied for invoices collection. This may be because:");
        console.warn("1. Firestore rules need to be updated");
        console.warn("2. Collection doesn't exist yet");
        console.warn("3. User doesn't have proper access");

        // Return empty array as fallback for permission errors
        return [];
      }

      throw error;
    }
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

  // ================== PAYMENT COLLECTION ==================

  static async collectPayment(
    paymentData: Omit<PaymentInvoice, "id" | "createdAt">,
  ): Promise<PaymentInvoice> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      console.log(
        `🔄 Processing payment: ₹${paymentData.amountPaid} for ${paymentData.customerName}`,
      );

      // Generate receipt number if not provided
      const receiptNumber =
        paymentData.receiptNumber ||
        `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

      const docData = {
        ...paymentData,
        receiptNumber,
        collectedBy: currentUser.name,
        paidAt: Timestamp.fromDate(paymentData.paidAt),
        createdAt: Timestamp.now(),
      };

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