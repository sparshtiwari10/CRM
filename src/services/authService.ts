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

// Mock users for demo mode when Firebase is unavailable
const mockUsers = [
  {
    id: "admin-demo",
    username: "admin",
    password_hash:
      "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj85/2hHxtIy", // admin123
    name: "System Administrator",
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
      "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj85/2hHxtIy", // employee123 (same hash for demo)
    name: "Demo Employee",
    role: "employee" as const,
    collector_name: "John Collector",
    access_scope: [],
    created_at: new Date("2024-01-01"),
    last_login: new Date(),
    is_active: true,
  },
];

export interface User {
  id: string;
  username: string;
  name: string;
  role: "admin" | "employee";
  access_scope?: string[]; // For employees: list of customer IDs or collector names they can access
  collector_name?: string; // For employees: their collector name
  created_at: Date;
  last_login?: Date;
  is_active: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface CreateUserData {
  username: string;
  password: string;
  name: string;
  role: "admin" | "employee";
  collector_name?: string;
  access_scope?: string[];
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
  private async loginWithFirebaseTimeout(credentials: LoginCredentials): Promise<User> {
    // First do a quick connectivity test
    const isConnected = await Promise.race([
      this.testFirebaseConnectivity(),
      new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), 1000); // 1 second timeout for connectivity test
      })
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
      const isPasswordValid = await bcrypt.compare(
        credentials.password,
        userData.password_hash,
      );

      if (!isPasswordValid) {
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

      // Create user object
      const user: User = {
        id: userDoc.id,
        username: userData.username,
        name: userData.name,
        role: userData.role,
        access_scope: userData.access_scope || [],
        collector_name: userData.collector_name,
        created_at: userData.created_at.toDate(),
        last_login: new Date(),
        is_active: userData.is_active,
      };

      // Store user in session
      this.currentUser = user;
      this.saveUserToStorage(user);

      console.log(
        `✅ User ${user.name} logged in successfully as ${user.role} (Firebase)`,
      );
      return user;
    } catch (error: any) {
      // Handle specific Firebase errors
      if (
        error.code === "permission-denied" ||
        error.message.includes("PERMISSION_DENIED")
      ) {
        console.error(
          "Firebase permission denied - falling back to mock authentication",
        );
        // Fall back to mock authentication if Firebase permissions aren't set up
        return await this.loginWithMockData(credentials);
      }
      throw error;
    }
  }

  /**
   * Login with mock data (when Firebase is unavailable)
   */
  private async loginWithMockData(
    credentials: LoginCredentials,
  ): Promise<User> {
    // Find user in mock data
    const mockUser = mockUsers.find((u) => u.username === credentials.username);

    if (!mockUser) {
      throw new Error("Invalid username or password");
    }

    // Verify password (for demo, we'll accept both hashed and plain passwords)
    const isPasswordValid =
      (credentials.password === "admin123" &&
        credentials.username === "admin") ||
      (credentials.password === "employee123" &&
        credentials.username === "employee") ||
      (await bcrypt.compare(credentials.password, mockUser.password_hash));

    if (!isPasswordValid) {
      throw new Error("Invalid username or password");
    }

    // Check if user is active
    if (!mockUser.is_active) {
      throw new Error("Account is deactivated. Please contact administrator.");
    }

    // Create user object
    const user: User = {
      id: mockUser.id,
      username: mockUser.username,
      name: mockUser.name,
      role: mockUser.role,
      access_scope: mockUser.access_scope || [],
      collector_name: mockUser.collector_name,
      created_at: mockUser.created_at,
      last_login: new Date(),
      is_active: mockUser.is_active,
    };

    // Store user in session
    this.currentUser = user;
    this.saveUserToStorage(user);

    console.log(
      `✅ User ${user.name} logged in successfully as ${user.role} (Demo Mode)`,
    );
    return user;
  }

  /**
   * Logout current user
   */
  logout(): void {
    this.currentUser = null;
    this.clearUserFromStorage();
    console.log("✅ User logged out successfully");
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null;
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
    if (!this.currentUser) return false;

    // Admins can access all customers
    if (this.currentUser.role === "admin") return true;

    // Employees can only access customers assigned to them
    if (this.currentUser.role === "employee") {
      // Check by collector name
      if (customerCollectorName && this.currentUser.collector_name) {
        return customerCollectorName === this.currentUser.collector_name;
      }

      // Check by access scope (customer IDs)
      if (this.currentUser.access_scope?.includes(customerId)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Create new user (Admin only)
   */
  async createUser(userData: CreateUserData): Promise<User> {
    if (!this.isAdmin()) {
      throw new Error("Only administrators can create users");
    }

    if (!isFirebaseAvailable || !db) {
      throw new Error("User creation is not available in demo mode");
    }

    try {
      // Check if username already exists
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", userData.username));
      const existingUser = await getDocs(q);

      if (!existingUser.empty) {
        throw new Error("Username already exists");
      }

      // Hash password
      const saltRounds = 12;
      const password_hash = await bcrypt.hash(userData.password, saltRounds);

      // Create user document
      const newUserData = {
        username: userData.username,
        password_hash,
        name: userData.name,
        role: userData.role,
        collector_name: userData.collector_name || null,
        access_scope: userData.access_scope || [],
        created_at: Timestamp.now(),
        is_active: true,
      };

      const docRef = await addDoc(usersRef, newUserData);

      const user: User = {
        id: docRef.id,
        username: userData.username,
        name: userData.name,
        role: userData.role,
        access_scope: userData.access_scope || [],
        collector_name: userData.collector_name,
        created_at: new Date(),
        is_active: true,
      };

      console.log(`✅ User ${user.name} created successfully`);
      return user;
    } catch (error) {
      console.error("❌ User creation failed:", error);
      throw error;
    }
  }

  /**
   * Get all users (Admin only)
   */
  async getAllUsers(): Promise<User[]> {
    if (!this.isAdmin()) {
      throw new Error("Only administrators can view all users");
    }

    if (!isFirebaseAvailable || !db) {
      // Return mock users in demo mode
      return mockUsers.map((mockUser) => ({
        id: mockUser.id,
        username: mockUser.username,
        name: mockUser.name,
        role: mockUser.role,
        access_scope: mockUser.access_scope || [],
        collector_name: mockUser.collector_name,
        created_at: mockUser.created_at,
        last_login: mockUser.last_login,
        is_active: mockUser.is_active,
      }));
    }

    try {
      const usersRef = collection(db, "users");
      const querySnapshot = await getDocs(usersRef);

      const users: User[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        users.push({
          id: doc.id,
          username: data.username,
          name: data.name,
          role: data.role,
          access_scope: data.access_scope || [],
          collector_name: data.collector_name,
          created_at: data.created_at.toDate(),
          last_login: data.last_login?.toDate(),
          is_active: data.is_active,
        });
      });

      return users;
    } catch (error) {
      console.error("❌ Failed to get users:", error);
      throw error;
    }
  }

  /**
   * Save user to local storage
   */
  private saveUserToStorage(user: User): void {
    try {
      localStorage.setItem(
        "agv_user",
        JSON.stringify({
          ...user,
          created_at: user.created_at.toISOString(),
          last_login: user.last_login?.toISOString(),
        }),
      );
    } catch (error) {
      console.warn("Failed to save user to storage:", error);
    }
  }

  /**
   * Load user from local storage
   */
  private loadUserFromStorage(): void {
    try {
      const storedUser = localStorage.getItem("agv_user");
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        this.currentUser = {
          ...userData,
          created_at: new Date(userData.created_at),
          last_login: userData.last_login
            ? new Date(userData.last_login)
            : undefined,
        };
      }
    } catch (error) {
      console.warn("Failed to load user from storage:", error);
      this.clearUserFromStorage();
    }
  }

  /**
   * Clear user from local storage
   */
  private clearUserFromStorage(): void {
    try {
      localStorage.removeItem("agv_user");
    } catch (error) {
      console.warn("Failed to clear user from storage:", error);
    }
  }

  /**
   * Seed default admin user (for initial setup)
   */
  async seedDefaultAdmin(): Promise<void> {
    if (!isFirebaseAvailable || !db) {
      console.log("🔄 Firebase not available, using mock admin user");
      return;
    }

    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("role", "==", "admin"));
      const adminUsers = await getDocs(q);

      if (adminUsers.empty) {
        console.log("🌱 Creating default admin user...");

        const saltRounds = 12;
        const password_hash = await bcrypt.hash("admin123", saltRounds);

        await addDoc(usersRef, {
          username: "admin",
          password_hash,
          name: "System Administrator",
          role: "admin",
          collector_name: null,
          access_scope: [],
          created_at: Timestamp.now(),
          is_active: true,
        });

        console.log(
          "✅ Default admin user created (username: admin, password: admin123)",
        );
      }
    } catch (error) {
      console.error("❌ Failed to seed default admin:", error);
    }
  }

  /**
   * Static method to seed demo users (for DataSeeder)
   */
  static async seedDemoUsers(): Promise<void> {
    if (!isFirebaseAvailable || !db) {
      console.log("🔄 Firebase not available, using mock users for demo");
      return;
    }

    const instance = new AuthService();
    await instance.seedDefaultAdmin();

    // Add demo employee user
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", "employee"));
      const employeeUsers = await getDocs(q);

      if (employeeUsers.empty) {
        console.log("🌱 Creating demo employee user...");

        const saltRounds = 12;
        const password_hash = await bcrypt.hash("employee123", saltRounds);

        await addDoc(usersRef, {
          username: "employee",
          password_hash,
          name: "Demo Employee",
          role: "employee",
          collector_name: "John Collector",
          access_scope: [],
          created_at: Timestamp.now(),
          is_active: true,
        });

        console.log(
          "✅ Demo employee user created (username: employee, password: employee123)",
        );
      }
    } catch (error) {
      console.error("❌ Failed to seed demo employee:", error);
    }
  }

  /**
   * Static method to check Firebase status
   */
  static getFirebaseStatus(): boolean {
    return isFirebaseAvailable && !!db;
  }
}

// Export both the class and the singleton instance
export { AuthService };
export const authService = new AuthService();