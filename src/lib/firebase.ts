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

try {
  console.log("🔄 Initializing Firebase...");
  console.log(`📊 Project ID: ${firebaseConfig.projectId}`);

  app = initializeApp(firebaseConfig);

  // Initialize Firestore with settings for better connectivity
  // This helps with network issues, corporate firewalls, and connection problems
  try {
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true, // Better for restrictive networks
      useFetchStreams: false, // Helps with firewall/proxy issues
    });
    console.log(
      "🔧 Firestore initialized with long polling for better connectivity",
    );
  } catch (initError) {
    // Fallback to regular initialization if the experimental settings fail
    console.warn(
      "⚠️ Long polling initialization failed, trying standard initialization",
    );
    db = getFirestore(app);
  }

  isFirebaseAvailable = true;

  // Connect to Firestore emulator in development if available
  if (import.meta.env.DEV) {
    try {
      // Only try to connect emulator if we're in development and haven't connected yet
      connectFirestoreEmulator(db, "localhost", 8080);
      console.log("🔗 Connected to Firestore emulator");
    } catch (error) {
      // Emulator already connected or not available - this is fine
      console.log("📡 Using production Firestore with enhanced connectivity");
    }
  }

  console.log("✅ Firebase initialized successfully");
  console.log("🔗 Firestore connection established with network optimizations");
} catch (error: any) {
  console.error("❌ Firebase initialization failed:", error);
  console.log("🔄 Falling back to demo mode with mock data");

  // Provide specific troubleshooting based on error type
  if (
    error.code === "unavailable" ||
    error.message.includes("Connection failed")
  ) {
    console.log("🌐 Network connectivity issue detected");
    console.log("💡 Possible solutions:");
    console.log("   • Check your internet connection");
    console.log("   • Disable VPN/proxy temporarily");
    console.log("   • Check if firewall is blocking Firebase domains");
    console.log("   • Verify Firebase project is active and billing is set up");
  } else {
    console.log("💡 Check your .env file and Firebase project settings");
  }

  isFirebaseAvailable = false;
  // Set db to null - we'll handle this in the services
  db = null;
}

export { db, isFirebaseAvailable };
export default app;
