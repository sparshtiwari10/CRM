import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { authService, User, LoginCredentials } from "@/services/authService";
import FirebasePermissionsFix from "@/utils/firebasePermissionsFix";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  permissionsError: string | null;
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
  fixPermissions: () => Promise<void>;
  clearPermissionsError: () => void;
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
  const [permissionsError, setPermissionsError] = useState<string | null>(null);

  useEffect(() => {
    console.log("🔄 Initializing Firebase Authentication...");

    // Set up auth state listener
    const unsubscribe = authService.onAuthStateChange(async (user) => {
      console.log("🔄 Auth state changed:", user ? user.name : "No user");
      setUser(user);

      if (!isAuthInitialized) {
        setIsAuthInitialized(true);
        setIsLoading(false);
        console.log("✅ Firebase Auth initialized");

        // If user is authenticated but we get permissions error, try to fix it
        if (user && permissionsError) {
          console.log(
            "🔧 User authenticated but permissions error exists, attempting fix...",
          );
          try {
            await FirebasePermissionsFix.quickFix();
            setPermissionsError(null);
          } catch (error) {
            console.warn("Could not auto-fix permissions:", error);
          }
        }
      }
    });

    // Seed default admin user if needed
    const seedAdmin = async () => {
      try {
        await authService.seedDefaultAdmin();
      } catch (error: any) {
        console.warn("Could not seed admin user:", error);

        // Check if this is a permissions error
        if (
          error.message?.includes("permission") ||
          error.code === "permission-denied"
        ) {
          setPermissionsError(
            "Firebase permissions not configured correctly. Click 'Fix Permissions' to resolve.",
          );
        }
      }
    };

    seedAdmin();

    // Set a timeout to ensure we don't get stuck loading forever
    const timeoutId = setTimeout(() => {
      if (!isAuthInitialized) {
        console.warn(
          "Auth initialization timeout - continuing without full auth",
        );
        setIsAuthInitialized(true);
        setIsLoading(false);
      }
    }, 10000); // 10 second timeout

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [isAuthInitialized, permissionsError]);

  const login = async (credentials: LoginCredentials): Promise<User> => {
    try {
      setIsLoading(true);
      setPermissionsError(null);
      console.log("🔐 Logging in with Firebase Auth...");

      const user = await authService.login(credentials);
      console.log("✅ Login successful:", user.name);

      return user;
    } catch (error: any) {
      console.error("❌ Login failed:", error);

      // Check for permission-related errors
      if (
        error.message?.includes("Missing or insufficient permissions") ||
        error.message?.includes("permission-denied") ||
        error.code === "permission-denied"
      ) {
        setPermissionsError(
          "Firebase permissions error. The user document may be missing or Firestore rules need updating.",
        );

        // Auto-attempt fix for permissions errors
        try {
          console.log("🔧 Attempting automatic permissions fix...");
          await FirebasePermissionsFix.quickFix();

          // Retry login after fix
          console.log("🔄 Retrying login after permissions fix...");
          const retryUser = await authService.login(credentials);
          setPermissionsError(null);
          return retryUser;
        } catch (fixError) {
          console.warn("Auto-fix failed:", fixError);
        }
      }

      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await authService.signOut();
      setPermissionsError(null);
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
      setPermissionsError(null);

      const newUser = await authService.createUser(userData);
      console.log("✅ User created successfully:", newUser.name);
      return newUser;
    } catch (error: any) {
      console.error("❌ Create user failed:", error);

      // Check for permission-related errors
      if (
        error.message?.includes("Missing or insufficient permissions") ||
        error.message?.includes("permission-denied")
      ) {
        setPermissionsError(
          "Cannot create users due to permissions error. Please fix Firebase configuration.",
        );
      }

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

  const fixPermissions = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setPermissionsError(null);

      console.log("🔧 Manual permissions fix initiated...");
      await FirebasePermissionsFix.diagnoseAndFix();

      console.log("✅ Permissions fix completed");
    } catch (error: any) {
      console.error("❌ Permissions fix failed:", error);
      setPermissionsError(
        "Manual fix failed. Please check console for detailed instructions.",
      );
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const clearPermissionsError = (): void => {
    setPermissionsError(null);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin" && user?.is_active,
    permissionsError,
    login,
    logout,
    createUser,
    sendPasswordReset,
    updatePassword,
    canAccessCustomer,
    isAuthInitialized,
    fixPermissions,
    clearPermissionsError,
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
