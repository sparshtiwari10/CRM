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

  const from = location.state?.from?.pathname || "/";

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Card className="w-full max-w-md shadow-xl">
            <CardHeader className="space-y-4 pb-6">
              <div className="flex items-center justify-center mb-4">
                <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center">
                  <Lock className="h-6 w-6 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-center text-foreground">
                Welcome Back
              </CardTitle>
              <p className="text-muted-foreground text-center">
                Sign in to your account to continue
              </p>
              <p className="text-xs text-muted-foreground text-center">
                Secure access for employees and administrators
              </p>
              {/* Firebase Connection Status */}
              <div className="flex justify-center mt-2">
                <FirebaseStatus />
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Login Form */}
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="username" className="text-foreground">
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !username.trim() || !password.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Demo Login Buttons */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg text-center text-foreground">
              Demo Access
            </CardTitle>
            <p className="text-sm text-muted-foreground text-center">
              Try the system with demo credentials
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => handleDemoLogin("admin")}
              disabled={isLoading}
            >
              <Shield className="mr-2 h-4 w-4" />
              Login as Administrator
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => handleDemoLogin("employee")}
              disabled={isLoading}
            >
              <Users className="mr-2 h-4 w-4" />
              Login as Employee
            </Button>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            AGV Cable TV Management System
          </p>
          <p className="text-xs text-muted-foreground">
            Secure • Reliable • Efficient
          </p>
        </div>
      </div>
    </div>
  );
}
