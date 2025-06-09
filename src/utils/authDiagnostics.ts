import { authService } from "@/services/authService";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  limit,
} from "firebase/firestore";

export class AuthDiagnostics {
  /**
   * Run comprehensive authentication and permission diagnostics
   */
  static async runCompleteDiagnostics() {
    console.group("🔍 AGV Cable TV - Complete Authentication Diagnostics");
    console.log("=====================================");

    try {
      // Step 1: Check authentication status
      console.log("1️⃣ AUTHENTICATION STATUS");
      console.log("========================");

      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        console.log("✅ User is authenticated");
        console.log("📋 User details:", {
          id: currentUser.id,
          name: currentUser.name,
          role: currentUser.role,
          isActive: currentUser.is_active,
          email: currentUser.email,
        });
      } else {
        console.error("❌ User is NOT authenticated");
        console.log("🔧 Solution: Log in to the application first");
        return;
      }

      // Step 2: Check Firebase Auth user
      console.log("\n2️⃣ FIREBASE AUTH USER");
      console.log("====================");

      // Check if Firebase auth is available
      if (typeof window !== "undefined" && (window as any).firebase?.auth) {
        const firebaseUser = (window as any).firebase.auth().currentUser;
        if (firebaseUser) {
          console.log("✅ Firebase Auth user exists");
          console.log("📋 Firebase user:", {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            emailVerified: firebaseUser.emailVerified,
          });
        } else {
          console.error("❌ No Firebase Auth user found");
        }
      } else {
        console.log("ℹ️ Firebase Auth not accessible from this context");
      }

      // Step 3: Check Firestore user document
      console.log("\n3️⃣ FIRESTORE USER DOCUMENT");
      console.log("==========================");

      try {
        const userDocRef = doc(db, "users", currentUser.id);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          console.log("✅ User document exists in Firestore");
          console.log("📋 Document data:", userDoc.data());

          const userData = userDoc.data();
          if (userData.role === "admin") {
            console.log("✅ User has admin role");
          } else {
            console.warn("⚠️ User role is:", userData.role);
          }

          if (userData.is_active === true) {
            console.log("✅ User is active");
          } else {
            console.warn("⚠️ User is_active:", userData.is_active);
          }
        } else {
          console.error("❌ User document does NOT exist in Firestore");
          console.log("🔧 Solution: Create user document manually");
          console.log("📝 Document structure needed:");
          console.log({
            collection: "users",
            documentId: currentUser.id,
            fields: {
              name: "Your Name",
              email: "your-email@example.com",
              role: "admin",
              is_active: true,
              created_at: new Date().toISOString(),
            },
          });
        }
      } catch (error) {
        console.error("❌ Error checking user document:", error);
      }

      // Step 4: Test collection access
      console.log("\n4️⃣ COLLECTION ACCESS TEST");
      console.log("=========================");

      const collections = [
        { name: "users", required: true },
        { name: "packages", required: false },
        { name: "customers", required: false },
      ];

      for (const coll of collections) {
        try {
          const collRef = collection(db, coll.name);
          const testQuery = query(collRef, limit(1));
          const snapshot = await getDocs(testQuery);

          console.log(
            `✅ ${coll.name}: Accessible (${snapshot.size} documents)`,
          );

          if (snapshot.size === 0 && coll.required) {
            console.warn(`⚠️ ${coll.name} collection is empty`);
          }
        } catch (error) {
          console.error(`❌ ${coll.name}: Permission denied`);
          console.error(`   Error: ${(error as Error).message}`);
        }
      }

      // Step 5: Provide specific recommendations
      console.log("\n5️⃣ RECOMMENDATIONS");
      console.log("==================");

      if (!currentUser) {
        console.log("🔧 1. Log in to the application");
        return;
      }

      try {
        const userDocRef = doc(db, "users", currentUser.id);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          console.log("🔧 1. CREATE USER DOCUMENT (CRITICAL):");
          console.log("   - Go to Firebase Console");
          console.log("   - Navigate to Firestore Database");
          console.log("   - Create collection: 'users'");
          console.log(`   - Create document with ID: '${currentUser.id}'`);
          console.log("   - Add these fields:");
          console.log("     • name (string): 'Your Full Name'");
          console.log("     • email (string): 'your-email@example.com'");
          console.log("     • role (string): 'admin'");
          console.log("     • is_active (boolean): true");
          console.log(
            "     • created_at (string): '" + new Date().toISOString() + "'",
          );
        } else {
          const userData = userDoc.data();
          if (userData.role !== "admin") {
            console.log("🔧 1. Update user role to 'admin' in Firestore");
          }
          if (userData.is_active !== true) {
            console.log("🔧 2. Set is_active to true in Firestore");
          }
        }
      } catch (error) {
        console.log("🔧 1. Fix Firestore permissions first");
      }

      console.log("🔧 2. Deploy Firestore rules:");
      console.log("   firebase deploy --only firestore:rules");

      console.log("🔧 3. Clear browser cache and refresh");
    } catch (error) {
      console.error("❌ Diagnostics failed:", error);
    }

    console.log("=====================================");
    console.groupEnd();
  }

  /**
   * Quick permission test for specific operation
   */
  static async testSpecificPermission(
    collection: string,
    operation: string = "read",
  ) {
    console.group(`🧪 Testing ${operation} permission on ${collection}`);

    try {
      const collRef = collection(db, collection);
      const testQuery = query(collRef, limit(1));
      const snapshot = await getDocs(testQuery);

      console.log(`✅ Success: Can ${operation} ${collection} collection`);
      console.log(`📊 Found ${snapshot.size} documents`);
    } catch (error) {
      console.error(`❌ Failed: Cannot ${operation} ${collection} collection`);
      console.error("Error:", (error as Error).message);
    }

    console.groupEnd();
  }

  /**
   * Generate user document creation instructions
   */
  static generateUserDocumentInstructions() {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      console.error("❌ No user authenticated - cannot generate instructions");
      return;
    }

    console.group("📝 User Document Creation Instructions");
    console.log("=====================================");

    console.log("1. Go to Firebase Console:");
    console.log("   https://console.firebase.google.com");

    console.log("\n2. Navigate to your project > Firestore Database");

    console.log("\n3. Create/Update user document:");
    console.log(`   Collection: users`);
    console.log(`   Document ID: ${currentUser.id}`);

    console.log("\n4. Add these exact fields:");
    console.table({
      name: { type: "string", value: "Your Full Name Here" },
      email: { type: "string", value: "your-email@example.com" },
      role: { type: "string", value: "admin" },
      is_active: { type: "boolean", value: true },
      created_at: { type: "string", value: new Date().toISOString() },
    });

    console.log("\n5. Save the document");
    console.log("\n6. Refresh your application");
    console.log(
      "\n7. Test again with AuthDiagnostics.runCompleteDiagnostics()",
    );

    console.groupEnd();
  }
}

// Make available globally for easy debugging
if (typeof window !== "undefined") {
  (window as any).AuthDiagnostics = AuthDiagnostics;
}
