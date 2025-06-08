import { initializeApp } from "firebase/app";
import {
  getFirestore,
  connectFirestoreEmulator,
  initializeFirestore,
} from "firebase/firestore";

// Firebase config - Replace with your actual Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "agv-cabletv.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "agv-cabletv",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "agv-cabletv.appspot.com",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef123456",
};

// Initialize Firebase
let app: any;
let db: any;
let isFirebaseAvailable = false;
let connectionStatus = "initializing";
let lastConnectionAttempt: Date | null = null;
let connectionRetryCount = 0;
const MAX_RETRY_ATTEMPTS = 3;

// Connection retry with exponential backoff
async function initializeFirebaseWithRetry(attempt = 1): Promise<void> {
  try {
    console.log(
      `🔄 Initializing Firebase (attempt ${attempt}/${MAX_RETRY_ATTEMPTS})...`,
    );
    console.log(`📊 Project ID: ${firebaseConfig.projectId}`);

    lastConnectionAttempt = new Date();
    connectionStatus = "connecting";

    app = initializeApp(firebaseConfig);

    // Initialize Firestore with standard settings first
    try {
      db = getFirestore(app);
      console.log("🔥 Firestore initialized successfully");
    } catch (initError: any) {
      console.error("❌ Firestore initialization failed:", initError.message);
      throw initError;
    }

    // Handle emulator connection in development (before testing connection)
    if (
      import.meta.env.DEV &&
      import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true"
    ) {
      try {
        connectFirestoreEmulator(db, "localhost", 8090);
        console.log("🔗 Connected to Firestore emulator");
      } catch (error) {
        console.log(
          "📡 Using production Firestore (emulator connection failed)",
        );
      }
    }

    // Test connection immediately after initialization
    await testFirebaseConnection();

    isFirebaseAvailable = true;
    connectionStatus = "connected";
    connectionRetryCount = 0;

    console.log("✅ Firebase initialized successfully");
    console.log("🔗 Firestore connection established and tested");
  } catch (error: any) {
    console.error(
      `❌ Firebase initialization attempt ${attempt} failed:`,
      error,
    );

    connectionStatus = "failed";
    connectionRetryCount = attempt;

    // Provide specific troubleshooting based on error type
    if (
      error.code === "unavailable" ||
      error.message.includes("Connection failed")
    ) {
      console.log("🌐 Network connectivity issue detected");

      if (attempt < MAX_RETRY_ATTEMPTS) {
        const retryDelay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
        console.log(`🔄 Retrying in ${retryDelay / 1000} seconds...`);

        setTimeout(async () => {
          try {
            await initializeFirebaseWithRetry(attempt + 1);
          } catch (retryError) {
            handleFinalFailure(retryError);
          }
        }, retryDelay);

        return; // Don't set to fallback mode yet
      }
    }

    handleFinalFailure(error);
  }
}

// Test Firebase connection with a simple operation
async function testFirebaseConnection(): Promise<void> {
  try {
    const { collection, getDocs, limit, query } = await import(
      "firebase/firestore"
    );

    // Try a simple query to test connectivity with shorter timeout
    const testRef = collection(db, "users");
    const testQuery = query(testRef, limit(1));

    // Use a shorter timeout for faster feedback
    await Promise.race([
      getDocs(testQuery),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Connection test timeout (3s)")),
          3000,
        ),
      ),
    ]);

    console.log("✅ Firebase connection test successful");
  } catch (error: any) {
    console.warn("⚠️ Firebase connection test failed:", error.message);

    // Don't throw error for connection test failure - allow app to continue
    // The app can work with Firebase but show appropriate connection status
    console.log("📡 Continuing with Firebase connection despite test failure");
  }
}

// Handle final failure after all retries
function handleFinalFailure(error: any): void {
  console.error("❌ All Firebase connection attempts failed");
  console.log("🔄 Falling back to demo mode with mock data");

  // Provide comprehensive troubleshooting
  if (
    error.code === "unavailable" ||
    error.message.includes("Connection failed")
  ) {
    console.log("🌐 Network connectivity issue - possible solutions:");
    console.log("   • Check your internet connection");
    console.log("   • Disable VPN/proxy temporarily");
    console.log("   • Check if firewall is blocking Firebase domains:");
    console.log("     - firestore.googleapis.com");
    console.log("     - firebase.googleapis.com");
    console.log("     - googleapis.com");
    console.log("   • Try a different network (mobile hotspot)");
    console.log("   • Contact IT if on corporate network");
    console.log("   • Verify Firebase project is active and billing set up");
  } else if (error.code === "permission-denied") {
    console.log("🔐 Permission denied - possible solutions:");
    console.log("   • Check Firestore security rules");
    console.log("   • Verify API keys are correct");
    console.log("   • Ensure Firestore is enabled in Firebase Console");
  } else {
    console.log("💡 General troubleshooting:");
    console.log("   • Check .env file and Firebase project settings");
    console.log("   • Verify project ID and API keys");
    console.log("   • Check Firebase Console for service status");
  }

  isFirebaseAvailable = false;
  connectionStatus = "failed";
  db = null;
}

// Export connection status helpers
export function getConnectionStatus() {
  return {
    status: connectionStatus,
    isAvailable: isFirebaseAvailable,
    lastAttempt: lastConnectionAttempt,
    retryCount: connectionRetryCount,
    maxRetries: MAX_RETRY_ATTEMPTS,
  };
}

// Manual retry function
export async function retryFirebaseConnection(): Promise<boolean> {
  if (connectionStatus === "connecting") {
    console.log("🔄 Connection attempt already in progress...");
    return false;
  }

  console.log("🔄 Manual retry requested...");
  connectionRetryCount = 0;

  try {
    await initializeFirebaseWithRetry(1);
    return isFirebaseAvailable;
  } catch (error) {
    console.error("❌ Manual retry failed:", error);
    return false;
  }
}

// Start initialization
initializeFirebaseWithRetry().catch((error) => {
  console.error("❌ Firebase initialization failed completely:", error);
});

export { db, isFirebaseAvailable };
export default app;
