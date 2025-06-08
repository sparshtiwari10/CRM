export interface Connection {
  id: string;
  vcNumber: string;
  planName: string;
  planPrice: number;
  isCustomPlan: boolean;
  isPrimary: boolean;
  connectionIndex: number;
  description?: string;
  // Enhanced VC-level fields
  status?: CustomerStatus; // Individual VC status
  packageAmount?: number; // Monthly package amount for this VC
  previousOutstanding?: number; // Previous outstanding for this VC
  currentOutstanding?: number; // Current outstanding for this VC
  lastBillingDate?: string; // Last billing date for this VC
  activationDate?: string; // When this VC was activated
  deactivationDate?: string; // When this VC was deactivated (if inactive)
}

export type CustomerStatus = "active" | "inactive" | "demo";

export interface StatusLog {
  id: string;
  previousStatus: CustomerStatus;
  newStatus: CustomerStatus;
  changedBy: string; // Admin who changed the status
  changedDate: string;
  reason?: string;
}

export interface Customer {
  id: string;
  name: string;
  phoneNumber: string;
  address: string;
  currentPackage: string;
  lastPaymentDate: string;
  email?: string;
  joinDate: string;
  vcNumber: string;
  collectorName: string; // Employee assigned to this customer
  portalBill?: number; // Admin-only field
  isActive: boolean;
  status: CustomerStatus; // New status field
  statusLogs?: StatusLog[]; // Status change history for admins
  activationDate?: string;
  deactivationDate?: string;
  billingStatus?: "Paid" | "Pending" | "Overdue";
  // New fields for multiple connections and custom plans
  numberOfConnections: number;
  connections: Connection[];
  customPlan?: {
    name: string;
    price: number;
    description: string;
  };
  // Enhanced billing calculation fields
  packageAmount: number; // Monthly package amount (required)
  previousOutstanding: number; // Previous outstanding amount (can be negative)
  currentOutstanding: number; // Current outstanding amount (calculated: previous + package - paid invoices, can be negative)
  billDueDate: number; // Due date (1-31) - on this date each month billing cycle runs
  // Invoice history for expanded row
  invoiceHistory?: BillingRecord[];
}

export interface Package {
  id: string;
  name: string;
  price: number;
  description: string;
  channels: number;
  features: string[];
  isActive: boolean;
  portalAmount: number; // New field for portal billing amount
}

export interface Payment {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  date: string;
  method: "Cash" | "Card" | "Bank Transfer" | "Online";
  status: "Completed" | "Pending" | "Failed";
  invoiceNumber: string;
}

export interface BillingRecord {
  id: string;
  customerId: string;
  customerName: string;
  packageName: string;
  amount: number;
  dueDate: string;
  status?: "Paid" | "Pending" | "Overdue";
  invoiceNumber: string;
  generatedDate: string;
  generatedBy: string; // Employee who generated the invoice
  employeeId: string; // Employee ID who generated the invoice
  billingMonth: string; // e.g., "January 2024"
  billingYear: string;
  vcNumber: string; // Primary VC Number (handles billing for all connections)
  allVcNumbers?: string[]; // All VC numbers for this customer (primary + secondary)
  customAmount?: number; // For custom invoice amounts
  paymentDate?: string; // Date when payment was received
  paymentMethod?: string; // Payment method used
  notes?: string; // Additional notes
  // Fields to ensure proper saving in both admin and employee views
  savedInBillingRecords?: boolean; // Ensures record is saved in billing section
}

export interface DashboardStats {
  totalCustomers: number;
  activeCustomers: number;
  monthlyRevenue: number;
  pendingPayments: number;
  overdueAccounts: number;
  newCustomersThisMonth: number;
}

export type NavigationItem = {
  name: string;
  href: string;
  icon: string;
  current?: boolean;
};

export interface Invoice {
  id: string;
  customerId: string;
  amount: number;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  status: "Paid" | "Pending" | "Overdue";
}
