import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword,
  User as FirebaseUser,
  Auth,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  Timestamp,
  addDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface User {
  id: string; // Firebase Auth UID
  email: string;
  name: string;
  role: "admin" | "employee";
  collector_name?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  requires_password_reset?: boolean;
  migrated_from_custom_auth?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  name: string;
  role: "admin" | "employee";
  collector_name?: string;
  assigned_areas?: string[];
}

class AuthService {
  private auth: Auth;
  private currentUser: User | null = null;
  private authStateListeners: ((user: User | null) => void)[] = [];
  private isInitialized = false;

  constructor() {
    this.auth = getAuth();
    this.initializeAuthStateListener();
  }

  /**
   * Initialize auth state listener
   */
  private initializeAuthStateListener(): void {
    onAuthStateChanged(this.auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // User signed in, fetch user data from Firestore
          const user = await this.loadUserData(firebaseUser);
          this.setCurrentUser(user);
        } catch (error) {
          console.error("Failed to load user data:", error);

          // If user document doesn't exist, try to create it
          if (
            error instanceof Error &&
            error.message.includes("User profile not found")
          ) {
            console.log("🔧 User document missing, attempting to create...");
            try {
              const newUser =
                await this.createUserDocumentForFirebaseUser(firebaseUser);
              this.setCurrentUser(newUser);
              console.log("✅ User document created successfully");
            } catch (createError) {
              console.error("❌ Failed to create user document:", createError);
              // Sign out the user if we can't create their document
              await this.signOut();
            }
          } else {
            // Sign out the user for other errors
            await this.signOut();
          }
        }
      } else {
        // User signed out
        this.setCurrentUser(null);
      }

      if (!this.isInitialized) {
        this.isInitialized = true;
      }
    });
  }

  /**
   * Login with email and password (Firebase Auth)
   */
  async login(credentials: LoginCredentials): Promise<User> {
    try {
      console.log("🔐 Attempting Firebase Auth login...");

      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(
        this.auth,
        credentials.email,
        credentials.password,
      );

      console.log("✅ Firebase Auth successful, loading user data...");

      // Load user data from Firestore
      let user: User;
      try {
        user = await this.loadUserData(userCredential.user);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("User profile not found")
        ) {
          console.log("🔧 User document missing, creating it now...");
          user = await this.createUserDocumentForFirebaseUser(
            userCredential.user,
          );
          console.log("✅ User document created successfully");
        } else {
          throw error;
        }
      }

      // Check if user is active
      if (!user.is_active) {
        await this.signOut();
        throw new Error(
          "Account is deactivated. Please contact administrator.",
        );
      }

      console.log("✅ Login successful:", user.name);
      return user;
    } catch (error: any) {
      console.error("❌ Firebase Auth login failed:", error);

      // Provide helpful error messages
      if (error.code === "auth/user-not-found") {
        throw new Error("No account found with this email address.");
      } else if (error.code === "auth/wrong-password") {
        throw new Error("Incorrect password.");
      } else if (error.code === "auth/invalid-email") {
        throw new Error("Invalid email address.");
      } else if (error.code === "auth/too-many-requests") {
        throw new Error(
          "Too many failed login attempts. Please try again later.",
        );
      } else if (error.message?.includes("Account is deactivated")) {
        throw error; // Re-throw our custom deactivated message
      } else {
        throw new Error(error.message || "Login failed. Please try again.");
      }
    }
  }

  /**
   * Create user document for Firebase Auth user
   */
  private async createUserDocumentForFirebaseUser(
    firebaseUser: FirebaseUser,
  ): Promise<User> {
    try {
      console.log("🔨 Creating user document for:", firebaseUser.email);

      const userData = {
        email: firebaseUser.email || "",
        name: firebaseUser.email?.split("@")[0] || "User",
        role: "admin" as const, // Make new users admin by default for now
        is_active: true,
        requires_password_reset: false,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
        auto_created: true,
      };

      await setDoc(doc(db, "users", firebaseUser.uid), userData);

      const user: User = {
        id: firebaseUser.uid,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        is_active: userData.is_active,
        requires_password_reset: userData.requires_password_reset,
        created_at: userData.created_at.toDate(),
        updated_at: userData.updated_at.toDate(),
      };

      console.log("✅ User document created successfully");
      return user;
    } catch (error) {
      console.error("❌ Failed to create user document:", error);
      throw new Error(
        "Failed to create user profile. Please contact administrator.",
      );
    }
  }

  /**
   * Create new user account (admin only)
   */
  async createUser(userData: CreateUserData): Promise<User> {
    try {
      // Check if current user is admin
      if (!this.isAdmin()) {
        throw new Error("Only administrators can create user accounts");
      }

      console.log("👤 Creating new user account:", userData.email);

      // Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        userData.email,
        userData.password,
      );

      // Prepare user document data, filtering out undefined values
      const baseUserDoc = {
        email: userData.email,
        name: userData.name,
        role: userData.role,
        is_active: true,
        requires_password_reset: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Add optional fields only if they have values
      const userDoc: any = { ...baseUserDoc };

      // Handle collector_name for employees
      if (userData.role === "employee" && userData.collector_name) {
        userDoc.collector_name = userData.collector_name;
      }

      // Handle assigned_areas for employees (multi-area support)
      if (
        userData.role === "employee" &&
        userData.assigned_areas &&
        userData.assigned_areas.length > 0
      ) {
        userDoc.assigned_areas = userData.assigned_areas;
        // Set primary area as collector_name if not already set
        if (!userDoc.collector_name) {
          userDoc.collector_name = userData.assigned_areas[0];
        }
      }

      // Convert dates to Firestore timestamps
      const firestoreDoc = {
        ...userDoc,
        created_at: Timestamp.fromDate(userDoc.created_at),
        updated_at: Timestamp.fromDate(userDoc.updated_at),
      };

      console.log("📝 Saving user document:", firestoreDoc);

      await setDoc(doc(db, "users", userCredential.user.uid), firestoreDoc);

      console.log("✅ User account created successfully:", userData.name);

      return {
        id: userCredential.user.uid,
        ...userDoc,
      };
    } catch (error: any) {
      console.error("❌ Failed to create user:", error);

      if (error.code === "auth/email-already-in-use") {
        throw new Error("An account with this email already exists.");
      } else if (error.code === "auth/weak-password") {
        throw new Error("Password is too weak. Use at least 6 characters.");
      } else if (error.code === "auth/invalid-email") {
        throw new Error("Invalid email address.");
      } else {
        throw new Error(error.message || "Failed to create user account.");
      }
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(this.auth, email);
      console.log("✅ Password reset email sent to:", email);
    } catch (error: any) {
      console.error("❌ Failed to send password reset:", error);

      if (error.code === "auth/user-not-found") {
        throw new Error("No account found with this email address.");
      } else {
        throw new Error("Failed to send password reset email.");
      }
    }
  }

  /**
   * Update user password (current user only)
   */
  async updatePassword(newPassword: string): Promise<void> {
    try {
      if (!this.auth.currentUser) {
        throw new Error("No user signed in");
      }

      await updatePassword(this.auth.currentUser, newPassword);

      // Update requires_password_reset flag
      if (this.currentUser) {
        await updateDoc(doc(db, "users", this.currentUser.id), {
          requires_password_reset: false,
          updated_at: Timestamp.now(),
        });
      }

      console.log("✅ Password updated successfully");
    } catch (error: any) {
      console.error("❌ Failed to update password:", error);

      if (error.code === "auth/weak-password") {
        throw new Error("Password is too weak. Use at least 6 characters.");
      } else {
        throw new Error("Failed to update password.");
      }
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    try {
      await signOut(this.auth);
      console.log("✅ User signed out successfully");
    } catch (error) {
      console.error("❌ Sign out failed:", error);
      throw error;
    }
  }

  /**
   * For backward compatibility - alias for signOut
   */
  logout(): void {
    this.signOut().catch((error) => {
      console.error("Logout failed:", error);
    });
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Check if current user is admin
   */
  isAdmin(): boolean {
    return this.currentUser?.role === "admin" && this.currentUser?.is_active;
  }

  /**
   * Check if current user can access specific customer
   */
  canAccessCustomer(
    customerId: string,
    customerCollectorName?: string,
  ): boolean {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return false;

    // Admins can access all customers
    if (currentUser.role === "admin") return true;

    // Employees can only access customers assigned to them
    return currentUser.collector_name === customerCollectorName;
  }

  /**
   * Get all users/employees (admin only)
   */
  async getAllEmployees(): Promise<
    Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      is_active: boolean;
      collector_name?: string;
    }>
  > {
    try {
      if (!this.isAdmin()) {
        throw new Error("Only administrators can view all employees");
      }

      console.log("🔍 Fetching all users from Firestore...");

      const usersRef = collection(db, "users");
      const querySnapshot = await getDocs(usersRef);

      const employees: Array<{
        id: string;
        name: string;
        email: string;
        role: string;
        is_active: boolean;
        collector_name?: string;
      }> = [];

      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        employees.push({
          id: doc.id,
          name: userData.name || "Unknown User",
          email: userData.email || "",
          role: userData.role || "employee",
          is_active: userData.is_active !== false,
          collector_name: userData.collector_name,
        });
      });

      console.log(`✅ Found ${employees.length} users in system`);
      return employees;
    } catch (error) {
      console.error("❌ Failed to fetch employees:", error);
      throw error;
    }
  }

  /**
   * Alias for getAllEmployees for backward compatibility
   */
  async getAllUsers(): Promise<
    Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      is_active: boolean;
      collector_name?: string;
    }>
  > {
    return this.getAllEmployees();
  }

  /**
   * Update user information (admin only)
   */
  async updateUser(
    userId: string,
    updates: {
      name?: string;
      role?: "admin" | "employee";
      collector_name?: string;
      is_active?: boolean;
    },
  ): Promise<void> {
    try {
      if (!this.isAdmin()) {
        throw new Error("Only administrators can update users");
      }

      await updateDoc(doc(db, "users", userId), {
        ...updates,
        updated_at: Timestamp.now(),
      });

      console.log("✅ User updated successfully:", userId);
    } catch (error) {
      console.error("❌ Failed to update user:", error);
      throw error;
    }
  }

  /**
   * Delete user account (admin only)
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      if (!this.isAdmin()) {
        throw new Error("Only administrators can delete users");
      }

      // Prevent deletion of current user
      if (userId === this.currentUser?.id) {
        throw new Error("You cannot delete your own account");
      }

      // Delete user document from Firestore
      await deleteDoc(doc(db, "users", userId));

      // Note: Firebase Auth user will remain but won't be able to access the app
      // without a Firestore user document

      console.log("✅ User deleted successfully:", userId);
    } catch (error) {
      console.error("❌ Failed to delete user:", error);
      throw error;
    }
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    this.authStateListeners.push(callback);

    // Call immediately with current state
    callback(this.currentUser);

    // Return unsubscribe function
    return () => {
      const index = this.authStateListeners.indexOf(callback);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  /**
   * Check if auth is initialized
   */
  isAuthInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get Firebase Auth instance
   */
  getAuth(): Auth {
    return this.auth;
  }

  /**
   * Load user data from Firestore
   */
  private async loadUserData(firebaseUser: FirebaseUser): Promise<User> {
    try {
      const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));

      if (!userDoc.exists()) {
        throw new Error(
          "User profile not found. Please contact administrator to set up your account.",
        );
      }

      const userData = userDoc.data();
      return {
        id: firebaseUser.uid,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        collector_name: userData.collector_name,
        is_active: userData.is_active,
        created_at: userData.created_at.toDate(),
        updated_at: userData.updated_at.toDate(),
        requires_password_reset: userData.requires_password_reset,
        migrated_from_custom_auth: userData.migrated_from_custom_auth,
      };
    } catch (error) {
      console.error("Failed to load user data:", error);
      throw error;
    }
  }

  /**
   * Set current user and notify listeners
   */
  private setCurrentUser(user: User | null): void {
    this.currentUser = user;
    this.notifyAuthStateChange(user);
  }

  /**
   * Notify auth state change listeners
   */
  private notifyAuthStateChange(user: User | null): void {
    this.authStateListeners.forEach((callback) => callback(user));
  }

  /**
   * Seed default admin user (for backwards compatibility)
   */
  async seedDefaultAdmin(): Promise<void> {
    try {
      console.log("🌱 Checking for admin users...");

      // Check if any admin users exist
      const usersRef = collection(db, "users");
      const adminQuery = query(usersRef, where("role", "==", "admin"));
      const adminSnapshot = await getDocs(adminQuery);

      if (!adminSnapshot.empty) {
        console.log("✅ Admin users already exist, skipping seed");
        return;
      }

      console.log("⚠️ No admin users found");
      console.log(
        "💡 Please create an admin user manually or sign in with an existing Firebase Auth account",
      );
    } catch (error) {
      console.warn("Could not check for admin users:", error);
      // Don't throw error as this is optional
    }
  }
}

export const authService = new AuthService();
