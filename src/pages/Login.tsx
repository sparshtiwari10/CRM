import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Eye,
  EyeOff,
  Shield,
  Users,
  Lock,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { FirebaseStatus } from "@/components/common/FirebaseStatus";
import { authService } from "@/services/authService";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [debugInfo, setDebugInfo] = useState("");
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = location.state?.from?.pathname || "/";

  // Test Firebase connection on component mount
  useEffect(() => {
    const testConnection = async () => {
      try {
        // Test if we can fetch users to verify Firebase connection
        const users = await authService.getAllUsers();
        console.log(
          "🔗 Firebase connection test successful:",
          users.length,
          "users found",
        );
        setDebugInfo(
          `Firebase connected successfully. Found ${users.length} users in database.`,
        );
      } catch (error: any) {
        console.error("🔗 Firebase connection test failed:", error);
        setDebugInfo(`Firebase connection failed: ${error.message}`);
      }
    };

    testConnection();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (!username.trim() || !password.trim()) {
        throw new Error("Please enter both username and password");
      }

      console.log("🔄 Attempting login for username:", username.trim());

      const user = await login({ username: username.trim(), password });

      console.log(
        "✅ Login successful for user:",
        user.name,
        "Role:",
        user.role,
      );

      toast({
        title: "Login Successful",
        description: `Welcome back, ${user.name}!`,
        className: "bottom-2 right-2 left-2 lg:left-auto lg:max-w-sm",
      });

      // Navigate to the intended page or dashboard
      navigate(from, { replace: true });
    } catch (error: any) {
      console.error("❌ Login error:", error);

      let errorMessage = error.message || "Login failed. Please try again.";

      // Provide more specific error messages
      if (
        error.message.includes("connection") ||
        error.message.includes("timeout")
      ) {
        errorMessage =
          "Connection to database failed. Please check your internet connection and try again.";
      } else if (error.message.includes("password")) {
        errorMessage =
          "Invalid username or password. Please check your credentials.";
      } else if (error.message.includes("deactivated")) {
        errorMessage =
          "Your account has been deactivated. Please contact an administrator.";
      }

      setError(errorMessage);

      // Update debug info with error details
      setDebugInfo(
        `Login failed: ${error.message}\nTimestamp: ${new Date().toLocaleString()}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTestUser = async () => {
    try {
      setIsLoading(true);
      console.log("🔄 Creating test admin user...");

      const userId = await authService.createUser({
        username: "admin",
        password: "admin123",
        name: "System Administrator",
        role: "admin",
      });

      console.log("✅ Test admin user created:", userId);
      toast({
        title: "Test User Created",
        description:
          "Admin user created successfully. You can now log in with username: admin, password: admin123",
      });

      setUsername("admin");
      setDebugInfo(`Test admin user created successfully with ID: ${userId}`);
    } catch (error: any) {
      console.error("❌ Failed to create test user:", error);
      toast({
        title: "User Creation Failed",
        description: error.message || "Failed to create test user.",
        variant: "destructive",
      });
      setDebugInfo(`Failed to create test user: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Firebase Status */}
        <div className="flex justify-center">
          <FirebaseStatus />
        </div>

        {/* Login Form */}
        <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-6">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 rounded-full bg-blue-600">
                <Shield className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-center text-foreground">
              Welcome Back
            </CardTitle>
            <p className="text-center text-muted-foreground">
              Sign in to your AGV Cable TV account
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            {/* Debug Information Section */}
            <div className="pt-4 border-t border-muted">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full mb-3"
                onClick={() => setShowDebugInfo(!showDebugInfo)}
              >
                {showDebugInfo ? "Hide" : "Show"} Debug Info
              </Button>

              {showDebugInfo && (
                <div className="space-y-3">
                  <div className="p-3 bg-muted/50 rounded-md">
                    <div className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">
                      {debugInfo || "No debug information available"}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={handleCreateTestUser}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Users className="mr-2 h-3 w-3" />
                          Create Test Admin User
                        </>
                      )}
                    </Button>

                    <div className="text-xs text-muted-foreground text-center">
                      Use this if no admin account exists yet
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* System Status */}
            <div className="pt-4 border-t border-muted">
              <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>System Status: Online</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Need access? Contact your system administrator.
          </p>
          <p className="text-xs text-muted-foreground">
            AGV Cable TV Management System v2.0
          </p>
        </div>
      </div>
    </div>
  );
}
