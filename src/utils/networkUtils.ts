/**
 * Network connectivity utilities for Firebase troubleshooting
 */

export interface ConnectivityCheck {
  isOnline: boolean;
  firebaseReachable: boolean;
  lastChecked: Date;
  error?: string;
}

/**
 * Check basic internet connectivity
 */
export async function checkInternetConnectivity(): Promise<boolean> {
  try {
    // Try to fetch a small resource from a reliable source
    const response = await fetch("https://www.google.com/favicon.ico", {
      method: "HEAD",
      mode: "no-cors",
      cache: "no-cache",
    });
    return true;
  } catch (error) {
    console.warn("Internet connectivity check failed:", error);
    return false;
  }
}

/**
 * Check if Firebase domains are reachable
 */
export async function checkFirebaseConnectivity(): Promise<boolean> {
  try {
    // Try to reach Firebase's status page or a minimal endpoint
    const response = await fetch("https://status.firebase.google.com", {
      method: "HEAD",
      mode: "no-cors",
      cache: "no-cache",
    });
    return true;
  } catch (error) {
    console.warn("Firebase connectivity check failed:", error);
    return false;
  }
}

/**
 * Comprehensive connectivity check
 */
export async function performConnectivityCheck(): Promise<ConnectivityCheck> {
  const result: ConnectivityCheck = {
    isOnline: false,
    firebaseReachable: false,
    lastChecked: new Date(),
  };

  try {
    // Check basic internet connectivity
    result.isOnline = await checkInternetConnectivity();

    if (result.isOnline) {
      // If online, check Firebase specifically
      result.firebaseReachable = await checkFirebaseConnectivity();
    }
  } catch (error: any) {
    result.error = error.message;
  }

  return result;
}

/**
 * Get network troubleshooting suggestions based on connectivity check
 */
export function getNetworkTroubleshooting(check: ConnectivityCheck): string[] {
  const suggestions: string[] = [];

  if (!check.isOnline) {
    suggestions.push(
      "❌ No internet connection detected",
      "💡 Check your internet connection",
      "💡 Try disabling VPN temporarily",
      "💡 Restart your router/modem",
    );
  } else if (!check.firebaseReachable) {
    suggestions.push(
      "🌐 Internet connection OK, but Firebase unreachable",
      "💡 Check if your firewall blocks Firebase domains:",
      "   • firestore.googleapis.com",
      "   • googleapis.com",
      "   • firebase.google.com",
      "💡 If on corporate network, contact IT about Firebase access",
      "💡 Try disabling antivirus/security software temporarily",
    );
  } else {
    suggestions.push(
      "✅ Network connectivity appears normal",
      "💡 The issue might be with your Firebase project:",
      "   • Check Firebase Console for service status",
      "   • Verify your API keys are correct",
      "   • Ensure Firestore is enabled in your project",
      "   • Check if you have proper billing set up",
    );
  }

  return suggestions;
}

/**
 * Auto-retry with exponential backoff for Firebase operations
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      if (attempt === maxRetries - 1) {
        // Last attempt failed
        break;
      }

      // Check if it's a network error worth retrying
      if (
        error.code === "unavailable" ||
        error.message.includes("Connection failed")
      ) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(
          `🔄 Retry attempt ${attempt + 1}/${maxRetries} in ${delay}ms`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        // Non-network error, don't retry
        throw error;
      }
    }
  }

  throw lastError!;
}
