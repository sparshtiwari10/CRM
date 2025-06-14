import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { db } from "@/lib/firebase";
import { authService } from "@/services/authService";
import { PaymentService } from "@/services/paymentService";
import { VCInventoryService } from "@/services/vcInventoryService";
import { BillsService } from "@/services/billsService";
import { collection, addDoc, getDocs, Timestamp } from "firebase/firestore";

export default function FirebaseDebugTest() {
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (
    test: string,
    status: "success" | "error",
    message: string,
    data?: any,
  ) => {
    setResults((prev) => [
      ...prev,
      { test, status, message, data, timestamp: new Date() },
    ]);
  };

  const clearResults = () => {
    setResults([]);
  };

  const testFirebaseConnection = async () => {
    setIsLoading(true);
    clearResults();

    try {
      // Test 1: Check if db object exists
      addResult(
        "DB Object",
        db ? "success" : "error",
        db ? "Database object exists" : "Database object is null",
      );

      // Test 2: Check authentication
      const currentUser = authService.getCurrentUser();
      addResult(
        "Authentication",
        currentUser ? "success" : "error",
        currentUser
          ? `User: ${currentUser.name} (${currentUser.role})`
          : "No authenticated user",
      );

      // Test 3: Basic Firestore connection
      try {
        const testCollection = collection(db, "test_connection");
        addResult("Firestore Connection", "success", "Can access collections");
      } catch (error: any) {
        addResult(
          "Firestore Connection",
          "error",
          `Failed to access collections: ${error.message}`,
        );
      }

      // Test 4: Test direct invoice creation
      if (currentUser) {
        try {
          const testInvoiceData = {
            customerId: "test-customer",
            customerName: "Test Customer",
            customerArea:
              currentUser.assigned_areas?.[0] ||
              currentUser.collector_name ||
              "test-area",
            amountPaid: 100,
            paymentMethod: "cash",
            billIds: [],
            notes: "Firebase connection test",
            paidAt: new Date(),
            collectedBy: currentUser.name,
            receiptNumber: `TEST-${Date.now()}`,
            createdAt: Timestamp.now(),
          };

          const docRef = await addDoc(
            collection(db, "invoices"),
            testInvoiceData,
          );
          addResult(
            "Invoice Creation",
            "success",
            `Invoice created with ID: ${docRef.id}`,
          );
        } catch (error: any) {
          addResult(
            "Invoice Creation",
            "error",
            `Failed to create invoice: ${error.message}`,
            error,
          );
        }
      }

      // Test 5: Test VC creation
      if (currentUser) {
        try {
          const testVCData = {
            vcNumber: `TEST-${Date.now()}`,
            status: "available" as const,
            customerId: "unassigned",
            customerName: "",
            packageId: "test-package",
            area:
              currentUser.assigned_areas?.[0] ||
              currentUser.collector_name ||
              "test-area",
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            createdBy: currentUser.id,
            statusHistory: [
              {
                status: "available" as const,
                changedAt: Timestamp.now(),
                changedBy: currentUser.id,
                reason: "Test creation",
              },
            ],
            ownershipHistory: [],
          };

          const docRef = await addDoc(
            collection(db, "vcInventory"),
            testVCData,
          );
          addResult(
            "VC Creation",
            "success",
            `VC created with ID: ${docRef.id}`,
          );
        } catch (error: any) {
          addResult(
            "VC Creation",
            "error",
            `Failed to create VC: ${error.message}`,
            error,
          );
        }
      }

      // Test 6: Test bill creation
      if (currentUser) {
        try {
          const testBillData = {
            customerId: "test-customer",
            customerName: "Test Customer",
            month: new Date().toISOString().slice(0, 7),
            vcBreakdown: [
              {
                vcNumber: "TEST-VC",
                packageId: "test-package",
                packageName: "Test Package",
                amount: 500,
              },
            ],
            totalAmount: 500,
            status: "generated",
            billDueDate: Timestamp.fromDate(new Date()),
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          };

          const docRef = await addDoc(collection(db, "bills"), testBillData);
          addResult(
            "Bill Creation",
            "success",
            `Bill created with ID: ${docRef.id}`,
          );
        } catch (error: any) {
          addResult(
            "Bill Creation",
            "error",
            `Failed to create bill: ${error.message}`,
            error,
          );
        }
      }

      // Test 7: Test reading collections
      try {
        const collections = ["users", "customers", "packages", "areas"];
        for (const collectionName of collections) {
          try {
            const querySnapshot = await getDocs(collection(db, collectionName));
            addResult(
              `Read ${collectionName}`,
              "success",
              `Found ${querySnapshot.size} documents`,
            );
          } catch (error: any) {
            addResult(
              `Read ${collectionName}`,
              "error",
              `Failed to read: ${error.message}`,
            );
          }
        }
      } catch (error: any) {
        addResult(
          "Read Collections",
          "error",
          `Failed to read collections: ${error.message}`,
        );
      }
    } catch (error: any) {
      addResult(
        "General Error",
        "error",
        `Unexpected error: ${error.message}`,
        error,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const testServiceMethods = async () => {
    setIsLoading(true);
    clearResults();

    // Test PaymentService
    try {
      const testPayment = {
        customerId: "test-customer",
        customerName: "Test Customer",
        customerArea: "test-area",
        amountPaid: 100,
        paymentMethod: "cash" as const,
        billIds: [],
        notes: "Service test",
        paidAt: new Date(),
      };

      const payment = await PaymentService.collectPayment(testPayment);
      addResult(
        "PaymentService.collectPayment",
        "success",
        `Payment collected: ${payment.id}`,
      );
    } catch (error: any) {
      addResult(
        "PaymentService.collectPayment",
        "error",
        `Failed: ${error.message}`,
        error,
      );
    }

    // Test VCInventoryService
    try {
      const testVC = {
        vcNumber: `SERVICE-TEST-${Date.now()}`,
        status: "available" as const,
        customerId: "unassigned",
        customerName: "",
        packageId: "test-package",
        area: "test-area",
      };

      const vcId = await VCInventoryService.createVCItem(testVC);
      addResult(
        "VCInventoryService.createVCItem",
        "success",
        `VC created: ${vcId}`,
      );
    } catch (error: any) {
      addResult(
        "VCInventoryService.createVCItem",
        "error",
        `Failed: ${error.message}`,
        error,
      );
    }

    // Test BillsService
    try {
      const result = await BillsService.generateMonthlyBills();
      addResult(
        "BillsService.generateMonthlyBills",
        "success",
        `Generated ${result.summary.billsGenerated} bills, ${result.failed.length} failed`,
      );
    } catch (error: any) {
      addResult(
        "BillsService.generateMonthlyBills",
        "error",
        `Failed: ${error.message}`,
        error,
      );
    }

    setIsLoading(false);
  };

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Firebase Debug Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={testFirebaseConnection} disabled={isLoading}>
              Test Firebase Connection
            </Button>
            <Button
              onClick={testServiceMethods}
              disabled={isLoading}
              variant="outline"
            >
              Test Service Methods
            </Button>
            <Button onClick={clearResults} variant="ghost">
              Clear Results
            </Button>
          </div>

          {isLoading && (
            <Alert>
              <AlertDescription>Running tests...</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {results.map((result, index) => (
              <div key={index} className="border rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{result.test}</span>
                  <Badge
                    variant={
                      result.status === "success" ? "default" : "destructive"
                    }
                  >
                    {result.status}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">{result.message}</p>
                {result.data && (
                  <details className="mt-2">
                    <summary className="text-xs cursor-pointer">
                      Error Details
                    </summary>
                    <pre className="text-xs bg-gray-100 p-2 mt-1 rounded overflow-x-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                )}
                <span className="text-xs text-gray-400">
                  {result.timestamp.toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
