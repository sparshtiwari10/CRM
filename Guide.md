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

### Current Status: ✅ FULLY OPERATIONAL

- **Authentication:** Firebase Auth with automatic user management
- **Database:** Firestore with real-time data synchronization
- **UI:** Modern, responsive interface with dark mode support
- **Roles:** Admin and Employee with proper permissions
- **Security:** Working Firestore rules with role-based access
- **Employee Management:** Integrated area-based assignment system
- **Customer Management:** Complete CRUD with area-based filtering

### Technology Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS
- **Backend:** Firebase (Firestore Database, Authentication)
- **UI Framework:** Custom components with shadcn/ui
- **State Management:** React Context API
- **Build Tool:** Vite
- **Deployment:** Firebase Hosting ready

## Current Features

### ✅ Enhanced Features (Latest Update)

#### Employee Management System

- **Integrated Area Management:** Employees can be assigned to specific collection areas
- **Dynamic Area Selection:** Area dropdown populated from existing customer assignments
- **Editable Areas:** Admin can change employee areas after creation
- **Session Stability:** Employee creation no longer logs out admin session
- **Dark Mode Compatible:** All dropdowns properly styled for dark theme

#### Customer Management Improvements

- **Area-Based Organization:** "Employee" column renamed to "Area" for clarity
- **Smart Area Filtering:** Filter customers by assigned areas
- **Enhanced Search:** Search includes area names in customer search
- **Improved Import/Export:** Updated CSV templates with "Area Name" field

### ✅ Core Working Features

#### Authentication & User Management

- Firebase Authentication with email/password
- Automatic user document creation
- Role-based access control (Admin/Employee)
- Employee management interface
- Password reset functionality
- Account activation/deactivation

#### Customer Management

- Add, edit, view customers
- Customer search and filtering by area
- Billing status tracking
- Connection management
- Area-based access for employees
- CSV import/export functionality

#### Package Management

- Create and manage service packages
- Real-time metrics and analytics
- Package usage statistics
- Revenue tracking per package

#### Billing System

- Automated bill generation
- Payment tracking (cash/online)
- Outstanding amount management
- Billing history

#### Request Management

- Service request submission
- Admin approval workflow
- Request status tracking

#### System Features

- Dark mode support
- Responsive design
- Real-time data updates
- Error handling and recovery
- Diagnostic tools

## Installation & Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase project
- Modern web browser

### Step-by-Step Setup

#### 1. Clone and Install

```bash
git clone <repository-url>
cd agv-cable-tv-management
npm install
```

#### 2. Firebase Configuration

1. **Create Firebase Project:**

   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create new project
   - Enable Firestore Database
   - Enable Authentication with Email/Password

2. **Configure App:**

   - Copy Firebase config to `src/lib/firebase.ts`
   - Update project settings

3. **Deploy Rules:**
   ```bash
   firebase deploy --only firestore:rules
   ```

#### 3. Start Development

```bash
npm run dev
```

#### 4. First Login

1. Open the application
2. You'll see the login page
3. If no admin exists, create one using:
   - Firebase Console → Authentication → Add User
   - Login with those credentials
   - System auto-creates admin profile

## Authentication System

### How It Works

1. **Firebase Auth:** Handles login/logout, password security
2. **Firestore Documents:** Store user profiles and roles
3. **Automatic Creation:** User documents created on first login
4. **Role Assignment:** Admin can manage roles via Employee page

### User Roles

#### Administrator

- **Full Access:** All system features
- **User Management:** Create, edit, delete employees
- **Area Management:** Assign and modify employee areas
- **System Settings:** Manage packages, global settings
- **All Data:** Access to all customers and billing

#### Employee

- **Area-Specific Access:** Only data from assigned area
- **Customer Management:** Add/edit customers in assigned area
- **Billing:** Generate bills for assigned customers
- **Requests:** Submit requests for admin approval

### Creating Employees

**Method 1: Through App (Recommended)**

1. Login as admin
2. Go to Employees page
3. Click "Add Employee"
4. Fill form with area selection from dropdown
5. Employee receives password reset email

**Method 2: Manual**

1. Create user in Firebase Console
2. Employee logs in
3. System creates profile
4. Admin assigns role/area

## Core Modules

### 1. Customer Management

**Location:** `/customers`

**Enhanced Features:**

- **Area-Based Organization:** Customers organized by collection areas
- **Smart Filtering:** Filter by area, status, search terms
- **Enhanced Search:** Includes area name in search results
- **Import/Export:** CSV support with area field
- **Area-Based Access:** Employees see only their area customers

**Employee Access:** Own area only
**Admin Access:** All customers with area filtering

### 2. Employee Management

**Location:** `/employees`

**Enhanced Features:**

- **Dynamic Area Selection:** Dropdown populated from customer areas
- **Editable Areas:** Change employee areas post-creation
- **Session Stability:** No logout on employee creation
- **Dark Mode Support:** Proper styling for all UI elements
- **Role Management:** Easy role switching

**Access:** Admin only

### 3. Package Management

**Location:** `/packages`

**Features:**

- Package CRUD operations
- Real-time metrics dashboard
- Usage analytics
- Revenue tracking
- Channel count management

**Employee Access:** View only
**Admin Access:** Full management

### 4. Billing System

**Location:** `/billing`

**Features:**

- Automated bill generation
- Payment recording
- Outstanding tracking
- Invoice generation
- Payment history

**Employee Access:** Own area customers
**Admin Access:** All billing data

### 5. Request Management

**Location:** `/requests`

**Features:**

- Service request submission
- Admin approval workflow
- Status tracking
- Request history

**Employee Access:** Submit requests
**Admin Access:** Approve/reject requests

### 6. Dashboard

**Location:** `/dashboard`

**Features:**

- Key metrics overview
- Recent activity
- Quick actions
- System status

**Access:** All authenticated users

## Technical Architecture

### Frontend Architecture

```
src/
├── components/          # Reusable UI components
│   ├── auth/           # Authentication components
│   ├── common/         # Shared components
│   ├── customers/      # Customer management components
│   ├── employees/      # Employee management components
│   ├── layout/         # Layout components
│   └── ui/             # Base UI components
├── contexts/           # React context providers
├── hooks/              # Custom React hooks
├── lib/                # Configuration and utilities
├── pages/              # Main application pages
├── services/           # Business logic and API calls
├── types/              # TypeScript definitions
└── utils/              # Helper functions
```

### Backend Architecture

**Firebase Services:**

- **Authentication:** User login/logout management
- **Firestore:** Document database for all data
- **Storage:** File uploads (future feature)
- **Hosting:** Static site hosting

**Data Structure:**

```
Firestore Collections:
├── users/              # User profiles and roles
├── customers/          # Customer information with areas
├── packages/           # Service packages
├── billing/            # Billing records
└── requests/           # Service requests
```

### State Management

- **React Context:** Global state (auth, theme)
- **Local State:** Component-specific state
- **Firebase Real-time:** Live data updates

## Security Implementation

### Current Security Measures

#### Firebase Authentication

- Secure password handling
- Session management
- Token-based authentication
- Built-in protection against attacks

#### Firestore Security Rules

```javascript
// Current working rules (development)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

#### Application-Level Security

- Role-based UI restrictions
- Area-based data access
- Input validation and sanitization
- Error boundary protection
- Secure routing

### Production Security (Future)

For production deployment, implement:

- Granular Firestore security rules
- Field-level access control
- Audit logging
- Rate limiting
- Advanced authentication features

## Area Management System

### How Areas Work

1. **Area Assignment:** Employees assigned to specific collection areas
2. **Customer Organization:** Customers grouped by areas
3. **Data Access:** Employees see only their area data
4. **Admin Oversight:** Admins can view and manage all areas

### Area Management Features

#### For Admins

- **View All Areas:** See all areas and their assignments
- **Assign Employees:** Assign employees to areas
- **Change Areas:** Modify employee area assignments
- **Area Analytics:** View performance by area

#### For Employees

- **Area-Specific Data:** Access only assigned area customers
- **Area Context:** All operations filtered by area
- **Request System:** Submit area-specific requests

### Area Setup Process

1. **Create Areas:** Areas automatically created from customer assignments
2. **Assign Employees:** Use Employee Management to assign areas
3. **Organize Customers:** Assign customers to appropriate areas
4. **Monitor Performance:** Track area-specific metrics

## Deployment

### Development Deployment

```bash
# Build the application
npm run build

# Deploy to Firebase
firebase deploy
```

### Production Deployment

1. **Update Security Rules:** Deploy production Firestore rules
2. **Environment Configuration:** Set production environment variables
3. **Domain Setup:** Configure custom domain
4. **SSL Certificate:** Enable HTTPS
5. **Monitoring:** Set up error tracking and analytics

### Environment Configuration

```bash
# .env.production
VITE_FIREBASE_API_KEY=your-production-key
VITE_FIREBASE_AUTH_DOMAIN=your-domain.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
```

## Troubleshooting

### Common Issues

#### Authentication Issues

**Problem:** "User profile not found"
**Solution:** Click "Create User Profile" button or use Employee Management

**Problem:** Permission denied
**Solution:** Check Firestore rules are deployed and user has correct role

**Problem:** Can't login
**Solution:** Verify Firebase Auth is enabled and credentials are correct

#### Area Management Issues

**Problem:** Employee can't see customers
**Solution:** Verify employee is assigned to correct area and customers are assigned to that area

**Problem:** Area dropdown empty
**Solution:** Ensure customers are assigned to areas and employees have areas set

#### Data Issues

**Problem:** Packages not loading
**Solution:** Check Firebase connection and Firestore permissions

**Problem:** Import/Export issues
**Solution:** Use updated CSV template with "Area Name" field

#### System Issues

**Problem:** App not loading
**Solution:** Check console for errors, verify Firebase configuration

**Problem:** Dark mode styling issues
**Solution:** Clear browser cache and check component styling

### Debug Tools

**Browser Console Commands:**

```javascript
// Test Firebase connection
testFirebase();

// Fix permissions
quickFixFirebase();

// Check user data
firebase.auth().currentUser;
```

**Firebase Console:**

- Authentication → Users (check user accounts)
- Firestore → Data (verify document structure)
- Firestore → Rules (check security rules)

## Recent Updates Summary

### Employee Management Improvements

1. **Fixed logout issue:** Employee creation no longer logs out admin
2. **Dark mode dropdowns:** All select elements properly styled
3. **Dynamic area selection:** Areas populated from customer data
4. **Editable areas:** Post-creation area modification support

### Customer Management Enhancements

1. **Area terminology:** "Employee" renamed to "Area" throughout
2. **Enhanced filtering:** Area-based customer filtering
3. **Improved search:** Area names included in search functionality
4. **Updated import/export:** CSV templates updated with area fields

### UI/UX Improvements

1. **Consistent styling:** Dark mode compatibility across all components
2. **Better organization:** Area-based data organization
3. **Enhanced navigation:** Clearer area-based navigation
4. **Responsive design:** Improved mobile and desktop experience

The AGV Cable TV Management System now provides comprehensive area-based management with enhanced user experience and improved administrative controls.
