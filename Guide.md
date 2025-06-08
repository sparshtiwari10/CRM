# AGV Cable TV Management System - Developer Guide

## 🏗️ **Architecture Overview**

This is a comprehensive **Customer Management System** for cable TV providers built with **React + TypeScript + Vite**. The system supports both **Administrator** and **Employee** roles with different access levels.

---

## 📁 **Project Structure**

```
src/
├── components/          # Reusable UI components
│   ├── common/         # Shared components (FirebaseStatus, ErrorBoundary)
│   ├── customers/      # Customer-specific components
│   ├── layout/         # Layout components (Sidebar, TopBar, DashboardLayout)
│   ├── ui/            # shadcn/ui base components
│   ├── invoice/       # Invoice generation components
│   └── packages/      # Package management components
├── pages/              # Main application pages
├── services/           # Business logic and API calls
├── types/              # TypeScript type definitions
├── contexts/           # React context providers (Auth, Theme)
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries (firebase, utils)
├── utils/              # Utility functions
└── data/               # Mock data and constants
```

---

## 🎨 **Layout Components**

### **`src/components/layout/`**

#### **`DashboardLayout.tsx`** 🏠 **[CRITICAL - LAYOUT]**

- **Purpose**: Main application layout wrapper
- **Features**:
  - Handles sidebar positioning and main content offset
  - Responsive design with proper spacing
  - Contains Sidebar + TopBar + main content area
- **Critical CSS Class**: `lg:ml-64` - **DO NOT REMOVE** (fixes sidebar overlap)
- **Structure**:
  ```typescript
  <div className="flex h-screen bg-background">
    <Sidebar />
    <div className="flex flex-1 flex-col overflow-hidden lg:ml-64"> // CRITICAL LINE
      <TopBar title={title} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  </div>
  ```

#### **`Sidebar.tsx`** 🧭

- **Purpose**: Navigation sidebar with role-based menu items
- **Features**:
  - Different navigation for Admin vs Employee
  - Active page highlighting with blue background
  - Mobile responsive with Sheet component
  - Dark mode support with semantic colors
- **Role Logic**:
  - `adminNavigation`: Dashboard, Customers, Billing, Packages, Requests, Employees, Settings
  - `employeeNavigation`: Dashboard, Customers, Billing, Requests
- **Important**: Fixed positioned (`lg:w-64 lg:fixed`) with proper z-index

#### **`TopBar.tsx`** 🔝

- **Purpose**: Application header with user controls
- **Features**:
  - Search functionality
  - Dark mode toggle (Sun/Moon icons)
  - Notifications dropdown with badge
  - User profile menu with role badges
  - Firebase connection status indicator

---

## 📄 **Page Components**

### **`src/pages/`**

#### **`Login.tsx`** 🔐

- **Purpose**: Authentication page with gradient background
- **Features**:
  - Username/password login form
  - Demo login buttons for testing
  - Firebase connection status display
  - Password visibility toggle
  - Dark mode compatible gradient
- **Demo Credentials**:
  - Admin: `admin` / `admin123`
  - Employee: `employee` / `employee123`

#### **`Dashboard.tsx`** 📊

- **Purpose**: Main dashboard with statistics and quick actions
- **Features**:
  - Real-time customer statistics (total, active, revenue)
  - Role-based content (Admin vs Employee views)
  - Collection summaries for employees (Today's/Yesterday's)
  - Quick action buttons for common tasks
  - Recent customer listing with status badges

#### **`Customers.tsx`** 👥 **[MAIN CUSTOMER PAGE]**

- **Purpose**: Primary customer management interface
- **Features**:
  - Customer listing with advanced filters
  - Search by name, phone, VC number, address
  - Status filtering (Active, Inactive, Demo)
  - Collector filtering (Admin view)
  - CRUD operations (Admin only)
  - CSV import/export functionality
  - Employee request system for restricted actions
- **Critical Dependencies**: Uses `CustomerTable` component for main functionality

#### **`Billing.tsx`** 💰

- **Purpose**: Billing and payment management
- **Features**:
  - Billing records table with filtering
  - Collection summaries (Today's/Yesterday's)
  - CSV export functionality
  - Invoice generation integration
  - Date range filtering
  - Status-based filtering (Paid, Pending, Overdue)

---

## 🔧 **Customer Management Components**

### **`src/components/customers/`**

#### **`CustomerTable.tsx`** 📋 **[MOST CRITICAL COMPONENT]**

- **Purpose**: Advanced customer table with expandable rows and multiple VC support
- **Key Features**:
  - **Multiple VC Number Support**: Individual status tracking per VC
  - **Expandable Rows**: Detailed customer information on click
  - **Dark Mode Compatible**: Uses semantic theme colors
  - **Status Management**: VC-level status changes with audit log
  - **Financial Summary**: Overall + Per-VC breakdown
  - **Mobile Responsive**: Table converts to cards automatically
  - **Real-time Invoice Fetching**: Firestore integration with fallbacks
  - **Outstanding Calculations**: Active VC filtering only

**⚠️ CRITICAL SECTIONS - DO NOT MODIFY:**

1. **VC Status Calculation Logic**:

   ```typescript
   const calculateVCStatus = useCallback((customer: Customer) => {
     // Handles mixed status for multiple VCs
     // Returns: "active", "inactive", or "mixed"
   });
   ```

2. **Expanded Row Content** (Lines ~400-700):

   - VC Connections & Status section with individual badges
   - Enhanced Financial Summary with per-VC breakdown
   - Recent Invoices with Firestore integration

3. **Mobile Card Layout** (Lines ~800-1000):
   - Responsive design for small screens
   - Preserves all functionality in card format

#### **`CustomerModal.tsx`** ✏️

- **Purpose**: Customer creation and editing modal
- **Features**:
  - Form validation with React Hook Form
  - Multiple VC connection support
  - Custom package configuration
  - Status management with change logging

#### **`CustomerImportExport.tsx`** 📤📥

- **Purpose**: CSV data import/export functionality
- **Features**:
  - File upload with validation
  - Data transformation and mapping
  - Export with custom formatting
  - Progress indicators and error handling

#### **`ActionRequestModal.tsx`** 📝

- **Purpose**: Employee request system for admin approval
- **Features**:
  - Request creation with reason input
  - Status tracking (pending, approved, rejected)
  - Admin notification system

---

## 🔄 **Services Layer**

### **`src/services/`**

#### **`customerService.ts`** 🔗 **[BUSINESS LOGIC BRIDGE]**

- **Purpose**: Bridge between UI components and data layer
- **Key Features**:
  - Customer CRUD operations with validation
  - **`getBillingRecordsByCustomer()`**: Critical for invoice fetching
  - Billing record management
  - Request handling for employee permissions
  - Fallback to mock data when Firestore unavailable
- **Critical Methods**:
  ```typescript
  static async getBillingRecordsByCustomer(customerId: string): Promise<BillingRecord[]>
  static async updateCustomer(customerId: string, updates: Partial<Customer>): Promise<void>
  ```

#### **`firestoreService.ts`** 🔥 **[DATABASE LAYER]**

- **Purpose**: Direct Firestore database operations
- **Critical Features**:
  - **Composite Index Avoidance**: Uses `where()` + in-memory sorting
  - Customer management with data validation
  - Billing record management
  - Data import/export with batch operations
- **Critical Method**:
  ```typescript
  async getBillingRecordsByCustomer(customerId: string): Promise<BillingRecord[]> {
    // Uses where() only to avoid composite index requirement
    const q = query(billingRef, where("customer_id", "==", customerId), limit(20));
    // Sorts in memory and returns top 10
  }
  ```

#### **`authService.ts`** 🛡️

- **Purpose**: Authentication and authorization management
- **Features**:
  - Role-based access control
  - Session management
  - Permission checking for customer access

---

## 📝 **Type Definitions**

### **`src/types/index.ts`** 📚 **[CRITICAL TYPE FILE]**

#### **Enhanced Interfaces for Multiple VC Support**:

```typescript
// Individual VC Connection with own status and billing
interface Connection {
  id: string;
  vcNumber: string;
  planName: string;
  planPrice: number;
  isPrimary: boolean; // Primary/Secondary indicator
  status?: CustomerStatus; // Individual VC status
  packageAmount?: number; // Monthly amount for this VC
  previousOutstanding?: number; // Previous outstanding for this VC
  currentOutstanding?: number; // Current outstanding for this VC
  activationDate?: string;
  deactivationDate?: string;
}

// Customer with multiple VC support
interface Customer {
  id: string;
  name: string;
  phoneNumber: string;
  address: string;
  currentPackage: string;

  // Multiple VC fields
  connections: Connection[]; // Array of VC connections
  numberOfConnections: number;

  // Status management
  status: CustomerStatus; // Overall customer status
  statusLogs?: StatusLog[]; // Audit trail for status changes

  // Enhanced billing
  packageAmount: number; // Total package amount
  previousOutstanding: number; // Previous outstanding (can be negative)
  currentOutstanding: number; // Current outstanding (calculated)
  billDueDate: number; // Day of month (1-31)

  // Invoice integration
  invoiceHistory?: BillingRecord[]; // Recent invoices
}

// Status change audit trail
interface StatusLog {
  id: string;
  previousStatus: CustomerStatus;
  newStatus: CustomerStatus;
  changedBy: string; // Admin who made the change
  changedDate: string;
  reason?: string;
}
```

#### **Critical Types**:

- `CustomerStatus`: "active" | "inactive" | "demo"
- `BillingRecord`: Enhanced with all required fields for invoicing
- `StatusLog`: For audit trail and compliance

---

## 🎯 **Key Features & Implementation**

### **🔥 Multiple VC Number Support**

- **Components**: `CustomerTable.tsx` (main display), `CustomerModal.tsx` (editing)
- **Types**: Enhanced `Connection` and `Customer` interfaces
- **Services**: Updated CRUD operations in both service layers
- **Features**:
  - Individual VC status tracking (Active/Inactive/Demo)
  - Per-VC billing amounts and outstanding calculations
  - Primary/Secondary VC designation
  - VC-specific activation/deactivation dates

### **🌙 Dark Mode System**

- **Implementation**: Tailwind CSS with `dark:` variants
- **Components**: All components use semantic theme classes
- **Toggle**: `TopBar.tsx` Sun/Moon button with theme context
- **Critical Classes**:
  - `text-foreground` (instead of `text-gray-900`)
  - `text-muted-foreground` (instead of `text-gray-600`)
  - `bg-background` (instead of `bg-white`)
  - `bg-card` (instead of `bg-gray-50`)

### **📊 Financial Management**

- **Components**: `CustomerTable.tsx` financial summary, `Billing.tsx` collections
- **Logic**: Active VC filtering for outstanding calculations
- **Features**:
  - Per-VC financial breakdown in expanded rows
  - Overall financial summary across all VCs
  - Collection summaries by date (Today/Yesterday)
  - Outstanding amount calculations (red/green indicators)

### **🔍 Advanced Search & Filtering**

- **Components**: `Customers.tsx`, `CustomerTable.tsx`
- **Implementation**: Real-time filtering with `useMemo` optimization
- **Features**:
  - Multi-field search (name, phone, VC number, address, email)
  - Status filtering (Active, Inactive, Demo, All)
  - Collector filtering (Admin only)
  - Date range filtering for billing records

### **📱 Mobile Responsiveness**

- **Implementation**: `hidden md:block` for desktop, `md:hidden` for mobile
- **Key Component**: `CustomerTable.tsx` automatically converts to cards
- **Features**:
  - Touch-friendly interfaces
  - Compact information display
  - Preserved functionality across all screen sizes

---

## 🚨 **Critical Areas - NEVER MODIFY**

### **1. Sidebar Layout Fix**

```typescript
// File: DashboardLayout.tsx - Line ~13
<div className="flex flex-1 flex-col overflow-hidden lg:ml-64">
```

**Purpose**: Prevents main content from being hidden behind fixed sidebar
**Risk**: Removing `lg:ml-64` will cause content overlap on desktop

### **2. Customer Table Expanded Rows**

```typescript
// File: CustomerTable.tsx - Lines ~400-700
{expandedRows.has(customer.id) && (
  <TableRow>
    <TableCell colSpan={11} className="p-0">
      {/* Enhanced VC display and financial breakdown */}
    </TableCell>
  </TableRow>
)}
```

**Purpose**: Multiple VC support with individual status and financial tracking
**Risk**: Contains complex logic for VC status calculation and financial summaries

### **3. Firestore Query Optimization**

```typescript
// File: firestoreService.ts - getBillingRecordsByCustomer method
const q = query(billingRef, where("customer_id", "==", customerId), limit(20));
// In-memory sorting to avoid composite index requirement
return records.sort(
  (a, b) =>
    new Date(b.generatedDate).getTime() - new Date(a.generatedDate).getTime(),
);
```

**Purpose**: Avoids Firebase composite index requirements while maintaining performance
**Risk**: Changing to orderBy() will require Firebase composite indexes

### **4. Theme Color Classes**

**Always Use**:

- `text-foreground`, `text-muted-foreground`, `text-muted-foreground/70`
- `bg-background`, `bg-card`, `bg-muted`, `bg-muted/50`
- `border-border`, `border-muted`

**Never Use**:

- `text-gray-900`, `text-gray-600`, `text-gray-500`
- `bg-gray-50`, `bg-gray-100`, `bg-white`
- Hardcoded RGB colors like `rgb(17, 24, 39)`

**Purpose**: Ensures automatic dark mode compatibility

---

## 🛠️ **Development Guidelines**

### **Adding New Features**

1. **Check existing components first** - Many are highly reusable
2. **Use semantic theme classes** for all styling
3. **Follow the service layer pattern**: UI → customerService → firestoreService
4. **Add TypeScript types** in `src/types/index.ts`
5. **Test both Admin and Employee role views**
6. **Test both light and dark modes**

### **Modifying Customer Table**

- **Test multiple VC scenarios** thoroughly (2-3 VCs per customer)
- **Preserve the financial summary structure** (overall + per-VC breakdown)
- **Maintain mobile responsiveness** (table → cards)
- **Keep Firestore fallback logic** for offline scenarios
- **Test status change functionality** with proper logging

### **Theme Development**

- **Always test in both light and dark modes** using the toggle
- **Use semantic classes** from the theme configuration
- **Check mobile responsiveness** at different breakpoints
- **Verify color contrast** for accessibility

---

## 🔄 **Common Development Workflows**

### **Customer Management Flow**

1. **Data Loading**: `Customers.tsx` → `CustomerService.getAllCustomers()`
2. **Display**: `CustomerTable.tsx` renders with expandable rows
3. **Row Expansion**: Triggers `getBillingRecordsByCustomer()` for invoices
4. **Status Changes**: `handleStatusChange()` updates with audit logging
5. **Persistence**: `customerService.updateCustomer()` → `firestoreService`

### **Billing Workflow**

1. **Invoice Generation**: `InvoiceGenerator.tsx` creates new billing record
2. **Database Save**: `firestoreService.addBillingRecord()` persists to Firestore
3. **UI Update**: `CustomerTable.tsx` displays in recent invoices section
4. **Summary Display**: `Billing.tsx` shows in collection summaries

### **Authentication Flow**

1. **Login**: `Login.tsx` captures and validates credentials
2. **Authentication**: `authService.login()` verifies user
3. **Context Update**: `AuthContext` provides role-based access control
4. **UI Rendering**: Components check `isAdmin` for conditional display

---

## 🧪 **Critical Testing Scenarios**

### **Must-Test Before Deployment**

1. **Multiple VC Customers**:

   - Customer with 2-3 VC numbers
   - Mixed status (some active, some inactive)
   - Per-VC financial breakdown accuracy

2. **Dark Mode Compatibility**:

   - Toggle between light/dark modes
   - Check all pages and components
   - Verify color contrast and readability

3. **Mobile Responsiveness**:

   - Table converts to cards properly
   - All functions accessible on mobile
   - Touch-friendly interactions

4. **Role-Based Access**:

   - Admin vs Employee permissions
   - Request system for employees
   - Data visibility restrictions

5. **Offline Scenarios**:
   - Firestore connection failures
   - Fallback to mock data
   - Error handling and user feedback

---

## 📚 **Dependencies & Libraries**

### **Core Framework**

- **React 18**: Component framework with hooks
- **TypeScript**: Type safety and development experience
- **Vite**: Build tool and development server

### **UI & Styling**

- **Tailwind CSS**: Utility-first CSS with dark mode support
- **shadcn/ui**: Component library foundation
- **Lucide React**: Icon library (consistent icons throughout)

### **Data & State Management**

- **Firebase/Firestore**: Primary database and authentication
- **React Context**: Global state management (Auth, Theme)
- **React Router**: Navigation and routing

### **Forms & Validation**

- **React Hook Form**: Form handling and validation
- **Zod**: Schema validation (if used)

---

## 🎯 **Quick Reference Guide**

| **Task**                    | **File to Modify**                                          | **Key Function/Component**                     |
| --------------------------- | ----------------------------------------------------------- | ---------------------------------------------- |
| Add customer field          | `types/index.ts` → `CustomerTable.tsx`                      | `Customer` interface                           |
| Change navigation menu      | `Sidebar.tsx`                                               | `adminNavigation`/`employeeNavigation` arrays  |
| Modify billing calculations | `customerService.ts`                                        | `getBillingRecordsByCustomer()` method         |
| Add new page/route          | `pages/` + `Sidebar.tsx`                                    | Create page + add to navigation                |
| Fix dark mode colors        | Search for hardcoded colors → replace with semantic classes | Theme compatibility                            |
| Debug customer display      | `CustomerTable.tsx`                                         | `enrichedCustomers` and filtering logic        |
| Add VC functionality        | `CustomerTable.tsx` + `types/index.ts`                      | `Connection` interface + display logic         |
| Modify status system        | `CustomerTable.tsx`                                         | `calculateVCStatus()` + `handleStatusChange()` |

---

## ⚠️ **Important Reminders**

1. **This is a Financial System**: Any changes to billing calculations, outstanding amounts, or payment tracking must be thoroughly tested for data accuracy.

2. **Multi-Role Application**: Always test both Administrator and Employee views when making changes.

3. **Mobile-First**: The customer table is heavily used on mobile devices - maintain responsive design.

4. **Dark Mode Support**: All new components must support both light and dark themes.

5. **Firestore Integration**: Database queries are optimized to avoid composite indexes - maintain this optimization.

6. **Audit Trail**: Status changes and customer modifications are logged - preserve this functionality for compliance.

---

**🔧 Need Help?**

- Check existing similar components before creating new ones
- Use the Quick Reference table for common tasks
- Test in both Admin and Employee modes
- Always verify dark mode compatibility
- Check mobile responsiveness on actual devices
