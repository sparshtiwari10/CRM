import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AuthService } from "@/services/authService";
import {
  performConnectivityCheck,
  getNetworkTroubleshooting,
} from "@/utils/networkUtils";
import { Cloud, CloudOff, AlertTriangle, RefreshCw, Wifi } from "lucide-react";
import type { ConnectivityCheck } from "@/utils/networkUtils";

export function FirebaseStatus() {
  const [isFirebaseAvailable, setIsFirebaseAvailable] = useState<
    boolean | null
  >(null);
  const [connectivityCheck, setConnectivityCheck] =
    useState<ConnectivityCheck | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkStatus = async () => {
    const status = AuthService.getFirebaseStatus();
    setIsFirebaseAvailable(status);

    // If Firebase is not available, run connectivity diagnostics
    if (!status) {
      setIsChecking(true);
      try {
        const check = await performConnectivityCheck();
        setConnectivityCheck(check);
      } catch (error) {
        console.error("Connectivity check failed:", error);
      } finally {
        setIsChecking(false);
      }
    }
  };

  useEffect(() => {
    checkStatus();
    // Check again after a short delay to catch initialization changes
    const timer = setTimeout(checkStatus, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleRetryConnection = async () => {
    setIsChecking(true);

    // Wait a moment then refresh
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  if (isFirebaseAvailable === null) {
    return (
      <Badge variant="secondary" className="text-xs">
        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
        Checking...
      </Badge>
    );
  }

  if (isFirebaseAvailable) {
    return (
      <Badge
        variant="default"
        className="text-xs bg-green-100 text-green-800 border-green-300"
      >
        <Cloud className="w-3 h-3 mr-1" />
        Firebase Connected
      </Badge>
    );
  }

  // Firebase not available - show detailed status with troubleshooting
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge
          variant="secondary"
          className="text-xs bg-orange-100 text-orange-800 border-orange-300 cursor-pointer hover:bg-orange-200"
        >
          <CloudOff className="w-3 h-3 mr-1" />
          Demo Mode
          <AlertTriangle className="w-3 h-3 ml-1" />
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="center">
        <Card className="border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center space-x-2">
              <CloudOff className="w-4 h-4 text-orange-600" />
              <span>Firebase Connection Issue</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Alert>
              <Wifi className="h-4 w-4" />
              <AlertDescription className="text-sm">
                App is running in <strong>Demo Mode</strong> with mock data.
                Your changes won't be saved permanently.
              </AlertDescription>
            </Alert>

            {connectivityCheck && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-700">
                  Connectivity Status:
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-2 h-2 rounded-full ${connectivityCheck.isOnline ? "bg-green-500" : "bg-red-500"}`}
                    />
                    <span>
                      Internet:{" "}
                      {connectivityCheck.isOnline
                        ? "Connected"
                        : "Disconnected"}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-2 h-2 rounded-full ${connectivityCheck.firebaseReachable ? "bg-green-500" : "bg-red-500"}`}
                    />
                    <span>
                      Firebase:{" "}
                      {connectivityCheck.firebaseReachable
                        ? "Reachable"
                        : "Unreachable"}
                    </span>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-xs font-medium text-gray-700 mb-1">
                    Suggestions:
                  </div>
                  <div className="text-xs space-y-1 text-gray-600">
                    {getNetworkTroubleshooting(connectivityCheck).map(
                      (suggestion, index) => (
                        <div key={index}>{suggestion}</div>
                      ),
                    )}
                  </div>
                </div>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleRetryConnection}
              disabled={isChecking}
              className="w-full text-xs"
            >
              {isChecking ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Retry Connection
                </>
              )}
            </Button>

            <div className="text-xs text-gray-500 text-center">
              Demo mode includes all features except data persistence
            </div>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
