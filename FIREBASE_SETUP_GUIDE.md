# Firebase Database Integration Guide - AGV Cable TV Management System

## Overview

Your AGV Cable TV Management System already includes comprehensive Firebase Firestore integration with:

- ✅ Custom authentication system with role-based access
- ✅ Real-time data synchronization
- ✅ Offline fallback with mock data
- ✅ Data import/export functionality
- ✅ Security rules and access controls

## Step-by-Step Setup

### 1. Create Firebase Project

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Click "Create a project"**
3. **Enter project name**: `agv-cabletv-management` (or your preferred name)
4. **Disable Google Analytics** (optional for this app)
5. **Click "Create project"**

### 2. Enable Firestore Database

1. **In Firebase Console**, go to **"Build" → "Firestore Database"**
2. **Click "Create database"**
3. **Choose "Start in production mode"** (we'll add security rules)
4. **Select your preferred region** (choose closest to your users)
5. **Click "Done"**

### 3. Get Firebase Configuration

1. **In Firebase Console**, go to **"Project Settings"** (gear icon)
2. **Scroll down** to "Your apps" section
3. **Click "Web" icon** (`</>`)
4. **Register app name**: `AGV Cable TV Management`
5. **Copy the config object** - you'll need these values:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key-here",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456",
};
```

### 4. Configure Environment Variables

Update your `.env` file with your actual Firebase credentials:

```env
# Firebase Configuration (Replace with your actual values)
VITE_FIREBASE_API_KEY=your-actual-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id

# Application Settings
VITE_APP_NAME=AGV Cable TV Management
VITE_APP_VERSION=1.0.0
```

### 5. Set Up Firestore Security Rules

1. **In Firebase Console**, go to **"Firestore Database" → "Rules"**
2. **Replace the default rules** with these production-ready rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - only authenticated users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Customers collection - role-based access
    match /customers/{customerId} {
      allow read, write: if request.auth != null && (
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'employee' &&
         resource.data.collector_name == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.collector_name)
      );
    }

    // Billing collection - same as customers
    match /billing/{billingId} {
      allow read, write: if request.auth != null && (
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'employee' &&
         resource.data.collector_name == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.collector_name)
      );
    }

    // Requests collection - employees can create, admins can read/write all
    match /requests/{requestId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'employee';
      allow update, delete: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

3. **Click "Publish"**

### 6. Initialize Database with Default Data

1. **Restart your development server**:

```bash
npm run dev
```

2. **The app will automatically**:

   - Create default admin user (username: `admin`, password: `admin123`)
   - Set up initial collections structure
   - Show "Firebase Connected" status

3. **Test login** with default credentials:
   - **Admin**: `admin` / `admin123`
   - Create additional users through the admin panel

### 7. Import Existing Data (Optional)

If you have existing customer data:

1. **Go to Settings → Data Import** (admin only)
2. **Upload CSV/Excel file** with columns:
   - name, phone, address, vc_no, collector_name, prev_os, date, bill_amount, collected_cash, collected_online, discount, current_os, remark, status
3. **Review mapping** and click "Import"

### 8. Firebase Console Management

You can manage your data directly in Firebase Console:

1. **Go to "Firestore Database" → "Data"**
2. **View collections**: `users`, `customers`, `billing`, `requests`
3. **Add/edit documents** manually if needed
4. **Monitor usage** in the Usage tab

## Production Deployment

### 1. Environment Variables for Production

Create production `.env` file:

```env
VITE_FIREBASE_API_KEY=your-production-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-production-domain
VITE_FIREBASE_PROJECT_ID=your-production-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-production-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-production-sender-id
VITE_FIREBASE_APP_ID=your-production-app-id
```

### 2. Build and Deploy

```bash
# Build for production
npm run build

# Deploy to your hosting platform
# (Vercel, Netlify, Firebase Hosting, etc.)
```

## Troubleshooting

### "Firebase not available" message

- Check your `.env` file has correct values
- Verify Firestore is enabled in Firebase Console
- Check browser console for specific error messages

### Authentication errors

- Ensure Firestore security rules are published
- Verify project ID matches in Firebase config
- Check that users collection exists

### Permission denied errors

- Review Firestore security rules
- Ensure user roles are set correctly in users collection
- Check collector_name assignments for employees

## Features Enabled by Firebase Integration

✅ **Real-time Data Sync**: Changes appear instantly across all connected devices
✅ **Role-based Access**: Admins see all data, employees see only their assigned customers
✅ **Secure Authentication**: Custom user management with encrypted passwords
✅ **Data Import/Export**: Upload Excel files and export reports
✅ **Offline Support**: App continues working even when Firebase is unavailable
✅ **Audit Trail**: Track changes and user activities
✅ **Scalable**: Handles thousands of customers and transactions

## Support

If you encounter issues:

1. Check the browser console for error messages
2. Verify Firebase Console shows green status
3. Test with demo credentials first
4. Review the troubleshooting section above

Your Firebase database is now fully integrated and ready for production use! 🎉
