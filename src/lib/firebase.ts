import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

// Firebase config - Replace with your actual Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain:
    process.env.VITE_FIREBASE_AUTH_DOMAIN || "agv-cabletv.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "agv-cabletv",
  storageBucket:
    process.env.VITE_FIREBASE_STORAGE_BUCKET || "agv-cabletv.appspot.com",
  messagingSenderId:
    process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef123456",
};

// Initialize Firebase
let app: any;
let db: any;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);

  // Connect to Firestore emulator in development if available
  if (import.meta.env.DEV && !db._delegate._databaseId.includes("(default)")) {
    try {
      connectFirestoreEmulator(db, "localhost", 8080);
    } catch (error) {
      // Emulator already connected or not available
      console.log("Firestore emulator connection attempted");
    }
  }

  console.log("✅ Firebase initialized successfully");
  console.log(`📊 Project ID: ${firebaseConfig.projectId}`);
} catch (error) {
  console.error("❌ Firebase initialization failed:", error);

  // Create minimal mock objects to prevent errors
  db = {
    collection: () => ({
      get: () => Promise.reject(new Error("Firebase not available")),
      add: () => Promise.reject(new Error("Firebase not available")),
      doc: () => ({
        get: () => Promise.reject(new Error("Firebase not available")),
        set: () => Promise.reject(new Error("Firebase not available")),
        update: () => Promise.reject(new Error("Firebase not available")),
        delete: () => Promise.reject(new Error("Firebase not available")),
      }),
    }),
  };
}

export { db };
export default app;
