import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { User, LoginCredentials } from "@/types/auth";

const USERS_COLLECTION = "users";

// Mock users for fallback when Firebase is not available
const MOCK_USERS = [
  {
    id: "admin-1",
    email: "admin@cabletv.com",
    phone: "+1 (555) 000-0000",
    name: "System Administrator",
    role: "admin" as const,
    isActive: true,
    createdAt: "2024-01-01",
    lastLogin: new Date().toISOString(),
    assignedCustomers: [],
  },
  {
    id: "emp-1",
    email: "john.collector@cabletv.com",
    phone: "+1 (555) 111-1111",
    name: "John Collector",
    role: "employee" as const,
    isActive: true,
    createdAt: "2024-01-01",
    assignedCustomers: ["1", "2", "5"],
  },
  {
    id: "emp-2",
    email: "sarah.collector@cabletv.com",
    phone: "+1 (555) 222-2222",
    name: "Sarah Collector",
    role: "employee" as const,
    isActive: true,
    createdAt: "2024-01-01",
    assignedCustomers: ["3", "4", "6"],
  },
];

// Mock credentials for fallback
const MOCK_CREDENTIALS = [
  { email: "admin@cabletv.com", password: "admin123" },
  { email: "john.collector@cabletv.com", password: "employee123" },
  { email: "sarah.collector@cabletv.com", password: "employee123" },
];

// Check if Firebase is available
let isFirebaseAvailable = true;
let mockCurrentUser: User | null = null;

// Convert Firebase user + Firestore data to our User type
const convertToUser = (firebaseUser: FirebaseUser, userData: any): User => {
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email || "",
    phone: userData.phone || "",
    name: userData.name || firebaseUser.displayName || "",
    role: userData.role || "employee",
    isActive: userData.isActive !== false,
    createdAt: userData.createdAt || new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    assignedCustomers: userData.assignedCustomers || [],
  };
};

export class AuthService {
  // Check Firebase availability
  private static async checkFirebaseAvailability(): Promise<boolean> {
    try {
      // Check if Firebase config has valid values
      if (!auth ||
          !auth.config ||
          auth.config.apiKey === 'demo-api-key' ||
          auth.config.projectId === 'demo-project') {
        console.warn('Demo Firebase configuration detected, using mock authentication');
        isFirebaseAvailable = false;
        return false;
      }

      // Try a simple Firebase operation with shorter timeout
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout')), 2000);

        // Try to get current auth state
        const unsubscribe = onAuthStateChanged(auth,
          () => {
            clearTimeout(timeout);
            unsubscribe();
            resolve(true);
          },
          (error) => {
            clearTimeout(timeout);
            unsubscribe();
            reject(error);
          }
        );
      });

      return true;
    } catch (error: any) {
      console.warn('Firebase not available, falling back to mock authentication:', error.message);
      isFirebaseAvailable = false;
      return false;
    }
  }
  }

  // Mock authentication
  private static async mockSignIn(
    credentials: LoginCredentials,
  ): Promise<User> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const validCredential = MOCK_CREDENTIALS.find(
      (cred) =>
        cred.email === credentials.email &&
        cred.password === credentials.password,
    );

    if (!validCredential) {
      throw new Error("Invalid email or password");
    }

    const user = MOCK_USERS.find((u) => u.email === credentials.email);
    if (!user) {
      throw new Error("User not found");
    }

    mockCurrentUser = { ...user, lastLogin: new Date().toISOString() };
    localStorage.setItem("cabletv_mock_user", JSON.stringify(mockCurrentUser));

    return mockCurrentUser;
  }

  // Sign in with email and password
  static async signIn(credentials: LoginCredentials): Promise<User> {
    try {
      // Check if Firebase is available first
      if (!isFirebaseAvailable) {
        // First time check
        const available = await this.checkFirebaseAvailability();
        if (!available) {
          return await this.mockSignIn(credentials);
        }
      }

      const userCredential = await signInWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password,
      );

      // Get additional user data from Firestore
      const userDoc = await getDoc(
        doc(db, USERS_COLLECTION, userCredential.user.uid),
      );
      const userData = userDoc.exists() ? userDoc.data() : {};

      // Update last login
      await setDoc(
        doc(db, USERS_COLLECTION, userCredential.user.uid),
        { ...userData, lastLogin: new Date().toISOString() },
        { merge: true },
      );

      return convertToUser(userCredential.user, userData);
    } catch (error: any) {
      console.error("Firebase sign in error:", error);

      // If network error or Firebase unavailable, fall back to mock
      if (
        error.code === "auth/network-request-failed" ||
        error.code === "auth/too-many-requests" ||
        !isFirebaseAvailable
      ) {
        console.log("Falling back to mock authentication");
        isFirebaseAvailable = false;
        return await this.mockSignIn(credentials);
      }

      // Handle other Firebase errors
      switch (error.code) {
        case "auth/user-not-found":
        case "auth/wrong-password":
          throw new Error("Invalid email or password");
        case "auth/user-disabled":
          throw new Error("Account has been disabled");
        case "auth/too-many-requests":
          throw new Error("Too many failed attempts. Please try again later");
        default:
          throw new Error("Failed to sign in. Please try again");
      }
    }
  }

  // Sign out
  static async signOut(): Promise<void> {
    try {
      if (isFirebaseAvailable) {
        await signOut(auth);
      } else {
        // Mock sign out
        mockCurrentUser = null;
        localStorage.removeItem("cabletv_mock_user");
      }
    } catch (error) {
      console.error("Sign out error:", error);
      // Even if Firebase sign out fails, clear local state
      mockCurrentUser = null;
      localStorage.removeItem("cabletv_mock_user");
    }
  }

  // Listen to authentication state changes
  static onAuthStateChanged(callback: (user: User | null) => void): () => void {
    if (!isFirebaseAvailable) {
      // Mock state listener
      const storedUser = localStorage.getItem("cabletv_mock_user");
      if (storedUser) {
        try {
          mockCurrentUser = JSON.parse(storedUser);
          callback(mockCurrentUser);
        } catch (error) {
          localStorage.removeItem("cabletv_mock_user");
          callback(null);
        }
      } else {
        callback(null);
      }

      // Return empty unsubscribe function
      return () => {};
    }

    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(
            doc(db, USERS_COLLECTION, firebaseUser.uid),
          );
          const userData = userDoc.exists() ? userDoc.data() : {};
          const user = convertToUser(firebaseUser, userData);
          callback(user);
        } catch (error) {
          console.error("Error fetching user data:", error);
          callback(null);
        }
      } else {
        callback(null);
      }
    });
  }

  // Get current user
  static async getCurrentUser(): Promise<User | null> {
    if (!isFirebaseAvailable) {
      return mockCurrentUser;
    }

    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;

    try {
      const userDoc = await getDoc(doc(db, USERS_COLLECTION, firebaseUser.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};
      return convertToUser(firebaseUser, userData);
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  }

  // Create new user (admin only) - Only works with Firebase
  static async createUser(
    email: string,
    password: string,
    userData: Partial<User>,
  ): Promise<User> {
    if (!isFirebaseAvailable) {
      throw new Error(
        "User creation requires Firebase. Please set up Firebase configuration.",
      );
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );

      // Store additional user data in Firestore
      const userDocData = {
        email,
        name: userData.name || "",
        phone: userData.phone || "",
        role: userData.role || "employee",
        isActive: userData.isActive !== false,
        createdAt: new Date().toISOString(),
        assignedCustomers: userData.assignedCustomers || [],
      };

      await setDoc(
        doc(db, USERS_COLLECTION, userCredential.user.uid),
        userDocData,
      );

      return convertToUser(userCredential.user, userDocData);
    } catch (error: any) {
      console.error("Create user error:", error);

      switch (error.code) {
        case "auth/email-already-in-use":
          throw new Error("Email address is already in use");
        case "auth/weak-password":
          throw new Error("Password should be at least 6 characters");
        case "auth/invalid-email":
          throw new Error("Invalid email address");
        default:
          throw new Error("Failed to create user");
      }
    }
  }

  // Update user data - Only works with Firebase
  static async updateUser(
    userId: string,
    updates: Partial<User>,
  ): Promise<void> {
    if (!isFirebaseAvailable) {
      throw new Error(
        "User updates require Firebase. Please set up Firebase configuration.",
      );
    }

    try {
      await setDoc(doc(db, USERS_COLLECTION, userId), updates, { merge: true });
    } catch (error) {
      console.error("Update user error:", error);
      throw new Error("Failed to update user");
    }
  }

  // Get all users (admin only) - Only works with Firebase
  static async getAllUsers(): Promise<User[]> {
    if (!isFirebaseAvailable) {
      return MOCK_USERS;
    }

    try {
      const usersRef = collection(db, USERS_COLLECTION);
      const snapshot = await getDocs(usersRef);

      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          email: data.email,
          phone: data.phone || "",
          name: data.name,
          role: data.role,
          isActive: data.isActive,
          createdAt: data.createdAt,
          lastLogin: data.lastLogin,
          assignedCustomers: data.assignedCustomers || [],
        } as User;
      });
    } catch (error) {
      console.error("Get all users error:", error);
      throw new Error("Failed to fetch users");
    }
  }

  // Check if Firebase is available
  static getFirebaseStatus(): boolean {
    return isFirebaseAvailable;
  }

  // Initialize service
  static async initialize(): Promise<void> {
    try {
      await this.checkFirebaseAvailability();
      if (!isFirebaseAvailable) {
        // Load mock user from localStorage
        const storedUser = localStorage.getItem("cabletv_mock_user");
        if (storedUser) {
          try {
            mockCurrentUser = JSON.parse(storedUser);
          } catch (error) {
            localStorage.removeItem("cabletv_mock_user");
          }
        }
      }
    } catch (error) {
      console.warn("Firebase initialization failed, using mock authentication");
      isFirebaseAvailable = false;
    }
  }
}