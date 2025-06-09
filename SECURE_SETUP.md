# 🔐 AGV Cable TV - Secure Setup Guide

## 🎯 **Objective**

Set up the AGV Cable TV Management System with full security while ensuring proper functionality.

## 📋 **Prerequisites**

- Firebase project configured
- Application deployed and accessible
- User can log into the application

## 🚀 **Secure Setup Process**

### **Phase 1: Deploy Secure Firestore Rules**

1. **Deploy the secure rules**:

   ```bash
   firebase deploy --only firestore:rules
   ```

2. **Verify deployment**:
   ```bash
   firebase firestore:rules get
   ```

### **Phase 2: Create Admin User Document**

**This is the critical step for security!**

1. **Login to your application**
2. **Get your Firebase Auth UID**:

   - Open browser console (F12)
   - Run: `console.log("UID:", firebase.auth().currentUser?.uid)`
   - Copy the UID (e.g., `abc123def456ghi789`)

3. **Create admin user in Firestore**:
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Navigate to Firestore Database
   - Create collection: `users`
   - Create document with ID: `<your-copied-uid>`
   - Add fields:
     ```json
     {
       "name": "Your Full Name",
       "email": "your-email@example.com",
       "role": "admin",
       "is_active": true,
       "created_at": "2024-12-01T12:00:00Z",
       "collector_name": null
     }
     ```

### **Phase 3: Test Security Setup**

1. **Refresh your application**
2. **Run diagnostics**:
   ```javascript
   FirebaseDebug.runDiagnostics();
   ```
3. **Verify admin access**:
   ```javascript
   FirebaseDebug.checkAuthStatus();
   ```

### **Phase 4: Initialize Collections**

**If packages collection is empty, create a sample package:**

1. **Go to Firebase Console > Firestore**
2. **Create collection: `packages`**
3. **Add sample document**:
   ```json
   Document ID: basic-cable
   {
     "name": "Basic Cable",
     "price": 299,
     "description": "Essential channels package",
     "channels": 50,
     "features": ["Local channels", "Basic networks"],
     "is_active": true,
     "portal_amount": 299,
     "created_at": "2024-12-01T12:00:00Z",
     "updated_at": "2024-12-01T12:00:00Z",
     "created_by": "system"
   }
   ```

## 🔒 **Security Features Enabled**

### **Role-Based Access Control**

- ✅ **Admin Users**: Full system access, user management, all CRUD operations
- ✅ **Employee Users**: Limited to assigned customers and personal data
- ✅ **Inactive Users**: No system access regardless of role

### **Collection-Level Security**

- ✅ **Users**: Admin-only management, self-read permissions
- ✅ **Customers**: Admin CRUD, employee read assigned customers only
- ✅ **Packages**: Admin CRUD, authenticated read for all
- ✅ **Billing**: Admin oversight, employee own records only
- ✅ **Requests**: Employee create, admin approve/reject

### **Data Validation**

- ✅ **Required Fields**: Server-side validation of essential fields
- ✅ **Type Checking**: Proper data types enforced
- ✅ **Role Validation**: User roles validated against allowed values
- ✅ **Business Logic**: Status transitions and workflow validation

## ✅ **Verification Checklist**

After setup completion:

- [ ] `firebase deploy --only firestore:rules` completed successfully
- [ ] Admin user document created with correct UID
- [ ] `FirebaseDebug.checkAuthStatus()` shows admin role
- [ ] Can access packages page without permission errors
- [ ] Can navigate between all application pages
- [ ] No console errors related to permissions

## 🚨 **Common Issues & Solutions**

### **Issue**: Permission denied errors persist

**Root Cause**: Admin user document not properly created
**Solution**:

- Verify document ID exactly matches Firebase Auth UID
- Ensure `role` field is string `"admin"`
- Ensure `is_active` field is boolean `true`

### **Issue**: Rules not taking effect

**Root Cause**: Rules deployment failed or not propagated
**Solution**:

- Re-run `firebase deploy --only firestore:rules`
- Wait 1-2 minutes for propagation
- Clear browser cache and refresh

### **Issue**: Cannot find Firebase Auth UID

**Root Cause**: User not properly authenticated
**Solution**:

- Ensure logged into application
- Check Firebase Console > Authentication > Users
- Verify email matches logged-in user

### **Issue**: Collections don't exist

**Root Cause**: Fresh database with no data
**Solution**:

- Create sample package as shown in Phase 4
- Other collections will be created automatically
- Rules handle empty collections gracefully

## 🔍 **Diagnostic Commands**

**Check Authentication Status**:

```javascript
FirebaseDebug.checkAuthStatus();
```

**Test Firestore Connection**:

```javascript
FirebaseDebug.testFirestoreConnection();
```

**Full System Diagnostics**:

```javascript
FirebaseDebug.runDiagnostics();
```

**Manual User Check**:

```javascript
console.log(
  "Current user:",
  JSON.stringify(authService.getCurrentUser(), null, 2),
);
```

## 🎉 **Success Indicators**

You'll know the secure setup is complete when:

1. **No permission errors** in browser console
2. **All pages accessible** without authentication challenges
3. **Admin functions available** (user management, package creation)
4. **Security maintained** (employees cannot access admin functions)
5. **Diagnostics pass** with all green checkmarks

## 📞 **Support**

If setup fails after following all steps:

1. **Share diagnostic output**: Results from `FirebaseDebug.runDiagnostics()`
2. **Include user document**: Screenshot from Firebase Console
3. **Provide console errors**: Complete browser console error log
4. **Verify project**: Confirm correct Firebase project selected

The secure setup maintains full security while ensuring proper functionality for all user roles.
