import { Customer, BillingRecord } from "@/types";
import { firestoreService } from "./firestoreService";
import { authService } from "./authService";

// This service now acts as a bridge between the UI and Firestore
export class CustomerService {
  // ================== CUSTOMERS ==================

  static async getAllCustomers(): Promise<Customer[]> {
    try {
      return await firestoreService.getAllCustomers();
    } catch (error) {
      console.error("CustomerService: Failed to get all customers:", error);

      // Fallback to mock data if Firestore is not available
      if (error?.message?.includes("Firebase not available")) {
        return this.getMockCustomers();
      }

      throw error;
    }
  }

  static async getCustomersByCollector(
    collectorName: string,
  ): Promise<Customer[]> {
    try {
      return await firestoreService.getCustomersByCollector(collectorName);
    } catch (error) {
      console.error(
        "CustomerService: Failed to get customers by collector:",
        error,
      );

      // Fallback to mock data if Firestore is not available
      if (error?.message?.includes("Firebase not available")) {
        return this.getMockCustomers().filter(
          (c) => c.collectorName === collectorName,
        );
      }

      throw error;
    }
  }

  static async getCustomer(customerId: string): Promise<Customer> {
    try {
      return await firestoreService.getCustomer(customerId);
    } catch (error) {
      console.error("CustomerService: Failed to get customer:", error);

      // Fallback to mock data if Firestore is not available
      if (error?.message?.includes("Firebase not available")) {
        const mockCustomers = this.getMockCustomers();
        const customer = mockCustomers.find((c) => c.id === customerId);
        if (!customer) {
          throw new Error("Customer not found");
        }
        return customer;
      }

      throw error;
    }
  }

  static async addCustomer(customer: Customer): Promise<string> {
    try {
      return await firestoreService.addCustomer(customer);
    } catch (error) {
      console.error("CustomerService: Failed to add customer:", error);

      // Fallback behavior if Firestore is not available
      if (error?.message?.includes("Firebase not available")) {
        // In mock mode, just return a random ID
        return `mock_${Date.now()}`;
      }

      throw error;
    }
  }

  static async updateCustomer(
    customerId: string,
    customer: Customer | Partial<Customer>,
  ): Promise<void> {
    try {
      return await firestoreService.updateCustomer(customerId, customer);
    } catch (error) {
      console.error("CustomerService: Failed to update customer:", error);

      // Fallback behavior if Firestore is not available
      if (error?.message?.includes("Firebase not available")) {
        console.log("Mock mode: Customer update simulated");
        return;
      }

      throw error;
    }
  }

  static async deleteCustomer(customerId: string): Promise<void> {
    try {
      return await firestoreService.deleteCustomer(customerId);
    } catch (error) {
      console.error("CustomerService: Failed to delete customer:", error);

      // Fallback behavior if Firestore is not available
      if (error?.message?.includes("Firebase not available")) {
        console.log("Mock mode: Customer deletion simulated");
        return;
      }

      throw error;
    }
  }

  // ================== BILLING ==================

  static async getAllBillingRecords(): Promise<BillingRecord[]> {
    try {
      return await firestoreService.getAllBillingRecords();
    } catch (error) {
      console.error("CustomerService: Failed to get billing records:", error);

      // Fallback to mock data if Firestore is not available
      if (error?.message?.includes("Firebase not available")) {
        return this.getMockBillingRecords();
      }

      throw error;
    }
  }

  static async getBillingRecordsByCustomer(
    customerId: string,
  ): Promise<BillingRecord[]> {
    try {
      return await firestoreService.getBillingRecordsByCustomer(customerId);
    } catch (error) {
      console.error(
        "CustomerService: Failed to get billing records by customer:",
        error,
      );

      // Fallback to mock data if Firestore is not available
      if (error?.message?.includes("Firebase not available")) {
        const allRecords = this.getMockBillingRecords();
        return allRecords.filter((record) => record.customerId === customerId);
      }

      throw error;
    }
  }

  static async addBillingRecord(
    record: Omit<BillingRecord, "id">,
  ): Promise<string> {
    try {
      return await firestoreService.addBillingRecord(record);
    } catch (error) {
      console.error("CustomerService: Failed to add billing record:", error);

      // Fallback behavior if Firestore is not available
      if (error?.message?.includes("Firebase not available")) {
        console.log("Mock mode: Billing record creation simulated");
        return `mock_bill_${Date.now()}`;
      }

      throw error;
    }
  }

  // ================== REQUESTS ==================

  static async getAllRequests(): Promise<any[]> {
    try {
      return await firestoreService.getAllRequests();
    } catch (error) {
      console.error("CustomerService: Failed to get requests:", error);

      // Fallback to mock data if Firestore is not available
      if (error?.message?.includes("Firebase not available")) {
        return this.getMockRequests();
      }

      throw error;
    }
  }

  static async addRequest(request: any): Promise<string> {
    try {
      return await firestoreService.addRequest(request);
    } catch (error) {
      console.error("CustomerService: Failed to add request:", error);

      // Fallback behavior if Firestore is not available
      if (error?.message?.includes("Firebase not available")) {
        console.log("Mock mode: Request creation simulated");
        return `mock_req_${Date.now()}`;
      }

      throw error;
    }
  }

  static async updateRequest(requestId: string, request: any): Promise<void> {
    try {
      return await firestoreService.updateRequest(requestId, request);
    } catch (error) {
      console.error("CustomerService: Failed to update request:", error);

      // Fallback behavior if Firestore is not available
      if (error?.message?.includes("Firebase not available")) {
        console.log("Mock mode: Request update simulated");
        return;
      }

      throw error;
    }
  }

  // ================== DATA IMPORT ==================

  static async importCustomersFromJson(customers: any[]): Promise<void> {
    try {
      return await firestoreService.importCustomersFromJson(customers);
    } catch (error) {
      console.error("CustomerService: Failed to import customers:", error);
      throw error;
    }
  }

  // ================== MOCK DATA FALLBACKS ==================

  private static getMockCustomers(): Customer[] {
    return [
      {
        id: "1",
        name: "John Smith",
        phoneNumber: "+91 98765 43210",
        address: "123 Main Street, Mumbai, Maharashtra 400001",
        currentPackage: "Premium HD",
        billingStatus: "Paid",
        lastPaymentDate: "2024-01-15",
        email: "john.smith@email.com",
        joinDate: "2023-06-15",
        vcNumber: "VC001234",
        collectorName: "John Collector",
        portalBill: 599,
        isActive: true,
        activationDate: "2023-06-15",
        numberOfConnections: 1,
        connections: [
          {
            id: "conn-1",
            vcNumber: "VC001234",
            planName: "Premium HD",
            planPrice: 599,
            isCustomPlan: false,
          },
        ],
        previousOutstanding: 150,
        planBill: 599,
        currentOutstanding: 749,
        packageAmount: 599,
      },
      {
        id: "2",
        name: "Priya Sharma",
        phoneNumber: "+91 87654 32109",
        address: "456 Garden Road, Delhi, Delhi 110001",
        currentPackage: "Basic",
        billingStatus: "Pending",
        lastPaymentDate: "2023-12-20",
        email: "priya.sharma@email.com",
        joinDate: "2023-03-10",
        vcNumber: "VC001235",
        collectorName: "John Collector",
        portalBill: 299,
        isActive: true,
        activationDate: "2023-03-10",
        numberOfConnections: 1,
        connections: [
          {
            id: "conn-1",
            vcNumber: "VC001235",
            planName: "Basic",
            planPrice: 299,
            isCustomPlan: false,
          },
        ],
        previousOutstanding: 0,
        planBill: 299,
        currentOutstanding: 299,
        packageAmount: 299,
      },
      {
        id: "3",
        name: "Raj Patel",
        phoneNumber: "+91 76543 21098",
        address: "789 Commercial Street, Bangalore, Karnataka 560001",
        currentPackage: "Custom Plan",
        billingStatus: "Overdue",
        lastPaymentDate: "2023-11-25",
        email: "raj.patel@email.com",
        joinDate: "2022-12-05",
        vcNumber: "VC001236",
        collectorName: "Sarah Collector",
        portalBill: 899,
        isActive: false,
        activationDate: "2022-12-05",
        deactivationDate: "2024-01-05",
        numberOfConnections: 1,
        connections: [
          {
            id: "conn-1",
            vcNumber: "VC001236",
            planName: "Enterprise Package",
            planPrice: 899,
            isCustomPlan: true,
          },
        ],
        customPlan: {
          name: "Enterprise Package",
          price: 899,
          description: "Custom enterprise solution with dedicated support",
        },
        previousOutstanding: 899,
        planBill: 899,
        currentOutstanding: 1798,
        packageAmount: 899,
      },
    ];
  }

  private static getMockBillingRecords(): BillingRecord[] {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    return [
      {
        id: "1",
        customerId: "1",
        customerName: "John Smith",
        packageName: "Premium HD",
        amount: 599,
        dueDate: "2024-02-15",
        status: "Paid",
        invoiceNumber: "INV-2024-001",
        generatedDate: today,
        generatedBy: "John Collector",
        employeeId: "emp-1",
        billingMonth: "January",
        billingYear: "2024",
        vcNumber: "VC001234",
      },
      {
        id: "2",
        customerId: "2",
        customerName: "Priya Sharma",
        packageName: "Basic",
        amount: 299,
        dueDate: "2024-02-10",
        status: "Pending",
        invoiceNumber: "INV-2024-002",
        generatedDate: yesterday,
        generatedBy: "John Collector",
        employeeId: "emp-1",
        billingMonth: "January",
        billingYear: "2024",
        vcNumber: "VC001235",
      },
    ];
  }

  private static getMockRequests(): any[] {
    return [
      {
        id: "req-1",
        customerId: "3",
        customerName: "Raj Patel",
        employeeId: "emp-2",
        employeeName: "Sarah Collector",
        actionType: "activation",
        reason: "Customer has paid overdue amount and requested reactivation",
        status: "pending",
        requestDate: "2024-01-20",
      },
    ];
  }

  // ================== AUTHENTICATION HELPERS ==================

  static getCurrentUser() {
    return authService.getCurrentUser();
  }

  static isAdmin(): boolean {
    return authService.isAdmin();
  }

  static canAccessCustomer(
    customerId: string,
    customerCollectorName?: string,
  ): boolean {
    return authService.canAccessCustomer(customerId, customerCollectorName);
  }
}
