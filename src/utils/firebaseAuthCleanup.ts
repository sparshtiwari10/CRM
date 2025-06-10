/**
 * Firebase Auth Cleanup Utilities
 * Browser console utilities to help identify orphaned Firebase Auth users
 */

import { getAuth, onAuthStateChanged } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const firebaseAuthCleanup = {
  /**
   * Get list of Firebase Auth users vs Firestore users for cleanup identification
   */
  async analyzeUsers() {
    try {
      console.log("🔍 Analyzing user accounts...");

      // Get all Firestore users
      const usersSnapshot = await getDocs(collection(db, "users"));
      const firestoreUsers = new Map();

      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        firestoreUsers.set(doc.id, {
          id: doc.id,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          is_active: userData.is_active,
        });
      });

      console.log("📊 Analysis Results:");
      console.log(`📄 Firestore users: ${firestoreUsers.size}`);

      console.log("\n📋 Firestore User List:");
      firestoreUsers.forEach((user) => {
        const status = user.is_active ? "🟢 Active" : "🔴 Inactive";
        console.log(`   ${status} ${user.email} (${user.role})`);
      });

      console.log("\n⚠️ Note: To see Firebase Auth users, go to:");
      console.log("   Firebase Console → Authentication → Users");
      console.log("   Compare emails with the list above");
      console.log("   Delete any Firebase Auth users not in Firestore list");

      return {
        firestoreUsers: Array.from(firestoreUsers.values()),
        firestoreCount: firestoreUsers.size,
      };
    } catch (error) {
      console.error("❌ Failed to analyze users:", error);
      throw error;
    }
  },

  /**
   * Check current Firebase Auth user
   */
  async getCurrentAuthUser() {
    const auth = getAuth();

    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();

        if (user) {
          console.log("👤 Current Firebase Auth User:");
          console.log(`   UID: ${user.uid}`);
          console.log(`   Email: ${user.email}`);
          console.log(`   Created: ${user.metadata.creationTime}`);
          console.log(`   Last Sign In: ${user.metadata.lastSignInTime}`);
          resolve(user);
        } else {
          console.log("❌ No authenticated user");
          resolve(null);
        }
      });
    });
  },

  /**
   * Get cleanup instructions
   */
  getCleanupInstructions() {
    console.log("🧹 Firebase Auth Cleanup Instructions:");
    console.log("\n1. Identify Orphaned Users:");
    console.log("   - Run firebaseAuthCleanup.analyzeUsers()");
    console.log("   - Note the Firestore user emails");
    console.log("\n2. Access Firebase Console:");
    console.log("   - Go to Firebase Console → Authentication → Users");
    console.log("   - Compare Firebase Auth users with Firestore list");
    console.log("\n3. Delete Orphaned Users:");
    console.log("   - Find Firebase Auth users NOT in Firestore");
    console.log("   - Click on each orphaned user");
    console.log("   - Select 'Delete user'");
    console.log("   - Confirm deletion");
    console.log("\n4. Verify Cleanup:");
    console.log("   - Refresh Firebase Console");
    console.log("   - Ensure only active users remain");
    console.log("\n⚠️ Important:");
    console.log("   - Never delete your own admin account");
    console.log("   - Double-check emails before deletion");
    console.log("   - Keep a backup list of deleted users");
  },

  /**
   * Generate cleanup report
   */
  async generateCleanupReport() {
    try {
      console.log("📋 Generating cleanup report...");

      const analysis = await this.analyzeUsers();
      const authUser = await this.getCurrentAuthUser();

      const report = {
        timestamp: new Date().toISOString(),
        currentAuthUser: authUser
          ? {
              uid: authUser.uid,
              email: authUser.email,
            }
          : null,
        firestoreUsers: analysis.firestoreUsers,
        summary: {
          firestoreUserCount: analysis.firestoreCount,
          activeUsers: analysis.firestoreUsers.filter((u) => u.is_active)
            .length,
          inactiveUsers: analysis.firestoreUsers.filter((u) => !u.is_active)
            .length,
          adminUsers: analysis.firestoreUsers.filter((u) => u.role === "admin")
            .length,
          employeeUsers: analysis.firestoreUsers.filter(
            (u) => u.role === "employee",
          ).length,
        },
        instructions: [
          "Go to Firebase Console → Authentication → Users",
          "Compare Firebase Auth emails with firestoreUsers list above",
          "Delete any Firebase Auth users NOT found in firestoreUsers",
          "Keep users that exist in both Firebase Auth and Firestore",
        ],
      };

      console.log("\n📊 Cleanup Report Generated:");
      console.log(JSON.stringify(report, null, 2));

      return report;
    } catch (error) {
      console.error("❌ Failed to generate report:", error);
      throw error;
    }
  },

  /**
   * Quick health check
   */
  async healthCheck() {
    try {
      console.log("🔍 Running Firebase Auth health check...");

      const authUser = await this.getCurrentAuthUser();

      if (!authUser) {
        console.log("❌ No authenticated user - please log in");
        return false;
      }

      // Check if current user has Firestore document
      const usersSnapshot = await getDocs(collection(db, "users"));
      let userFoundInFirestore = false;

      usersSnapshot.forEach((doc) => {
        if (doc.id === authUser.uid) {
          userFoundInFirestore = true;
          const userData = doc.data();
          console.log("✅ Current user found in Firestore:");
          console.log(`   Email: ${userData.email}`);
          console.log(`   Role: ${userData.role}`);
          console.log(`   Active: ${userData.is_active}`);
        }
      });

      if (!userFoundInFirestore) {
        console.log("⚠️ Warning: Current user not found in Firestore");
        console.log("   This may indicate a data consistency issue");
      }

      return userFoundInFirestore;
    } catch (error) {
      console.error("❌ Health check failed:", error);
      return false;
    }
  },
};

// Export to global scope for browser console access
if (typeof window !== "undefined") {
  (window as any).firebaseAuthCleanup = firebaseAuthCleanup;

  console.log("🔧 Firebase Auth Cleanup utilities loaded!");
  console.log("📋 Available commands:");
  console.log(
    "   firebaseAuthCleanup.analyzeUsers() - Compare Firestore vs Auth users",
  );
  console.log(
    "   firebaseAuthCleanup.getCurrentAuthUser() - Check current auth user",
  );
  console.log(
    "   firebaseAuthCleanup.getCleanupInstructions() - Show cleanup steps",
  );
  console.log(
    "   firebaseAuthCleanup.generateCleanupReport() - Generate full report",
  );
  console.log(
    "   firebaseAuthCleanup.healthCheck() - Quick system health check",
  );
}

export default firebaseAuthCleanup;
