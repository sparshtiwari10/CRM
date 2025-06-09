# 🚨 AGV Cable TV - Website Not Working Checklist

## 🔍 **Immediate Debugging Steps**

### **Step 1: Check Dev Server**

- ✅ **Dev server restarted**: Running on http://localhost:8081/
- ✅ **Port changed**: Was 8080, now 8081 (check if this affects anything)

### **Step 2: Verify Firestore Rules Deployment**

**Check if rules are actually deployed to Firebase:**

```bash
# 1. Check current project
firebase use

# 2. Deploy rules (even if they seem the same)
firebase deploy --only firestore:rules

# 3. Verify deployment
firebase firestore:rules get

# 4. Check for any deployment errors
firebase deploy --only firestore:rules --debug
```

### **Step 3: Browser Debugging**

**Open browser console (F12) and check for:**

1. **Authentication errors**:

   ```javascript
   // Run this in console
   console.log("Auth user:", firebase.auth().currentUser);
   ```

2. **Firestore connection**:

   ```javascript
   // Run this in console
   FirebaseDebug.runDiagnostics();
   ```

3. **Network errors**:
   - Check Network tab for failed requests
   - Look for 403 (Forbidden) or 401 (Unauthorized) errors

### **Step 4: Check Firebase Console**

**Go to [Firebase Console](https://console.firebase.google.com):**

1. **Firestore Database**:

   - ✅ Check if collections exist: `users`, `packages`, `customers`
   - ✅ Check if your user document exists in `users` collection
   - ✅ Verify user document has: `role: "admin"`, `is_active: true`

2. **Authentication**:

   - ✅ Check if you're listed in Authentication > Users
   - ✅ Verify your email/UID matches

3. **Rules**:
   - ✅ Check Rules tab shows the updated rules
   - ✅ Try Rules Playground to test specific operations

## 🔧 **Common Issues & Solutions**

### **Issue 1: Rules Not Actually Deployed**

**Symptoms**: Same errors after updating rules file

**Solution**:

```bash
# Force deploy with debug output
firebase deploy --only firestore:rules --debug

# If that fails, try
firebase login --reauth
firebase use <your-project-id>
firebase deploy --only firestore:rules
```

### **Issue 2: Collections Don't Exist**

**Symptoms**: Permission errors on empty database

**Solution**: Create collections manually in Firebase Console:

1. **Create `packages` collection**:

   ```json
   Document ID: basic-cable
   {
     "name": "Basic Cable",
     "price": 299,
     "description": "Essential channels",
     "channels": 50,
     "features": ["Local channels"],
     "is_active": true,
     "portal_amount": 299,
     "created_at": "2024-12-01T00:00:00Z",
     "updated_at": "2024-12-01T00:00:00Z",
     "created_by": "system"
   }
   ```

2. **Check your user document in `users` collection**:
   ```json
   Document ID: <your-firebase-auth-uid>
   {
     "name": "Your Name",
     "role": "admin",
     "is_active": true,
     "email": "your-email@example.com",
     "created_at": "2024-12-01T00:00:00Z"
   }
   ```

### **Issue 3: Authentication Problems**

**Symptoms**: User not recognized as admin

**Solution**:

1. **Log out and log back in**
2. **Check browser localStorage**: Look for `agv_user` key
3. **Clear cache and cookies**
4. **Verify user document in Firestore matches logged-in user**

### **Issue 4: Network/Connection Issues**

**Symptoms**: Connection timeouts, network errors

**Solution**:

1. **Check internet connection**
2. **Try different browser/incognito mode**
3. **Disable browser extensions**
4. **Check if Firebase services are down**: [Firebase Status](https://status.firebase.google.com/)

## 🚨 **Emergency Bypass (Last Resort)**

If everything else fails, temporarily use super-permissive rules:

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

**Deploy these emergency rules**:

```bash
firebase deploy --only firestore:rules
```

⚠️ **CRITICAL**: These rules allow any authenticated user full access. Use only for debugging and restore proper rules immediately!

## 📋 **Debugging Commands**

**In Browser Console**:

```javascript
// Check authentication
FirebaseDebug.checkAuthStatus();

// Test Firestore
FirebaseDebug.testFirestoreConnection();

// Full diagnostics
FirebaseDebug.runDiagnostics();

// Check current user
console.log(JSON.stringify(authService.getCurrentUser(), null, 2));
```

**In Terminal**:

```bash
# Firebase status
firebase --version
firebase login --status
firebase use

# Project info
firebase projects:list
firebase firestore:collections list

# Rules
firebase firestore:rules get
firebase deploy --only firestore:rules --debug
```

## ✅ **Success Indicators**

You'll know it's working when:

1. **No console errors** about permissions
2. **Packages page loads** with data or empty state
3. **FirebaseDebug.runDiagnostics()** shows all green checkmarks
4. **Network tab** shows successful Firestore requests (200 status)

## 📞 **If Still Not Working**

Share these debugging results:

1. **Browser console output** from `FirebaseDebug.runDiagnostics()`
2. **Terminal output** from `firebase deploy --only firestore:rules --debug`
3. **Screenshot** of Firebase Console showing:
   - Firestore collections
   - Your user document
   - Rules deployment status
4. **Network tab** showing any failed requests

The issue is likely one of:

- Rules not actually deployed to Firebase
- Missing collections in Firestore
- User authentication/document issues
- Firebase project configuration problems
