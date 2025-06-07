export interface Customer {
  id: string;
  name: string;
  phoneNumber: string;
  address: string;
  currentPackage: string;
  billingStatus: "Paid" | "Pending" | "Overdue";
  lastPaymentDate: string;
  email?: string;
  joinDate: string;
  vcNumber: string;
  collectorName: string; // Employee assigned to this customer
  portalBill?: number; // Admin-only field
  isActive: boolean;
  activationDate?: string;
  deactivationDate?: string;
}

export interface Package {
  id: string;
  name: string;
  price: number;
  description: string;
  channels: number;
  features: string[];
  isActive: boolean;
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
  status: "Paid" | "Pending" | "Overdue";
  invoiceNumber: string;
  generatedDate: string;
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
