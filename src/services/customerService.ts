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
import { Customer } from "@/types";

const CUSTOMERS_COLLECTION = "customers";

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
  // Get all customers
  static async getAllCustomers(): Promise<Customer[]> {
    try {
      const customersRef = collection(db, CUSTOMERS_COLLECTION);
      const q = query(customersRef, orderBy("name"));
      const snapshot = await getDocs(q);

      return snapshot.docs.map(convertFirestoreToCustomer);
    } catch (error) {
      console.error("Error fetching customers:", error);
      throw new Error("Failed to fetch customers");
    }
  }

  // Get customers by collector (for employees)
  static async getCustomersByCollector(
    collectorName: string,
  ): Promise<Customer[]> {
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
      throw new Error("Failed to fetch customers");
    }
  }

  // Get single customer
  static async getCustomer(id: string): Promise<Customer | null> {
    try {
      const customerRef = doc(db, CUSTOMERS_COLLECTION, id);
      const snapshot = await getDoc(customerRef);

      if (snapshot.exists()) {
        return convertFirestoreToCustomer(snapshot);
      }
      return null;
    } catch (error) {
      console.error("Error fetching customer:", error);
      throw new Error("Failed to fetch customer");
    }
  }

  // Add new customer
  static async addCustomer(customer: Omit<Customer, "id">): Promise<string> {
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
      },
    );
  }

  // Real-time listener for customers by collector
  static subscribeToCustomersByCollector(
    collectorName: string,
    callback: (customers: Customer[]) => void,
    onError?: (error: Error) => void,
  ): () => void {
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
      },
    );
  }

  // Search customers
  static async searchCustomers(searchTerm: string): Promise<Customer[]> {
    try {
      // Note: Firestore doesn't support full-text search natively
      // This is a basic implementation - for production, consider using Algolia or similar
      const customers = await this.getAllCustomers();

      return customers.filter(
        (customer) =>
          customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.phoneNumber.includes(searchTerm) ||
          customer.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.vcNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.email?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    } catch (error) {
      console.error("Error searching customers:", error);
      throw new Error("Failed to search customers");
    }
  }
}
