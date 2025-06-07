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
  // Sign in with email and password
  static async signIn(credentials: LoginCredentials): Promise<User> {
    try {
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
      console.error("Sign in error:", error);

      // Handle specific Firebase errors
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
      await signOut(auth);
    } catch (error) {
      console.error("Sign out error:", error);
      throw new Error("Failed to sign out");
    }
  }

  // Listen to authentication state changes
  static onAuthStateChanged(callback: (user: User | null) => void): () => void {
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

  // Create new user (admin only)
  static async createUser(
    email: string,
    password: string,
    userData: Partial<User>,
  ): Promise<User> {
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

  // Update user data
  static async updateUser(
    userId: string,
    updates: Partial<User>,
  ): Promise<void> {
    try {
      await setDoc(doc(db, USERS_COLLECTION, userId), updates, { merge: true });
    } catch (error) {
      console.error("Update user error:", error);
      throw new Error("Failed to update user");
    }
  }

  // Get all users (admin only)
  static async getAllUsers(): Promise<User[]> {
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

  // Seed demo users for development
  static async seedDemoUsers(): Promise<void> {
    try {
      // Check if demo users already exist
      const usersRef = collection(db, USERS_COLLECTION);
      const q = query(usersRef, where("email", "==", "admin@cabletv.com"));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        // Create demo admin user
        const adminUser = await this.createUser(
          "admin@cabletv.com",
          "admin123",
          {
            name: "System Administrator",
            role: "admin",
            phone: "+1 (555) 000-0000",
          },
        );

        // Create demo employee users
        await this.createUser("john.collector@cabletv.com", "employee123", {
          name: "John Collector",
          role: "employee",
          phone: "+1 (555) 111-1111",
          assignedCustomers: ["customer1", "customer2"],
        });

        await this.createUser("sarah.collector@cabletv.com", "employee123", {
          name: "Sarah Collector",
          role: "employee",
          phone: "+1 (555) 222-2222",
          assignedCustomers: ["customer3", "customer4"],
        });

        console.log("Demo users created successfully");
      }
    } catch (error) {
      console.error("Error seeding demo users:", error);
    }
  }
}
