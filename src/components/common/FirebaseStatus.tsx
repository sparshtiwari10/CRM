import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { AuthService } from "@/services/authService";
import { Cloud, CloudOff } from "lucide-react";

export function FirebaseStatus() {
  const [isFirebaseAvailable, setIsFirebaseAvailable] = useState<
    boolean | null
  >(null);

  useEffect(() => {
    const checkStatus = () => {
      const status = AuthService.getFirebaseStatus();
      setIsFirebaseAvailable(status);
    };

    checkStatus();
    // Check again after a short delay to catch initialization changes
    const timer = setTimeout(checkStatus, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (isFirebaseAvailable === null) {
    return null; // Don't show anything while checking
  }

  return (
    <Badge
      variant={isFirebaseAvailable ? "default" : "secondary"}
      className={`text-xs ${
        isFirebaseAvailable
          ? "bg-green-100 text-green-800 border-green-300"
          : "bg-orange-100 text-orange-800 border-orange-300"
      }`}
    >
      {isFirebaseAvailable ? (
        <>
          <Cloud className="w-3 h-3 mr-1" />
          Firebase Connected
        </>
      ) : (
        <>
          <CloudOff className="w-3 h-3 mr-1" />
          Demo Mode
        </>
      )}
    </Badge>
  );
}
