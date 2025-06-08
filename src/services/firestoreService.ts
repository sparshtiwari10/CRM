import { db } from "@/lib/firebase";
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
  limit,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { Customer, BillingRecord, Connection } from "@/types";
import { authService } from "./authService";

export interface FirestoreCustomer {
  name: string;
  phone: string;
  address: string;
  package: string;
  vc_no: string;
  collector_name: string;
  prev_os: number;
  date: Timestamp;
  bill_amount: number;
  collected_cash: number;
  collected_online: number;
  discount: number;
  current_os: number;
  remark: string;
  status: "active" | "inactive";
  // Additional fields for the app
  email?: string;
  billing_status: "Paid" | "Pending" | "Overdue";
  last_payment_date: Timestamp;
  join_date: Timestamp;
  activation_date?: Timestamp;
  deactivation_date?: Timestamp;
  number_of_connections: number;
  connections: Connection[];
  custom_plan?: {
    name: string;
    price: number;
    description: string;
  };
  bill_due_date: number; // Day of month (1-31)
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface FirestoreBillingRecord {
  customer_id: string;
  customer_name: string;
  package_name: string;
  amount: number;
  due_date: Timestamp;
  status: "Paid" | "Pending" | "Overdue";
  invoice_number: string;
  generated_date: Timestamp;
  generated_by: string;
  employee_id: string;
  billing_month: string;
  billing_year: string;
  vc_number: string;
  custom_amount?: number;
  created_at: Timestamp;
}

export interface FirestoreRequest {
  customer_id: string;
  customer_name: string;
  employee_id: string;
  employee_name: string;
  action_type: "activation" | "deactivation" | "plan_change";
  current_plan?: string;
  requested_plan?: string; // Optional - only present for plan_change requests
  reason: string;
  status: "pending" | "approved" | "rejected";
  request_date: Timestamp;
  review_date?: Timestamp;
  reviewed_by?: string;
  admin_notes?: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

class FirestoreService {
  // ================== CUSTOMERS ==================

  async getAllCustomers(): Promise<Customer[]> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      const customersRef = collection(db, "customers");
      let q;

      if (currentUser.role === "admin") {
        // Admins can see all customers
        q = query(customersRef, orderBy("name"));
      } else {
        // Employees can only see customers assigned to them
        // Use collector_name OR name for compatibility (no orderBy to avoid composite index)
        const employeeName = currentUser.collector_name || currentUser.name;
        q = query(customersRef, where("collector_name", "==", employeeName));
      }

      const querySnapshot = await getDocs(q);
      const customers: Customer[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data() as FirestoreCustomer;
        customers.push(this.convertFirestoreCustomerToCustomer(doc.id, data));
      });

      // Sort in memory for employees since we can't use orderBy with where clause
      if (currentUser.role !== "admin") {
        customers.sort((a, b) => a.name.localeCompare(b.name));
      }

      console.log(
        `✅ Loaded ${customers.length} customers for ${currentUser.role === "admin" ? "admin" : `employee: ${currentUser.collector_name || currentUser.name}`}`,
      );
      return customers;
    } catch (error) {
      console.error("❌ Failed to load customers:", error);
      throw error;
    }
  }

  async getCustomersByCollector(collectorName: string): Promise<Customer[]> {
    try {
      const customersRef = collection(db, "customers");
      const q = query(
        customersRef,
        where("collector_name", "==", collectorName),
      );

      const querySnapshot = await getDocs(q);
      const customers: Customer[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data() as FirestoreCustomer;
        customers.push(this.convertFirestoreCustomerToCustomer(doc.id, data));
      });

      // Sort in memory since we can't use orderBy with where clause without composite index
      customers.sort((a, b) => a.name.localeCompare(b.name));

      console.log(
        `✅ Found ${customers.length} customers for collector: ${collectorName}`,
      );
      return customers;
    } catch (error) {
      console.error("❌ Failed to load customers by collector:", error);
      throw error;
    }
  }

  async getCustomer(customerId: string): Promise<Customer> {
    try {
      const docRef = doc(db, "customers", customerId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error("Customer not found");
      }

      const data = docSnap.data() as FirestoreCustomer;
      return this.convertFirestoreCustomerToCustomer(docSnap.id, data);
    } catch (error) {
      console.error("❌ Failed to get customer:", error);
      throw error;
    }
  }

  async addCustomer(customer: Customer): Promise<string> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser || currentUser.role !== "admin") {
        throw new Error("Only administrators can add customers");
      }

      // Validate required fields before processing
      this.validateCustomerData(customer);

      const customersRef = collection(db, "customers");
      const customerData: FirestoreCustomer =
        this.convertCustomerToFirestoreCustomer(customer);

      // Additional sanitization check
      this.sanitizeFirestoreData(customerData);

      const docRef = await addDoc(customersRef, customerData);
      console.log(`✅ Customer ${customer.name} added successfully`);
      return docRef.id;
    } catch (error) {
      console.error("❌ Failed to add customer:", error);
      throw error;
    }
  }

  async updateCustomer(
    customerId: string,
    customer: Customer | Partial<Customer>,
  ): Promise<void> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser || currentUser.role !== "admin") {
        throw new Error("Only administrators can update customers");
      }

      const docRef = doc(db, "customers", customerId);

      // For partial updates, only convert the provided fields
      let updateData: any = {};

      if (customer.name !== undefined) updateData.name = customer.name;
      if (customer.phoneNumber !== undefined)
        updateData.phone = customer.phoneNumber;
      if (customer.address !== undefined) updateData.address = customer.address;
      if (customer.currentPackage !== undefined)
        updateData.package = customer.currentPackage;
      if (customer.vcNumber !== undefined) updateData.vc_no = customer.vcNumber;
      if (customer.collectorName !== undefined)
        updateData.collector_name = customer.collectorName;
      if (customer.previousOutstanding !== undefined)
        updateData.prev_os = customer.previousOutstanding;
      if (customer.packageAmount !== undefined)
        updateData.bill_amount = customer.packageAmount;
      if (customer.currentOutstanding !== undefined)
        updateData.current_os = customer.currentOutstanding;
      if (customer.email !== undefined) updateData.email = customer.email;
      if (customer.isActive !== undefined)
        updateData.status = customer.isActive ? "active" : "inactive";
      if (customer.status !== undefined) {
        updateData.status = customer.status;
        updateData.is_active = customer.status === "active";
      }
      if (customer.statusLogs !== undefined)
        updateData.status_logs = customer.statusLogs;
      if (customer.billDueDate !== undefined)
        updateData.bill_due_date = customer.billDueDate;
      if (customer.numberOfConnections !== undefined)
        updateData.number_of_connections = customer.numberOfConnections;
      if (customer.connections !== undefined)
        updateData.connections = customer.connections;
      if (customer.customPlan !== undefined)
        updateData.custom_plan = customer.customPlan;

      // Always update the timestamp
      updateData.updated_at = Timestamp.now();

      await updateDoc(docRef, updateData);
      console.log(`✅ Customer updated successfully`);
    } catch (error) {
      console.error("❌ Failed to update customer:", error);
      throw error;
    }
  }

  async deleteCustomer(customerId: string): Promise<void> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser || currentUser.role !== "admin") {
        throw new Error("Only administrators can delete customers");
      }

      const docRef = doc(db, "customers", customerId);
      await deleteDoc(docRef);
      console.log(`✅ Customer deleted successfully`);
    } catch (error) {
      console.error("❌ Failed to delete customer:", error);
      throw error;
    }
  }

  // ================== BILLING ==================

  async getAllBillingRecords(): Promise<BillingRecord[]> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      const billingRef = collection(db, "billing");
      let q;

      if (currentUser.role === "admin") {
        // Admins can see all billing records
        q = query(billingRef, orderBy("generated_date", "desc"));
      } else {
        // Employees can only see their billing records (no orderBy to avoid composite index)
        q = query(billingRef, where("employee_id", "==", currentUser.id));
      }

      const querySnapshot = await getDocs(q);
      const records: BillingRecord[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data() as FirestoreBillingRecord;
        records.push(this.convertFirestoreBillingToBillingRecord(doc.id, data));
      });

      // Sort in memory for employees since we can't use orderBy with where clause
      if (currentUser.role !== "admin") {
        records.sort(
          (a, b) =>
            new Date(b.generatedDate).getTime() -
            new Date(a.generatedDate).getTime(),
        );
      }

      console.log(
        `✅ Loaded ${records.length} billing records for ${currentUser.role === "admin" ? "admin" : `employee: ${currentUser.name}`}`,
      );
      return records;
    } catch (error) {
      console.error("❌ Failed to load billing records:", error);
      throw error;
    }
  }

  async getBillingRecordsByCustomer(
    customerId: string,
  ): Promise<BillingRecord[]> {
    try {
      const billingRef = collection(db, "billing");
      // Use only where clause to avoid composite index requirement
      const q = query(
        billingRef,
        where("customer_id", "==", customerId),
        limit(20), // Get more records since we'll sort in memory
      );

      const querySnapshot = await getDocs(q);
      const records: BillingRecord[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data() as FirestoreBillingRecord;
        records.push(this.convertFirestoreBillingToBillingRecord(doc.id, data));
      });

      // Sort in memory by generated date (newest first) and limit to 10
      return records
        .sort(
          (a, b) =>
            new Date(b.generatedDate).getTime() -
            new Date(a.generatedDate).getTime(),
        )
        .slice(0, 10);
    } catch (error) {
      console.error("❌ Failed to load billing records for customer:", error);
      // Fallback: return empty array instead of throwing error
      return [];
    }
  }

  async addBillingRecord(record: Omit<BillingRecord, "id">): Promise<string> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      // Validate billing record data
      this.validateBillingRecordData(record);

      const billingRef = collection(db, "billing");

      // Build record data with proper handling of optional fields
      const recordData: FirestoreBillingRecord = {
        customer_id: record.customerId || "",
        customer_name: record.customerName || "",
        package_name: record.packageName || "",
        amount: record.amount || 0,
        due_date: Timestamp.fromDate(new Date(record.dueDate)),
        status: record.status || "Pending",
        invoice_number: record.invoiceNumber || "",
        generated_date: Timestamp.fromDate(new Date(record.generatedDate)),
        generated_by: record.generatedBy || "",
        employee_id: record.employeeId || "",
        billing_month: record.billingMonth || "",
        billing_year: record.billingYear || "",
        vc_number: record.vcNumber || "",
        created_at: Timestamp.now(),
      };

      // Only add optional fields if they have valid values
      if (
        record.customAmount !== undefined &&
        record.customAmount !== null &&
        record.customAmount > 0
      ) {
        recordData.custom_amount = record.customAmount;
      }

      // Additional sanitization check
      this.sanitizeFirestoreData(recordData);

      const docRef = await addDoc(billingRef, recordData);
      console.log(
        `✅ Billing record ${record.invoiceNumber} added successfully`,
      );
      return docRef.id;
    } catch (error) {
      console.error("❌ Failed to add billing record:", error);
      throw error;
    }
  }

  // ================== REQUESTS ==================

  async getAllRequests(): Promise<any[]> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      const requestsRef = collection(db, "requests");
      let q;

      if (currentUser.role === "admin") {
        // Admins can see all requests
        q = query(requestsRef, orderBy("request_date", "desc"));
      } else {
        // Employees can only see their requests (no orderBy to avoid composite index)
        q = query(requestsRef, where("employee_id", "==", currentUser.id));
      }

      const querySnapshot = await getDocs(q);
      const requests: any[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data() as FirestoreRequest;
        requests.push({
          id: doc.id,
          customerId: data.customer_id,
          customerName: data.customer_name,
          employeeId: data.employee_id,
          employeeName: data.employee_name,
          actionType: data.action_type,
          currentPlan: data.current_plan,
          requestedPlan: data.requested_plan,
          reason: data.reason,
          status: data.status,
          requestDate: data.request_date.toDate().toISOString().split("T")[0],
          reviewDate: data.review_date?.toDate().toISOString().split("T")[0],
          reviewedBy: data.reviewed_by,
          adminNotes: data.admin_notes,
        });
      });

      // Sort in memory for employees since we can't use orderBy with where clause
      if (currentUser.role !== "admin") {
        requests.sort(
          (a, b) =>
            new Date(b.requestDate).getTime() -
            new Date(a.requestDate).getTime(),
        );
      }

      console.log(
        `✅ Loaded ${requests.length} requests for ${currentUser.role === "admin" ? "admin" : `employee: ${currentUser.name}`}`,
      );
      return requests;
    } catch (error) {
      console.error("❌ Failed to load requests:", error);
      throw error;
    }
  }

  async addRequest(request: any): Promise<string> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      const requestsRef = collection(db, "requests");

      // Build request data with proper undefined handling
      const requestData: any = {
        customer_id: request.customerId || "",
        customer_name: request.customerName || "",
        employee_id: currentUser.id || "",
        employee_name: currentUser.name || "",
        action_type: request.actionType || "",
        current_plan: request.currentPlan || "",
        reason: request.reason || "",
        status: "pending",
        request_date: Timestamp.now(),
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      // Only add requested_plan if it's not undefined or empty
      if (request.requestedPlan && request.requestedPlan.trim() !== "") {
        requestData.requested_plan = request.requestedPlan;
      }

      // Sanitize data to remove any remaining undefined values
      this.sanitizeFirestoreData(requestData);

      console.log("🔧 Adding request to Firestore:", {
        customer_name: requestData.customer_name,
        action_type: requestData.action_type,
        has_requested_plan: !!requestData.requested_plan,
      });

      const docRef = await addDoc(requestsRef, requestData);
      console.log(`✅ Request submitted successfully with ID: ${docRef.id}`);

      return docRef.id;
    } catch (error) {
      console.error("❌ Failed to add request:", error);
      throw error;
    }
  }

  async updateRequest(requestId: string, request: any): Promise<void> {
    try {
      if (!db) {
        throw new Error("Firebase not available");
      }

      const currentUser = authService.getCurrentUser();
      if (!currentUser || currentUser.role !== "admin") {
        throw new Error("Only administrators can update requests");
      }

      const requestRef = doc(db, "requests", requestId);
      const updateData = {
        status: request.status,
        review_date: request.reviewDate
          ? Timestamp.fromDate(new Date(request.reviewDate))
          : undefined,
        reviewed_by: request.reviewedBy,
        admin_notes: request.adminNotes,
        updated_at: Timestamp.now(),
      };

      await updateDoc(requestRef, updateData);
      console.log(`✅ Request ${requestId} updated successfully`);
    } catch (error) {
      console.error("❌ Failed to update request:", error);
      throw error;
    }
  }
  // ================== DATA IMPORT ==================

  async importCustomersFromJson(customers: any[]): Promise<void> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser || currentUser.role !== "admin") {
        throw new Error("Only administrators can import data");
      }

      const batch = writeBatch(db);
      const customersRef = collection(db, "customers");

      for (const customerData of customers) {
        const docRef = doc(customersRef);
        const firestoreCustomer: FirestoreCustomer = {
          name: customerData.name,
          phone: customerData.phone,
          address: customerData.address,
          package: customerData.package,
          vc_no: customerData.vc_no,
          collector_name: customerData.collector_name,
          prev_os: customerData.prev_os || 0,
          date: customerData.date
            ? Timestamp.fromDate(new Date(customerData.date))
            : Timestamp.now(),
          bill_amount: customerData.bill_amount || 0,
          collected_cash: customerData.collected_cash || 0,
          collected_online: customerData.collected_online || 0,
          discount: customerData.discount || 0,
          current_os: customerData.current_os || 0,
          remark: customerData.remark || "",
          status: customerData.status === "active" ? "active" : "inactive",
          email: customerData.email,
          billing_status: customerData.billing_status || "Pending",
          last_payment_date: customerData.last_payment_date
            ? Timestamp.fromDate(new Date(customerData.last_payment_date))
            : Timestamp.now(),
          join_date: customerData.join_date
            ? Timestamp.fromDate(new Date(customerData.join_date))
            : Timestamp.now(),
          activation_date: customerData.activation_date
            ? Timestamp.fromDate(new Date(customerData.activation_date))
            : undefined,
          deactivation_date: customerData.deactivation_date
            ? Timestamp.fromDate(new Date(customerData.deactivation_date))
            : undefined,
          number_of_connections: customerData.number_of_connections || 1,
          connections: customerData.connections || [],
          custom_plan: customerData.custom_plan,
          created_at: Timestamp.now(),
          updated_at: Timestamp.now(),
        };

        batch.set(docRef, firestoreCustomer);
      }

      await batch.commit();
      console.log(`✅ Successfully imported ${customers.length} customers`);
    } catch (error) {
      console.error("❌ Failed to import customers:", error);
      throw error;
    }
  }

  // ================== HELPER METHODS ==================

  private convertFirestoreCustomerToCustomer(
    id: string,
    data: FirestoreCustomer,
  ): Customer {
    return {
      id,
      name: data.name || "",
      phoneNumber: data.phone || "",
      address: data.address || "",
      currentPackage: data.package || "",
      vcNumber: data.vc_no || "",
      collectorName: data.collector_name || "",
      email: data.email || "",
      billingStatus: data.billing_status || "Pending",
      lastPaymentDate: data.last_payment_date
        ? data.last_payment_date.toDate().toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      joinDate: data.join_date
        ? data.join_date.toDate().toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      activationDate: data.activation_date
        ?.toDate()
        .toISOString()
        .split("T")[0],
      deactivationDate: data.deactivation_date
        ?.toDate()
        .toISOString()
        .split("T")[0],
      isActive: data.status === "active",
      status: data.status || "active",
      portalBill: data.bill_amount || 0,
      numberOfConnections: data.number_of_connections || 1,
      connections: data.connections || [],
      customPlan: data.custom_plan,
      // Add billing fields with defaults
      packageAmount: data.bill_amount || 0,
      previousOutstanding: data.prev_os || 0,
      currentOutstanding: data.current_os || 0,
      billDueDate: data.bill_due_date || 1,
    };
  }

  private convertCustomerToFirestoreCustomer(
    customer: Customer,
  ): FirestoreCustomer {
    // Sanitize data to remove undefined values (Firestore doesn't accept undefined)
    const sanitizedData: FirestoreCustomer = {
      name: customer.name || "",
      phone: customer.phoneNumber || "",
      address: customer.address || "",
      package: customer.currentPackage || "",
      vc_no: customer.vcNumber || "",
      collector_name: customer.collectorName || "",
      billing_status: customer.billingStatus || "Pending",
      last_payment_date: customer.lastPaymentDate
        ? Timestamp.fromDate(new Date(customer.lastPaymentDate))
        : Timestamp.now(),
      join_date: customer.joinDate
        ? Timestamp.fromDate(new Date(customer.joinDate))
        : Timestamp.now(),
      status: (customer.status ||
        (customer.isActive ? "active" : "inactive")) as "active" | "inactive",
      bill_amount: customer.packageAmount || customer.portalBill || 0,
      number_of_connections: customer.numberOfConnections || 1,
      connections: customer.connections || [],
      // Fields from original Excel/CSV structure
      prev_os: customer.previousOutstanding || 0,
      date: Timestamp.now(),
      collected_cash: 0,
      collected_online: 0,
      discount: 0,
      current_os: customer.currentOutstanding || 0,
      remark: "",
      bill_due_date: customer.billDueDate || 1,
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
    };

    console.log("🔧 Converting customer to Firestore:", {
      name: sanitizedData.name,
      collector_name: sanitizedData.collector_name,
      status: sanitizedData.status,
    });

    // Only add optional fields if they have valid values
    if (customer.email && customer.email.trim() !== "") {
      sanitizedData.email = customer.email.trim();
    }

    if (customer.activationDate) {
      sanitizedData.activation_date = Timestamp.fromDate(
        new Date(customer.activationDate),
      );
    }

    if (customer.deactivationDate) {
      sanitizedData.deactivation_date = Timestamp.fromDate(
        new Date(customer.deactivationDate),
      );
    }

    if (customer.customPlan) {
      sanitizedData.custom_plan = customer.customPlan;
    }

    return sanitizedData;
  }

  /**
   * Validate customer data before saving to Firestore
   */
  private validateCustomerData(customer: Customer): void {
    const errors: string[] = [];

    if (!customer.name || customer.name.trim() === "") {
      errors.push("Customer name is required");
    }

    if (!customer.phoneNumber || customer.phoneNumber.trim() === "") {
      errors.push("Phone number is required");
    }

    if (!customer.address || customer.address.trim() === "") {
      errors.push("Address is required");
    }

    if (!customer.collectorName || customer.collectorName.trim() === "") {
      errors.push("Collector name is required");
    }

    if (!customer.vcNumber || customer.vcNumber.trim() === "") {
      errors.push("VC Number is required");
    }

    // Validate email format if provided
    if (customer.email && customer.email.trim() !== "") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customer.email.trim())) {
        errors.push("Invalid email format");
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(", ")}`);
    }
  }

  /**
   * Validate billing record data before saving to Firestore
   */
  private validateBillingRecordData(record: Omit<BillingRecord, "id">): void {
    const errors: string[] = [];

    if (!record.customerId || record.customerId.trim() === "") {
      errors.push("Customer ID is required");
    }

    if (!record.customerName || record.customerName.trim() === "") {
      errors.push("Customer name is required");
    }

    if (!record.packageName || record.packageName.trim() === "") {
      errors.push("Package name is required");
    }

    if (!record.amount || record.amount <= 0) {
      errors.push("Amount must be greater than 0");
    }

    if (!record.invoiceNumber || record.invoiceNumber.trim() === "") {
      errors.push("Invoice number is required");
    }

    if (!record.dueDate) {
      errors.push("Due date is required");
    }

    if (!record.generatedBy || record.generatedBy.trim() === "") {
      errors.push("Generated by field is required");
    }

    if (!record.employeeId || record.employeeId.trim() === "") {
      errors.push("Employee ID is required");
    }

    if (errors.length > 0) {
      throw new Error(`Billing record validation failed: ${errors.join(", ")}`);
    }
  }

  /**
   * Sanitize data to ensure Firestore compatibility
   */
  private sanitizeFirestoreData(data: any): void {
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) {
        console.warn(
          `⚠️ Removing undefined field '${key}' from Firestore data`,
        );
        delete data[key];
      } else if (typeof value === "string" && value.trim() === "") {
        // Convert empty strings to null for optional fields
        if (key === "email" || key === "remark" || key === "custom_amount") {
          delete data[key];
        }
      }
    }
  }

  private convertFirestoreBillingToBillingRecord(
    id: string,
    data: FirestoreBillingRecord,
  ): BillingRecord {
    return {
      id,
      customerId: data.customer_id,
      customerName: data.customer_name,
      packageName: data.package_name,
      amount: data.amount,
      dueDate: data.due_date.toDate().toISOString().split("T")[0],
      status: data.status,
      invoiceNumber: data.invoice_number,
      generatedDate: data.generated_date.toDate().toISOString().split("T")[0],
      generatedBy: data.generated_by,
      employeeId: data.employee_id,
      billingMonth: data.billing_month,
      billingYear: data.billing_year,
      vcNumber: data.vc_number,
      customAmount: data.custom_amount,
    };
  }
}

export const firestoreService = new FirestoreService();
