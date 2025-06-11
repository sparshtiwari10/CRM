# AGV Cable TV Management System - Complete Guide

## Table of Contents

1. [System Overview](#system-overview)
2. [Current Features](#current-features)
3. [Installation & Setup](#installation--setup)
4. [Authentication System](#authentication-system)
5. [User Management](#user-management)
6. [Core Modules](#core-modules)
7. [Technical Architecture](#technical-architecture)
8. [Security Implementation](#security-implementation)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)

## System Overview

The AGV Cable TV Management System is a comprehensive web application for managing cable TV operations, including customer management, billing, package management, and employee administration. The system is built with modern web technologies and Firebase backend services.

### Current Status: ✅ FULLY OPERATIONAL & PRODUCTION READY

- **Authentication:** Firebase Auth with enterprise-grade security and session management
- **Database:** Firestore with role-based and area-based access control
- **UI:** Modern, responsive interface with comprehensive modal systems
- **Permissions:** Advanced role-based access with multi-area employee support
- **Security:** Production-grade Firestore rules with granular access control
- **Employee Management:** Multi-area assignment with secure user creation
- **Customer Management:** Complete CRUD with area-based permissions and detailed views
- **Bulk Management:** Admin-only bulk update tools for customer areas and packages
- **Dynamic Settings:** Firebase-based configuration system with real-time updates
- **Professional Interface:** Clean, modern login and settings pages

### Technology Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS
- **Backend:** Firebase (Firestore Database, Authentication)
- **UI Framework:** Custom components with shadcn/ui
- **State Management:** React Context API
- **Build Tool:** Vite
- **Deployment:** Firebase Hosting ready

## Current Features

### ✅ Latest Production Features (Current Session)

#### Admin Management Tools

- **Bulk Customer Management:** Select multiple customers for bulk area/package updates
- **Advanced Filtering:** Multi-criteria search and filtering (name, phone, email, VC, area, package, status)
- **Bulk Area Updates:** Reassign customers to different collectors/areas efficiently
- **Bulk Package Updates:** Change packages and pricing for multiple customers simultaneously
- **Real-time Data:** Live synchronization with Firebase for immediate updates
- **Professional Interface:** Clean table view with selection indicators and action buttons

#### Firebase-Based Settings System

- **Dynamic Configuration:** All settings stored in Firebase instead of hardcoded values
- **Project Name Control:** Login page title configurable through settings
- **Real-time Updates:** Settings changes reflect immediately across the system
- **Admin-Only Access:** Secure settings management restricted to administrators
- **Persistent Storage:** Configuration survives system restarts and deployments
- **Fallback Support:** Default values ensure system stability if Firebase unavailable

#### Professional Login Interface

- **Clean Design:** Removed diagnostic text and debug information for production readiness
- **Dynamic Branding:** Project name loaded from Firebase settings
- **Improved Error Messages:** User-friendly error handling with specific guidance
- **Simplified Flow:** Streamlined authentication without technical instructions
- **Professional Presentation:** Modern, business-appropriate login experience

#### Enhanced Security & Access Control

- **Settings Collection Rules:** Secure access to configuration data with proper permissions
- **Public Project Name:** Login page can display branding without authentication
- **Write Protection:** Prevents unauthorized modification of system settings
- **Admin Verification:** Double-layer security for sensitive configuration changes

### ✅ Core Working Features

#### Authentication & User Management

- Firebase Authentication with email/password
- Automatic user document creation and management
- Advanced role-based access control (Admin/Employee)
- Multi-area employee assignment system
- Secure user creation without session disruption
- Password reset functionality
- Account activation/deactivation

#### Customer Management

- Complete CRUD operations with area-based permissions
- Advanced search and filtering by multiple criteria
- Professional customer details modal
- Comprehensive transaction history modal
- Area-based access control for employees
- Connection management with multiple connections per customer
- Billing status tracking and outstanding management
- CSV import/export functionality

#### Package Management

- Create and manage service packages
- Real-time metrics and analytics
- Package usage statistics
- Revenue tracking per package
- Package assignment to customer connections

#### Billing System

- Automated bill generation
- Payment tracking (cash/online)
- Outstanding amount management
- Comprehensive billing history with detailed records
- Area-based billing access for employees

#### Request Management

- Service request submission and tracking
- Admin approval workflow
- Request status management
- Area-based request access

#### Employee Administration

- Create employees with secure session management
- Multi-area assignment capability
- Visual area management interface
- Employee status management (active/inactive)
- Role modification (admin/employee)
- Password reset email functionality
- Real-time area coverage statistics

## Installation & Setup

### Prerequisites

- Node.js 18+ and npm
- Firebase project with Firestore and Authentication enabled
- Git for version control

### Initial Setup

1. **Clone and Install Dependencies**

   ```bash
   git clone [repository-url]
   cd agv-cable-tv-management
   npm install
   ```

2. **Firebase Configuration**

   ```bash
   # Install Firebase CLI
   npm install -g firebase-tools

   # Login to Firebase
   firebase login

   # Initialize project
   firebase init
   ```

3. **Environment Configuration**
   Create `.env` file with your Firebase configuration:

   ```env
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   ```

4. **Deploy Security Rules**

   ```bash
   firebase deploy --only firestore:rules
   ```

5. **Start Development**
   ```bash
   npm run dev
   ```

## Authentication System

### Firebase Authentication Integration

The system uses Firebase Authentication with enhanced session management:

- **Email/Password Authentication:** Secure login system
- **Automatic User Documents:** User profiles created automatically in Firestore
- **Role-Based Access:** Admin and Employee roles with different permissions
- **Password Reset:** Email-based password recovery
- **Session Management:** Secure user creation without affecting admin sessions

### User Roles

#### Administrator

- Full system access
- Employee management capabilities
- Customer management across all areas
- Package and billing management
- System configuration access
- Analytics and reporting access
- Secure user creation without session disruption

#### Employee

- Area-based customer access (supports multiple areas)
- Limited to assigned areas only
- Customer management within assigned areas
- View customer details and history for assigned customers
- Billing access for assigned customers
- Service request creation
- Cannot access employee management or system settings

### Security Implementation

#### Production Firestore Rules

The system implements comprehensive security rules with area-based access:

```javascript
// Role-based access control
function isAdmin() {
  return isAuthenticated() && getUserDoc().data.role == "admin";
}

// Multi-area access for employees
function canAccessArea(area) {
  let userData = getUserDoc().data;
  return (
    isAdmin() ||
    userData.collector_name == area ||
    (userData.assigned_areas != null && area in userData.assigned_areas)
  );
}

// Active user validation
function isActiveUser() {
  return isAuthenticated() && getUserDoc().data.is_active == true;
}

// Customer access with area restrictions
match /customers/{customerId} {
  allow read, write: if isAdmin() && isActiveUser();
  allow read, write: if isAuthenticated() &&
                    isActiveUser() &&
                    canAccessArea(resource.data.collectorName);
}
```

#### Key Security Features

- **Authentication Required:** All operations require valid Firebase Auth token
- **Role Validation:** Server-side role checking prevents privilege escalation
- **Area Restrictions:** Employees cannot access data outside assigned areas
- **Active User Check:** Deactivated users lose system access immediately
- **Session Security:** User creation doesn't compromise admin sessions
- **Default Deny:** Unlisted collections are automatically denied access

## User Management

### Employee Management System

#### Creating Employees (Secure Process)

1. Navigate to Employee Management (Admin only)
2. Click "Add Employee"
3. Fill in employee details:
   - Full name and email
   - Temporary password
   - Role (Admin/Employee)
   - Assigned areas (multiple selection for employees)
4. Employee receives password reset email automatically
5. **Admin session remains active** throughout the process

#### Multi-Area Assignment

Employees can be assigned to multiple areas with visual management:

- **Checkbox Interface:** Multi-select area assignment
- **Real-time Updates:** Immediate reflection of area changes
- **Visual Badges:** Display of assigned areas with inline editing
- **Flexible Management:** Areas can be modified after creation
- **Coverage Tracking:** System tracks area coverage statistics

#### Employee Status Management

- **Activation/Deactivation:** Toggle employee access instantly
- **Role Modification:** Change between admin and employee roles
- **Password Reset:** Send password reset emails on demand
- **Area Reassignment:** Modify area assignments as needed
- **Session Isolation:** Employee operations don't affect admin sessions

## Core Modules

### Customer Management

#### Enhanced Permission System

The system implements sophisticated area-based access control:

```typescript
// Permission checking function
const canEditCustomer = (
  customer: Customer,
  user: User,
  isAdmin: boolean,
): boolean => {
  if (!user) return false;

  // Admins can edit all customers
  if (isAdmin) return true;

  // Employees can only edit customers in their assigned areas
  const userAreas =
    user.assigned_areas || (user.collector_name ? [user.collector_name] : []);
  return userAreas.includes(customer.collectorName);
};
```

#### Customer Data Structure

```typescript
interface Customer {
  id: string;
  name: string;
  phoneNumber: string;
  email: string;
  address: string;
  collectorName: string; // Area assignment
  status: "active" | "inactive" | "demo";
  connections: Connection[];
  billingInfo: BillingInfo;
  // Additional fields...
}
```

#### Key Features

- **Area-Based Access:** Employees can only view/edit customers in assigned areas
- **Professional Modals:** Comprehensive customer details and history views
- **Multi-Connection Support:** Customers can have multiple connections
- **Enhanced Search:** Search across all customer fields including areas
- **Import/Export:** CSV functionality for bulk operations
- **Real-time Updates:** Live data synchronization with Firestore

#### Customer Details Modal

Provides comprehensive customer information:

- **Contact Information:** Phone, email, address
- **Service Details:** VC numbers, packages, pricing
- **Billing Information:** Join date, payment history, outstanding amounts
- **Connection Management:** Multiple connections with individual status
- **Historical Data:** Complete service and billing history

#### Customer History Modal

Displays complete transaction history:

- **Billing Records:** Payment history with amounts and dates
- **Status Changes:** Service activation/deactivation history
- **Plan Changes:** Package modification records
- **Loading States:** Professional loading indicators
- **Data Organization:** Chronological ordering with clear categorization

### Package Management

#### Package Types

- **Standard Packages:** Predefined service packages
- **Custom Packages:** Tailored packages for specific customers
- **Package Metrics:** Usage statistics and revenue tracking

### Billing System

#### Billing Features

- **Automated Generation:** Monthly billing cycles
- **Payment Tracking:** Cash and online payment recording
- **Outstanding Management:** Track and manage unpaid amounts
- **Billing History:** Comprehensive payment records accessible through modals
- **Area-Based Access:** Employees see only their area's billing

### Request Management

#### Workflow Process

1. **Request Creation:** Service requests submitted by employees
2. **Admin Review:** Administrators review and approve requests
3. **Status Tracking:** Real-time status updates
4. **Area-Based Access:** Employees see requests for their areas only

### Bulk Management System (Admin Only)

#### Management Features

- **Multi-Customer Selection:** Checkbox interface for selecting customers across filters
- **Bulk Area Updates:** Reassign multiple customers to different collectors/areas
- **Bulk Package Updates:** Change packages and pricing for selected customers
- **Advanced Filtering:** Search and filter by multiple criteria simultaneously
- **Real-time Updates:** Live data synchronization with immediate reflection

#### Management Workflow

1. **Filter Customers:** Use search and filter options to find target customers
2. **Select Customers:** Use checkboxes to select individual or all filtered customers
3. **Choose Action:** Select bulk area update or bulk package update
4. **Execute Changes:** Apply changes to all selected customers simultaneously
5. **Verify Results:** System provides confirmation and updates data in real-time

#### Security and Permissions

- **Admin-Only Access:** Management section restricted to administrator accounts
- **Validation Checks:** System validates all changes before applying updates
- **Audit Trail:** All bulk operations logged for security and compliance
- **Error Handling:** Graceful failure modes with detailed error reporting

### Dynamic Settings Management

#### Settings Categories

- **Company Information:** Project name, company details, contact information
- **Notification Settings:** Email, SMS, and system alert preferences
- **System Configuration:** Timezone, date format, currency, session settings
- **Security Settings:** Password requirements, data retention policies

#### Settings Features

- **Firebase Storage:** All configuration stored in Firestore database
- **Real-time Updates:** Changes reflect immediately across all user sessions
- **Admin Control:** Only administrators can modify system settings
- **Default Fallbacks:** System maintains functionality even if settings unavailable
- **Project Branding:** Login page displays configurable project name

## Technical Architecture

### Frontend Architecture

- **React 18:** Modern React with hooks and functional components
- **TypeScript:** Type-safe development with comprehensive interfaces
- **Tailwind CSS:** Utility-first styling for responsive design
- **shadcn/ui:** Pre-built accessible components
- **Modal System:** Professional dialog interfaces for data interaction
- **Vite:** Fast development and build tooling

### Backend Architecture

- **Firebase Firestore:** NoSQL document database with real-time updates
- **Firebase Authentication:** Managed authentication service with session security
- **Security Rules:** Server-side access control with area-based restrictions
- **Cloud Functions:** Serverless backend logic (if needed)

### State Management

- **React Context:** Global state management for auth and theme
- **Local State:** Component-level state with useState and useEffect
- **Session Management:** Secure user operations without session disruption
- **Optimistic Updates:** Immediate UI updates with server synchronization

### Data Flow

1. **User Authentication:** Firebase Auth validates users with session isolation
2. **Permission Check:** Firestore rules validate data access with area restrictions
3. **Data Retrieval:** Area-based data filtering applied automatically
4. **UI Updates:** Real-time updates via Firestore listeners
5. **State Sync:** Context providers manage global state securely

## Security Implementation

### Authentication Security

- **Firebase Auth Tokens:** Secure JWT-based authentication
- **Password Requirements:** Minimum 6 characters required
- **Email Verification:** Password reset via email
- **Session Isolation:** User creation doesn't affect admin sessions
- **Session Management:** Automatic token refresh and validation

### Data Security

- **Role-Based Access Control (RBAC):** Admin vs Employee permissions
- **Area-Based Access Control (ABAC):** Geographic data restrictions
- **Multi-Area Support:** Flexible area assignment with security
- **Active User Validation:** Deactivated users lose access
- **Input Validation:** Client and server-side data validation

### Security Rules Structure

```javascript
// Customer access with multi-area support
match /customers/{customerId} {
  allow read, write: if isAdmin() && isActiveUser();
  allow read, write: if isAuthenticated() &&
                    isActiveUser() &&
                    canAccessArea(resource.data.collectorName);
}

// Employee management (admin only)
match /users/{userId} {
  allow read: if isAuthenticated() && request.auth.uid == userId;
  allow read, write: if isAdmin();
  allow create: if isAuthenticated() && request.auth.uid == userId;
}
```

### Security Best Practices

- **Least Privilege:** Users get minimum required permissions
- **Defense in Depth:** Multiple layers of security validation
- **Area Isolation:** Employees cannot access other areas' data
- **Session Security:** User operations don't compromise active sessions
- **Audit Trail:** All operations logged for security monitoring
- **Regular Updates:** Security rules updated with feature changes

## Deployment

### Development Deployment

```bash
# Start development server
npm run dev

# Run type checking
npm run typecheck

# Build for production
npm run build
```

### Production Deployment

```bash
# Build and deploy to Firebase Hosting
npm run build
firebase deploy

# Deploy only Firestore rules
firebase deploy --only firestore:rules

# Deploy specific functions
firebase deploy --only functions
```

### Environment Configuration

#### Development

- Local development server on port 5173
- Firebase emulators for testing
- Debug mode enabled

#### Production

- Firebase Hosting deployment
- Production Firestore database
- Optimized builds and caching
- Secure session management

## Troubleshooting

### Common Issues

#### Authentication Issues

**Problem:** Users cannot log in
**Solution:**

1. Check Firebase Auth configuration
2. Verify user document exists in Firestore
3. Confirm user is marked as active
4. Check Firestore security rules

#### Permission Errors

**Problem:** "Missing or insufficient permissions"
**Solution:**

1. Verify user role in Firestore
2. Check area assignments for employees
3. Confirm security rules are deployed
4. Validate user is active and in correct areas

#### Employee Edit Access Issues

**Problem:** Employees can edit customers outside their areas
**Solution:**

1. Verify area assignments match customer areas
2. Check `canEditCustomer` function in components
3. Confirm customer `collectorName` field is populated
4. Validate employee `assigned_areas` or `collector_name`

#### Session Management Issues

**Problem:** Admin gets logged out when creating employees
**Solution:**

1. Verify authService.createUser() includes session restoration
2. Check auth state listener in AuthContext
3. Confirm Firebase Auth configuration
4. Validate sign-out and restoration logic

### Debugging Tools

#### Browser Console Commands

```javascript
// Check current user data
firebasePermissionsFix.getCurrentUserInfo();

// Test Firebase connection
firebasePermissionsFix.testFirebaseConnection();

// Run comprehensive diagnostics
firebasePermissionsFix.runDiagnostics();
```

#### Firebase Console Monitoring

1. **Authentication Tab:** Monitor user logins and status
2. **Firestore Tab:** Check data structure and permissions
3. **Rules Tab:** Test security rules with Rules Playground
4. **Usage Tab:** Monitor API usage and quotas

### Support and Maintenance

#### Regular Maintenance Tasks

1. **Security Rule Updates:** Review and update access controls
2. **User Account Cleanup:** Remove inactive users periodically
3. **Area Assignment Review:** Ensure proper customer-employee area mapping
4. **Session Monitoring:** Check for session-related issues
5. **Data Backup:** Regular Firestore data exports
6. **Performance Monitoring:** Track app performance metrics

#### Getting Help

1. **Firebase Documentation:** Official Firebase guides
2. **Console Debugging:** Use built-in diagnostic tools
3. **Error Logs:** Check browser console for error details
4. **Security Playground:** Test rules in Firebase Console
5. **Permission Debugging:** Use canEditCustomer function for testing

---

## Conclusion

The AGV Cable TV Management System provides a robust, secure, and scalable solution for cable TV operations management. With advanced Firebase integration, sophisticated permission systems, and professional user interfaces, the system ensures data security while providing efficient operational tools.

### Key Benefits

- **Advanced Security:** Production-ready security rules with comprehensive access control
- **Area-Based Management:** Flexible multi-area assignment for complex organizations
- **Session Security:** Secure user management without session disruption
- **Professional UI:** Modern, responsive design with comprehensive modal systems
- **Scalable Architecture:** Firebase backend handles growth automatically
- **Operational Efficiency:** Streamlined workflows for customer and employee management
- **Real-time Updates:** Live data synchronization across all users

### Security Features

- **Role-Based Access Control:** Proper admin vs employee permissions
- **Area-Based Restrictions:** Employees limited to assigned geographic areas
- **Multi-Area Support:** Flexible area assignment system
- **Session Isolation:** Secure user operations without affecting admin sessions
- **Data Validation:** Comprehensive field validation preventing system errors
- **Active User Management:** Automatic access control for deactivated users

### User Experience Features

- **Professional Modals:** Comprehensive customer details and history views
- **Loading States:** Proper feedback during all async operations
- **Error Handling:** Graceful failure modes with meaningful messages
- **Responsive Design:** Works across desktop and mobile devices
- **Real-time Updates:** Live data synchronization with instant feedback

### Future Enhancements

- **Mobile Application:** React Native app for field operations
- **Advanced Analytics:** Detailed reporting and business intelligence
- **Payment Integration:** Online payment processing
- **Notification System:** Real-time alerts and notifications
- **API Integration:** Third-party service integrations
- **Advanced Reporting:** Custom report generation with area-based filtering

The system is production-ready and can be deployed immediately with proper Firebase configuration, security rule deployment, and comprehensive area-based access control for complex organizational structures.
