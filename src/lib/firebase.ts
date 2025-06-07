import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

// Firebase config - using demo values that will fall back to mock auth
// To use real Firebase, replace these with your actual Firebase config
const firebaseConfig = {
  apiKey: "demo-api-key",
  authDomain: "demo-project.firebaseapp.com",
  projectId: "demo-project",
  storageBucket: "demo-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456",
};

// Initialize Firebase
let app: any;
let auth: any;
let db: any;
let functions: any;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  functions = getFunctions(app);

  console.log("Firebase initialized with demo configuration");
  console.log(
    "📝 To use real Firebase, update the config in src/lib/firebase.ts",
  );
  console.log("📖 See FIREBASE_SETUP.md for detailed setup instructions");
} catch (error) {
  console.warn(
    "Firebase initialization failed, mock authentication will be used:",
    error,
  );

  // Create minimal mock objects to prevent errors
  auth = {
    currentUser: null,
    onAuthStateChanged: () => () => {},
    signInWithEmailAndPassword: () =>
      Promise.reject(new Error("Firebase not available")),
    signOut: () => Promise.reject(new Error("Firebase not available")),
  };

  db = {
    collection: () => ({
      get: () => Promise.reject(new Error("Firebase not available")),
    }),
  };

  functions = {};
}

export { auth, db, functions };
export default app;
