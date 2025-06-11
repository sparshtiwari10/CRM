import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { getAuth, onAuthStateChanged } from "firebase/auth";

type FirebaseConnectionStatus = "connected" | "disconnected" | "error";

export function FirebaseStatus() {
  const [status, setStatus] =
    useState<FirebaseConnectionStatus>("disconnected");
  const [lastCheck, setLastCheck] = useState<Date>(new Date());

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const checkFirebaseConnection = () => {
      try {
        const auth = getAuth();

        // Listen to auth state changes to verify Firebase is working
        unsubscribe = onAuthStateChanged(
          auth,
          (user) => {
            // Firebase is working if we can listen to auth changes
            setStatus("connected");
            setLastCheck(new Date());
            console.log("🔥 Firebase connected, user:", user?.email || "none");
          },
          (error) => {
            console.error("Firebase auth error:", error);
            setStatus("error");
            setLastCheck(new Date());
          },
        );
      } catch (error) {
        console.error("Firebase initialization error:", error);
        setStatus("error");
        setLastCheck(new Date());
      }
    };

    checkFirebaseConnection();

    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const getStatusIcon = () => {
    switch (status) {
      case "connected":
        return <CheckCircle className="h-3 w-3" />;
      case "disconnected":
        return <AlertCircle className="h-3 w-3" />;
      case "error":
        return <XCircle className="h-3 w-3" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "connected":
        return "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200";
      case "disconnected":
        return "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200";
      case "error":
        return "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200";
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "connected":
        return "Online";
      case "disconnected":
        return "Connecting...";
      case "error":
        return "Error";
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Badge
        variant="outline"
        className={`${getStatusColor()} border-0 text-xs flex items-center space-x-1`}
      >
        {getStatusIcon()}
        <span className="hidden sm:inline">{getStatusText()}</span>
      </Badge>
      {status === "connected" && (
        <span className="text-xs text-muted-foreground hidden lg:inline">
          {lastCheck.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
