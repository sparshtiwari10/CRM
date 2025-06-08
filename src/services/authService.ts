import { db, isFirebaseAvailable } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import bcrypt from "bcryptjs";

// Minimal mock users for absolute fallback only (demo mode)
const mockUsers = [
  {
    id: "admin-demo",
    username: "admin",
    password_hash:
      "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj85/2hHxtIy", // admin123
    name: "System Administrator (Demo)",
    role: "admin" as const,
    collector_name: null,
    access_scope: [],
    created_at: new Date("2024-01-01"),
    last_login: new Date(),
    is_active: true,
  },
  {
    id: "employee-demo",
    username: "employee",
    password_hash:
      "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj85/2hHxtIy", // employee123
    name: "Demo Employee",
    role: "employee" as const,
    collector_name: "Demo Employee",
    access_scope: [],
    created_at: new Date("2024-01-01"),
    last_login: new Date(),
    is_active: true,
  },
];

export interface User {
  id: string;
  name: string;
  role: "admin" | "employee";
  collector_name?: string | null;
  access_scope?: string[];
  email?: string;
  avatar?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

class AuthService {
  private currentUser: User | null = null;

  constructor() {
    // Check for existing session on initialization
    this.loadUserFromStorage();
  }

  /**
   * Authenticate user with custom credentials
   */
  async login(credentials: LoginCredentials): Promise<User> {
    try {
      if (isFirebaseAvailable && db) {
        // Try Firebase with a quick timeout, fallback to mock on any issue
        try {
          return await this.loginWithFirebaseTimeout(credentials);
        } catch (firebaseError: any) {
          console.warn(
            "Firebase login failed, falling back to mock authentication:",
            firebaseError.message,
          );
          return await this.loginWithMockData(credentials);
        }
      } else {
        // Use mock data when Firebase is unavailable
        return await this.loginWithMockData(credentials);
      }
    } catch (error) {
      console.error("❌ Login failed:", error);
      throw error;
    }
  }

  /**
   * Test Firebase connectivity quickly
   */
  private async testFirebaseConnectivity(): Promise<boolean> {
    try {
      // Try a simple query to test if Firebase is accessible
      const usersRef = collection(db, "users");
      const testQuery = query(usersRef);
      await getDocs(testQuery);
      return true;
    } catch (error: any) {
      console.warn("Firebase connectivity test failed:", error.message);
      return false;
    }
  }

  /**
   * Login with Firebase with timeout
   */
  private async loginWithFirebaseTimeout(
    credentials: LoginCredentials,
  ): Promise<User> {
    // First do a quick connectivity test
    const isConnected = await Promise.race([
      this.testFirebaseConnectivity(),
      new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), 1000); // 1 second timeout for connectivity test
      }),
    ]);

    if (!isConnected) {
      throw new Error("Firebase connection test failed - using demo mode");
    }

    return new Promise((resolve, reject) => {
      // Set a 5-second timeout for actual login
      const timeoutId = setTimeout(() => {
        reject(new Error("Firebase authentication timeout - using demo mode"));
      }, 5000);

      this.loginWithFirebase(credentials)
        .then((user) => {
          clearTimeout(timeoutId);
          resolve(user);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Login with Firebase
   */
  private async loginWithFirebase(
    credentials: LoginCredentials,
  ): Promise<User> {
    try {
      // Query users collection for matching username
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", credentials.username));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("Invalid username or password");
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      // Verify password
      const isValidPassword = await bcrypt.compare(
        credentials.password,
        userData.password_hash,
      );

      if (!isValidPassword) {
        throw new Error("Invalid username or password");
      }

      // Check if user is active
      if (!userData.is_active) {
        throw new Error(
          "Account is deactivated. Please contact administrator.",
        );
      }

      // Update last login
      await updateDoc(doc(db, "users", userDoc.id), {
        last_login: Timestamp.now(),
      });

      const user: User = {
        id: userDoc.id,
        name: userData.name,
        role: userData.role,
        collector_name: userData.collector_name,
        access_scope: userData.access_scope || [],
        email: userData.email,
        avatar: userData.avatar,
      };

      this.currentUser = user;
      this.saveUserToStorage(user);

      console.log("✅ Firebase authentication successful:", user.name);
      return user;
    } catch (error: any) {
      console.error("❌ Firebase authentication failed:", error.message);
      throw error;
    }
  }

  /**
   * Login with mock data (fallback)
   */
  private async loginWithMockData(
    credentials: LoginCredentials,
  ): Promise<User> {
    // Find user in mock data
    const mockUser = mockUsers.find(
      (user) => user.username === credentials.username,
    );

    if (!mockUser) {
      throw new Error("Invalid username or password");
    }

    // Verify password (simple comparison for demo)
    const isValidPassword = await bcrypt.compare(
      credentials.password,
      mockUser.password_hash,
    );

    if (!isValidPassword) {
      throw new Error("Invalid username or password");
    }

    if (!mockUser.is_active) {
      throw new Error("Account is deactivated. Please contact administrator.");
    }

    const user: User = {
      id: mockUser.id,
      name: mockUser.name,
      role: mockUser.role,
      collector_name: mockUser.collector_name,
      access_scope: mockUser.access_scope,
    };

    this.currentUser = user;
    this.saveUserToStorage(user);

    console.log("✅ Mock authentication successful:", user.name);
    return user;
  }

  /**
   * Logout current user
   */
  logout(): void {
    this.currentUser = null;
    localStorage.removeItem("agv_user");
    console.log("✅ User logged out successfully");
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
    return this.currentUser?.role === "admin";
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
   * Get all employees for admin purposes - PRIORITIZES FIREBASE DATA
   * Only falls back to mock data in demo mode or complete Firebase failure
   */
  async getAllEmployees(): Promise<
    Array<{ id: string; name: string; role: string }>
  > {
    console.log(
      "🔍 Fetching employees from Firebase (prioritizing real data)...",
    );

    try {
      // Always try Firebase first, regardless of isFirebaseAvailable flag
      if (db) {
        console.log("📡 Connecting to Firebase users collection...");

        // Set a reasonable timeout for the query
        const usersRef = collection(db, "users");
        const queryPromise = getDocs(usersRef);

        // Race against timeout
        const result = await Promise.race([
          queryPromise,
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Firebase query timeout")),
              10000,
            ),
          ),
        ]);

        const querySnapshot = result as any;
        const employees: Array<{ id: string; name: string; role: string }> = [];

        console.log(`📊 Found ${querySnapshot.size} total users in Firebase`);

        querySnapshot.forEach((doc: any) => {
          const userData = doc.data();
          const userName = userData.name || userData.username || "Unknown User";
          const userRole = userData.role || "employee";

          console.log(
            `👤 Processing user: ${userName} (${userRole}) - Active: ${userData.is_active !== false}`,
          );

          // Include all active users (both admin and employee)
          if (userData.is_active !== false) {
            employees.push({
              id: doc.id,
              name: userName,
              role: userRole,
            });
          }
        });

        console.log(
          `✅ Successfully fetched ${employees.length} REAL employees from Firebase:`,
        );
        employees.forEach((emp) =>
          console.log(`   - ${emp.name} (${emp.role})`),
        );

        if (employees.length === 0) {
          console.warn(
            "⚠️ No active employees found in Firebase. You may need to create employee accounts.",
          );
          console.log(
            "💡 Tip: Use the Employee Management page to create new employee accounts",
          );
        }

        return employees;
      } else {
        throw new Error("Firebase database not initialized");
      }
    } catch (error: any) {
      console.error(
        "❌ Failed to fetch employees from Firebase:",
        error.message,
      );

      // Check if this is truly a connection issue or if Firebase is working but empty
      if (
        error.message.includes("timeout") ||
        error.message.includes("unavailable")
      ) {
        console.log("🌐 Network/connection issue detected");
      }

      // Only use mock data if specifically in demo mode OR if Firebase is completely unavailable
      if (!isFirebaseAvailable || error.message.includes("demo")) {
        console.log("🎭 Falling back to demo employees (mock data)");
        return mockUsers.map((user) => ({
          id: user.id,
          name: user.name,
          role: user.role,
        }));
      }

      // For other Firebase errors, return empty array to encourage creating real accounts
      console.warn(
        "🚫 Returning empty employee list - please create employee accounts in Firebase",
      );
      console.log("💡 Go to Employee Management to create new employees");
      return [];
    }
  }

  /**
   * Alias for getAllEmployees for backward compatibility
   */
  async getAllUsers(): Promise<
    Array<{ id: string; name: string; role: string }>
  > {
    return this.getAllEmployees();
  }

  /**
   * Save user to localStorage
   */
  private saveUserToStorage(user: User): void {
    try {
      localStorage.setItem("agv_user", JSON.stringify(user));
    } catch (error) {
      console.warn("Failed to save user to localStorage:", error);
    }
  }

  /**
   * Load user from localStorage
   */
  private loadUserFromStorage(): void {
    try {
      const storedUser = localStorage.getItem("agv_user");
      if (storedUser) {
        this.currentUser = JSON.parse(storedUser);
        console.log("✅ Restored user session:", this.currentUser?.name);
      }
    } catch (error) {
      console.warn("Failed to load user from localStorage:", error);
      localStorage.removeItem("agv_user");
    }
  }

  /**
   * Create a new user (admin only)
   */
  async createUser(userData: {
    username: string;
    password: string;
    name: string;
    role: "admin" | "employee";
    collector_name?: string;
    email?: string;
  }): Promise<string> {
    try {
      if (!this.isAdmin()) {
        throw new Error("Only administrators can create users");
      }

      if (!isFirebaseAvailable || !db) {
        throw new Error("Firebase not available for user creation");
      }

      // Hash password
      const password_hash = await bcrypt.hash(userData.password, 12);

      // Create user document
      const usersRef = collection(db, "users");
      const docRef = await addDoc(usersRef, {
        username: userData.username,
        password_hash,
        name: userData.name,
        role: userData.role,
        collector_name: userData.collector_name || null,
        email: userData.email || null,
        access_scope: [],
        created_at: Timestamp.now(),
        is_active: true,
      });

      console.log("✅ User created successfully:", userData.name);
      return docRef.id;
    } catch (error) {
      console.error("❌ Failed to create user:", error);
      throw error;
    }
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
      email?: string;
      is_active?: boolean;
    },
  ): Promise<void> {
    try {
      if (!this.isAdmin()) {
        throw new Error("Only administrators can update users");
      }

      if (!isFirebaseAvailable || !db) {
        throw new Error("Firebase not available for user updates");
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
}

export const authService = new AuthService();
