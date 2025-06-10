# Firebase Permissions Error - Step-by-Step Fix Guide

## 🚨 Error: "Missing or insufficient permissions"

This error occurs because Firebase Firestore security rules are blocking access. Follow these steps to fix it:

## Quick Fix (Recommended)

### Step 1: Open Browser Console

1. Press `F12` or right-click → "Inspect Element"
2. Go to the "Console" tab
3. Type: `quickFixFirebase()` and press Enter
4. Follow the instructions in the console

### Step 2: Apply Temporary Debug Rules

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Firestore Database** → **Rules**
4. Replace the current rules with these TEMPORARY rules:

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

5. Click **"Publish"** to deploy the rules
6. Refresh your app and try again

## Manual Diagnostics

If the quick fix doesn't work, follow these manual steps:

### 1. Check Firebase Authentication

- Go to Firebase Console → Authentication
- Verify Email/Password provider is enabled
- Check if users exist in the Users tab

### 2. Check if User Document Exists

Run this in your browser console:

```javascript
// Check current user
firebase.auth().currentUser;

// Check user document (if authenticated)
FirebasePermissionsFix.diagnoseAndFix();
```

### 3. Create Missing User Document

If you're authenticated but the user document is missing:

1. **Automatic**: The diagnostic tool will create it for you
2. **Manual**: Go to Firestore Console → users collection → Add document:

```json
Document ID: [your-firebase-uid]
{
  "email": "admin@agvcabletv.com",
  "name": "System Administrator",
  "role": "admin",
  "is_active": true,
  "created_at": [current timestamp],
  "updated_at": [current timestamp]
}
```

## Common Issues and Solutions

### Issue 1: No Authentication

**Symptoms**: Not signed in, no Firebase user
**Solution**:

1. Try signing in with: admin@agvcabletv.com / admin123
2. If account doesn't exist, run `quickFixFirebase()` to create it

### Issue 2: Missing User Document

**Symptoms**: Authenticated but permission denied
**Solution**: Run the diagnostic tool to create user document

### Issue 3: Wrong Role or Inactive User

**Symptoms**: Authenticated but still permission denied
**Solution**: Check user document has `role: "admin"` and `is_active: true`

### Issue 4: Firestore Rules Too Restrictive

**Symptoms**: All operations denied
**Solution**: Use the temporary debug rules above

## Production Rules (After Fixing)

Once everything works with debug rules, replace them with secure production rules:

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

    match /requests/{requestId} {
      allow read: if isEmployee();
      allow create: if isEmployee();
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }
  }
}
```

## Console Commands for Debugging

```javascript
// Check authentication status
firebase.auth().currentUser;

// Run full diagnostics
FirebasePermissionsFix.diagnoseAndFix();

// Quick fix
quickFixFirebase();

// Test basic connection
testFirebaseConnection();

// Check user document
firebase
  .firestore()
  .collection("users")
  .doc(firebase.auth().currentUser.uid)
  .get();
```

## Contact Information

If these steps don't resolve the issue:

1. **Check the browser console** for detailed error messages
2. **Run the diagnostic tools** provided in the console
3. **Follow the specific instructions** shown in the console output

The diagnostic tools will provide specific, actionable steps based on your exact configuration.

## Security Note

⚠️ **Important**: The temporary debug rules allow all authenticated users to read/write all data. Only use them temporarily for debugging, then replace with proper production rules.

🔒 **After fixing**: Make sure to deploy the production rules above for proper security.
