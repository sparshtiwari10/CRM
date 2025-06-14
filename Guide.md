# AGV Cable TV Management System - Complete Guide

## 🎯 Project Overview

The **AGV Cable TV Management System** is a comprehensive web-based application designed to manage cable TV operations including customer management, VC (Video Connection) inventory, billing, and payment collection. The system provides role-based access for administrators and field employees with area-specific permissions.

### 🏢 Business Context

This system is designed for cable TV operators who need to:

- Manage customer subscriptions and service connections
- Track VC (Set-top box) inventory and assignments
- Generate monthly bills automatically
- Collect payments and manage receivables
- Monitor customer service history and status changes
- Manage field employees and their assigned collection areas

---

## 🔑 Core Features

### 👥 Customer Management

- **Complete Customer Profiles**: Name, address, contact, service history
- **Multi-VC Support**: Customers can have multiple video connections
- **Service Status Tracking**: Active, inactive, demo status with history
- **Outstanding Management**: Real-time calculation of dues and payments
- **Area-based Organization**: Customers grouped by collection areas

### 📱 VC Inventory Management

- **VC Number Tracking**: Complete inventory of all video connection devices
- **Assignment Management**: Track which customer has which VC
- **Status History**: Full audit trail of VC status changes
- **Bulk Operations**: Efficient management of multiple VCs
- **Package Association**: Link VCs to specific service packages

### 💰 Billing System

- **Automated Bill Generation**: Monthly bills generated automatically
- **Package-based Pricing**: Different service packages with varied pricing
- **Multi-VC Billing**: Support for customers with multiple connections
- **Outstanding Calculations**: Real-time calculation of pending amounts
- **Force Regeneration**: Ability to regenerate bills when needed

### 🧾 Invoice & Payment Collection

- **Payment Recording**: Record payments with various methods (cash, online, cheque)
- **Receipt Generation**: Automatic receipt number generation
- **Customer Search**: Advanced search by name, address, or VC number
- **Outstanding Updates**: Automatic outstanding amount adjustments
- **Payment History**: Complete payment tracking per customer

### 👨‍💼 User Management & Security

- **Role-based Access**: Administrator and Employee roles
- **Area Restrictions**: Employees limited to assigned collection areas
- **Permission System**: Granular control over what users can access
- **Audit Trails**: Complete history of who did what and when

---

## 🏗️ System Architecture

### Frontend Technology Stack

- **React 18** with TypeScript for type safety
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Radix UI** components for accessible UI elements
- **React Router** for navigation
- **React Query** for data fetching and caching

### Backend & Database

- **Firebase Authentication** for user management
- **Cloud Firestore** for real-time database
- **Firebase Security Rules** for data protection
- **Firebase Hosting** for web deployment

### State Management

- **React Context** for authentication state
- **React Hooks** for component state
- **Custom Hooks** for reusable logic

---

## 👤 User Roles & Permissions

### 🔑 Administrator Role

**Full System Access**:

- ✅ Create, edit, delete customers
- ✅ Manage VC inventory (create, assign, reassign)
- ✅ Generate bills for all customers
- ✅ Delete bills and invoices
- ✅ Collect payments for any customer
- ✅ Manage employee accounts
- ✅ Access all areas and customer data
- ✅ View system debug tools

### 👨‍💼 Employee Role

**Area-Restricted Access**:

- ✅ View customers in assigned areas only
- ✅ Collect payments from area customers
- ✅ Update VC status (with approval for some changes)
- ✅ View billing history for area customers
- ❌ Cannot create or delete customers
- ❌ Cannot delete bills or invoices
- ❌ Cannot access other areas' data
- ❌ Cannot manage VC inventory

---

## 📊 Data Structure

### 👤 Customer Entity

```typescript
interface Customer {
  id: string; // Unique identifier
  name: string; // Customer name
  phoneNumber: string; // Contact number
  email?: string; // Email address
  address: string; // Physical address
  collectorName: string; // Assigned collection area
  status: "active" | "inactive" | "demo";
  currentPackage: string; // Service package name
  packageAmount: number; // Monthly service fee
  vcNumber: string; // Primary VC number
  connections?: Connection[]; // Multiple VC connections
  previousOutstanding: number; // Previous dues
  currentOutstanding: number; // Current dues
  joinDate: Date; // Service start date
  statusLogs: StatusLog[]; // History of status changes
}
```

### 📱 VC Inventory Entity

```typescript
interface VCInventoryItem {
  id: string; // Unique identifier
  vcNumber: string; // VC device number
  customerId?: string; // Assigned customer
  customerName?: string; // Customer name
  packageId: string; // Associated package
  area: string; // Collection area
  status: "available" | "active" | "inactive" | "maintenance";
  statusHistory: VCStatusHistory[]; // Status change history
  ownershipHistory: VCOwnershipHistory[]; // Assignment history
  createdAt: Date;
  updatedAt: Date;
}
```

### 💰 Bill Entity

```typescript
interface MonthlyBill {
  id: string; // Unique identifier
  customerId: string; // Customer reference
  customerName: string; // Customer name
  month: string; // Billing month (YYYY-MM)
  vcBreakdown: VCBillBreakdown[]; // Per-VC charges
  totalAmount: number; // Total bill amount
  status: "generated" | "partial" | "paid";
  billDueDate: Date; // Payment due date
  createdAt: Date;
  updatedAt: Date;
}
```

### 🧾 Invoice Entity

```typescript
interface PaymentInvoice {
  id: string; // Unique identifier
  customerId: string; // Customer reference
  customerName: string; // Customer name
  customerArea: string; // Collection area
  amountPaid: number; // Payment amount
  paymentMethod: "cash" | "online" | "cheque" | "bank_transfer";
  billId?: string; // Associated bill (optional)
  receiptNumber: string; // Receipt identifier
  collectedBy: string; // Employee name
  paidAt: Date; // Payment date
  notes?: string; // Additional notes
  createdAt: Date;
}
```

---

## 🔄 Core Business Workflows

### 1. Customer Onboarding

1. **Admin creates customer** with basic details
2. **Assign VC numbers** from available inventory
3. **Select service package** and pricing
4. **Set collection area** and assign to employee
5. **Customer status** set to active
6. **First bill generation** in next billing cycle

### 2. Monthly Billing Process

1. **Auto-billing trigger** on configured date
2. **System identifies** all active customers
3. **Calculates charges** based on assigned VCs and packages
4. **Generates bills** for the month
5. **Updates customer outstanding** amounts
6. **Bills available** for payment collection

### 3. Payment Collection

1. **Employee searches** for customer
2. **Views outstanding** bills and amounts
3. **Records payment** with method and amount
4. **System generates** receipt number
5. **Updates customer** outstanding balance
6. **Links payment** to specific bills (optional)

### 4. VC Management

1. **Admin manages** VC inventory
2. **Assigns VCs** to customers
3. **Tracks status** changes (active/inactive)
4. **Reassigns VCs** when customers disconnect
5. **Maintains history** of all changes

---

## 🖥️ User Interface Guide

### 📊 Dashboard

**Admin View**:

- Customer statistics (total, active, inactive)
- Revenue overview (collected, pending)
- VC inventory status
- Recent activities
- Quick action buttons

**Employee View**:

- Area-specific customer stats
- Today's collection targets
- Recent payments collected
- Quick payment collection access

### 👥 Customers Page

**Features**:

- Customer list with search and filters
- Add/Edit customer functionality
- Expandable rows showing:
  - Customer invoices/payment history
  - Bills for the customer
  - VC status change history
- Bulk operations for multiple customers

### 📱 VC Inventory Page

**Features**:

- Complete VC inventory list
- Status filters (available, assigned, inactive)
- VC assignment and reassignment
- Status change tracking
- Bulk status updates

### 💰 Bills Page

**Features**:

- Monthly bill generation
- Bills history with filters
- Auto-billing configuration
- Force regeneration option
- Delete functionality (admin-only)

### 🧾 Invoices Page

**Features**:

- Payment collection interface
- Customer search by name/address/VC
- Receipt generation
- Payment history
- Delete functionality (admin-only)

---

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+ and npm
- Firebase account and project
- Git for version control

### Installation Steps

1. **Clone repository**:

   ```bash
   git clone <repository-url>
   cd agv-cable-tv-management
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Configure Firebase**:

   ```bash
   # Copy environment template
   cp .env.example .env

   # Add your Firebase configuration
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   # ... other Firebase config
   ```

4. **Setup Firestore**:

   ```bash
   # Deploy security rules
   firebase deploy --only firestore:rules

   # Deploy composite indexes
   firebase deploy --only firestore:indexes
   ```

5. **Start development server**:

   ```bash
   npm run dev
   ```

### Build for Production

```bash
# Build the application
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

---

## 🔧 Configuration

### Firebase Setup

1. **Create Firebase Project** at [Firebase Console](https://console.firebase.google.com)
2. **Enable Authentication** with Email/Password provider
3. **Enable Firestore Database** in production mode
4. **Configure Security Rules** from `firestore.rules`
5. **Deploy Composite Indexes** from `firestore.indexes.json`
6. **Setup Hosting** for web deployment

### Initial Data Setup

1. **Create Admin User**:

   ```javascript
   // Run in browser console after login
   const adminUser = {
     email: "admin@agvcable.com",
     role: "admin",
     name: "System Administrator",
     is_active: true,
   };
   ```

2. **Setup Collection Areas**:

   ```javascript
   // Add areas collection
   const areas = ["Area 1", "Area 2", "Area 3"];
   areas.forEach((area) => {
     db.collection("areas").add({ name: area, isActive: true });
   });
   ```

3. **Configure Packages**:

   ```javascript
   // Add service packages
   const packages = [
     { name: "Basic", price: 299, channels: 50 },
     { name: "Standard", price: 499, channels: 100 },
     { name: "Premium", price: 799, channels: 200 },
   ];
   ```

---

## 🚀 Deployment Guide

### Firebase Hosting Deployment

1. **Build the application**:

   ```bash
   npm run build
   ```

2. **Deploy to Firebase**:

   ```bash
   firebase deploy
   ```

3. **Access your application**:
   - Your app will be available at `https://your-project.web.app`

### Environment Configuration

**Production Environment Variables**:

```env
VITE_FIREBASE_API_KEY=production_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=sender_id
VITE_FIREBASE_APP_ID=app_id
```

---

## 🔍 Troubleshooting

### Common Issues

#### Firebase Connection Issues

- **Verify Firebase configuration** in `.env`
- **Check Firestore rules** for permission errors
- **Ensure indexes are deployed** for complex queries

#### Authentication Problems

- **Verify Email/Password provider** is enabled
- **Check user roles** in Firestore `users` collection
- **Confirm security rules** allow user operations

#### Performance Issues

- **Deploy composite indexes** for faster queries
- **Check Firebase usage quotas**
- **Monitor Firestore read/write operations**

### Debug Tools

**Firebase Debug Component**:

- Access via Dashboard > "Debug Firebase" button (admin-only)
- Tests all Firebase operations
- Provides detailed error reporting
- Monitors connection status

---

## 📱 Mobile Responsiveness

The application is fully responsive and works on:

- **Desktop browsers** (Chrome, Firefox, Safari, Edge)
- **Tablet devices** (iPad, Android tablets)
- **Mobile phones** (iOS Safari, Android Chrome)

### Mobile-Specific Features

- Touch-friendly interface
- Swipe gestures for navigation
- Optimized forms for mobile input
- Responsive tables and layouts

---

## 🔐 Security Features

### Data Protection

- **Role-based access control** for all operations
- **Area-based data restrictions** for employees
- **Audit trails** for all data modifications
- **Secure authentication** with Firebase Auth

### Firestore Security Rules

- **Read/Write permissions** based on user roles
- **Field-level validation** for data integrity
- **Area-based access control** for employees
- **Admin-only operations** for sensitive actions

---

## 📈 Analytics & Monitoring

### Business Metrics

- **Customer growth** tracking
- **Revenue collection** monitoring
- **Outstanding amounts** analysis
- **Employee performance** metrics

### Technical Monitoring

- **Firebase usage** tracking
- **Error rate** monitoring
- **Performance metrics** analysis
- **User activity** logging

---

## 🔄 Backup & Recovery

### Data Backup

- **Firestore exports** for data backup
- **Regular automated backups** recommended
- **Export customer data** in CSV format
- **Backup authentication users**

### Disaster Recovery

- **Multi-region deployment** options
- **Data restoration** procedures
- **Backup validation** processes
- **Recovery time objectives** defined

---

## 📞 Support & Maintenance

### Regular Maintenance

- **Update dependencies** monthly
- **Monitor Firebase quotas** and usage
- **Review security rules** quarterly
- **Backup data** weekly

### Support Contacts

- **Technical Issues**: Review error logs and debug tools
- **Business Logic**: Refer to this guide and documentation
- **Firebase Issues**: Check Firebase Console and status page

---

## 🎯 Future Enhancements

### Planned Features

- **Advanced reporting** and analytics dashboard
- **SMS notifications** for bill reminders
- **Mobile app** for field employees
- **Integration** with accounting software
- **Bulk data import/export** improvements

### Performance Optimizations

- **Caching strategies** for better performance
- **Offline support** for mobile users
- **Progressive Web App** features
- **Advanced search** capabilities

---

**Last Updated**: Current Development Session  
**Version**: 1.0.0  
**Status**: Production Ready ✅
