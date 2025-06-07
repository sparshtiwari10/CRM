/**
 * Firebase Diagnostics and Troubleshooting Utilities
 */

interface DiagnosticsResult {
  timestamp: Date;
  connectivity: {
    internet: boolean;
    firebase: boolean;
    firestore: boolean;
  };
  configuration: {
    envVarsPresent: boolean;
    projectId: string;
    authDomain: string;
    validConfig: boolean;
  };
  browser: {
    userAgent: string;
    online: boolean;
    cookiesEnabled: boolean;
    localStorageAvailable: boolean;
  };
  network: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  };
  recommendations: string[];
}

/**
 * Run comprehensive Firebase diagnostics
 */
export async function runFirebaseDiagnostics(): Promise<DiagnosticsResult> {
  console.log("🔍 Running comprehensive Firebase diagnostics...");

  const result: DiagnosticsResult = {
    timestamp: new Date(),
    connectivity: {
      internet: false,
      firebase: false,
      firestore: false,
    },
    configuration: {
      envVarsPresent: false,
      projectId: "",
      authDomain: "",
      validConfig: false,
    },
    browser: {
      userAgent: navigator.userAgent,
      online: navigator.onLine,
      cookiesEnabled: navigator.cookieEnabled,
      localStorageAvailable: false,
    },
    network: {},
    recommendations: [],
  };

  // Test browser capabilities
  try {
    localStorage.setItem("test", "test");
    localStorage.removeItem("test");
    result.browser.localStorageAvailable = true;
  } catch (error) {
    result.browser.localStorageAvailable = false;
  }

  // Get network information if available
  if ("connection" in navigator) {
    const connection = (navigator as any).connection;
    result.network = {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
    };
  }

  // Check environment configuration
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;

  result.configuration = {
    envVarsPresent: !!(apiKey && projectId && authDomain),
    projectId: projectId || "NOT_SET",
    authDomain: authDomain || "NOT_SET",
    validConfig: !!(
      apiKey &&
      projectId &&
      authDomain &&
      apiKey.length > 10 &&
      projectId.length > 3 &&
      authDomain.includes(".")
    ),
  };

  // Test connectivity
  try {
    result.connectivity.internet = await testInternetConnectivity();
    result.connectivity.firebase = await testFirebaseConnectivity();
    result.connectivity.firestore = await testFirestoreConnectivity();
  } catch (error) {
    console.error("Connectivity tests failed:", error);
  }

  // Generate recommendations
  result.recommendations = generateRecommendations(result);

  return result;
}

/**
 * Test internet connectivity with multiple methods
 */
async function testInternetConnectivity(): Promise<boolean> {
  const tests = [
    () =>
      fetch("https://www.google.com/favicon.ico", {
        method: "HEAD",
        mode: "no-cors",
      }),
    () =>
      fetch("https://httpbin.org/status/200", {
        method: "HEAD",
        mode: "no-cors",
      }),
    () =>
      fetch("https://jsonplaceholder.typicode.com/posts/1", {
        method: "HEAD",
        mode: "no-cors",
      }),
  ];

  for (const test of tests) {
    try {
      await Promise.race([
        test(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 3000),
        ),
      ]);
      return true;
    } catch (error) {
      continue;
    }
  }

  return false;
}

/**
 * Test Firebase service connectivity
 */
async function testFirebaseConnectivity(): Promise<boolean> {
  const firebaseEndpoints = [
    "https://firebase.googleapis.com",
    "https://firestore.googleapis.com",
    "https://identitytoolkit.googleapis.com",
  ];

  for (const endpoint of firebaseEndpoints) {
    try {
      await Promise.race([
        fetch(endpoint, { method: "HEAD", mode: "no-cors" }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 3000),
        ),
      ]);
      return true;
    } catch (error) {
      continue;
    }
  }

  return false;
}

/**
 * Test Firestore specific connectivity
 */
async function testFirestoreConnectivity(): Promise<boolean> {
  try {
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
    if (!projectId) return false;

    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

    await Promise.race([
      fetch(firestoreUrl, { method: "HEAD", mode: "no-cors" }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 3000),
      ),
    ]);

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Generate recommendations based on diagnostics
 */
function generateRecommendations(result: DiagnosticsResult): string[] {
  const recommendations: string[] = [];

  // Configuration issues
  if (!result.configuration.envVarsPresent) {
    recommendations.push("❌ Missing Firebase environment variables");
    recommendations.push(
      "💡 Check your .env file contains all required Firebase config",
    );
  }

  if (!result.configuration.validConfig) {
    recommendations.push("❌ Invalid Firebase configuration");
    recommendations.push(
      "💡 Verify API keys and project settings in Firebase Console",
    );
  }

  // Browser issues
  if (!result.browser.online) {
    recommendations.push("❌ Browser reports offline status");
    recommendations.push("💡 Check your internet connection");
  }

  if (!result.browser.cookiesEnabled) {
    recommendations.push("❌ Cookies are disabled");
    recommendations.push("💡 Enable cookies for Firebase authentication");
  }

  if (!result.browser.localStorageAvailable) {
    recommendations.push("❌ Local storage unavailable");
    recommendations.push("💡 Check browser privacy settings");
  }

  // Network issues
  if (!result.connectivity.internet) {
    recommendations.push("❌ No internet connectivity detected");
    recommendations.push("💡 Check network connection and try:");
    recommendations.push("   • Restart router/modem");
    recommendations.push("   • Try different network (mobile hotspot)");
    recommendations.push("   • Disable VPN temporarily");
  } else if (!result.connectivity.firebase) {
    recommendations.push("❌ Firebase services unreachable");
    recommendations.push("💡 Network can reach internet but not Firebase:");
    recommendations.push("   • Corporate firewall may block Firebase domains");
    recommendations.push(
      "   • Contact IT to whitelist: *.googleapis.com, *.firebase.com",
    );
    recommendations.push("   • Try different DNS servers (8.8.8.8, 1.1.1.1)");
  } else if (!result.connectivity.firestore) {
    recommendations.push("❌ Firestore specifically unreachable");
    recommendations.push("💡 Firebase reachable but Firestore blocked:");
    recommendations.push(
      "   • Check if Firestore is enabled in Firebase Console",
    );
    recommendations.push("   • Verify billing is set up for your project");
    recommendations.push("   • Check Firestore security rules");
  }

  // Network quality issues
  if (
    result.network.effectiveType === "slow-2g" ||
    result.network.effectiveType === "2g"
  ) {
    recommendations.push("⚠️ Slow network connection detected");
    recommendations.push("💡 Poor connection may cause timeouts:");
    recommendations.push("   • Try a faster connection");
    recommendations.push("   • Firebase will use offline mode when possible");
  }

  // Add success message if everything looks good
  if (
    result.connectivity.internet &&
    result.connectivity.firebase &&
    result.connectivity.firestore &&
    result.configuration.validConfig
  ) {
    recommendations.push("✅ All connectivity and configuration tests passed");
    recommendations.push("💡 If still having issues, try:");
    recommendations.push("   • Hard refresh (Ctrl+F5 or Cmd+Shift+R)");
    recommendations.push("   • Clear browser cache and cookies");
    recommendations.push("   • Check Firebase Console for service status");
  }

  return recommendations;
}

/**
 * Export diagnostics as a readable report
 */
export function exportDiagnosticsReport(result: DiagnosticsResult): string {
  const report = [
    "=== FIREBASE DIAGNOSTICS REPORT ===",
    `Generated: ${result.timestamp.toLocaleString()}`,
    "",
    "CONNECTIVITY TESTS:",
    `  Internet: ${result.connectivity.internet ? "✅ Connected" : "❌ Failed"}`,
    `  Firebase: ${result.connectivity.firebase ? "✅ Reachable" : "❌ Unreachable"}`,
    `  Firestore: ${result.connectivity.firestore ? "✅ Available" : "❌ Unavailable"}`,
    "",
    "CONFIGURATION:",
    `  Environment Variables: ${result.configuration.envVarsPresent ? "✅ Present" : "❌ Missing"}`,
    `  Project ID: ${result.configuration.projectId}`,
    `  Auth Domain: ${result.configuration.authDomain}`,
    `  Valid Config: ${result.configuration.validConfig ? "✅ Valid" : "❌ Invalid"}`,
    "",
    "BROWSER STATUS:",
    `  Online: ${result.browser.online ? "✅ Yes" : "❌ No"}`,
    `  Cookies: ${result.browser.cookiesEnabled ? "✅ Enabled" : "❌ Disabled"}`,
    `  Local Storage: ${result.browser.localStorageAvailable ? "✅ Available" : "❌ Unavailable"}`,
    `  User Agent: ${result.browser.userAgent}`,
    "",
    "NETWORK INFO:",
    `  Connection Type: ${result.network.effectiveType || "Unknown"}`,
    `  Download Speed: ${result.network.downlink ? `${result.network.downlink} Mbps` : "Unknown"}`,
    `  Latency: ${result.network.rtt ? `${result.network.rtt}ms` : "Unknown"}`,
    "",
    "RECOMMENDATIONS:",
    ...result.recommendations.map((rec) => `  ${rec}`),
    "",
    "=== END REPORT ===",
  ].join("\n");

  return report;
}

/**
 * Download diagnostics report as a file
 */
export function downloadDiagnosticsReport(result: DiagnosticsResult): void {
  const report = exportDiagnosticsReport(result);
  const blob = new Blob([report], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `firebase-diagnostics-${result.timestamp.toISOString().split("T")[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
