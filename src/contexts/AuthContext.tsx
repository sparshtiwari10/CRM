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
  isAdmin: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  logout: () => void;
  canAccessCustomer: (
    customerId: string,
    customerCollectorName?: string,
  ) => boolean;
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

  useEffect(() => {
    // Initialize auth service and check for existing session
    const initializeAuth = async () => {
      try {
        // Check if user is already logged in
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        }

        // Try to seed default admin user, but don't block the UI if it fails
        try {
          await authService.seedDefaultAdmin();
        } catch (seedError) {
          console.warn(
            "Could not seed admin user (Firebase may not be configured yet):",
            seedError,
          );
        }
      } catch (error) {
        console.error("Failed to initialize auth:", error);
      } finally {
        // Always set loading to false to unblock the UI
        setIsLoading(false);
      }
    };

    // Add a timeout to ensure we don't get stuck loading forever
    const timeoutId = setTimeout(() => {
      console.warn("Auth initialization timeout - continuing without seeding");
      setIsLoading(false);
    }, 5000); // 5 second timeout

    initializeAuth().finally(() => {
      clearTimeout(timeoutId);
    });

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  const login = async (credentials: LoginCredentials): Promise<User> => {
    try {
      setIsLoading(true);
      const user = await authService.login(credentials);
      setUser(user);
      return user;
    } catch (error: any) {
      console.error("Login failed:", error);

      // Provide more helpful error messages
      if (
        error.message.includes("timeout") ||
        error.message.includes("Firebase authentication timeout")
      ) {
        throw new Error(
          "Firebase connection issue - continuing in demo mode. Try refreshing the page.",
        );
      } else if (
        error.message.includes("permission-denied") ||
        error.message.includes("PERMISSION_DENIED")
      ) {
        throw new Error(
          "Firebase permission denied. Please set up Firestore security rules.",
        );
      } else if (error.message.includes("Invalid username or password")) {
        throw new Error("Invalid username or password.");
      } else {
        // For any other error, still try to provide a helpful message
        throw new Error(error.message || "Login failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
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
    isAdmin: user?.role === "admin",
    login,
    logout,
    canAccessCustomer,
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
