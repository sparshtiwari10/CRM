# Firebase Authentication Setup Guide

## Firebase Console Configuration

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

### 4. Firestore Security Rules

Update your Firestore rules to work with Firebase Authentication:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
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

    function getCollectorName() {
      return getUserDoc().data.collector_name;
    }

    function canAccessCustomer(customerData) {
      return isAdmin() ||
             (isEmployee() && customerData.collector_name == getCollectorName());
    }

    // Users collection - Role and profile management
    match /users/{userId} {
      allow read: if isAuthenticated() && (request.auth.uid == userId || isAdmin());
      allow create: if isAdmin();
      allow update: if isAdmin() ||
                    (request.auth.uid == userId &&
                     !('role' in request.resource.data) &&
                     !('is_active' in request.resource.data));
      allow delete: if isAdmin();
    }

    // Customers collection
    match /customers/{customerId} {
      allow read: if isEmployee();
      allow create: if isAdmin();
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }

    // Packages collection
    match /packages/{packageId} {
      allow read: if isEmployee();
      allow create, update, delete: if isAdmin();
    }

    // Billing collection
    match /billing/{billingId} {
      allow read: if isEmployee();
      allow create: if isEmployee();
      allow update, delete: if isAdmin();
    }

    // Requests collection
    match /requests/{requestId} {
      allow read: if isEmployee();
      allow create: if isEmployee();
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }

    // Migration logs (admin only)
    match /migration_logs/{document=**} {
      allow read, write: if isAdmin();
    }
  }
}
```

### 5. Deploy the Rules

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Or deploy everything
firebase deploy
```

## User Document Structure

After migration, user documents in Firestore will look like this:

```typescript
// Document path: /users/{firebase_auth_uid}
{
  email: "admin@agvcabletv.com",
  name: "System Administrator",
  role: "admin", // or "employee"
  collector_name: "Area 1", // For employees only
  is_active: true,
  requires_password_reset: false,
  created_at: Timestamp,
  updated_at: Timestamp,
  // Migration tracking
  migrated_from_custom_auth: true,
  migration_date: Timestamp
}
```

## Migration Process

### 1. Before Migration (Current State)

- Custom authentication with username/password
- User data stored in Firestore with password hashes
- Client-side role validation

### 2. After Migration (Firebase Auth)

- Firebase Authentication handles login/passwords
- User profile data stored in Firestore (linked by Firebase UID)
- Server-side role validation through Firestore rules

### 3. What Changes

**✅ Improved Security:**

- Firebase handles password security
- Server-side role validation
- Secure session management

**✅ Better User Experience:**

- Password reset functionality
- Email verification
- Better error messages

**✅ Easier Management:**

- Admin can create/deactivate users
- Built-in password policies
- Audit logs

## Testing the Migration

### 1. Create Test Admin Account

After running the migration script, create a test admin:

```typescript
// Use the admin panel to create your first Firebase Auth user
const testAdmin = {
  email: "admin@agvcabletv.com",
  password: "secure_password_123",
  name: "System Administrator",
  role: "admin",
};
```

### 2. Test Authentication Flow

1. **Login**: Use email/password instead of username/password
2. **Access Control**: Verify admin can see all features
3. **Employee Creation**: Create test employee account
4. **Employee Login**: Test employee access restrictions

### 3. Verify Firestore Rules

Test in Firebase Console → Firestore → Rules playground:

```javascript
// Test admin access
auth: {uid: 'admin_uid'}
path: /customers/any_customer_id
operation: read
// Should be allowed

// Test employee access
auth: {uid: 'employee_uid'}
path: /packages/any_package_id
operation: write
// Should be denied
```

## Troubleshooting

### Common Issues

1. **"User not found" after login**

   - Make sure user document exists in `/users/{firebase_uid}`
   - Check that `role` and `is_active` fields are set

2. **Permission denied errors**

   - Verify Firestore rules are deployed
   - Check user document structure matches rules

3. **Login fails**
   - Verify email/password provider is enabled
   - Check Firebase Console → Authentication → Users

### Support Commands

```bash
# Check Firebase project
firebase projects:list

# Check current Firestore rules
firebase firestore:rules

# View authentication users
# Go to Firebase Console → Authentication → Users
```

## Security Best Practices

1. **Password Requirements**

   - Minimum 8 characters
   - Require password change on first login

2. **Account Management**

   - Regular audit of active users
   - Deactivate unused accounts
   - Monitor login attempts

3. **Role Management**
   - Principle of least privilege
   - Regular role reviews
   - Clear separation of admin/employee duties

## Next Steps After Setup

1. Run the migration script to move existing users
2. Test login with migrated accounts
3. Create new employee accounts using the admin panel
4. Remove old custom authentication code
5. Update any remaining hardcoded authentication logic
