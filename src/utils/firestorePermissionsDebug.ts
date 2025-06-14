import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

interface PermissionTestResult {
  collection: string;
  operation: string;
  success: boolean;
  error?: string;
  timestamp: string;
}

export class FirestorePermissionsDebugger {
  private static testResults: PermissionTestResult[] = [];

  /**
   * Test basic permissions for a collection
   */
  static async testCollectionPermissions(
    collectionName: string,
  ): Promise<PermissionTestResult[]> {
    const results: PermissionTestResult[] = [];
    const testDocId = `test_${Date.now()}`;

    // Test READ permission
    try {
      await getDocs(collection(db, collectionName));
      results.push({
        collection: collectionName,
        operation: "READ",
        success: true,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      results.push({
        collection: collectionName,
        operation: "READ",
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    // Test WRITE permission (CREATE)
    try {
      await setDoc(doc(db, collectionName, testDocId), {
        test: true,
        createdAt: new Date().toISOString(),
        userId: getAuth().currentUser?.uid,
      });
      results.push({
        collection: collectionName,
        operation: "CREATE",
        success: true,
        timestamp: new Date().toISOString(),
      });

      // Clean up test document
      try {
        await deleteDoc(doc(db, collectionName, testDocId));
      } catch (cleanupError) {
        console.warn(`Could not clean up test document: ${cleanupError}`);
      }
    } catch (error: any) {
      results.push({
        collection: collectionName,
        operation: "CREATE",
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    this.testResults.push(...results);
    return results;
  }

  /**
   * Test permissions for all Cable TV CRM collections
   */
  static async testAllCRMCollections(): Promise<PermissionTestResult[]> {
    const collections = [
      "vcInventory",
      "bills",
      "invoices",
      "customers",
      "packages",
      "users",
    ];

    const allResults: PermissionTestResult[] = [];

    for (const collectionName of collections) {
      console.log(`Testing permissions for ${collectionName}...`);
      const results = await this.testCollectionPermissions(collectionName);
      allResults.push(...results);
    }

    return allResults;
  }

  /**
   * Display formatted test results
   */
  static displayResults(results: PermissionTestResult[]): void {
    console.log("\n🔒 Firestore Permissions Test Results:");
    console.log("=====================================");

    const groupedResults = results.reduce(
      (acc, result) => {
        if (!acc[result.collection]) {
          acc[result.collection] = [];
        }
        acc[result.collection].push(result);
        return acc;
      },
      {} as Record<string, PermissionTestResult[]>,
    );

    Object.entries(groupedResults).forEach(
      ([collection, collectionResults]) => {
        console.log(`\n📦 Collection: ${collection}`);
        collectionResults.forEach((result) => {
          const status = result.success ? "✅" : "❌";
          const error = result.error ? ` (${result.error})` : "";
          console.log(`  ${status} ${result.operation}${error}`);
        });
      },
    );

    // Summary
    const totalTests = results.length;
    const successfulTests = results.filter((r) => r.success).length;
    const failedTests = totalTests - successfulTests;

    console.log(`\n📊 Summary:`);
    console.log(`  Total Tests: ${totalTests}`);
    console.log(`  ✅ Successful: ${successfulTests}`);
    console.log(`  ❌ Failed: ${failedTests}`);

    if (failedTests > 0) {
      console.log(`\n🚨 Action Required:`);
      console.log(
        `  Deploy updated Firestore rules to fix ${failedTests} permission issues.`,
      );
      console.log(`  Run: firebase deploy --only firestore:rules`);
    }
  }

  /**
   * Quick fix utility - creates minimal test data to verify collections work
   */
  static async createTestData(): Promise<void> {
    console.log("🧪 Creating test data for new collections...");

    try {
      // Test VC Inventory
      const vcTestData = {
        vcNumber: "TEST001",
        status: "available",
        area: "Test Area",
        createdAt: new Date().toISOString(),
        createdBy: auth.currentUser?.uid || "test-user",
      };

      await setDoc(doc(db, "vcInventory", "test-vc"), vcTestData);
      console.log("✅ VC Inventory test document created");

      // Test Bills
      const billTestData = {
        customerId: "test-customer",
        customerName: "Test Customer",
        customerArea: "Test Area",
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        dueAmount: 100,
        status: "generated",
        createdAt: new Date().toISOString(),
        vcBreakdown: [],
      };

      await setDoc(doc(db, "bills", "test-bill"), billTestData);
      console.log("✅ Bills test document created");

      // Test Invoices
      const invoiceTestData = {
        customerId: "test-customer",
        customerName: "Test Customer",
        customerArea: "Test Area",
        amount: 100,
        paymentMethod: "cash",
        paymentDate: new Date().toISOString(),
        receiptNumber: "TEST001",
        collectedBy: auth.currentUser?.uid || "test-user",
      };

      await setDoc(doc(db, "invoices", "test-invoice"), invoiceTestData);
      console.log("✅ Invoices test document created");

      console.log("🎉 All test data created successfully!");
    } catch (error: any) {
      console.error("❌ Error creating test data:", error.message);
      throw error;
    }
  }

  /**
   * Clean up test data
   */
  static async cleanupTestData(): Promise<void> {
    console.log("🧹 Cleaning up test data...");

    try {
      await deleteDoc(doc(db, "vcInventory", "test-vc"));
      await deleteDoc(doc(db, "bills", "test-bill"));
      await deleteDoc(doc(db, "invoices", "test-invoice"));
      console.log("✅ Test data cleaned up successfully");
    } catch (error: any) {
      console.warn(
        "⚠️ Some test data may not have been cleaned up:",
        error.message,
      );
    }
  }

  /**
   * Get current user context for debugging
   */
  static getCurrentUserContext(): any {
    const user = getAuth().currentUser;
    return {
      authenticated: !!user,
      uid: user?.uid,
      email: user?.email,
      emailVerified: user?.emailVerified,
    };
  }

  /**
   * Main debug function to run all tests
   */
  static async runFullDiagnostics(): Promise<void> {
    console.log("🚀 Starting Firestore Permissions Diagnostics...");

    // Show user context
    console.log("👤 User Context:", this.getCurrentUserContext());

    // Test permissions
    const results = await this.testAllCRMCollections();
    this.displayResults(results);

    // Try to create test data if there are write failures
    const writeFailures = results.filter(
      (r) => r.operation === "CREATE" && !r.success,
    );
    if (writeFailures.length > 0) {
      console.log(
        "\n🔧 Attempting to create test data despite permission errors...",
      );
      try {
        await this.createTestData();
      } catch (error) {
        console.error(
          "❌ Could not create test data - permissions need to be fixed",
        );
      }
    }
  }
}

// Make available globally for console debugging
if (typeof window !== "undefined") {
  (window as any).FirestoreDebugger = FirestorePermissionsDebugger;
  (window as any).testFirestorePermissions = () =>
    FirestorePermissionsDebugger.runFullDiagnostics();
}

export default FirestorePermissionsDebugger;
