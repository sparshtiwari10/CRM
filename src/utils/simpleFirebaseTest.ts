import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export class SimpleFirebaseTest {
  /**
   * Simple Firebase connection and user document test
   */
  static async testConnection(): Promise<void> {
    console.log("🧪 Testing Firebase connection...");

    try {
      // Test 1: Check Firebase Auth
      const auth = getAuth();
      console.log(
        "✅ Firebase Auth:",
        auth ? "Initialized" : "Not initialized",
      );

      // Test 2: Check current user
      const currentUser = auth.currentUser;
      if (currentUser) {
        console.log("✅ Authenticated user:", currentUser.email);

        // Test 3: Check user document in Firestore
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log("✅ User document found:", {
              email: userData.email,
              role: userData.role,
              is_active: userData.is_active,
            });
          } else {
            console.log("❌ User document missing, creating it...");
            await this.createUserDocument(currentUser);
          }
        } catch (error) {
          console.error("❌ Firestore error:", error);
          throw error;
        }
      } else {
        console.log("❌ No authenticated user");
        console.log("🔧 Please sign in first");
      }
    } catch (error) {
      console.error("❌ Firebase test failed:", error);
      throw error;
    }
  }

  /**
   * Create user document for authenticated user
   */
  static async createUserDocument(user: any): Promise<void> {
    try {
      const userData = {
        email: user.email,
        name: user.email.split("@")[0], // Use email prefix as name
        role: "admin", // Make them admin by default
        is_active: true,
        requires_password_reset: false,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
        auto_created: true,
      };

      await setDoc(doc(db, "users", user.uid), userData);
      console.log("✅ User document created successfully");
    } catch (error) {
      console.error("❌ Failed to create user document:", error);
      throw error;
    }
  }

  /**
   * Listen for auth state changes
   */
  static listenForAuth(): Promise<any> {
    return new Promise((resolve) => {
      const auth = getAuth();

      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(user);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        unsubscribe();
        resolve(null);
      }, 5000);
    });
  }

  /**
   * Complete diagnostic
   */
  static async runDiagnostic(): Promise<void> {
    console.log("🔍 Running complete Firebase diagnostic...");
    console.log("=".repeat(50));

    try {
      // Wait for auth state
      console.log("1. Checking authentication state...");
      const user = await this.listenForAuth();

      if (user) {
        console.log("✅ User authenticated:", user.email);

        // Check user document
        console.log("2. Checking user document...");
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          console.log("❌ User document missing, creating...");
          await this.createUserDocument(user);
        } else {
          console.log("✅ User document exists");
        }

        console.log("3. Testing basic Firestore operations...");
        // Test a simple read operation
        await getDoc(userDocRef);
        console.log("✅ Firestore read operations working");

        console.log("🎉 All tests passed!");
      } else {
        console.log("❌ No user authenticated");
        console.log("💡 Please sign in with your Firebase Auth credentials");
      }
    } catch (error) {
      console.error("❌ Diagnostic failed:", error);

      // Provide specific help based on error
      if (error instanceof Error) {
        if (error.message.includes("permission")) {
          console.log("🔧 Permission error detected");
          console.log("📋 Solutions:");
          console.log("1. Check Firestore rules are deployed");
          console.log("2. Ensure user document exists");
          console.log("3. Verify user has correct role");
        }
      }
    }

    console.log("=".repeat(50));
  }
}

// Make available globally
if (typeof window !== "undefined") {
  (window as any).SimpleFirebaseTest = SimpleFirebaseTest;
  (window as any).testFirebase = () => SimpleFirebaseTest.runDiagnostic();
}

export default SimpleFirebaseTest;
