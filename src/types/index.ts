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
  customerId: string;
  previousStatus: CustomerStatus;
  newStatus: CustomerStatus;
  changedBy: string; // Admin who changed the status
  changedAt: Date; // Changed to Date type for consistency
  reason?: string;
  requestId?: string; // Link to request that triggered this change
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
  customerName?: string;
  packageName?: string;
  amount: number;
  billingMonth: string; // Format: YYYY-MM or "January 2024"
  billingYear?: string;
  paymentDate: Date;
  paymentStatus: "Paid" | "Pending" | "Overdue";
  amountPaid: number;
  paymentMethod?: "Cash" | "Card" | "Bank Transfer" | "Online";
  vcNumber?: string; // Primary VC Number (handles billing for all connections)
  allVcNumbers?: string[]; // All VC numbers for this customer (primary + secondary)
  customAmount?: number; // For custom invoice amounts
  dueDate?: string;
  invoiceNumber?: string;
  generatedDate?: string;
  generatedBy?: string; // Employee who generated the invoice
  employeeId?: string; // Employee ID who generated the invoice
  notes?: string; // Additional notes
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

// VC Inventory Management
export interface VCInventoryItem {
  id: string;
  vcNumber: string; // Unique VC number
  customerId: string; // Reference to customer
  customerName?: string; // Cached for display
  packageId: string; // Reference to package
  packageName?: string; // Cached for display
  packageAmount?: number; // Cached for display
  status: "active" | "inactive";
  statusHistory: VCStatusHistory[];
  ownershipHistory: VCOwnershipHistory[];
  createdAt: Date;
  updatedAt: Date;
}

export interface VCStatusHistory {
  status: "active" | "inactive";
  changedAt: Date;
  changedBy: string;
  reason?: string;
}

export interface VCOwnershipHistory {
  customerId: string;
  customerName: string;
  startDate: Date;
  endDate?: Date; // null if current owner
  assignedBy: string;
}

// Monthly Bills System
export interface MonthlyBill {
  id: string;
  customerId: string;
  customerName: string; // Cached for display
  month: string; // Format: YYYY-MM
  vcBreakdown: VCBillBreakdown[];
  totalAmount: number;
  billDueDate: Date;
  status: "generated" | "partial" | "paid";
  createdAt: Date;
  updatedAt: Date;
}

export interface VCBillBreakdown {
  vcNumber: string;
  packageId: string;
  packageName: string;
  amount: number;
}

// Payment Collection System
export interface PaymentInvoice {
  id: string;
  customerId: string;
  customerName: string; // Cached for display
  billId?: string; // Optional reference to specific bill
  billMonth?: string; // For reference
  amountPaid: number;
  paymentMethod: "cash" | "online" | "bank_transfer" | "cheque";
  paidAt: Date;
  collectedBy: string; // Employee who collected payment
  notes?: string;
  receiptNumber?: string;
  createdAt: Date;
}

// Financial Summary for Customer
export interface CustomerFinancialSummary {
  customerId: string;
  previousOS: number;
  currentOS: number;
  lastBilledDate?: Date;
  nextDueDate?: Date;
  totalUnpaidBills: number;
  totalPayments: number;
  activeVCCount: number;
  monthlyAmount: number;
}
