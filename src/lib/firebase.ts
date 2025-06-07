import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

// Your Firebase config object
// In production, these should be environment variables
const firebaseConfig = {
  apiKey: "demo-api-key",
  authDomain: "cabletv-dashboard.firebaseapp.com",
  projectId: "cabletv-dashboard",
  storageBucket: "cabletv-dashboard.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// For development - connect to emulators if running locally
if (import.meta.env.DEV) {
  try {
    // Only connect to emulators if not already connected
    if (!auth.config.emulator) {
      connectAuthEmulator(auth, "http://localhost:9099");
    }
    // Note: Firestore emulator connection should be done before any other Firestore operations
    if (!db._delegate._databaseId.projectId.includes("demo-")) {
      connectFirestoreEmulator(db, "localhost", 8080);
    }
    if (!functions.customDomain) {
      connectFunctionsEmulator(functions, "localhost", 5001);
    }
  } catch (error) {
    // Emulators might already be connected, ignore the error
    console.log("Firebase emulators already connected or not available");
  }
}

export default app;
