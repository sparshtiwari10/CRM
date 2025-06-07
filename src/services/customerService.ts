import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  Timestamp,
  DocumentData,
  QuerySnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Customer, BillingRecord } from "@/types";
import { AuthService } from "./authService";

const CUSTOMERS_COLLECTION = "customers";

// Mock customers data for fallback
const MOCK_CUSTOMERS: Customer[] = [
  {
    id: "1",
    name: "John Smith",
    phoneNumber: "+1 (555) 123-4567",
    address: "123 Main St, Anytown, NY 12345",
    currentPackage: "Premium HD",
    billingStatus: "Paid",
    lastPaymentDate: "2024-01-15",
    email: "john.smith@email.com",
    joinDate: "2023-06-15",
    vcNumber: "VC001234",
    collectorName: "John Collector",
    portalBill: 59.99,
    isActive: true,
    activationDate: "2023-06-15",
  },
  {
    id: "2",
    name: "Sarah Johnson",
    phoneNumber: "+1 (555) 234-5678",
    address: "456 Oak Ave, Springfield, CA 90210",
    currentPackage: "Basic",
    billingStatus: "Pending",
    lastPaymentDate: "2023-12-20",
    email: "sarah.j@email.com",
    joinDate: "2023-03-10",
    vcNumber: "VC001235",
    collectorName: "John Collector",
    portalBill: 29.99,
    isActive: true,
    activationDate: "2023-03-10",
  },
  {
    id: "3",
    name: "Michael Brown",
    phoneNumber: "+1 (555) 345-6789",
    address: "789 Pine Rd, Riverside, TX 75001",
    currentPackage: "Sports Package",
    billingStatus: "Overdue",
    lastPaymentDate: "2023-11-25",
    email: "mbrown@email.com",
    joinDate: "2022-12-05",
    vcNumber: "VC001236",
    collectorName: "Sarah Collector",
    portalBill: 79.99,
    isActive: false,
    activationDate: "2022-12-05",
    deactivationDate: "2024-01-05",
  },
  {
    id: "4",
    name: "Emily Davis",
    phoneNumber: "+1 (555) 456-7890",
    address: "321 Elm St, Lakewood, FL 33801",
    currentPackage: "Premium HD",
    billingStatus: "Paid",
    lastPaymentDate: "2024-01-18",
    email: "emily.davis@email.com",
    joinDate: "2023-08-22",
    vcNumber: "VC001237",
    collectorName: "Sarah Collector",
    portalBill: 59.99,
    isActive: true,
    activationDate: "2023-08-22",
  },
  {
    id: "5",
    name: "David Wilson",
    phoneNumber: "+1 (555) 567-8901",
    address: "654 Maple Dr, Hillview, WA 98001",
    currentPackage: "Family Bundle",
    billingStatus: "Paid",
    lastPaymentDate: "2024-01-12",
    email: "dwilson@email.com",
    joinDate: "2023-04-30",
    vcNumber: "VC001238",
    collectorName: "John Collector",
    portalBill: 49.99,
    isActive: true,
    activationDate: "2023-04-30",
  },
  {
    id: "6",
    name: "Lisa Anderson",
    phoneNumber: "+1 (555) 678-9012",
    address: "987 Cedar Ln, Greenfield, OR 97001",
    currentPackage: "Basic",
    billingStatus: "Pending",
    lastPaymentDate: "2023-12-28",
    email: "lisa.anderson@email.com",
    joinDate: "2023-07-14",
    vcNumber: "VC001239",
    collectorName: "Sarah Collector",
    portalBill: 29.99,
    isActive: true,
    activationDate: "2023-07-14",
  },
];

// Store mock customers in localStorage for persistence
let mockCustomersState: Customer[] = [];

// Store mock billing records
let mockBillingRecordsState: BillingRecord[] = [];

// Load mock customers from localStorage or use defaults
const initializeMockCustomers = () => {
  const stored = localStorage.getItem("cabletv_mock_customers");
  if (stored) {
    try {
      mockCustomersState = JSON.parse(stored);
    } catch (error) {
      mockCustomersState = [...MOCK_CUSTOMERS];
    }
  } else {
    mockCustomersState = [...MOCK_CUSTOMERS];
  }
};

// Load mock billing records from localStorage or use defaults
const initializeMockBillingRecords = () => {
  const stored = localStorage.getItem("cabletv_mock_billing_records");
  if (stored) {
    try {
      mockBillingRecordsState = JSON.parse(stored);
    } catch (error) {
      // Import mock data if localStorage is corrupted
      import("@/data/mockData").then(({ mockBillingRecords }) => {
        mockBillingRecordsState = [...mockBillingRecords];
        saveMockBillingRecords();
      });
    }
  } else {
    // Import mock data if no localStorage
    import("@/data/mockData").then(({ mockBillingRecords }) => {
      mockBillingRecordsState = [...mockBillingRecords];
      saveMockBillingRecords();
    });
  }
};

// Save mock customers to localStorage
const saveMockCustomers = () => {
  localStorage.setItem(
    "cabletv_mock_customers",
    JSON.stringify(mockCustomersState),
  );
};

// Save mock billing records to localStorage
const saveMockBillingRecords = () => {
  localStorage.setItem(
    "cabletv_mock_billing_records",
    JSON.stringify(mockBillingRecordsState),
  );
};

// Convert Firestore document to Customer type
const convertFirestoreToCustomer = (doc: DocumentData): Customer => {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    phoneNumber: data.phoneNumber,
    email: data.email || "",
    address: data.address,
    vcNumber: data.vcNumber,
    currentPackage: data.currentPackage,
    collectorName: data.collectorName,
    billingStatus: data.billingStatus,
    isActive: data.isActive,
    lastPaymentDate: data.lastPaymentDate,
    joinDate: data.joinDate,
    portalBill: data.portalBill || 0,
    activationDate: data.activationDate,
    deactivationDate: data.deactivationDate,
  };
};

// Convert Customer to Firestore document
const convertCustomerToFirestore = (
  customer: Omit<Customer, "id">,
): DocumentData => {
  return {
    name: customer.name,
    phoneNumber: customer.phoneNumber,
    email: customer.email || "",
    address: customer.address,
    vcNumber: customer.vcNumber,
    currentPackage: customer.currentPackage,
    collectorName: customer.collectorName,
    billingStatus: customer.billingStatus,
    isActive: customer.isActive,
    lastPaymentDate: customer.lastPaymentDate,
    joinDate: customer.joinDate,
    portalBill: customer.portalBill || 0,
    activationDate: customer.activationDate,
    deactivationDate: customer.deactivationDate,
    updatedAt: Timestamp.now(),
  };
};

export class CustomerService {
  // Initialize mock data
  static initialize() {
    initializeMockCustomers();
    initializeMockBillingRecords();
  }

  // Get all customers
  static async getAllCustomers(): Promise<Customer[]> {
    if (!AuthService.getFirebaseStatus()) {
      // Return mock customers
      return [...mockCustomersState];
    }

    try {
      const customersRef = collection(db, CUSTOMERS_COLLECTION);
      const q = query(customersRef, orderBy("name"));
      const snapshot = await getDocs(q);

      return snapshot.docs.map(convertFirestoreToCustomer);
    } catch (error) {
      console.error("Error fetching customers:", error);
      // Fall back to mock data
      return [...mockCustomersState];
    }
  }

  // Get customers by collector (for employees)
  static async getCustomersByCollector(
    collectorName: string,
  ): Promise<Customer[]> {
    if (!AuthService.getFirebaseStatus()) {
      // Return filtered mock customers
      return mockCustomersState.filter(
        (customer) => customer.collectorName === collectorName,
      );
    }

    try {
      const customersRef = collection(db, CUSTOMERS_COLLECTION);
      const q = query(
        customersRef,
        where("collectorName", "==", collectorName),
        orderBy("name"),
      );
      const snapshot = await getDocs(q);

      return snapshot.docs.map(convertFirestoreToCustomer);
    } catch (error) {
      console.error("Error fetching customers by collector:", error);
      // Fall back to mock data
      return mockCustomersState.filter(
        (customer) => customer.collectorName === collectorName,
      );
    }
  }

  // Get single customer
  static async getCustomer(id: string): Promise<Customer | null> {
    if (!AuthService.getFirebaseStatus()) {
      return mockCustomersState.find((customer) => customer.id === id) || null;
    }

    try {
      const customerRef = doc(db, CUSTOMERS_COLLECTION, id);
      const snapshot = await getDoc(customerRef);

      if (snapshot.exists()) {
        return convertFirestoreToCustomer(snapshot);
      }
      return null;
    } catch (error) {
      console.error("Error fetching customer:", error);
      return mockCustomersState.find((customer) => customer.id === id) || null;
    }
  }

  // Add new customer
  static async addCustomer(customer: Omit<Customer, "id">): Promise<string> {
    if (!AuthService.getFirebaseStatus()) {
      // Add to mock data
      const newId = Date.now().toString();
      const newCustomer = { ...customer, id: newId };
      mockCustomersState.unshift(newCustomer);
      saveMockCustomers();
      return newId;
    }

    try {
      const customersRef = collection(db, CUSTOMERS_COLLECTION);
      const customerData = {
        ...convertCustomerToFirestore(customer),
        createdAt: Timestamp.now(),
      };

      const docRef = await addDoc(customersRef, customerData);
      return docRef.id;
    } catch (error) {
      console.error("Error adding customer:", error);
      throw new Error("Failed to add customer");
    }
  }

  // Update customer
  static async updateCustomer(
    id: string,
    customer: Partial<Omit<Customer, "id">>,
  ): Promise<void> {
    if (!AuthService.getFirebaseStatus()) {
      // Update mock data
      const index = mockCustomersState.findIndex((c) => c.id === id);
      if (index !== -1) {
        mockCustomersState[index] = {
          ...mockCustomersState[index],
          ...customer,
        };
        saveMockCustomers();
      }
      return;
    }

    try {
      const customerRef = doc(db, CUSTOMERS_COLLECTION, id);
      const updateData = convertCustomerToFirestore(
        customer as Omit<Customer, "id">,
      );

      await updateDoc(customerRef, updateData);
    } catch (error) {
      console.error("Error updating customer:", error);
      throw new Error("Failed to update customer");
    }
  }

  // Delete customer
  static async deleteCustomer(id: string): Promise<void> {
    if (!AuthService.getFirebaseStatus()) {
      // Delete from mock data
      mockCustomersState = mockCustomersState.filter(
        (customer) => customer.id !== id,
      );
      saveMockCustomers();
      return;
    }

    try {
      const customerRef = doc(db, CUSTOMERS_COLLECTION, id);
      await deleteDoc(customerRef);
    } catch (error) {
      console.error("Error deleting customer:", error);
      throw new Error("Failed to delete customer");
    }
  }

  // Real-time listener for all customers
  static subscribeToCustomers(
    callback: (customers: Customer[]) => void,
    onError?: (error: Error) => void,
  ): () => void {
    if (!AuthService.getFirebaseStatus()) {
      // For mock data, just call callback immediately and return empty unsubscribe
      callback([...mockCustomersState]);
      return () => {};
    }

    const customersRef = collection(db, CUSTOMERS_COLLECTION);
    const q = query(customersRef, orderBy("name"));

    return onSnapshot(
      q,
      (snapshot: QuerySnapshot) => {
        const customers = snapshot.docs.map(convertFirestoreToCustomer);
        callback(customers);
      },
      (error) => {
        console.error("Error in customers subscription:", error);
        if (onError) {
          onError(new Error("Failed to sync customers"));
        }
        // Fall back to mock data
        callback([...mockCustomersState]);
      },
    );
  }

  // Real-time listener for customers by collector
  static subscribeToCustomersByCollector(
    collectorName: string,
    callback: (customers: Customer[]) => void,
    onError?: (error: Error) => void,
  ): () => void {
    if (!AuthService.getFirebaseStatus()) {
      // For mock data, filter and call callback
      const filtered = mockCustomersState.filter(
        (customer) => customer.collectorName === collectorName,
      );
      callback(filtered);
      return () => {};
    }

    const customersRef = collection(db, CUSTOMERS_COLLECTION);
    const q = query(
      customersRef,
      where("collectorName", "==", collectorName),
      orderBy("name"),
    );

    return onSnapshot(
      q,
      (snapshot: QuerySnapshot) => {
        const customers = snapshot.docs.map(convertFirestoreToCustomer);
        callback(customers);
      },
      (error) => {
        console.error("Error in customers subscription:", error);
        if (onError) {
          onError(new Error("Failed to sync customers"));
        }
        // Fall back to mock data
        const filtered = mockCustomersState.filter(
          (customer) => customer.collectorName === collectorName,
        );
        callback(filtered);
      },
    );
  }

  // Search customers
  static async searchCustomers(searchTerm: string): Promise<Customer[]> {
    const customers = await this.getAllCustomers();

    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phoneNumber.includes(searchTerm) ||
        customer.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.vcNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }

  // Get all billing records
  static async getAllBillingRecords(): Promise<BillingRecord[]> {
    if (!AuthService.getFirebaseStatus()) {
      return [...mockBillingRecordsState];
    }

    // TODO: Implement Firebase billing records fetching
    return [...mockBillingRecordsState];
  }

  // Add new billing record (invoice)
  static async addBillingRecord(
    billingRecord: Omit<BillingRecord, "id">,
  ): Promise<string> {
    if (!AuthService.getFirebaseStatus()) {
      const newId = Date.now().toString();
      const newRecord = { ...billingRecord, id: newId };
      mockBillingRecordsState.unshift(newRecord);
      saveMockBillingRecords();
      return newId;
    }

    // TODO: Implement Firebase billing record creation
    const newId = Date.now().toString();
    const newRecord = { ...billingRecord, id: newId };
    mockBillingRecordsState.unshift(newRecord);
    saveMockBillingRecords();
    return newId;
  }

  // Get billing records by employee
  static async getBillingRecordsByEmployee(
    employeeId: string,
  ): Promise<BillingRecord[]> {
    const allRecords = await this.getAllBillingRecords();
    return allRecords.filter((record) => record.employeeId === employeeId);
  }
}
