import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, Timestamp } from "firebase/firestore";

export async function testFirebaseConnection() {
  console.log("🔥 Testing Firebase connection...");

  try {
    // Test 1: Check if Firebase is initialized
    if (!db) {
      throw new Error("Firebase database not initialized");
    }
    console.log("✅ Firebase database initialized");

    // Test 2: Try to read packages collection
    console.log("📦 Testing packages collection...");
    const packagesRef = collection(db, "packages");
    const packagesSnapshot = await getDocs(packagesRef);

    console.log(
      `📦 Packages collection: ${packagesSnapshot.size} documents found`,
    );

    if (packagesSnapshot.empty) {
      console.log(
        "📦 Packages collection is empty, creating sample package...",
      );

      // Create a sample package if collection is empty
      const samplePackage = {
        name: "Basic Package",
        price: 299,
        description: "Basic cable TV package with essential channels",
        channels: 50,
        features: ["Sports channels", "News channels", "Entertainment"],
        is_active: true,
        portal_amount: 299,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      const docRef = await addDoc(packagesRef, samplePackage);
      console.log("✅ Sample package created with ID:", docRef.id);
    } else {
      packagesSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`📦 Package found: ${data.name} - ₹${data.price}`);
      });
    }

    // Test 3: Try to read customers collection
    console.log("👥 Testing customers collection...");
    const customersRef = collection(db, "customers");
    const customersSnapshot = await getDocs(customersRef);

    console.log(
      `👥 Customers collection: ${customersSnapshot.size} documents found`,
    );

    return {
      success: true,
      packagesCount: packagesSnapshot.size,
      customersCount: customersSnapshot.size,
    };
  } catch (error) {
    console.error("❌ Firebase connection test failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Make available globally
if (typeof window !== "undefined") {
  (window as any).testFirebaseConnection = testFirebaseConnection;
}
