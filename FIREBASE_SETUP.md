# 🔥 Firebase Firestore Setup Guide for AGV Cable TV Management

## 🚀 Quick Start

This application uses **Firestore Database** with **custom authentication** (no Firebase Auth required).

### Default Login Credentials

- **Admin**: username: `admin`, password: `admin123`
- **Employee**: username: `employee`, password: `employee123`

## 📋 Prerequisites

1. A Firebase account
2. Node.js installed
3. Your existing customer data in CSV/JSON format

## 🔧 Firebase Project Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: `agv-cabletv` (or your preferred name)
4. **Disable Google Analytics** (not needed for this app)
5. Create project

### 2. Create Firestore Database

1. In Firebase Console, go to **Firestore Database**
2. Click **Create database**
3. Choose **Start in production mode**
4. Select your preferred location (closest to your users)

### 3. Get Firebase Configuration

1. Go to **Project Settings** → **General** → **Your apps**
2. Click **Web app** (</>) icon
3. Register app with name: `agv-cabletv-app`
4. **Do NOT select "Firebase Hosting"**
5. Copy the Firebase configuration object

### 4. Configure the Application

1. Create a `.env` file in your project root:

```bash
cp .env.example .env
```

2. Update `.env` with your Firebase configuration:

```env
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

## 🔐 Firestore Security Rules

Replace the default rules in **Firestore → Rules**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users collection - stores employee/admin credentials
    match /users/{userId} {
      allow read, write: if true; // Allow for initial setup
      // TODO: Restrict after initial admin user is created
    }

    // Customers collection
    match /customers/{customerId} {
      allow read, write: if true; // Allow for initial setup
      // TODO: Add user-based restrictions after authentication is set up
    }

    // Billing collection
    match /billing/{billingId} {
      allow read, write: if true; // Allow for initial setup
    }

    // Requests collection
    match /requests/{requestId} {
      allow read, write: if true; // Allow for initial setup
    }

    // Allow read/write access on all documents to any user, as defined above
    // TODO: Implement proper security rules based on user roles
  }
}
```

**⚠️ Important**: These are permissive rules for initial setup. Update them for production!

## 📊 Data Import Process

### 1. Prepare Your Data

Ensure your customer data includes these fields:

- `name` (required)
- `phone` (required)
- `address` (required)
- `vc_no` (required)
- `package` (optional, defaults to "Basic")
- `collector_name` (optional, defaults to "Default Collector")
- `email` (optional)
- `billing_status` (optional: "Paid"/"Pending"/"Overdue")
- `status` (optional: "active"/"inactive", defaults to "active")

### 2. Import Customer Data

1. Start the application: `npm run dev`
2. Login as admin (username: `admin`, password: `admin123`)
3. Go to **Settings** or **Admin Panel**
4. Use the **Import Data** feature
5. Upload your CSV or JSON file

### 3. Create Employee Users

After importing customers, create employee accounts:

1. Login as admin
2. Go to **Employee Management**
3. Create users with:
   - Username and password
   - Role: "employee" or "admin"
   - Collector name (for employees)
   - Access scope (which customers they can see)

## 🏗️ Collections Structure

The application creates these Firestore collections:

### `users` Collection

```javascript
{
  username: "john.collector",
  password_hash: "bcrypt_hashed_password",
  name: "John Collector",
  role: "employee", // or "admin"
  collector_name: "John Collector", // for employees
  access_scope: [], // array of customer IDs (optional)
  created_at: timestamp,
  last_login: timestamp,
  is_active: true
}
```

### `customers` Collection

```javascript
{
  name: "Customer Name",
  phone: "+91 98765 43210",
  address: "Full Address",
  package: "Premium HD",
  vc_no: "VC001234",
  collector_name: "John Collector",
  email: "customer@email.com",
  billing_status: "Paid", // "Paid" | "Pending" | "Overdue"
  last_payment_date: timestamp,
  join_date: timestamp,
  status: "active", // "active" | "inactive"
  // Additional fields from original Excel data
  prev_os: 0,
  bill_amount: 599,
  collected_cash: 599,
  collected_online: 0,
  discount: 0,
  current_os: 0,
  remark: "Customer notes",
  created_at: timestamp,
  updated_at: timestamp
}
```

### `billing` Collection

```javascript
{
  customer_id: "customer_doc_id",
  customer_name: "Customer Name",
  package_name: "Premium HD",
  amount: 599,
  due_date: timestamp,
  status: "Paid", // "Paid" | "Pending" | "Overdue"
  invoice_number: "INV-2024-001",
  generated_date: timestamp,
  generated_by: "John Collector",
  employee_id: "employee_doc_id",
  billing_month: "January",
  billing_year: "2024",
  vc_number: "VC001234",
  custom_amount: 599, // if custom amount was used
  created_at: timestamp
}
```

### `requests` Collection

```javascript
{
  customer_id: "customer_doc_id",
  customer_name: "Customer Name",
  employee_id: "employee_doc_id",
  employee_name: "John Collector",
  action_type: "activation", // "activation" | "deactivation" | "plan_change"
  current_plan: "Basic",
  requested_plan: "Premium HD",
  reason: "Customer requested upgrade",
  status: "pending", // "pending" | "approved" | "rejected"
  request_date: timestamp,
  review_date: timestamp,
  reviewed_by: "Admin Name",
  admin_notes: "Approved",
  created_at: timestamp,
  updated_at: timestamp
}
```

## 🚀 Deployment

### Option 1: Firebase Hosting

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize: `firebase init hosting`
4. Build: `npm run build`
5. Deploy: `firebase deploy`

### Option 2: Other Hosting Platforms

The app can be deployed to:

- Vercel
- Netlify
- DigitalOcean App Platform
- Any static hosting service

Just build the app with `npm run build` and upload the `dist` folder.

## 🔐 Production Security

### 1. Update Firestore Rules

Replace the permissive rules with proper security:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper function to check if user is authenticated admin
    function isAdmin() {
      return request.auth != null &&
             exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Helper function to check if user is authenticated employee
    function isEmployee() {
      return request.auth != null &&
             exists(/databases/$(database)/documents/users/$(request.auth.uid));
    }

    // Users collection
    match /users/{userId} {
      allow read: if isEmployee();
      allow write: if isAdmin();
    }

    // Customers collection
    match /customers/{customerId} {
      allow read, write: if isAdmin();
      allow read: if isEmployee() &&
                     resource.data.collector_name ==
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.collector_name;
    }

    // Billing collection
    match /billing/{billingId} {
      allow read, write: if isAdmin();
      allow read, create: if isEmployee() &&
                          resource.data.employee_id == request.auth.uid;
    }

    // Requests collection
    match /requests/{requestId} {
      allow read: if isAdmin();
      allow read, create: if isEmployee() &&
                          resource.data.employee_id == request.auth.uid;
      allow update: if isAdmin();
    }
  }
}
```

### 2. Environment Variables

For production, use environment variables or Firebase Remote Config for sensitive settings.

### 3. Enable App Check

1. Go to **Project Settings** → **App Check**
2. Enable App Check for your web app
3. Configure reCAPTCHA v3

## 🐛 Troubleshooting

### Common Issues

1. **"Permission denied" errors**: Check Firestore security rules
2. **"Firebase not available"**: Verify environment variables in `.env`
3. **Login fails**: Check if default admin user was created
4. **Import fails**: Verify data format and required fields

### Debug Mode

Enable detailed logging:

```javascript
// In browser console
localStorage.setItem("debug", "agv:*");
```

### Firestore Emulator (Development)

For local development with emulator:

1. Install: `npm install -g firebase-tools`
2. Setup: `firebase init emulators`
3. Start: `firebase emulators:start`
4. Update `.env`:

```env
VITE_USE_FIREBASE_EMULATOR=true
VITE_FIRESTORE_EMULATOR_HOST=localhost
VITE_FIRESTORE_EMULATOR_PORT=8080
```

## 📞 Support

For setup assistance:

1. Check console errors in browser developer tools
2. Verify Firestore rules and data structure
3. Ensure environment variables are correctly set
4. Check that collections exist and have proper permissions

## 🔄 Data Backup

Regular backup your Firestore data:

1. Use Firebase CLI: `firebase firestore:export`
2. Or use Cloud Console backup feature
3. Schedule automated backups for production

---

**🎉 You're all set!** Your AGV Cable TV Management System is now connected to Firebase Firestore with custom authentication and ready for production use.
