import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff, Shield, Users, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { FirebaseStatus } from "@/components/common/FirebaseStatus";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = location.state?.from?.pathname || "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (!username.trim() || !password.trim()) {
        throw new Error("Please enter both username and password");
      }

      const user = await login({ username: username.trim(), password });

      toast({
        title: "Login Successful",
        description: `Welcome back, ${user.name}!`,
        className: "bottom-2 right-2 left-2 lg:left-auto lg:max-w-sm",
      });

      // Navigate to the intended page or dashboard
      navigate(from, { replace: true });
    } catch (error: any) {
      console.error("Login error:", error);
      setError(error.message || "Login failed. Please try again.");

      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials. Please try again.",
        variant: "destructive",
        className: "bottom-2 right-2 left-2 lg:left-auto lg:max-w-sm",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (role: "admin" | "employee") => {
    setError("");
    setIsLoading(true);

    try {
      let credentials;
      if (role === "admin") {
        credentials = { username: "admin", password: "admin123" };
      } else {
        credentials = { username: "employee", password: "employee123" };
      }

      const user = await login(credentials);

      toast({
        title: "Demo Login Successful",
        description: `Logged in as ${user.name} (${role})`,
        className: "bottom-2 right-2 left-2 lg:left-auto lg:max-w-sm",
      });

      navigate(from, { replace: true });
    } catch (error: any) {
      console.error("Demo login error:", error);
      setError("Demo login failed. Using fallback authentication.");

      // Fallback for demo purposes if Firestore is not available
      toast({
        title: "Demo Mode",
        description: `Simulating ${role} login in demo mode`,
        className: "bottom-2 right-2 left-2 lg:left-auto lg:max-w-sm",
      });

      navigate(from, { replace: true });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="h-12 w-12 rounded-lg bg-blue-600 flex items-center justify-center">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">AGV</h1>
          </div>
          <h2 className="text-xl font-semibold text-gray-700">
            Cable TV Management System
          </h2>
          <p className="text-sm text-gray-500">
            Secure access for employees and administrators
          </p>
        </div>

        {/* Login Form */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-center text-xl">Sign In</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  disabled={isLoading}
                  className="h-11"
                  autoComplete="username"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    disabled={isLoading}
                    className="h-11 pr-10"
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
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Sign In
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Demo Login Section */}
        <Card className="shadow-lg border-dashed border-2 border-gray-300">
          <CardHeader>
            <CardTitle className="text-center text-lg text-gray-600">
              Demo Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-500 text-center">
              Try the system with demo credentials
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => handleDemoLogin("admin")}
                disabled={isLoading}
                className="h-12 flex flex-col space-y-1"
              >
                <Shield className="h-4 w-4" />
                <span className="text-xs">Admin Demo</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => handleDemoLogin("employee")}
                disabled={isLoading}
                className="h-12 flex flex-col space-y-1"
              >
                <Users className="h-4 w-4" />
                <span className="text-xs">Employee Demo</span>
              </Button>
            </div>

            <div className="text-xs text-gray-500 space-y-1">
              <div>
                <strong>Admin:</strong> username: admin, password: admin123
              </div>
              <div>
                <strong>Employee:</strong> username: employee, password:
                employee123
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="text-center text-xs text-gray-500 space-y-1">
          <p>🔒 This system is for authorized personnel only</p>
          <p>All login attempts are monitored and logged</p>
        </div>
      </div>
    </div>
  );
}
