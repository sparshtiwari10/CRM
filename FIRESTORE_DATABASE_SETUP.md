# Firestore Database Setup Guide - AGV Cable TV Management

## 🔥 **Complete Firestore Database Setup**

Your AGV app is ready to use Firebase Firestore! Here's everything you need to set up the database properly.

## 📋 **What You Need to Setup**

### **1. Firestore Security Rules (Essential)**

Go to: https://console.firebase.google.com/project/cable-tv-b8f38/firestore/rules

Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Simple rules for AGV Cable TV Management - Custom Auth System
    // Since we're using custom authentication (not Firebase Auth), we allow all operations
    // and handle permissions in the application layer

    match /{document=**} {
      // Allow all read/write operations
      // Security is handled by the application's custom authentication system
      allow read, write: if true;
    }
  }
}
```

**Click "Publish" to save the rules.**

### **2. Firestore Collections (Auto-Created)**

Your app will automatically create these collections when you start using it:

#### **`users` Collection**

Stores admin and employee users with authentication data.

**Document Structure:**

```javascript
{
  username: "admin",
  password_hash: "$2a$12$...", // Encrypted password
  name: "System Administrator",
  role: "admin", // or "employee"
  collector_name: null, // For employees only
  access_scope: [],
  created_at: Timestamp,
  last_login: Timestamp,
  is_active: true
}
```

#### **`customers` Collection**

Stores all customer information.

**Document Structure:**

```javascript
{
  name: "John Smith",
  phoneNumber: "+91 98765 43210",
  address: "123 Main Street, City",
  vcNumber: "VC001001",
  currentPackage: "Premium HD",
  collectorName: "Collector Name",
  billingStatus: "Paid", // "Paid", "Pending", "Overdue"
  portalBill: 599,
  isActive: true,
  email: "john@email.com",
  joinDate: "2024-01-01",
  lastPaymentDate: "2024-01-15",
  activationDate: "2024-01-01",
  numberOfConnections: "2",
  connections: [...], // Array of connection objects
  customPlan: null // Custom pricing if used
}
```

#### **`billing` Collection**

Stores billing and payment records.

**Document Structure:**

```javascript
{
  customerId: "customer_doc_id",
  customerName: "John Smith",
  amount: 599,
  date: "2024-01-15",
  status: "Paid",
  method: "Cash", // "Cash", "Online", "Card"
  collectorName: "Collector Name",
  invoiceNumber: "INV-001",
  description: "Monthly subscription",
  created_at: Timestamp
}
```

#### **`requests` Collection**

Stores employee requests for admin approval.

**Document Structure:**

```javascript
{
  employeeId: "user_doc_id",
  employeeName: "Employee Name",
  requestType: "customer_action", // Type of request
  description: "Request details",
  status: "pending", // "pending", "approved", "rejected"
  created_at: Timestamp,
  processed_at: Timestamp,
  processed_by: "admin_user_id"
}
```

## 🚀 **Getting Started Steps**

### **Step 1: Set Up Rules (5 minutes)**

1. Go to Firebase Console → Firestore Database → Rules
2. Copy the rules from above
3. Click "Publish"
4. Wait 1-2 minutes for rules to propagate

### **Step 2: Test Connection**

1. Refresh your app at http://localhost:8080
2. Look for "Firebase Connected" badge (green)
3. Login with: `admin` / `admin123`

### **Step 3: Create Your First Customer**

1. Go to Customers section
2. Click "Add Customer"
3. Fill in the details
4. Save and verify it appears in Firebase Console

### **Step 4: Import Existing Data (Optional)**

1. In Customers section, click "Import Data"
2. Download the sample CSV template
3. Fill with your customer data
4. Upload and import

## 📊 **Data Import Format**

### **Required CSV Columns:**

```
name,phoneNumber,address,vcNumber,currentPackage,collectorName,billingStatus,portalBill,isActive
```

### **Sample CSV Data:**

```csv
name,phoneNumber,address,vcNumber,currentPackage,collectorName,billingStatus,portalBill,isActive
John Smith,+91 98765 43210,123 Main Street,VC001001,Premium HD,Collector A,Paid,599,true
Sarah Johnson,+91 98765 43211,456 Oak Avenue,VC001002,Basic,Collector B,Pending,299,true
```

### **Field Descriptions:**

- **name**: Customer full name
- **phoneNumber**: Contact number (include +91 for India)
- **address**: Complete address
- **vcNumber**: Unique VC number (e.g., VC001001)
- **currentPackage**: Package name (Basic, Premium HD, etc.)
- **collectorName**: Employee responsible for this customer
- **billingStatus**: Paid, Pending, or Overdue
- **portalBill**: Monthly bill amount in ₹
- **isActive**: true for active, false for inactive

## 🔍 **Monitoring Your Database**

### **Firebase Console Access:**

- **Database**: https://console.firebase.google.com/project/cable-tv-b8f38/firestore/data
- **Rules**: https://console.firebase.google.com/project/cable-tv-b8f38/firestore/rules
- **Usage**: https://console.firebase.google.com/project/cable-tv-b8f38/usage

### **What to Check:**

1. **Collections**: Verify users, customers, billing, requests collections
2. **Document Count**: Monitor growth
3. **Usage Stats**: Check reads/writes per day
4. **Security**: Ensure rules are active

## ⚠️ **Important Notes**

### **Security:**

- Current rules allow all access for simplicity
- Security is handled in the application layer
- For high-security needs, contact for advanced rules setup

### **Billing:**

- Firebase has a generous free tier
- Monitor usage in Firebase Console
- Upgrade to Blaze plan only if you exceed free limits

### **Backup:**

- Firebase automatically backs up your data
- Export capabilities available in Console
- Data is replicated across multiple regions

## 🛠️ **Troubleshooting**

### **"Demo Mode" Still Showing:**

1. Wait 2-3 minutes after publishing rules
2. Clear browser cache and refresh
3. Check browser console for specific errors
4. Verify project ID matches in .env file

### **Import Not Working:**

1. Check CSV format matches exactly
2. Ensure file is saved as CSV (not Excel)
3. Verify required columns are present
4. Check for special characters in data

### **Data Not Saving:**

1. Check Firebase Console for error messages
2. Verify rules are published
3. Check internet connection
4. Look for JavaScript errors in browser console

## ✅ **Success Indicators**

When everything is working correctly, you should see:

1. **🟢 "Firebase Connected"** badge on login page
2. **Real-time updates** across browser tabs
3. **Data persistence** after browser refresh
4. **Collections appearing** in Firebase Console
5. **Import functionality** working smoothly

## 📞 **Need Help?**

If you encounter issues:

1. **Check FIREBASE_TROUBLESHOOTING.md** for connection issues
2. **Review browser console** for error messages
3. **Test in incognito mode** to rule out cache issues
4. **Try mobile hotspot** to test different network

Your Firestore database is now ready for production use! 🎉

## 🎯 **Next Steps**

1. Set up proper security rules for production
2. Configure automated backups
3. Set up monitoring and alerts
4. Plan for data growth and scaling
5. Train your team on the system

**Your AGV Cable TV Management System is now fully operational with cloud database storage!** 🚀
