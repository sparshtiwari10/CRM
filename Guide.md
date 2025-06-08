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
  - **Employee dropdown from Firebase users** (not just billing records)

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

#### **`authService.ts`** 🛡️ **[ENHANCED WITH EMPLOYEE LISTING]**

- **Purpose**: Authentication, authorization, and user management
- **Key Features**:
  - Role-based access control
  - Session management
  - **`getAllEmployees()`**: NEW - Fetches all employees from Firebase
  - Permission checking for customer access
  - User creation and management (Admin only)

**NEW Method Added:**

```typescript
static async getAllEmployees(): Promise<Array<{id: string, name: string, role: string}>> {
  // Fetches all active employees from Firebase users collection
  // Falls back to mock data if Firebase unavailable
}
```

#### **`firestoreService.ts`** 🔥 **[DATABASE LAYER]**

- **Purpose**: Direct Firestore database operations
- **Critical Features**:
  - **Composite Index Avoidance**: Uses `where()` + in-memory sorting
  - Customer management with data validation
  - Billing record management
  - Data import/export with batch operations

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

### **📊 Enhanced Employee Management**

- **NEW**: Billing page now shows all employees from Firebase
- **Components**: `Billing.tsx` employee dropdown
- **Service**: `authService.getAllEmployees()` method
- **Features**:
  - Dropdown populated from Firebase users, not billing records
  - Shows employee role (Admin/Employee)
  - Fallback to mock data for offline scenarios

---

## 🚨 **Recent Changes Applied**

### **1. ✅ Fixed Billing Employee Dropdown**

- **Problem**: Only showed "System Administrator"
- **Solution**: Added `authService.getAllEmployees()` method
- **Result**: Now shows all employees from Firebase users collection

### **2. ✅ Enhanced Billing.tsx**

- **Added**: Employee fetching with `useEffect`
- **Added**: Role display in dropdown items
- **Added**: Proper fallback for offline scenarios

### **3. ✅ Guide.md File Created**

- **Location**: Project root directory
- **Content**: Complete architecture documentation
- **Sections**: All components, services, critical areas marked

---

## 🔧 **File Locations & Status**

| File                  | Status      | Location                                     |
| --------------------- | ----------- | -------------------------------------------- |
| **Guide.md**          | ✅ Created  | Project root (same level as package.json)    |
| **authService.ts**    | ✅ Updated  | `src/services/authService.ts`                |
| **Billing.tsx**       | ✅ Enhanced | `src/pages/Billing.tsx`                      |
| **CustomerTable.tsx** | ✅ Enhanced | `src/components/customers/CustomerTable.tsx` |

---

## 🎯 **Quick Reference Guide**

| **Task**                   | **File to Modify**                                          | **Key Function/Component**                    |
| -------------------------- | ----------------------------------------------------------- | --------------------------------------------- |
| Add employee functionality | `authService.ts`                                            | `getAllEmployees()` method                    |
| Fix billing dropdown       | `Billing.tsx`                                               | Employee filter with Firebase users           |
| Add customer field         | `types/index.ts` → `CustomerTable.tsx`                      | `Customer` interface                          |
| Change navigation menu     | `Sidebar.tsx`                                               | `adminNavigation`/`employeeNavigation` arrays |
| Fix dark mode colors       | Search for hardcoded colors → replace with semantic classes | Theme compatibility                           |
| Debug customer display     | `CustomerTable.tsx`                                         | `enrichedCustomers` and filtering logic       |

---

**🔧 Need Help Finding Guide.md?**

- **Location**: Project root directory (same level as package.json, vite.config.ts)
- **Try**: `code Guide.md` or `cat Guide.md` in terminal
- **Check**: File explorer settings for hidden files
- **Refresh**: Your IDE/file explorer (Ctrl+F5)
