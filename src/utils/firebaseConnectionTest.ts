import { db, isFirebaseAvailable } from "@/lib/firebase";
import {
  connectFirestoreEmulator,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  limit,
} from "firebase/firestore";

export class FirebaseConnectionTest {
  /**
   * Comprehensive Firebase connection and configuration test
   */
  static async runConnectionDiagnostics() {
    console.group("🔥 Firebase Connection Diagnostics");
    console.log("=====================================");

    try {
      // Step 1: Check Firebase availability
      console.log("1️⃣ FIREBASE AVAILABILITY");
      console.log("========================");

      console.log("isFirebaseAvailable:", isFirebaseAvailable);
      console.log("db object exists:", !!db);

      if (!db) {
        console.error("❌ Firebase database not initialized");
        console.log("🔧 Check Firebase configuration in src/lib/firebase.ts");
        return false;
      }

      console.log("✅ Firebase database object exists");

      // Step 2: Check Firebase configuration
      console.log("\n2️⃣ FIREBASE CONFIGURATION");
      console.log("==========================");

      try {
        const app = db.app;
        console.log("✅ Firebase app exists");
        console.log("📋 App name:", app.name);
        console.log("📋 App options:", {
          projectId: app.options.projectId,
          authDomain: app.options.authDomain,
          // Don't log sensitive data
        });
      } catch (error) {
        console.error("❌ Firebase app configuration error:", error);
      }

      // Step 3: Test basic Firestore connection
      console.log("\n3️⃣ FIRESTORE CONNECTION TEST");
      console.log("=============================");

      try {
        // Try to create a reference to test connection
        const testRef = collection(db, "test_connection");
        console.log("✅ Can create collection reference");

        // Try a simple query with short timeout
        const testQuery = query(testRef, limit(1));
        console.log("✅ Can create query");

        // This is the critical test - actual network request
        const snapshot = await Promise.race([
          getDocs(testQuery),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Connection timeout")), 5000),
          ),
        ]);

        console.log("✅ Firestore connection successful");
        console.log("📊 Query returned:", (snapshot as any).size, "documents");
      } catch (error) {
        console.error("❌ Firestore connection failed:", error);
        console.log("🔧 Possible causes:");
        console.log("   - Firebase project not configured");
        console.log("   - Network connectivity issues");
        console.log("   - Firebase services down");
        console.log("   - Firestore not enabled in project");
        return false;
      }

      // Step 4: Test authentication state
      console.log("\n4️⃣ AUTHENTICATION STATE");
      console.log("========================");

      try {
        // Check if Firebase Auth is available
        if (typeof window !== "undefined" && (window as any).firebase?.auth) {
          const auth = (window as any).firebase.auth();
          const currentUser = auth.currentUser;

          if (currentUser) {
            console.log("✅ User is authenticated");
            console.log("📋 User UID:", currentUser.uid);
            console.log("📋 User email:", currentUser.email);
          } else {
            console.warn("⚠️ No authenticated user");
            console.log("🔧 Try logging in first");
          }
        } else {
          console.log("ℹ️ Firebase Auth not accessible from this context");
        }
      } catch (error) {
        console.error("❌ Authentication check failed:", error);
      }

      // Step 5: Test specific collections
      console.log("\n5️⃣ COLLECTION ACCESS TEST");
      console.log("==========================");

      const testCollections = ["users", "packages", "customers", "billing"];

      for (const collName of testCollections) {
        try {
          const collRef = collection(db, collName);
          const testQuery = query(collRef, limit(1));

          const snapshot = await Promise.race([
            getDocs(testQuery),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Timeout")), 3000),
            ),
          ]);

          console.log(
            `✅ ${collName}: Accessible (${(snapshot as any).size} docs)`,
          );
        } catch (error) {
          console.error(`❌ ${collName}: Failed -`, (error as Error).message);
        }
      }

      // Step 6: Environment checks
      console.log("\n6️⃣ ENVIRONMENT CHECKS");
      console.log("======================");

      console.log("Environment:", import.meta.env.MODE);
      console.log("Dev server:", import.meta.env.DEV);
      console.log("Firebase project ID:", db.app.options.projectId);

      // Check for emulator
      try {
        console.log("Checking for Firestore emulator...");
        // This would throw if not connected to emulator
        const emulatorCheck =
          db._delegate?._databaseId || db._delegate?.settings;
        console.log("Database settings:", emulatorCheck);
      } catch (error) {
        console.log("Not using Firestore emulator (normal for production)");
      }

      console.log("\n✅ CONNECTION DIAGNOSTICS COMPLETE");
      return true;
    } catch (error) {
      console.error("❌ Diagnostics failed:", error);
      return false;
    } finally {
      console.log("=====================================");
      console.groupEnd();
    }
  }

  /**
   * Quick connection test with immediate result
   */
  static async quickConnectionTest(): Promise<boolean> {
    try {
      if (!db) return false;

      const testRef = collection(db, "connection_test");
      const testQuery = query(testRef, limit(1));

      await Promise.race([
        getDocs(testQuery),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Quick test timeout")), 2000),
        ),
      ]);

      return true;
    } catch (error) {
      console.error("Quick connection test failed:", error);
      return false;
    }
  }

  /**
   * Test specific collection access
   */
  static async testCollectionAccess(collectionName: string): Promise<boolean> {
    try {
      if (!db) return false;

      const collRef = collection(db, collectionName);
      const testQuery = query(collRef, limit(1));

      await getDocs(testQuery);
      console.log(`✅ ${collectionName} collection accessible`);
      return true;
    } catch (error) {
      console.error(`❌ ${collectionName} collection failed:`, error);
      return false;
    }
  }

  /**
   * Generate fix recommendations based on connection state
   */
  static async generateFixRecommendations() {
    console.group("🔧 Fix Recommendations");

    const isConnected = await this.quickConnectionTest();

    if (!isConnected) {
      console.log("🚨 CRITICAL: Firebase connection failed");
      console.log("");
      console.log("IMMEDIATE ACTIONS:");
      console.log("1. Check Firebase project configuration");
      console.log("2. Verify Firestore is enabled in Firebase Console");
      console.log("3. Check network connectivity");
      console.log("4. Deploy ultra-simple rules:");
      console.log("   firebase deploy --only firestore:rules");
      console.log("");
      console.log("5. Check Firebase Console for project status:");
      console.log("   https://console.firebase.google.com");
    } else {
      console.log("✅ Firebase connection working");
      console.log("");
      console.log("LIKELY CAUSES OF PERMISSION ERRORS:");
      console.log("1. Complex Firestore security rules");
      console.log("2. Missing user documents");
      console.log("3. Authentication state issues");
      console.log("");
      console.log("SOLUTIONS:");
      console.log("1. Deploy simple rules (already provided)");
      console.log("2. Create admin user document");
      console.log("3. Verify authentication");
    }

    console.groupEnd();
  }
}

// Make available globally
if (typeof window !== "undefined") {
  (window as any).FirebaseConnectionTest = FirebaseConnectionTest;
}
