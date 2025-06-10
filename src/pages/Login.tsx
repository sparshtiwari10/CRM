import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  LogIn,
  AlertCircle,
  Settings,
  RefreshCw,
} from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("admin@agvcabletv.com"); // Pre-fill with default admin
  const [password, setPassword] = useState("admin123"); // Pre-fill with default password
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  const {
    login,
    sendPasswordReset,
    permissionsError,
    fixPermissions,
    clearPermissionsError,
  } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      console.log("🔐 Attempting login with:", email);
      await login({ email, password });
      console.log("✅ Login successful, navigating to dashboard");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("❌ Login error:", error);

      let errorMessage = "Login failed. Please try again.";

      if (error.code === "auth/user-not-found") {
        errorMessage = "No account found with this email address.";
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "Incorrect password.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address.";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many failed attempts. Please try again later.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResetMessage("");

    try {
      await sendPasswordReset(resetEmail);
      setResetMessage(
        "Password reset email sent! Check your inbox and follow the instructions.",
      );
      setShowPasswordReset(false);
      setResetEmail("");
    } catch (error: any) {
      setError(error.message || "Failed to send password reset email.");
    }
  };

  const handleFixPermissions = async () => {
    setError("");
    setIsLoading(true);

    try {
      await fixPermissions();
      clearPermissionsError();
      setError("");
      setResetMessage("Permissions fixed! You can now try logging in again.");
    } catch (error: any) {
      setError(
        "Could not auto-fix permissions. Please check the console for manual instructions.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const runDiagnostics = () => {
    console.log("🔧 Running Firebase diagnostics...");

    // Check if diagnostic tools are available
    if ((window as any).quickFixFirebase) {
      (window as any).quickFixFirebase();
    } else if ((window as any).FirebasePermissionsFix) {
      (window as any).FirebasePermissionsFix.quickFix();
    } else {
      console.log(
        "⚠️ Diagnostic tools not loaded. Checking basic Firebase status...",
      );

      // Basic Firebase check
      import("@/lib/firebase").then(({ db, auth }) => {
        console.log("🔥 Firebase status:");
        console.log(
          "  - Database:",
          db ? "✅ Initialized" : "❌ Not initialized",
        );
        console.log(
          "  - Auth:",
          auth ? "✅ Initialized" : "❌ Not initialized",
        );

        if (auth?.currentUser) {
          console.log("  - Current user:", auth.currentUser.email);
        } else {
          console.log("  - Current user: None");
        }
      });
    }
  };

  // Show password reset form
  if (showPasswordReset) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Reset Password
            </CardTitle>
            <p className="text-sm text-muted-foreground text-center">
              Enter your email to receive a password reset link
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="reset-email" className="text-sm font-medium">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="admin@agvcabletv.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Button type="submit" className="w-full">
                  Send Reset Email
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setShowPasswordReset(false);
                    setError("");
                    setResetEmail("");
                  }}
                >
                  Back to Login
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            AGV Cable TV
          </CardTitle>
          <p className="text-sm text-muted-foreground text-center">
            Management System
          </p>
        </CardHeader>
        <CardContent>
          {/* Permissions Error Alert */}
          {permissionsError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <p>{permissionsError}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleFixPermissions}
                  disabled={isLoading}
                  className="mt-2"
                >
                  {isLoading ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Settings className="mr-2 h-4 w-4" />
                  )}
                  Fix Permissions
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@agvcabletv.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p>{error}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={runDiagnostics}
                      className="mt-2"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Run Diagnostics
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {resetMessage && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-green-700 dark:text-green-400">
                  {resetMessage}
                </AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <LogIn className="h-4 w-4" />
                  <span>Sign In</span>
                </div>
              )}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowPasswordReset(true)}
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Forgot your password?
              </button>
            </div>
          </form>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground text-center">
              <strong>Using the account you created in Firebase Auth</strong>
              <br />
              Enter the email and password from your Firebase Auth user
              <br />
              <em>If you need to reset password, use the link above</em>
            </p>
          </div>

          {/* Debug Tools */}
          <div className="mt-4 text-center space-y-2">
            <button
              type="button"
              onClick={runDiagnostics}
              className="text-xs text-muted-foreground hover:text-foreground block w-full"
            >
              🔧 Run Firebase Diagnostics (Check Console)
            </button>

            <div className="text-xs text-muted-foreground">
              Console Commands: <code>quickFixFirebase()</code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
