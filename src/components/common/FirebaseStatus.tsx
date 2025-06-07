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
import { getConnectionStatus, retryFirebaseConnection } from "@/lib/firebase";
import {
  Cloud,
  CloudOff,
  AlertTriangle,
  RefreshCw,
  Wifi,
  Clock,
  XCircle,
} from "lucide-react";
import type { ConnectivityCheck } from "@/utils/networkUtils";

export function FirebaseStatus() {
  const [isFirebaseAvailable, setIsFirebaseAvailable] = useState<
    boolean | null
  >(null);
  const [connectivityCheck, setConnectivityCheck] =
    useState<ConnectivityCheck | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<any>(null);

  const checkStatus = async () => {
    const status = AuthService.getFirebaseStatus();
    const connStatus = getConnectionStatus();

    setIsFirebaseAvailable(status);
    setConnectionStatus(connStatus);

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
    } else {
      // Clear connectivity check if now available
      setConnectivityCheck(null);
    }
  };

  useEffect(() => {
    checkStatus();

    // Check status periodically while connection is unstable
    const timer = setInterval(() => {
      const connStatus = getConnectionStatus();
      if (
        connStatus.status === "connecting" ||
        connStatus.status === "failed"
      ) {
        checkStatus();
      }
    }, 2000);

    return () => clearInterval(timer);
  }, []);

  const handleRetryConnection = async () => {
    setIsChecking(true);
    setConnectivityCheck(null);

    try {
      const success = await retryFirebaseConnection();
      if (success) {
        // Connection successful, update status
        await checkStatus();
      } else {
        // Still failed, run diagnostics
        const check = await performConnectivityCheck();
        setConnectivityCheck(check);
      }
    } catch (error) {
      console.error("Retry failed:", error);
      const check = await performConnectivityCheck();
      setConnectivityCheck(check);
    } finally {
      setIsChecking(false);
    }
  };

  if (
    isFirebaseAvailable === null ||
    connectionStatus?.status === "initializing"
  ) {
    return (
      <Badge variant="secondary" className="text-xs">
        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
        <span className="hidden lg:inline">Initializing...</span>
      </Badge>
    );
  }

  if (connectionStatus?.status === "connecting") {
    return (
      <Badge
        variant="secondary"
        className="text-xs bg-blue-100 text-blue-800 border-blue-300"
      >
        <RefreshCw className="w-3 h-3 lg:mr-1 animate-spin" />
        <span className="hidden lg:inline">Connecting...</span>
      </Badge>
    );
  }

  if (isFirebaseAvailable) {
    return (
      <Badge
        variant="default"
        className="text-xs bg-green-100 text-green-800 border-green-300"
      >
        <Cloud className="w-3 h-3 lg:mr-1" />
        <span className="hidden lg:inline">Firebase Connected</span>
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
          <CloudOff className="w-3 h-3 lg:mr-1" />
          <span className="hidden lg:inline">Demo Mode</span>
          <AlertTriangle className="w-3 h-3 lg:ml-1 ml-0" />
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="center">
        <Card className="border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center space-x-2">
              {connectionStatus?.status === "failed" ? (
                <XCircle className="w-4 h-4 text-red-600" />
              ) : (
                <CloudOff className="w-4 h-4 text-orange-600" />
              )}
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

            {connectionStatus && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-700">
                  Connection Status:
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        connectionStatus.status === "connected"
                          ? "bg-green-500"
                          : connectionStatus.status === "connecting"
                            ? "bg-blue-500"
                            : "bg-red-500"
                      }`}
                    />
                    <span>Status: {connectionStatus.status}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-3 h-3" />
                    <span>
                      Attempts: {connectionStatus.retryCount}/
                      {connectionStatus.maxRetries}
                    </span>
                  </div>
                  {connectionStatus.lastAttempt && (
                    <div className="flex items-center space-x-2">
                      <Clock className="w-3 h-3" />
                      <span>
                        Last attempt:{" "}
                        {connectionStatus.lastAttempt.toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

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
