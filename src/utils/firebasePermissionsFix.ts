import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  limit,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export class FirebasePermissionsFix {
  private static auth = getAuth();

  /**
   * Comprehensive Firebase permissions diagnostic and fix
   */
  static async diagnoseAndFix(): Promise<void> {
    console.log("🚨 Firebase Permissions Diagnostic Started");
    console.log("=".repeat(50));

    try {
      // Step 1: Check authentication state
      const authResult = await this.checkAuthState();

      if (!authResult.isAuthenticated) {
        console.log("❌ User not authenticated - this is the main issue");
        await this.createEmergencyAdminUser();
        return;
      }

      // Step 2: Check user document exists
      const userDocResult = await this.checkUserDocument(authResult.user!);

      if (!userDocResult.exists) {
        console.log("❌ User document missing - creating it now");
        await this.createUserDocument(authResult.user!);
      }

      // Step 3: Test basic permissions
      await this.testBasicPermissions();

      // Step 4: Test specific collections
      await this.testCollectionPermissions();

      console.log("✅ Diagnostic complete!");
    } catch (error) {
      console.error("❌ Diagnostic failed:", error);
      console.log("🔧 Applying emergency fixes...");
      await this.applyEmergencyFixes();
    }
  }

  /**
   * Check current authentication state
   */
  private static async checkAuthState(): Promise<{
    isAuthenticated: boolean;
    user?: any;
    uid?: string;
  }> {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(this.auth, (user) => {
        unsubscribe();

        if (user) {
          console.log("✅ User is authenticated:", {
            uid: user.uid,
            email: user.email,
            emailVerified: user.emailVerified,
          });

          resolve({
            isAuthenticated: true,
            user: user,
            uid: user.uid,
          });
        } else {
          console.log("❌ No authenticated user found");
          resolve({ isAuthenticated: false });
        }
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        unsubscribe();
        resolve({ isAuthenticated: false });
      }, 5000);
    });
  }

  /**
   * Check if user document exists in Firestore
   */
  private static async checkUserDocument(user: any): Promise<{
    exists: boolean;
    data?: any;
  }> {
    try {
      console.log("🔍 Checking user document for UID:", user.uid);

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log("✅ User document exists:", {
          role: userData.role,
          is_active: userData.is_active,
          email: userData.email,
        });

        return {
          exists: true,
          data: userData,
        };
      } else {
        console.log("❌ User document does not exist in /users/" + user.uid);
        return { exists: false };
      }
    } catch (error) {
      console.error("❌ Error checking user document:", error);
      return { exists: false };
    }
  }

  /**
   * Create user document for authenticated user
   */
  private static async createUserDocument(user: any): Promise<void> {
    try {
      console.log("🔧 Creating user document for:", user.email);

      const userData = {
        email: user.email,
        name: user.email.split("@")[0], // Use email prefix as name
        role: "admin", // Make them admin to fix permissions
        is_active: true,
        requires_password_reset: false,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
        emergency_created: true,
      };

      await setDoc(doc(db, "users", user.uid), userData);

      console.log("✅ User document created successfully");
    } catch (error) {
      console.error("❌ Failed to create user document:", error);
      throw error;
    }
  }

  /**
   * Test basic Firestore permissions
   */
  private static async testBasicPermissions(): Promise<void> {
    try {
      console.log("🧪 Testing basic Firestore permissions...");

      // Test reading users collection
      const usersRef = collection(db, "users");
      const usersQuery = query(usersRef, limit(1));
      const usersSnapshot = await getDocs(usersQuery);

      console.log(
        "✅ Users collection accessible:",
        usersSnapshot.size,
        "documents",
      );
    } catch (error) {
      console.error("❌ Basic permissions test failed:", error);
      throw error;
    }
  }

  /**
   * Test specific collection permissions
   */
  private static async testCollectionPermissions(): Promise<void> {
    const collections = ["packages", "customers", "billing", "requests"];

    for (const collectionName of collections) {
      try {
        console.log(`🧪 Testing ${collectionName} collection...`);

        const collectionRef = collection(db, collectionName);
        const testQuery = query(collectionRef, limit(1));
        const snapshot = await getDocs(testQuery);

        console.log(
          `✅ ${collectionName}: ${snapshot.size} documents accessible`,
        );
      } catch (error) {
        console.error(`❌ ${collectionName}: Permission denied`);
      }
    }
  }

  /**
   * Create emergency admin user if no authentication exists
   */
  private static async createEmergencyAdminUser(): Promise<void> {
    try {
      console.log("🚨 Creating emergency admin user...");

      // Import Firebase Auth functions
      const { createUserWithEmailAndPassword } = await import("firebase/auth");

      const emergencyEmail = "admin@agvcabletv.com";
      const emergencyPassword = "admin123";

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        emergencyEmail,
        emergencyPassword,
      );

      // Create user document
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email: emergencyEmail,
        name: "Emergency Admin",
        role: "admin",
        is_active: true,
        requires_password_reset: true,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
        emergency_created: true,
      });

      console.log("✅ Emergency admin created successfully");
      console.log("📧 Email:", emergencyEmail);
      console.log("🔑 Password:", emergencyPassword);
      console.log("⚠️ Please sign in with these credentials");
    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") {
        console.log("✅ Emergency admin already exists");
        console.log("📧 Try signing in with: admin@agvcabletv.com");
        console.log("🔑 Password: admin123");
      } else {
        console.error("❌ Failed to create emergency admin:", error);
      }
    }
  }

  /**
   * Apply emergency fixes for common permission issues
   */
  private static async applyEmergencyFixes(): Promise<void> {
    console.log("🔧 Applying emergency fixes...");

    try {
      // Fix 1: Try to create a test document to verify write permissions
      await this.testWritePermissions();

      // Fix 2: Check and fix Firebase configuration
      await this.checkFirebaseConfig();

      // Fix 3: Provide step-by-step instructions
      this.showManualFixInstructions();
    } catch (error) {
      console.error("❌ Emergency fixes failed:", error);
      this.showManualFixInstructions();
    }
  }

  /**
   * Test write permissions
   */
  private static async testWritePermissions(): Promise<void> {
    try {
      const testDoc = doc(db, "test", "permission-test");
      await setDoc(testDoc, {
        test: true,
        timestamp: Timestamp.now(),
      });

      console.log("✅ Write permissions working");
    } catch (error) {
      console.error("❌ Write permissions failed:", error);
      throw error;
    }
  }

  /**
   * Check Firebase configuration
   */
  private static async checkFirebaseConfig(): Promise<void> {
    console.log("🔍 Checking Firebase configuration...");

    if (!db) {
      console.error("❌ Firestore database not initialized");
      return;
    }

    if (!this.auth) {
      console.error("❌ Firebase Auth not initialized");
      return;
    }

    console.log("✅ Firebase services initialized correctly");
  }

  /**
   * Show manual fix instructions
   */
  private static showManualFixInstructions(): void {
    console.log("");
    console.log("🚨 MANUAL FIX REQUIRED");
    console.log("=".repeat(40));
    console.log("1. Go to Firebase Console → Firestore → Rules");
    console.log("2. Replace current rules with these TEMPORARY debug rules:");
    console.log("");
    console.log("rules_version = '2';");
    console.log("service cloud.firestore {");
    console.log("  match /databases/{database}/documents {");
    console.log("    match /{document=**} {");
    console.log("      allow read, write: if request.auth != null;");
    console.log("    }");
    console.log("  }");
    console.log("}");
    console.log("");
    console.log("3. Click 'Publish' to deploy the rules");
    console.log("4. Refresh the page and try again");
    console.log("5. Once working, we'll implement proper security rules");
    console.log("");
    console.log("⚠️ These are TEMPORARY rules for debugging only!");
  }

  /**
   * Quick fix method that can be called from anywhere
   */
  static async quickFix(): Promise<void> {
    console.log("⚡ Running quick Firebase permissions fix...");

    try {
      await this.diagnoseAndFix();
    } catch (error) {
      console.error("❌ Quick fix failed:", error);
      this.showManualFixInstructions();
    }
  }
}

// Make available globally for console access
if (typeof window !== "undefined") {
  (window as any).FirebasePermissionsFix = FirebasePermissionsFix;
  (window as any).quickFixFirebase = () => FirebasePermissionsFix.quickFix();
}

export default FirebasePermissionsFix;
