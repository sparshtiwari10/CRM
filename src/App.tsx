import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import Billing from "./pages/Billing";
import Packages from "./pages/Packages";
import Management from "./pages/Management";
import Settings from "./pages/Settings";
import EmployeeManagement from "./pages/EmployeeManagement";
import Employees from "./pages/Employees";
import RequestManagement from "./pages/RequestManagement";
import NotFound from "./pages/NotFound";

// Import diagnostic tools
import FirebasePermissionsFix from "@/utils/firebasePermissionsFix";
import SimpleFirebaseTest from "@/utils/simpleFirebaseTest";

const queryClient = new QueryClient();

function AppContent() {
  useEffect(() => {
    // Make diagnostic tools available globally
    if (typeof window !== "undefined") {
      (window as any).FirebasePermissionsFix = FirebasePermissionsFix;
      (window as any).SimpleFirebaseTest = SimpleFirebaseTest;
      (window as any).quickFixFirebase = () =>
        FirebasePermissionsFix.quickFix();
      (window as any).testFirebase = () => SimpleFirebaseTest.runDiagnostic();

      console.log("🔧 Diagnostic tools loaded:");
      console.log("  - quickFixFirebase() - Auto-fix permissions");
      console.log("  - testFirebase() - Test Firebase connection");
      console.log(
        "  - FirebasePermissionsFix.diagnoseAndFix() - Full diagnosis",
      );
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers"
          element={
            <ProtectedRoute>
              <Customers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/billing"
          element={
            <ProtectedRoute>
              <Billing />
            </ProtectedRoute>
          }
        />
        <Route
          path="/packages"
          element={
            <ProtectedRoute>
              <Packages />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/requests"
          element={
            <ProtectedRoute>
              <RequestManagement />
            </ProtectedRoute>
          }
        />

        {/* Admin-only routes */}
        <Route
          path="/employees"
          element={
            <ProtectedRoute adminOnly>
              <Employees />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee-management"
          element={
            <ProtectedRoute adminOnly>
              <EmployeeManagement />
            </ProtectedRoute>
          }
        />

        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* 404 fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider defaultTheme="light">
          <AuthProvider>
            <ErrorBoundary>
              <Toaster />
            </ErrorBoundary>
            <Sonner />
            <AppContent />
          </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
