import React, { createContext, useContext, useEffect, useState } from "react";
import { User, LoginCredentials, AuthContextType } from "@/types/auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock admin user for development
const MOCK_ADMIN: User = {
  id: "admin-1",
  email: "admin@cabletv.com",
  phone: "+1 (555) 000-0000",
  name: "System Administrator",
  role: "admin",
  isActive: true,
  createdAt: "2024-01-01",
  lastLogin: new Date().toISOString(),
};

// Mock employees for development
const MOCK_EMPLOYEES: User[] = [
  {
    id: "emp-1",
    email: "john.collector@cabletv.com",
    phone: "+1 (555) 111-1111",
    name: "John Collector",
    role: "employee",
    isActive: true,
    createdAt: "2024-01-01",
    assignedCustomers: ["1", "2"], // Customer IDs
  },
  {
    id: "emp-2",
    email: "sarah.collector@cabletv.com",
    phone: "+1 (555) 222-2222",
    name: "Sarah Collector",
    role: "employee",
    isActive: true,
    createdAt: "2024-01-01",
    assignedCustomers: ["3", "4"], // Customer IDs
  },
];

// Mock credentials for development
const MOCK_CREDENTIALS = [
  { email: "admin@cabletv.com", password: "admin123" },
  { email: "john.collector@cabletv.com", password: "employee123" },
  { email: "sarah.collector@cabletv.com", password: "employee123" },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for stored authentication on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("cabletv_user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Error parsing stored user:", error);
        localStorage.removeItem("cabletv_user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    setIsLoading(true);

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Check credentials against mock data
    const validCredential = MOCK_CREDENTIALS.find(
      (cred) =>
        cred.email === credentials.email &&
        cred.password === credentials.password,
    );

    if (validCredential) {
      let authenticatedUser: User;

      if (credentials.email === "admin@cabletv.com") {
        authenticatedUser = {
          ...MOCK_ADMIN,
          lastLogin: new Date().toISOString(),
        };
      } else {
        const employee = MOCK_EMPLOYEES.find(
          (emp) => emp.email === credentials.email,
        );
        if (!employee) {
          setIsLoading(false);
          return false;
        }
        authenticatedUser = {
          ...employee,
          lastLogin: new Date().toISOString(),
        };
      }

      setUser(authenticatedUser);
      localStorage.setItem("cabletv_user", JSON.stringify(authenticatedUser));
      setIsLoading(false);
      return true;
    }

    setIsLoading(false);
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("cabletv_user");
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
