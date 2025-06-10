import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { authService, User, LoginCredentials } from "@/services/authService";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  logout: () => Promise<void>;
  createUser: (userData: {
    email: string;
    password: string;
    name: string;
    role: "admin" | "employee";
    collector_name?: string;
  }) => Promise<User>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  canAccessCustomer: (
    customerId: string,
    customerCollectorName?: string,
  ) => boolean;
  isAuthInitialized: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthInitialized, setIsAuthInitialized] = useState(false);

  useEffect(() => {
    console.log("🔄 Initializing Firebase Authentication...");

    // Set up auth state listener
    const unsubscribe = authService.onAuthStateChange((user) => {
      console.log("🔄 Auth state changed:", user ? user.name : "No user");
      setUser(user);

      if (!isAuthInitialized) {
        setIsAuthInitialized(true);
        setIsLoading(false);
        console.log("✅ Firebase Auth initialized");
      }
    });

    // Seed default admin user if needed
    const seedAdmin = async () => {
      try {
        await authService.seedDefaultAdmin();
      } catch (error) {
        console.warn("Could not seed admin user:", error);
      }
    };

    seedAdmin();

    // Set a timeout to ensure we don't get stuck loading forever
    const timeoutId = setTimeout(() => {
      if (!isAuthInitialized) {
        console.warn("Auth initialization timeout - continuing without auth");
        setIsAuthInitialized(true);
        setIsLoading(false);
      }
    }, 10000); // 10 second timeout

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [isAuthInitialized]);

  const login = async (credentials: LoginCredentials): Promise<User> => {
    try {
      setIsLoading(true);
      console.log("🔐 Logging in with Firebase Auth...");

      const user = await authService.login(credentials);
      console.log("✅ Login successful:", user.name);

      return user;
    } catch (error: any) {
      console.error("❌ Login failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await authService.signOut();
      console.log("✅ Logout successful");
    } catch (error: any) {
      console.error("❌ Logout failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const createUser = async (userData: {
    email: string;
    password: string;
    name: string;
    role: "admin" | "employee";
    collector_name?: string;
  }): Promise<User> => {
    try {
      setIsLoading(true);
      const newUser = await authService.createUser(userData);
      console.log("✅ User created successfully:", newUser.name);
      return newUser;
    } catch (error: any) {
      console.error("❌ Create user failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const sendPasswordReset = async (email: string): Promise<void> => {
    try {
      await authService.sendPasswordReset(email);
      console.log("✅ Password reset email sent");
    } catch (error: any) {
      console.error("❌ Send password reset failed:", error);
      throw error;
    }
  };

  const updatePassword = async (newPassword: string): Promise<void> => {
    try {
      await authService.updatePassword(newPassword);
      console.log("✅ Password updated successfully");
    } catch (error: any) {
      console.error("❌ Update password failed:", error);
      throw error;
    }
  };

  const canAccessCustomer = (
    customerId: string,
    customerCollectorName?: string,
  ): boolean => {
    return authService.canAccessCustomer(customerId, customerCollectorName);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin" && user?.is_active,
    login,
    logout,
    createUser,
    sendPasswordReset,
    updatePassword,
    canAccessCustomer,
    isAuthInitialized,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
