import React, { useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Copy,
  ExternalLink,
  RefreshCw,
  Shield,
  Database,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { FirebaseDebug } from "@/utils/firebaseDebug";

interface PermissionDebuggerProps {
  onRetry?: () => void;
}

export function PermissionDebugger({ onRetry }: PermissionDebuggerProps) {
  const [debugResults, setDebugResults] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const { user, isAuthenticated, isAdmin } = useAuth();

  const runDiagnostics = async () => {
    setTesting(true);
    try {
      // Run diagnostics and capture results
      console.group("🔍 Permission Debugger Results");
      await FirebaseDebug.runDiagnostics();
      await FirebaseDebug.testPermissions();
      console.groupEnd();

      setDebugResults({
        timestamp: new Date().toISOString(),
        completed: true,
      });
    } catch (error) {
      console.error("Debug failed:", error);
    } finally {
      setTesting(false);
    }
  };

  const copyDebugRules = () => {
    const debugRules = `rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`;

    navigator.clipboard.writeText(debugRules);
    alert(
      "Debug rules copied to clipboard! Replace your firestore.rules file with this content.",
    );
  };

  const samplePackageData = {
    name: "Basic Cable",
    price: 299,
    description: "Essential channels package",
    channels: 50,
    features: ["Local channels", "Basic networks"],
    is_active: true,
    portal_amount: 299,
    created_at: "2024-12-01T00:00:00Z",
    updated_at: "2024-12-01T00:00:00Z",
    created_by: "system",
  };

  const copyPackageData = () => {
    navigator.clipboard.writeText(JSON.stringify(samplePackageData, null, 2));
    alert(
      "Sample package data copied! Use this to create a document in the 'packages' collection.",
    );
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Firebase Permission Debugger</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Authentication Status */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span className="font-medium">Authentication:</span>
            </div>
            <div className="flex items-center space-x-2">
              {isAuthenticated ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <Badge variant={isAdmin ? "default" : "secondary"}>
                    {user?.role || "unknown"}
                  </Badge>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <Badge variant="destructive">Not authenticated</Badge>
                </>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={runDiagnostics}
              disabled={testing}
              className="w-full"
            >
              {testing ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Database className="mr-2 h-4 w-4" />
              )}
              Run Full Diagnostics
            </Button>

            {onRetry && (
              <Button onClick={onRetry} variant="outline" className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry Loading Data
              </Button>
            )}
          </div>

          {debugResults && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Diagnostics completed. Check browser console for detailed
                results.
                <br />
                <span className="text-xs text-muted-foreground">
                  Run at: {new Date(debugResults.timestamp).toLocaleString()}
                </span>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Quick Fixes */}
      <Card>
        <CardHeader>
          <CardTitle>🚨 Quick Fixes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Debug Rules */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">1. Use Temporary Debug Rules</p>
                <p className="text-sm">
                  Replace your firestore.rules file and deploy to bypass
                  permission checks.
                </p>
                <div className="flex space-x-2">
                  <Button size="sm" onClick={copyDebugRules}>
                    <Copy className="mr-2 h-3 w-3" />
                    Copy Debug Rules
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      window.open(
                        "https://console.firebase.google.com",
                        "_blank",
                      )
                    }
                  >
                    <ExternalLink className="mr-2 h-3 w-3" />
                    Firebase Console
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Create Collections */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">2. Create Missing Collections</p>
                <p className="text-sm">
                  Create the 'packages' collection in Firestore with sample
                  data.
                </p>
                <Button size="sm" onClick={copyPackageData}>
                  <Copy className="mr-2 h-3 w-3" />
                  Copy Sample Package Data
                </Button>
              </div>
            </AlertDescription>
          </Alert>

          {/* User Document */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">3. Check User Document</p>
                <p className="text-sm">
                  Ensure your user document has role: "admin" and is_active:
                  true
                </p>
                <p className="text-xs text-muted-foreground">
                  Collection: users, Document ID: {user?.id || "your-auth-uid"}
                </p>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Step by Step Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Step-by-Step Fix</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-3 text-sm">
            <li>
              <strong>Copy debug rules</strong> (click button above)
            </li>
            <li>
              <strong>Replace firestore.rules</strong> file with copied content
            </li>
            <li>
              <strong>Deploy rules:</strong>{" "}
              <code>firebase deploy --only firestore:rules</code>
            </li>
            <li>
              <strong>Test app</strong> - permission errors should be gone
            </li>
            <li>
              <strong>Create packages collection</strong> in Firebase Console if
              needed
            </li>
            <li>
              <strong>Restore proper rules</strong> once everything works
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
