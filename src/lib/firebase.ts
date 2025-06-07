import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

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
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  isFirebaseAvailable = true;

  // Connect to Firestore emulator in development if available
  if (import.meta.env.DEV) {
    try {
      // Only try to connect emulator if we're in development and haven't connected yet
      connectFirestoreEmulator(db, "localhost", 8080);
      console.log("🔗 Connected to Firestore emulator");
    } catch (error) {
      // Emulator already connected or not available - this is fine
      console.log(
        "📡 Using production Firestore or emulator already connected",
      );
    }
  }

  console.log("✅ Firebase initialized successfully");
  console.log(`📊 Project ID: ${firebaseConfig.projectId}`);
} catch (error) {
  console.error("❌ Firebase initialization failed:", error);
  console.log("🔄 Falling back to demo mode with mock data");

  isFirebaseAvailable = false;
  // Set db to null - we'll handle this in the services
  db = null;
}

export { db, isFirebaseAvailable };
export default app;
