import React, { createContext, useContext, useEffect, useState } from "react";
import { User, LoginCredentials, AuthContextType } from "@/types/auth";
import { AuthService } from "@/services/authService";
import { CustomerService } from "@/services/customerService";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { AuthContext };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize services and listen to authentication state changes
  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize services
        await AuthService.initialize();
        CustomerService.initialize();

        // Set up auth state listener
        const unsubscribe = AuthService.onAuthStateChanged((user) => {
          setUser(user);
          setIsLoading(false);
        });

        return unsubscribe;
      } catch (error) {
        console.error("Error initializing services:", error);
        setIsLoading(false);
        return () => {};
      }
    };

    const unsubscribePromise = initialize();

    return () => {
      unsubscribePromise.then((unsubscribe) => {
        if (unsubscribe) unsubscribe();
      });
    };
  }, []);

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    setIsLoading(true);

    try {
      const user = await AuthService.signIn(credentials);
      setUser(user);
      return true;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await AuthService.signOut();
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const canAccessCustomer = (customerId: string): boolean => {
    if (!user) return false;
    if (user.role === "admin") return true;
    return user.assignedCustomers?.includes(customerId) || false;
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
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
