# AGV Cable TV Management System - Complete Guide

## Table of Contents

1. [System Overview](#system-overview)
2. [Authentication System](#authentication-system)
3. [Installation & Setup](#installation--setup)
4. [Firebase Configuration](#firebase-configuration)
5. [Features & Modules](#features--modules)
6. [User Roles & Permissions](#user-roles--permissions)
7. [Troubleshooting](#troubleshooting)
8. [Migration Guide](#migration-guide)
9. [Security Implementation](#security-implementation)

## System Overview

The AGV Cable TV Management System is a comprehensive web application built with React, TypeScript, and Firebase for managing cable TV operations including customer management, billing, package management, and employee administration.

### Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Firebase (Firestore, Authentication)
- **State Management**: React Context API
- **UI Components**: Custom components with shadcn/ui
- **Build Tool**: Vite
- **Authentication**: Firebase Authentication (migrated from custom auth)

## Authentication System

### Current Implementation: Firebase Authentication

The system has been migrated from custom authentication to Firebase Authentication for enhanced security and reliability.

#### Authentication Flow

1. **Login Process**:

   - Users sign in with email/password via Firebase Auth
   - User profile data fetched from Firestore (`/users/{firebase_uid}`)
   - Role-based access control enforced through Firestore security rules

2. **User Document Structure**:

   ```typescript
   interface User {
     id: string; // Firebase Auth UID
     email: string;
     name: string;
     role: "admin" | "employee";
     collector_name?: string; // For employees
     is_active: boolean;
     requires_password_reset?: boolean;
     migrated_from_custom_auth?: boolean;
     created_at: Date;
     updated_at: Date;
   }
   ```

3. **Default Admin Account**:
   - Email: `admin@agvcabletv.com`
   - Password: `admin123`
   - **Important**: Change password after first login

### Security Features

- **Server-side validation** through Firestore security rules
- **Password reset** functionality via email
- **Account deactivation** by administrators
- **Role-based access control** with real-time enforcement
- **Audit logging** for all authentication events

## Installation & Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase project with Firestore and Authentication enabled

### Installation Steps

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd agv-cable-tv-management
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Configure Firebase**:

   - Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
   - Enable Firestore Database
   - Enable Authentication with Email/Password provider
   - Copy your Firebase config to `src/lib/firebase.ts`

4. **Deploy Firestore Rules**:

   ```bash
   firebase deploy --only firestore:rules
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```

## Firebase Configuration

### Required Firebase Services

1. **Authentication**:

   - Enable Email/Password provider
   - Configure authorized domains

2. **Firestore Database**:

   - Create database in production mode
   - Deploy security rules from `firestore.rules`

3. **Firestore Collections Structure**:
   ```
   /users/{firebase_uid}        # User profiles and roles
   /customers/{customer_id}     # Customer information
   /packages/{package_id}       # Service packages
   /billing/{billing_id}        # Billing records
   /requests/{request_id}       # Service requests
   ```

### Security Rules

The system uses comprehensive Firestore security rules for server-side validation:

```javascript
// Example rule for packages collection
match /packages/{packageId} {
  allow read: if isEmployee();
  allow create, update, delete: if isAdmin();
}
```

See `firestore.rules` for complete security implementation.

## Features & Modules

### 1. Dashboard

- Overview of key metrics
- Quick access to common tasks
- Recent activity summary
- Revenue and customer statistics

### 2. Customer Management

- **Add/Edit Customers**: Complete customer information management
- **Billing Integration**: Automatic bill generation and tracking
- **Service History**: Track all customer interactions
- **Connection Management**: Handle multiple connections per customer
- **Status Tracking**: Active, inactive, demo status management

### 3. Package Management

- **Package Creation**: Define service packages with pricing
- **Feature Management**: Detailed package features and channel counts
- **Usage Analytics**: Track package popularity and revenue
- **Real-time Metrics**: Customer count and revenue per package

### 4. Billing System

- **Automated Billing**: Generate bills based on package pricing
- **Payment Tracking**: Record cash and online payments
- **Outstanding Management**: Track and manage outstanding amounts
- **Invoice Generation**: Professional invoice creation
- **Billing History**: Complete payment history per customer

### 5. Employee Management (Admin Only)

- **User Creation**: Add new admin and employee accounts
- **Role Management**: Assign and modify user roles
- **Access Control**: Activate/deactivate user accounts
- **Password Management**: Send password reset emails
- **Area Assignment**: Assign collection areas to employees

### 6. Request Management

- **Service Requests**: Handle activation, deactivation, plan changes
- **Approval Workflow**: Admin approval for employee requests
- **Request Tracking**: Monitor request status and history
- **Bulk Operations**: Handle multiple requests efficiently

## User Roles & Permissions

### Administrator Role

- **Full System Access**: All features and data
- **User Management**: Create, modify, delete employee accounts
- **Data Management**: Full CRUD operations on all data
- **Reports & Analytics**: Access to all system reports
- **System Configuration**: Manage packages, pricing, and settings

### Employee Role

- **Area-Restricted Access**: Only customers in assigned area
- **Customer Operations**: Add, edit customers in their area
- **Billing Operations**: Generate bills for assigned customers
- **Request Submission**: Submit requests for admin approval
- **Read-Only Access**: View packages and system information

## Troubleshooting

### Common Issues

1. **Login Failures**:

   - Verify Firebase Authentication is enabled
   - Check email/password provider configuration
   - Ensure user document exists in Firestore

2. **Permission Denied Errors**:

   - Verify Firestore security rules are deployed
   - Check user role and active status
   - Ensure user document has correct structure

3. **Data Loading Issues**:
   - Check Firebase project configuration
   - Verify Firestore collections exist
   - Check browser console for detailed errors

### Debug Commands

```bash
# Check Firebase configuration
firebase projects:list

# Deploy Firestore rules
firebase deploy --only firestore:rules

# View current rules
firebase firestore:rules
```

### Firestore Debugging

```javascript
// Run in browser console
FirebaseDebug.runDiagnostics();
testFirebaseConnection();
```

## Migration Guide

### From Custom Authentication to Firebase Auth

The system has been fully migrated from custom authentication to Firebase Authentication. If you're upgrading from an older version:

1. **Backup existing data**:

   ```bash
   # Export existing users
   node scripts/backup-users.js
   ```

2. **Run migration script**:

   ```bash
   # Migrate users to Firebase Auth
   node scripts/migrate-to-firebase-auth.js
   ```

3. **Update Firebase settings**:

   - Enable Email/Password authentication
   - Deploy new Firestore security rules
   - Test login with migrated accounts

4. **Notify users**:
   - Send password reset emails to all users
   - Provide new login instructions (email instead of username)

### Migration Benefits

- ✅ **Enhanced Security**: Firebase handles password security
- ✅ **Server-side Validation**: Firestore rules enforce permissions
- ✅ **Built-in Features**: Password reset, email verification
- ✅ **Scalability**: Handle thousands of users
- ✅ **Audit Logging**: Comprehensive login and activity logs

## Security Implementation

### Multi-Layer Security

1. **Firebase Authentication**:

   - Secure password handling and token management
   - Built-in protection against common attacks
   - Session management and timeout handling

2. **Firestore Security Rules**:

   - Server-side permission enforcement
   - Role-based access control
   - Data validation and sanitization

3. **Client-Side Validation**:
   - Input validation and sanitization
   - UI-level access control
   - Real-time permission checking

### Best Practices Implemented

- **Principle of Least Privilege**: Users only access necessary data
- **Data Sanitization**: All inputs validated before processing
- **Audit Logging**: All critical operations logged
- **Regular Security Reviews**: Permissions audited regularly
- **Secure Defaults**: New users created with minimal permissions

### Password Security

- **Minimum Requirements**: 6+ characters enforced by Firebase
- **Reset Functionality**: Secure email-based password reset
- **Force Reset**: New users must change temporary passwords
- **No Plain Text**: Passwords never stored in plain text

## Development Guidelines

### Code Organization

```
src/
├── components/          # Reusable UI components
├── contexts/           # React context providers
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries and configurations
├── pages/              # Main application pages
├── services/           # Business logic and API calls
├── types/              # TypeScript type definitions
└── utils/              # Helper functions and utilities
```

### Best Practices

1. **Type Safety**: Full TypeScript implementation
2. **Error Handling**: Comprehensive error boundaries and validation
3. **Loading States**: User-friendly loading indicators
4. **Responsive Design**: Mobile-first responsive layout
5. **Accessibility**: WCAG compliance and keyboard navigation
6. **Performance**: Optimized rendering and data fetching

## Deployment

### Production Deployment

1. **Build the application**:

   ```bash
   npm run build
   ```

2. **Deploy to Firebase Hosting**:

   ```bash
   firebase deploy
   ```

3. **Configure domain** (if using custom domain):
   - Add domain in Firebase Console
   - Update DNS records
   - Configure SSL certificate

### Environment Configuration

Create environment files for different stages:

```bash
# .env.production
VITE_FIREBASE_API_KEY=your-production-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-domain.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
```

## Support and Maintenance

### Regular Maintenance Tasks

1. **User Account Audit**: Review active users monthly
2. **Permission Review**: Audit roles and permissions quarterly
3. **Data Backup**: Regular Firestore exports
4. **Security Updates**: Keep dependencies up to date
5. **Performance Monitoring**: Monitor application performance

### Getting Help

1. **Documentation**: Check this guide first
2. **Console Logs**: Enable debug mode for detailed logging
3. **Firebase Console**: Monitor authentication and database activity
4. **Error Tracking**: Implement error tracking for production

This guide provides comprehensive information for setting up, using, and maintaining the AGV Cable TV Management System with Firebase Authentication.
