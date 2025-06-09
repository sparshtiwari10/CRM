# 🔧 Initialize Admin User for AGV Cable TV System

## 🎯 **Goal**

Create the first admin user document in Firestore to enable full system access.

## 📋 **Prerequisites**

- Firebase project set up
- Firestore enabled
- User authenticated in the application

## 🚀 **Step-by-Step Setup**

### **Step 1: Get Your Firebase Auth UID**

1. **Log into your application**
2. **Open browser console (F12)**
3. **Run this command**:
   ```javascript
   console.log("Your UID:", firebase.auth().currentUser?.uid);
   ```
4. **Copy the UID** (it looks like: `abc123def456ghi789`)

### **Step 2: Create Admin User Document**

1. **Go to [Firebase Console](https://console.firebase.google.com)**
2. **Select your project**
3. **Go to Firestore Database**
4. **Create a collection called `users`**
5. **Create a document with your UID as the document ID**
6. **Add these fields**:

```json
{
  "name": "Your Name Here",
  "email": "your-email@example.com",
  "role": "admin",
  "is_active": true,
  "created_at": "2024-12-01T12:00:00Z",
  "collector_name": null
}
```

### **Step 3: Verify Setup**

1. **Refresh your application**
2. **Go to any page (like packages)**
3. **Check browser console for errors**
4. **Run diagnostics**:
   ```javascript
   FirebaseDebug.runDiagnostics();
   ```

## ✅ **Success Indicators**

- No permission errors in console
- Can access all pages
- `FirebaseDebug.checkAuthStatus()` shows you as admin
- Packages page loads successfully

## 🔍 **Troubleshooting**

### **Issue**: Still getting permission errors

**Solution**:

- Verify the document ID exactly matches your Firebase Auth UID
- Ensure `role` field is exactly `"admin"` (string)
- Ensure `is_active` field is `true` (boolean)

### **Issue**: Can't find your UID

**Solution**:

- Make sure you're logged into the app
- Try: `console.log(JSON.stringify(firebase.auth().currentUser, null, 2))`
- Look in Firebase Console > Authentication > Users tab

### **Issue**: Firestore rules still blocking

**Solution**:

- Deploy the updated rules: `firebase deploy --only firestore:rules`
- Clear browser cache and refresh
- Wait 1-2 minutes for rules to propagate

## 📝 **Example Document**

```
Collection: users
Document ID: abc123def456ghi789 (your actual UID)

Fields:
┌─────────────────┬─────────┬─────────────────────────────────┐
│ Field           │ Type    │ Value                           │
├─────────────────┼─────────┼─────────────────────────────────┤
│ name            │ string  │ John Smith                      │
│ email           │ string  │ john.smith@example.com          │
│ role            │ string  │ admin                           │
│ is_active       │ boolean │ true                            │
│ created_at      │ string  │ 2024-12-01T12:00:00Z           │
│ collector_name  │ null    │ null                            │
└─────────────────┴─────────┴─────────────────────────────────┘
```

## 🎉 **Next Steps**

Once your admin user is created:

1. **Test package management** - should work without errors
2. **Create sample packages** - if none exist
3. **Set up employee users** - through the Employee Management page
4. **Import customer data** - if needed

The secure Firestore rules will now recognize you as an admin and grant appropriate access!
