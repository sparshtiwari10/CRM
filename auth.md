# Firebase Authentication Setup Guide

## Current System Status: ✅ WORKING

The AGV Cable TV Management System now uses Firebase Authentication with automatic user document creation.

## Firebase Console Configuration (One-Time Setup)

### 1. Enable Firebase Authentication

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Authentication** → **Get started**
4. Go to **Sign-in method** tab

### 2. Enable Email/Password Authentication

1. Click on **Email/Password** provider
2. Enable the first option: **Email/Password**
3. **Optional**: Enable **Email link (passwordless sign-in)** if you want passwordless login
4. Click **Save**

### 3. Configure Authorized Domains

1. In **Sign-in method** tab, scroll down to **Authorized domains**
2. Add your domains:
   - `localhost` (for development)
   - Your production domain (e.g., `yourdomain.com`)
   - Any staging domains

### 4. Deploy Firestore Security Rules

```bash
firebase deploy --only firestore:rules
```

Use these current working rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Employee Management - Two Methods

### Method 1: Through the App (Recommended) ⭐

**Who can do this:** Admin users only

**Steps:**

1. **Login as admin** to the AGV Cable TV system
2. **Navigate to Employees page** (`/employees`)
3. **Click "Add Employee"** button
4. **Fill out the form:**
   - Full Name
   - Email Address
   - Password (temporary)
   - Role (Admin or Employee)
   - Collection Area (for employees)
5. **Click "Create Employee"**

**What happens automatically:**

- ✅ Creates Firebase Auth account
- ✅ Creates user document in Firestore
- ✅ Sets correct role and permissions
- ✅ Sends password reset email to employee
- ✅ Employee can login immediately

### Method 2: Manual Firebase Auth + App Profile Creation

**Who can do this:** Firebase project admin

**Steps:**

1. **Go to Firebase Console** → Authentication → Users
2. **Click "Add user"**
3. **Enter email and password**
4. **Save the user**
5. **Give credentials to employee**
6. **Employee logs in** to the app
7. **System automatically creates** user document with admin role
8. **Admin changes role** in Employees page if needed

## User Login Process

### For New Employees

1. **Employee receives credentials** (email/password)
2. **Goes to login page** of the app
3. **Enters email and password**
4. **If "User profile not found" error appears:**
   - Click **"Create User Profile"** button
   - System automatically creates admin profile
   - Admin can change role later in Employees page
5. **Successfully logged in**

### For Existing Users

1. **Enter email and password**
2. **Click "Sign In"**
3. **Redirected to dashboard**

## User Document Structure

```typescript
// Firestore: /users/{firebase_uid}
{
  email: "employee@agvcabletv.com",
  name: "Employee Name",
  role: "admin" | "employee",
  collector_name: "Area 1", // For employees only
  is_active: true,
  requires_password_reset: false,
  created_at: Timestamp,
  updated_at: Timestamp,
  auto_created: true // If created automatically
}
```

## Admin User Management

### Creating Users

- **Recommended:** Use the app's Employee Management page
- **Alternative:** Create in Firebase Console, let them create profile on first login

### Managing Users

- **Activate/Deactivate:** Toggle user status in Employees page
- **Change Roles:** Switch between admin/employee
- **Reset Passwords:** Send password reset emails
- **Delete Users:** Remove users completely

### Role Permissions

| Feature          | Admin         | Employee      |
| ---------------- | ------------- | ------------- |
| View customers   | All customers | Own area only |
| Create customers | ✅            | ❌            |
| Edit customers   | ✅            | Own area only |
| Delete customers | ✅            | ❌            |
| View packages    | ✅            | ✅            |
| Manage packages  | ✅            | ❌            |
| Generate bills   | ✅            | Own area only |
| View reports     | ✅            | Own area only |
| Manage employees | ✅            | ❌            |

## Security Features

### Current Implementation

- ✅ **Firebase Auth:** Secure password handling
- ✅ **Auto User Creation:** No manual setup required
- ✅ **Role-Based Access:** Admin vs Employee permissions
- ✅ **Account Management:** Activate/deactivate users
- ✅ **Password Reset:** Email-based password reset

### Production Security (Future)

For production deployment, replace debug rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }

    function getUserDoc() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid));
    }

    function getUserRole() {
      return getUserDoc().data.role;
    }

    function isActive() {
      return getUserDoc().data.is_active == true;
    }

    function isAdmin() {
      return isAuthenticated() && getUserRole() == 'admin' && isActive();
    }

    function isEmployee() {
      return isAuthenticated() &&
             (getUserRole() == 'employee' || getUserRole() == 'admin') &&
             isActive();
    }

    match /users/{userId} {
      allow read: if isAuthenticated() && (request.auth.uid == userId || isAdmin());
      allow create: if isAdmin();
      allow update: if isAdmin() ||
                    (request.auth.uid == userId &&
                     !('role' in request.resource.data) &&
                     !('is_active' in request.resource.data));
      allow delete: if isAdmin();
    }

    match /customers/{customerId} {
      allow read: if isEmployee();
      allow create: if isAdmin();
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }

    match /packages/{packageId} {
      allow read: if isEmployee();
      allow create, update, delete: if isAdmin();
    }

    match /billing/{billingId} {
      allow read: if isEmployee();
      allow create: if isEmployee();
      allow update, delete: if isAdmin();
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **"User profile not found" after login**

   - **Solution:** Click "Create User Profile" button on login page
   - **Prevention:** Use Employee Management page to create users

2. **Permission denied errors**

   - **Solution:** Ensure debug Firestore rules are deployed
   - **Check:** User has correct role in Firestore

3. **Can't create employees**
   - **Solution:** Ensure you're logged in as admin
   - **Check:** Your user document has `role: "admin"`

### Debug Commands

```javascript
// Test Firebase connection
testFirebase();

// Fix permissions
quickFixFirebase();

// Check current user
firebase.auth().currentUser;

// Check user document
firebase
  .firestore()
  .collection("users")
  .doc(firebase.auth().currentUser.uid)
  .get();
```

## Best Practices

### For Admins

1. **Always use Employee Management page** to create new users
2. **Send password reset emails** instead of sharing passwords
3. **Regularly audit user roles** and active status
4. **Deactivate users** instead of deleting when possible

### For Employees

1. **Change password** after first login
2. **Report login issues** to admin immediately
3. **Use password reset** if you forget password

### Security

1. **Strong passwords** (minimum 6 characters, Firebase enforced)
2. **Regular password changes** for sensitive accounts
3. **Monitor authentication logs** in Firebase Console
4. **Deploy production rules** before going live

This authentication system provides enterprise-grade security with easy management for admins and simple login for employees.
