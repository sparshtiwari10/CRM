export interface User {
  id: string;
  email: string;
  phone?: string;
  name: string;
  role: "admin" | "employee";
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  assignedCustomers?: string[]; // Customer IDs assigned to employee
}

export interface Employee extends User {
  role: "employee";
  employeeId: string;
  department?: string;
  supervisor?: string;
  permissions: EmployeePermissions;
}

export interface EmployeePermissions {
  canViewAllCustomers: boolean;
  canCreateCustomers: boolean;
  canEditCustomers: boolean;
  canDeleteCustomers: boolean;
  canViewReports: boolean;
  canProcessPayments: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthContextType {
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  canAccessCustomer: (customerId: string) => boolean;
}

export interface ActionRequest {
  id: string;
  customerId: string;
  customerName: string;
  vcNumber: string; // VC number for the request
  employeeId: string;
  employeeName: string;
  actionType: "activation" | "deactivation" | "plan_change";
  currentPlan?: string;
  currentStatus?: "active" | "inactive" | "demo"; // Current VC status
  requestedPlan?: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  requestDate: string;
  reviewDate?: string;
  reviewedBy?: string;
  adminNotes?: string;
}

export interface ChangeHistory {
  id: string;
  customerId: string;
  customerName: string;
  employeeId: string;
  employeeName: string;
  changeType:
    | "plan_change"
    | "activation"
    | "deactivation"
    | "vc_number_change"
    | "customer_update";
  oldValue?: string;
  newValue?: string;
  timestamp: string;
  actionRequestId?: string;
}

export interface PaymentReport {
  employeeId: string;
  employeeName: string;
  period: string;
  totalCollected: number;
  transactionCount: number;
  averageTransaction: number;
}

export interface DashboardReport {
  totalEmployees: number;
  activeEmployees: number;
  pendingRequests: number;
  todayCollections: number;
  monthlyCollections: number;
  topPerformers: PaymentReport[];
}
