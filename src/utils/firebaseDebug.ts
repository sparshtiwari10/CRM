import { authService } from "@/services/authService";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, limit } from "firebase/firestore";

export class FirebaseDebug {
  /**
   * Check current authentication status and user details
   */
  static checkAuthStatus() {
    const user = authService.getCurrentUser();

    console.group("🔐 Firebase Authentication Status");

    if (user) {
      console.log("✅ User is authenticated");
      console.log("📋 User details:", {
        id: user.id,
        name: user.name,
        role: user.role,
        isActive: user.is_active,
        collectorName: user.collector_name,
      });
      console.log("👑 Is Admin:", authService.isAdmin());
    } else {
      console.log("❌ User is not authenticated");
    }

    console.groupEnd();
    return user;
  }

  /**
   * Test Firestore connection and permissions
   */
  static async testFirestoreConnection() {
    console.group("🔥 Firestore Connection Test");

    try {
      if (!db) {
        console.error("❌ Firestore database not initialized");
        return false;
      }

      console.log("✅ Firestore database initialized");

      // Test reading collections
      const collections = ["users", "packages", "customers"];

      for (const collectionName of collections) {
        try {
          const collectionRef = collection(db, collectionName);
          const testQuery = query(collectionRef, limit(1));
          const snapshot = await getDocs(testQuery);

          console.log(
            `✅ ${collectionName}: Accessible (${snapshot.size} document(s) found)`,
          );
        } catch (error) {
          console.error(
            `❌ ${collectionName}: Permission denied or collection doesn't exist`,
          );
          console.error(`   Error: ${(error as Error).message}`);
        }
      }

      console.groupEnd();
      return true;
    } catch (error) {
      console.error("❌ Firestore connection failed:", error);
      console.groupEnd();
      return false;
    }
  }

  /**
   * Check if user document exists and has correct structure
   */
  static async checkUserDocument() {
    console.group("👤 User Document Validation");

    const user = authService.getCurrentUser();
    if (!user) {
      console.error("❌ No user authenticated");
      console.groupEnd();
      return false;
    }

    try {
      // This is a simplified check since we don't have direct access to the user doc
      console.log("✅ User object exists in memory");
      console.log("📋 Required fields check:");

      const requiredFields = {
        id: user.id,
        name: user.name,
        role: user.role,
        is_active: user.is_active,
      };

      for (const [field, value] of Object.entries(requiredFields)) {
        if (value !== undefined && value !== null) {
          console.log(`  ✅ ${field}: ${value}`);
        } else {
          console.error(`  ❌ ${field}: Missing or invalid`);
        }
      }

      console.groupEnd();
      return true;
    } catch (error) {
      console.error("❌ User document check failed:", error);
      console.groupEnd();
      return false;
    }
  }

  /**
   * Run comprehensive Firebase debugging
   */
  static async runDiagnostics() {
    console.log("🔍 Starting Firebase Diagnostics...");
    console.log("=====================================");

    // Check authentication
    const hasAuth = this.checkAuthStatus();

    // Check user document
    if (hasAuth) {
      await this.checkUserDocument();
    }

    // Check Firestore connection
    await this.testFirestoreConnection();

    console.log("=====================================");
    console.log("🏁 Firebase Diagnostics Complete");

    // Provide recommendations
    console.group("💡 Recommendations");

    if (!hasAuth) {
      console.log("1. Log in to the application first");
    } else {
      console.log("1. ✅ Authentication working");
    }

    console.log("2. Ensure Firestore security rules are deployed:");
    console.log("   firebase deploy --only firestore:rules");

    console.log("3. Check Firebase Console for:");
    console.log("   - Collections exist (users, packages, customers)");
    console.log("   - User document has correct role and is_active fields");
    console.log("   - Security rules are active");

    console.log("4. If still having issues, try temporary debug rules:");
    console.log("   (See scripts/temp-debug-rules.rules)");

    console.groupEnd();
  }

  /**
   * Quick permission test for specific operations
   */
  static async testPermissions() {
    console.group("🔒 Permission Tests");

    const user = authService.getCurrentUser();
    if (!user) {
      console.error("❌ Cannot test permissions - user not authenticated");
      console.groupEnd();
      return;
    }

    console.log(`Testing permissions for ${user.role} user: ${user.name}`);

    // Test package read permission
    try {
      const packagesRef = collection(db, "packages");
      const testQuery = query(packagesRef, limit(1));
      await getDocs(testQuery);
      console.log("✅ Package read: Allowed");
    } catch (error) {
      console.error("❌ Package read: Denied");
      console.error(`   Error: ${(error as Error).message}`);
    }

    // Test customer read permission
    try {
      const customersRef = collection(db, "customers");
      const testQuery = query(customersRef, limit(1));
      await getDocs(testQuery);
      console.log("✅ Customer read: Allowed");
    } catch (error) {
      console.error("❌ Customer read: Denied");
      console.error(`   Error: ${(error as Error).message}`);
    }

    console.groupEnd();
  }
}

// Make available globally for easy debugging
if (typeof window !== "undefined") {
  (window as any).FirebaseDebug = FirebaseDebug;
}
