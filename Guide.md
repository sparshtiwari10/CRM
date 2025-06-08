# AGV Cable TV Management System - Developer Guide

## 🏗️ **Architecture Overview**

This is a comprehensive **Customer Management System** for cable TV providers built with **React + TypeScript + Vite**. The system supports **Administrator** and **Employee** roles with Firebase-based authentication and real-time data management.

## 🚨 **CRITICAL UPDATES (Latest)**

### **🔐 Security Enhancement: Demo Credentials Removed**

- **REMOVED**: Demo login credentials (`admin`/`admin123`, `employee`/`employee123`)
- **NEW**: Firebase-only authentication - all users must be created through User Management
- **IMPACT**: More secure, production-ready authentication system
- **CREATE USERS**: Use User Management page to create real employee accounts

### **👥 User Management Overhaul**

- **ADDED**: Active/Inactive toggle for all users
- **FEATURE**: Real-time user status control - inactive users cannot log in
- **UI**: Enhanced User Management with status badges and confirmation dialogs
- **SECURITY**: Only active employees appear in customer assignment dropdowns

### **🔄 Terminology Standardization**

- **CHANGED**: "Collector" → "Employee" throughout the entire customer management system
- **UPDATED**: All UI labels, dropdowns, tables, import/export headers
- **CONSISTENT**: Unified terminology across Customer, Billing, and User Management pages

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
│   ├── auth/          # Authentication components
│   └── packages/      # Package management components
├── pages/              # Main application pages
├── services/           # Business logic and API calls
├── types/              # TypeScript type definitions
├��─ contexts/           # React context providers (Auth, Theme)
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
  - `adminNavigation`: Dashboard, Customers, Billing, Packages, Requests, User Management, Settings
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

#### **`Login.tsx`** 🔐 **[UPDATED - SECURITY]**

- **Purpose**: Firebase-only authentication page
- **Features**:
  - Username/password login form
  - Firebase connection status display
  - Password visibility toggle
  - Dark mode compatible gradient
- **REMOVED**: Demo login credentials for security
- **Requirement**: Users must be created through User Management page

#### **`EmployeeManagement.tsx`** 👥 **[NEW - USER CONTROL]**

- **Purpose**: Comprehensive user management with status control
- **Features**:
  - View all users (Admins + Employees)
  - **Active/Inactive Toggle**: Real-time user status control
  - **Security**: Inactive users cannot log in
  - Create new users with role assignment
  - Real Firebase data (no mock users)
  - Status confirmation dialogs
- **Key Functions**:
  ```typescript
  handleToggleStatus(); // Activate/deactivate users
  authService.updateUser(); // Firebase status updates
  ```

#### **`Customers.tsx`** 🏢 **[UPDATED - TERMINOLOGY]**

- **Purpose**: Customer management with Firebase employee integration
- **Features**:
  - **Employee Filter**: Renamed from "Collector Filter"
  - **Real Employee Data**: Pulls active employees from Firebase
  - Customer creation, editing, and management
  - Multi-VC customer support
  - Role-based access control
- **Data Source**: `authService.getAllEmployees()` for employee dropdowns

#### **`Dashboard.tsx`** 📊

- **Purpose**: Main dashboard with statistics and quick actions
- **Features**:
  - Role-based content (different for Admin vs Employee)
  - Customer count by status (Active, Inactive, Demo)
  - Quick action buttons for customer/billing management
  - Recent activity feed
  - Firebase connection monitoring

#### **`Billing.tsx`** 💰

- **Purpose**: Invoice generation and payment tracking
- **Features**:
  - **Employee Dropdown**: Uses real Firebase employees (not hardcoded)
  - Invoice generation with automatic numbering
  - Payment tracking by collection method
  - Monthly/yearly collection summaries
  - Employee-specific collection reports

---

## 🔧 **Service Layer**

### **`src/services/`**

#### **`authService.ts`** 🔐 **[MAJOR UPDATE]**

- **Purpose**: Firebase-only authentication and user management
- **Key Changes**:
  - **REMOVED**: Mock user fallbacks and demo credentials
  - **ADDED**: `getAllEmployees()` returns active users with status
  - **ADDED**: `updateUser()` for status management
  - **SECURITY**: Only Firebase authentication allowed
- **Critical Methods**:
  ```typescript
  async login(credentials) // Firebase-only login
  async getAllEmployees() // Returns users with is_active status
  async updateUser(userId, updates) // Updates user status/info
  async createUser(userData) // Creates new Firebase user
  ```

#### **`customerService.ts`** 🏢

- **Purpose**: Customer data management and operations
- **Features**:
  - Full CRUD operations for customers
  - Multi-VC customer support
  - Integration with Firebase through firestoreService
  - Billing record management
  - Import/export functionality

#### **`firestoreService.ts`** 🔥

- **Purpose**: Direct Firebase Firestore operations
- **Features**:
  - Customer, billing, and user data operations
  - Query optimization to avoid composite indexes
  - Error handling and offline support
  - Batch operations for data import

---

## 🧩 **Customer Components**

### **`src/components/customers/`**

#### **`CustomerModal.tsx`** 🎛️ **[UPDATED - DATA SOURCE]**

- **Purpose**: Customer creation/editing with real employee data
- **Features**:
  - **Employee Selection**: Uses `authService.getAllUsers()` for real data
  - Multi-connection customer support
  - Form validation with controlled inputs
  - Custom plan support
  - **Fixed**: Controlled input warnings resolved
- **Data Integration**:
  ```typescript
  // Loads active employees from Firebase
  const activeEmployees = allUsers.filter((user) => user.is_active);
  ```

#### **`CustomerTable.tsx`** 📋 **[UPDATED - TERMINOLOGY]**

- **Purpose**: Enhanced customer display with multi-VC support
- **Features**:
  - **Column**: "Employee" (renamed from "Collector")
  - Expandable rows for detailed VC information
  - Per-VC financial breakdown
  - Status management with audit logging
  - Invoice history integration
  - Mobile-responsive card layout

#### **`CustomerImportExport.tsx`** 📤 **[UPDATED - HEADERS]**

- **Purpose**: Data import/export with updated terminology
- **Features**:
  - **CSV Headers**: "Employee Name" (was "Collector Name")
  - Template generation with correct field names
  - Bulk customer data operations
  - Error handling and validation

---

## 🛡️ **Authentication & Security**

### **Authentication Flow** 🔐

1. **Login**: `Login.tsx` → Firebase-only authentication
2. **Validation**: `authService.login()` checks Firebase user + active status
3. **Context**: `AuthContext` provides role-based access control
4. **Protection**: `ProtectedRoute` guards all authenticated pages

### **User Status Control** 👥

1. **Admin Access**: Only admins can manage user status
2. **Real-time Updates**: Status changes immediately affect login ability
3. **UI Feedback**: Clear active/inactive badges and confirmation dialogs
4. **Security**: Inactive users cannot authenticate

### **Data Security** 🔒

- **Firebase Rules**: Proper Firestore security rules implemented
- **Role Validation**: Server-side role checking
- **No Demo Data**: Production-ready with real user management

---

## 🔄 **Critical Areas - DO NOT MODIFY**

### **1. Layout Margin Fix**

```typescript
// DashboardLayout.tsx - Line ~15
<div className="flex flex-1 flex-col overflow-hidden lg:ml-64">
```

**Purpose**: Prevents sidebar overlap with main content
**Risk**: Removing `lg:ml-64` breaks the entire layout

### **2. Theme Color System**

**Always Use**:

- `text-foreground`, `text-muted-foreground`, `text-muted-foreground/70`
- `bg-background`, `bg-card`, `bg-muted`, `bg-muted/50`
- `border-border`, `border-muted`

**Never Use**:

- `text-gray-900`, `text-gray-600`, `text-gray-500`
- `bg-gray-50`, `bg-gray-100`, `bg-white`
- Hardcoded RGB colors like `rgb(17, 24, 39)`

### **3. Authentication Service Structure**

```typescript
// authService.ts - Critical methods
async getAllEmployees() // Returns active users for dropdowns
async updateUser() // Manages user status
login() // Firebase-only authentication
```

**Purpose**: Maintains user management and security
**Risk**: Modifying these breaks user system integration

### **4. Customer Data Integration**

```typescript
// Customer components must use:
authService.getAllEmployees(); // For employee dropdowns
customerService.getAllCustomers(); // For customer data
```

**Purpose**: Ensures consistent data sources
**Risk**: Using different data sources causes inconsistencies

---

## 🛠️ **Development Guidelines**

### **Adding New Features**

1. **Authentication**: Always check user status with `user.is_active`
2. **Employee Data**: Use `authService.getAllEmployees()` for employee dropdowns
3. **Terminology**: Use "Employee" not "Collector" in all new features
4. **Theme**: Use semantic color classes for dark mode compatibility
5. **Security**: Validate user permissions server-side

### **User Management Development**

- **Status Changes**: Always show confirmation dialogs
- **Real-time Updates**: Update UI immediately after status changes
- **Error Handling**: Provide clear feedback for failed operations
- **Logging**: Console log all user management operations
- **Security**: Only admins can modify user status

### **Customer Management Development**

- **Employee Integration**: Always use active employees from Firebase
- **Multi-VC Support**: Test with customers having multiple connections
- **Status Validation**: Ensure only active employees can be assigned
- **Form Validation**: Use controlled inputs with proper fallbacks

---

## 🧪 **Critical Testing Scenarios**

### **Authentication & Security**

1. **User Status Testing**:

   - Create user → Verify can log in
   - Deactivate user → Verify cannot log in
   - Reactivate user → Verify can log in again

2. **Employee Assignment**:
   - Only active employees appear in customer creation
   - Inactive employees don't appear in dropdowns
   - Status changes immediately reflect in assignment options

### **Data Consistency**

1. **Employee Data Sources**:

   - Customer page employee filter matches User Management
   - Customer modal employee dropdown shows same data
   - Billing page employee dropdown uses same source

2. **Multi-VC Customers**:
   - Customer with 2-3 VC numbers displays correctly
   - Per-VC financial breakdown accuracy
   - Status changes affect all connections properly

### **UI/UX Testing**

1. **Dark Mode Compatibility**:

   - All pages work in both light and dark modes
   - No hardcoded colors break theme switching
   - Semantic classes maintain proper contrast

2. **Mobile Responsiveness**:
   - User Management table converts to cards on mobile
   - Customer table expandable rows work on touch devices
   - All modals and forms are mobile-friendly

---

## 📈 **Performance Considerations**

### **Firebase Optimization**

- **User Queries**: Cache active employee list to reduce Firebase calls
- **Status Updates**: Batch user updates when possible
- **Connection Monitoring**: Handle offline states gracefully

### **UI Performance**

- **Large User Lists**: Implement pagination if user count exceeds 100
- **Customer Tables**: Virtual scrolling for large customer datasets
- **Real-time Updates**: Debounce status change operations

---

## 🔧 **Troubleshooting Common Issues**

### **Employee Dropdown Empty**

- **Check**: Firebase connection and user creation
- **Verify**: Users have `is_active: true` in Firebase
- **Debug**: Console logs in `authService.getAllEmployees()`

### **User Cannot Log In**

- **Check**: User `is_active` status in Firebase
- **Verify**: Correct username/password
- **Debug**: Firebase authentication errors in console

### **Layout Issues**

- **Check**: `lg:ml-64` class in DashboardLayout
- **Verify**: Sidebar CSS classes intact
- **Debug**: Responsive breakpoints working correctly

---

## 📝 **Change Log**

### **Latest Updates**

1. **Security Enhancement**: Removed demo credentials, Firebase-only auth
2. **User Management**: Added active/inactive toggle with real-time control
3. **Terminology**: Standardized "Employee" throughout customer management
4. **Data Integration**: Unified employee data sources across all components
5. **Bug Fixes**: Resolved controlled input warnings in CustomerModal
6. **UI Improvements**: Enhanced status badges and confirmation dialogs

### **Breaking Changes**

- **Authentication**: Demo login no longer works - users must be created through User Management
- **Employee Data**: Hardcoded employee lists replaced with Firebase data
- **API Changes**: `getAllEmployees()` now includes `is_active` status field

---

## 🚀 **Deployment Checklist**

### **Pre-Deployment**

- [ ] Create at least one admin user in Firebase
- [ ] Test user activation/deactivation functionality
- [ ] Verify employee dropdowns use real Firebase data
- [ ] Test customer creation with active employees only
- [ ] Confirm all "Collector" references changed to "Employee"
- [ ] Test both light and dark modes
- [ ] Verify mobile responsiveness

### **Post-Deployment**

- [ ] Create additional employee accounts as needed
- [ ] Train users on new User Management features
- [ ] Monitor Firebase authentication logs
- [ ] Verify customer-employee assignment workflow
- [ ] Check system performance with real user load

---

## 📞 **Support & Documentation**

For technical issues or feature requests, refer to:

1. **Component Documentation**: Each component has inline documentation
2. **Type Definitions**: Check `src/types/index.ts` for data structures
3. **Service Documentation**: Review service files for API specifications
4. **Firebase Setup**: See `FIREBASE_SETUP.md` for configuration details

This guide represents the current production-ready state of the AGV Cable TV Management System with enhanced security, real user management, and unified terminology.
