import { Customer } from "@/types";
import { CustomerService } from "./customerService";

export class BillingCycleService {
  /**
   * Process monthly billing cycle for a customer
   * On bill due date: Previous O/S = Current O/S, then Current O/S = Previous O/S + Package Amount
   */
  static processMonthlyCycle(customer: Customer): Customer {
    const updatedCustomer = {
      ...customer,
      previousOutstanding: customer.currentOutstanding,
      currentOutstanding: customer.currentOutstanding + customer.packageAmount,
    };

    return updatedCustomer;
  }

  /**
   * Check if today is the billing due date for a customer
   */
  static isBillingDueDate(customer: Customer): boolean {
    const today = new Date();
    const todayDate = today.getDate();
    return todayDate === customer.billDueDate;
  }

  /**
   * Calculate current outstanding based on package amount, previous outstanding, and paid invoices
   */
  static calculateCurrentOutstanding(customer: Customer): number {
    // Get paid invoices for this customer
    const paidInvoices =
      customer.invoiceHistory?.filter((invoice) => invoice.status === "Paid") ||
      [];

    const totalPaidAmount = paidInvoices.reduce(
      (sum, invoice) => sum + invoice.amount,
      0,
    );

    // Current O/S = Package Amount + Previous O/S - Paid Invoice Amounts
    return (
      customer.packageAmount + customer.previousOutstanding - totalPaidAmount
    );
  }

  /**
   * Process monthly billing for all customers who have reached their due date
   */
  static async processAllMonthlyCycles(): Promise<Customer[]> {
    try {
      const allCustomers = await CustomerService.getAllCustomers();
      const updatedCustomers: Customer[] = [];

      for (const customer of allCustomers) {
        if (this.isBillingDueDate(customer)) {
          const updatedCustomer = this.processMonthlyCycle(customer);
          await CustomerService.updateCustomer(updatedCustomer);
          updatedCustomers.push(updatedCustomer);
        }
      }

      return updatedCustomers;
    } catch (error) {
      console.error("Error processing monthly billing cycles:", error);
      throw error;
    }
  }

  /**
   * Get next billing date for a customer
   */
  static getNextBillingDate(customer: Customer): Date {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    let nextBillingDate = new Date(
      currentYear,
      currentMonth,
      customer.billDueDate,
    );

    // If this month's billing date has passed, move to next month
    if (nextBillingDate <= today) {
      nextBillingDate = new Date(
        currentYear,
        currentMonth + 1,
        customer.billDueDate,
      );
    }

    return nextBillingDate;
  }

  /**
   * Format billing date for display
   */
  static formatBillingDate(customer: Customer): string {
    const nextDate = this.getNextBillingDate(customer);
    return nextDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  /**
   * Get days until next billing cycle
   */
  static getDaysUntilNextBilling(customer: Customer): number {
    const today = new Date();
    const nextBillingDate = this.getNextBillingDate(customer);
    const diffTime = nextBillingDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
