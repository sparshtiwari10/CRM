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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

        // Seed default admin user if no admin exists
        await authService.seedDefaultAdmin();
      } catch (error) {
        console.error("Failed to initialize auth:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<User> => {
    try {
      setIsLoading(true);
      const user = await authService.login(credentials);
      setUser(user);
      return user;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
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
