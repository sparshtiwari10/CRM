# AGV Cable TV Management System - Troubleshooting Guide

## 🔥 Firebase Permissions Error: "Missing or insufficient permissions"

This error occurs when Firestore security rules are blocking your requests. Here's how to fix it:

### 🔍 **Quick Diagnosis**

1. **Open browser console** (F12) and run:

   ```javascript
   FirebaseDebug.runDiagnostics();
   ```

2. **Check the output** for specific issues with authentication, collections, and permissions.

### 🛠️ **Step-by-Step Solutions**

#### **Step 1: Verify Authentication**

1. **Check if you're logged in:**

   - Open browser console
   - Run: `FirebaseDebug.checkAuthStatus()`
   - Ensure you see "User is authenticated" and role is "admin"

2. **If not authenticated:**
   - Go to the login page
   - Log in with admin credentials

#### **Step 2: Deploy Security Rules**

1. **Deploy the security rules:**

   ```bash
   firebase deploy --only firestore:rules
   ```

2. **Verify deployment:**
   ```bash
   firebase firestore:rules get
   ```

#### **Step 3: Check Firestore Collections**

1. **Go to Firebase Console:**

   - Visit: https://console.firebase.google.com
   - Select your project
   - Go to Firestore Database

2. **Verify these collections exist:**

   - ✅ `users` - Contains your user document
   - ✅ `packages` - May be empty but should exist
   - ✅ `customers` - Contains customer data

3. **Check your user document:**
   - Collection: `users`
   - Document ID: Your Firebase Auth UID
   - Required fields:
     ```json
     {
       "name": "Your Name",
       "role": "admin",
       "is_active": true,
       "email": "your-email@example.com",
       "created_at": "2024-01-01T00:00:00Z"
     }
     ```

#### **Step 4: Create Packages Collection (If Missing)**

If the `packages` collection doesn't exist:

1. **In Firebase Console:**

   - Go to Firestore Database
   - Click "Start collection"
   - Collection ID: `packages`

2. **Add a sample package:**
   - Document ID: `basic-cable`
   - Fields:
     ```json
     {
       "name": "Basic Cable",
       "price": 299,
       "description": "Essential channels package",
       "channels": 50,
       "features": ["Local channels", "Basic cable networks"],
       "is_active": true,
       "portal_amount": 299,
       "created_at": "2024-01-01T00:00:00Z",
       "updated_at": "2024-01-01T00:00:00Z",
       "created_by": "system"
     }
     ```

### 🚨 **Emergency Debug Mode**

If you need to bypass security rules temporarily for debugging:

1. **Backup your current rules:**

   ```bash
   firebase firestore:rules get > backup-rules.txt
   ```

2. **Use temporary debug rules:**

   ```bash
   cp scripts/temp-debug-rules.rules firestore.rules
   firebase deploy --only firestore:rules
   ```

3. **Test your app** - permissions error should be gone

4. **Restore proper rules immediately:**
   ```bash
   git checkout firestore.rules
   firebase deploy --only firestore:rules
   ```

### 🔧 **Advanced Debugging**

#### **Check Security Rules Evaluation**

1. **In Firebase Console:**

   - Go to Firestore → Rules
   - Use the Rules Playground to test your rules

2. **Test scenarios:**
   - Authenticated admin reading packages
   - Authenticated employee reading packages
   - Unauthenticated user accessing data

#### **Common Rule Issues**

1. **User document doesn't exist:**

   ```javascript
   // This will fail if user doc doesn't exist
   exists(/databases/$(database)/documents/users/$(request.auth.uid))
   ```

2. **Incorrect field names:**

   ```javascript
   // Make sure field names match exactly
   getUserData().role == "admin"; // ✅ Correct
   getUserData().userRole == "admin"; // ❌ Wrong field name
   ```

3. **Missing `is_active` field:**
   ```javascript
   getUserData().is_active == true; // Requires this field to exist
   ```

### 📋 **Debugging Checklist**

- [ ] Logged in as admin user
- [ ] Security rules deployed (`firebase deploy --only firestore:rules`)
- [ ] `packages` collection exists in Firestore
- [ ] User document exists with correct fields (`role: "admin"`, `is_active: true`)
- [ ] Browser console shows no authentication errors
- [ ] Firebase project is selected (`firebase use <project-id>`)

### 🔗 **Useful Commands**

```bash
# Check current Firebase project
firebase use

# List available projects
firebase projects:list

# Deploy only security rules
firebase deploy --only firestore:rules

# View current security rules
firebase firestore:rules get

# Check Firestore collections
firebase firestore:collections list

# Login to Firebase
firebase login

# Initialize debugging
# (Run in browser console)
FirebaseDebug.runDiagnostics();
```

### 📞 **Still Having Issues?**

1. **Run the diagnostics:**

   ```javascript
   // In browser console
   FirebaseDebug.runDiagnostics();
   FirebaseDebug.testPermissions();
   ```

2. **Check browser console** for detailed error messages

3. **Verify Firebase project configuration:**

   - Correct project selected
   - Firestore enabled
   - Authentication enabled

4. **Share the following information:**
   - Browser console error messages
   - Firebase project ID
   - User document structure from Firestore Console
   - Output from `FirebaseDebug.runDiagnostics()`

### 💡 **Prevention**

1. **Always test security rules** before deploying to production
2. **Use Firebase Rules Playground** to validate rule logic
3. **Keep user documents** properly structured with required fields
4. **Monitor Firestore usage** in Firebase Console for permission denials
5. **Use version control** for security rules to track changes

---

**Last Updated:** December 2024  
**Applies To:** AGV Cable TV Management System v1.0
