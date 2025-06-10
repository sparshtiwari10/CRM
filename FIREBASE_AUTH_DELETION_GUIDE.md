# Firebase Auth User Deletion Guide

## Issue: App Deletion vs Firebase Auth Deletion

### Problem Description

When you delete an employee from the AGV Cable TV Management app, the user document is removed from Firestore, but the Firebase Authentication user remains. This is because:

1. **Security Limitation:** Firebase doesn't allow client-side deletion of other users' Authentication accounts
2. **Admin SDK Required:** Deleting Firebase Auth users requires server-side Firebase Admin SDK
3. **Two-Part Storage:** Users exist in both Firestore (user profile) and Firebase Auth (authentication)

### Current System Behavior

#### When "Delete Employee" is clicked:

1. ✅ **Firestore Document Deleted:** User profile removed from `/users/{userId}`
2. ❌ **Firebase Auth User Remains:** Authentication account still exists
3. 🔒 **Access Blocked:** User cannot login (no Firestore profile to load)
4. 👻 **Ghost User:** Shows in Firebase Console → Authentication but can't access app

## Solutions

### 🎯 Solution 1: Manual Firebase Console Cleanup (Current Implementation)

**How it works:**

- App deletes Firestore document
- Admin manually removes Firebase Auth user via console
- Complete user removal achieved

**Steps to complete deletion:**

1. **Delete from App** (Already done)

   - User document removed from Firestore
   - User loses app access immediately

2. **Manual Firebase Console Cleanup**
   ```
   1. Go to Firebase Console → Authentication → Users
   2. Find user by email address
   3. Click on the user
   4. Select "Delete user"
   5. Confirm deletion
   ```

**Pros:**

- ✅ Works with current setup
- ✅ No additional backend required
- ✅ Secure (admin controlled)

**Cons:**

- ❌ Manual step required
- ❌ Not automated
- ❌ Users remain in Firebase Auth if forgotten

### 🎯 Solution 2: User Disable (Recommended Alternative)

**How it works:**

- Mark user as inactive in Firestore
- User cannot login but account remains
- No manual cleanup required

**Implementation:**

```typescript
// Disable user instead of deleting
await authService.disableUser(employee.id);

// User marked as inactive
{
  is_active: false,
  disabled_at: new Date(),
  disabled_by: adminUserId
}
```

**Pros:**

- ✅ Fully automated
- ✅ No manual steps
- ✅ User data preserved for records
- ✅ Can be re-enabled if needed

**Cons:**

- ❌ User account remains in Firebase Auth
- ❌ Firestore document remains (marked inactive)

### 🎯 Solution 3: Firebase Cloud Functions (Future Enhancement)

**How it works:**

- Create Cloud Function with Admin SDK
- App calls function to delete user
- Function deletes both Firestore and Auth user

**Implementation Steps:**

1. **Create Cloud Function:**

   ```javascript
   // functions/deleteUser.js
   const admin = require("firebase-admin");

   exports.deleteUser = functions.https.onCall(async (data, context) => {
     // Verify admin permissions
     const uid = data.uid;

     // Delete from Firebase Auth
     await admin.auth().deleteUser(uid);

     // Delete from Firestore
     await admin.firestore().collection("users").doc(uid).delete();
   });
   ```

2. **Deploy Function:**

   ```bash
   firebase deploy --only functions
   ```

3. **Update App:**
   ```typescript
   // Call cloud function
   const deleteUserFunction = getFunctions(app, "deleteUser");
   await deleteUserFunction({ uid: employee.id });
   ```

**Pros:**

- ✅ Fully automated
- ✅ Complete user removal
- ✅ Single operation

**Cons:**

- ❌ Requires Firebase Functions setup
- ❌ Additional complexity
- ❌ Billing implications

### 🎯 Solution 4: Firebase Admin SDK Backend (Enterprise)

**How it works:**

- Separate Node.js backend with Admin SDK
- API endpoint for user deletion
- Complete user management capabilities

**Implementation:**

```javascript
// backend/userManagement.js
const admin = require("firebase-admin");

app.delete("/api/users/:uid", async (req, res) => {
  try {
    // Verify admin token
    const adminToken = req.headers.authorization;
    await admin.auth().verifyIdToken(adminToken);

    // Delete user
    await admin.auth().deleteUser(req.params.uid);
    await admin.firestore().collection("users").doc(req.params.uid).delete();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**Pros:**

- ✅ Complete control
- ✅ Advanced user management
- ✅ Audit logging
- ✅ Bulk operations

**Cons:**

- ❌ Requires separate backend
- ❌ Infrastructure complexity
- ❌ Maintenance overhead

## Current Implementation

### Enhanced Delete Function

The current `deleteUser` function has been enhanced to:

1. **Delete Firestore Document:** Removes user profile immediately
2. **Provide Clear Instructions:** Shows manual cleanup steps
3. **Console Logging:** Detailed instructions for admin
4. **Return User Info:** Email for manual cleanup

```typescript
async deleteUser(userId: string): Promise<void> {
  // Delete Firestore document
  await deleteDoc(doc(db, "users", userId));

  // Log cleanup instructions
  console.warn("⚠️ IMPORTANT: Firebase Auth user still exists!");
  console.warn("📋 Manual action required:");
  console.warn(`   1. Go to Firebase Console → Authentication → Users`);
  console.warn(`   2. Find user with email: ${userEmail}`);
  console.warn(`   3. Click the user and select "Delete user"`);
}
```

### New Disable Function

Added `disableUser` function as alternative:

```typescript
async disableUser(userId: string): Promise<void> {
  await updateDoc(doc(db, "users", userId), {
    is_active: false,
    disabled_at: new Date(),
    disabled_by: this.currentUser?.id,
  });
}
```

### Enhanced UI

The employee management UI now provides:

1. **Disable Option:** Recommended for temporary suspension
2. **Delete Option:** With manual cleanup instructions
3. **Clear Feedback:** Toast messages with next steps
4. **Dropdown Menu:** Organized management options

## Recommendations

### For Current Setup (Immediate):

1. **Use Disable for Most Cases:**

   - Temporarily suspend problematic users
   - Preserve data for potential reactivation
   - No manual cleanup required

2. **Use Delete for Permanent Removal:**

   - Follow manual Firebase Console cleanup
   - Document process for admin team
   - Keep list of emails for cleanup tracking

3. **Regular Cleanup Schedule:**
   - Weekly Firebase Console review
   - Remove orphaned Auth users
   - Maintain clean user database

### For Future Enhancement:

1. **Implement Cloud Functions:**

   - Automate complete user deletion
   - Reduce manual administrative overhead
   - Improve user experience

2. **Add Audit Logging:**

   - Track all user management actions
   - Record who deleted/disabled which users
   - Maintain compliance records

3. **Bulk Management Tools:**
   - Mass disable/enable operations
   - Bulk Firebase Auth cleanup
   - User export/import capabilities

## Best Practices

### User Management Workflow:

1. **First Offense:** Disable user account
2. **Repeated Issues:** Consider deletion with cleanup
3. **Data Retention:** Follow company policies
4. **Documentation:** Log all management actions

### Firebase Console Maintenance:

1. **Weekly Review:** Check for orphaned Auth users
2. **Cleanup Process:** Document steps for team
3. **Access Control:** Limit Firebase Console access
4. **Backup:** Export user data before bulk operations

### Security Considerations:

1. **Admin Verification:** Confirm admin status before operations
2. **Self-Protection:** Prevent deletion of own account
3. **Audit Trail:** Log all user management activities
4. **Role Separation:** Different permissions for disable vs delete

## Troubleshooting

### Common Issues:

1. **User Still Shows in Firebase Auth**

   - Expected behavior with current implementation
   - Manual cleanup required via Firebase Console

2. **User Can't Login After Deletion**

   - Correct behavior - Firestore document deleted
   - User account exists but can't access app

3. **Employee List Still Shows User**
   - Check if app refreshed properly
   - Verify Firestore document actually deleted

### Quick Fixes:

1. **Complete User Removal:**

   ```
   1. Confirm user deleted from Firestore
   2. Go to Firebase Console → Authentication
   3. Find and delete user manually
   ```

2. **Reactivate Disabled User:**

   ```typescript
   await authService.updateUser(userId, { is_active: true });
   ```

3. **Check User Status:**
   ```javascript
   // In browser console
   firebase.auth().currentUser;
   ```

## Conclusion

The current implementation provides a secure, functional user deletion system with clear instructions for complete cleanup. While manual Firebase Console steps are required, this approach ensures:

- ✅ **Immediate Access Revocation**
- ✅ **Data Security**
- ✅ **Admin Control**
- ✅ **Clear Process Documentation**

For organizations requiring fully automated deletion, implementing Firebase Cloud Functions is the recommended next step.
