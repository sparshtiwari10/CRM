import { db, isFirebaseAvailable } from "@/lib/firebase";
import { collection, getDocs, query, limit } from "firebase/firestore";

/**
 * Test Firebase connection and return detailed status
 */
export async function testFirebaseConnection(): Promise<{
  isConnected: boolean;
  hasUsers: boolean;
  userCount: number;
  error?: string;
  suggestion?: string;
}> {
  try {
    if (!isFirebaseAvailable || !db) {
      return {
        isConnected: false,
        hasUsers: false,
        userCount: 0,
        error: "Firebase not initialized",
        suggestion: "Check Firebase configuration and network connection",
      };
    }

    // Test basic connectivity
    const usersRef = collection(db, "users");
    const testQuery = query(usersRef, limit(50));

    // Test with timeout
    const result = await Promise.race([
      getDocs(testQuery),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Connection timeout")), 8000),
      ),
    ]);

    const querySnapshot = result as any;
    const userCount = querySnapshot.size;

    console.log(`🔍 Firebase test: Found ${userCount} users`);

    if (userCount === 0) {
      return {
        isConnected: true,
        hasUsers: false,
        userCount: 0,
        suggestion:
          "Firebase is connected but no users found. Create employee accounts in Employee Management.",
      };
    }

    return {
      isConnected: true,
      hasUsers: true,
      userCount,
    };
  } catch (error: any) {
    console.error("Firebase connection test failed:", error);

    let suggestion = "Check Firebase configuration";
    if (error.message.includes("timeout")) {
      suggestion = "Network timeout - check internet connection or try again";
    } else if (error.message.includes("permission")) {
      suggestion = "Permission denied - check Firestore security rules";
    } else if (error.message.includes("unavailable")) {
      suggestion =
        "Firebase service unavailable - check network or Firebase status";
    }

    return {
      isConnected: false,
      hasUsers: false,
      userCount: 0,
      error: error.message,
      suggestion,
    };
  }
}

/**
 * Get a user-friendly status message for Firebase connection
 */
export function getFirebaseStatusMessage(connectionTest: {
  isConnected: boolean;
  hasUsers: boolean;
  userCount: number;
  error?: string;
  suggestion?: string;
}): string {
  if (!connectionTest.isConnected) {
    return `❌ Firebase Offline: ${connectionTest.error || "Connection failed"}`;
  }

  if (!connectionTest.hasUsers) {
    return "⚠️ Firebase Connected - No employees found. Create accounts in Employee Management.";
  }

  return `✅ Firebase Connected - ${connectionTest.userCount} users found`;
}
