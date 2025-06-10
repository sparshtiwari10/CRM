/**
 * Test script to verify user creation works without undefined field errors
 * This is a temporary debugging utility
 */

export const testUserCreation = () => {
  console.log("🧪 Testing user creation data preparation...");

  // Test data scenarios
  const testCases = [
    {
      name: "Admin User",
      userData: {
        email: "admin@test.com",
        password: "password123",
        name: "Test Admin",
        role: "admin" as const,
        collector_name: undefined,
        assigned_areas: undefined,
      },
    },
    {
      name: "Employee with single area",
      userData: {
        email: "employee1@test.com",
        password: "password123",
        name: "Test Employee 1",
        role: "employee" as const,
        collector_name: "Area 1",
        assigned_areas: ["Area 1"],
      },
    },
    {
      name: "Employee with multiple areas",
      userData: {
        email: "employee2@test.com",
        password: "password123",
        name: "Test Employee 2",
        role: "employee" as const,
        collector_name: undefined,
        assigned_areas: ["Area 1", "Area 2", "Downtown"],
      },
    },
    {
      name: "Employee with no areas (edge case)",
      userData: {
        email: "employee3@test.com",
        password: "password123",
        name: "Test Employee 3",
        role: "employee" as const,
        collector_name: undefined,
        assigned_areas: [],
      },
    },
  ];

  testCases.forEach((testCase) => {
    console.log(`\n📋 Testing: ${testCase.name}`);

    const { userData } = testCase;

    // Simulate the data preparation logic from authService.createUser
    const baseUserDoc = {
      email: userData.email,
      name: userData.name,
      role: userData.role,
      is_active: true,
      requires_password_reset: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Add optional fields only if they have values
    const userDoc: any = { ...baseUserDoc };

    // Handle collector_name for employees
    if (userData.role === "employee" && userData.collector_name) {
      userDoc.collector_name = userData.collector_name;
    }

    // Handle assigned_areas for employees (multi-area support)
    if (
      userData.role === "employee" &&
      userData.assigned_areas &&
      userData.assigned_areas.length > 0
    ) {
      userDoc.assigned_areas = userData.assigned_areas;
      // Set primary area as collector_name if not already set
      if (!userDoc.collector_name) {
        userDoc.collector_name = userData.assigned_areas[0];
      }
    }

    console.log("📝 Prepared user document:");
    console.log(JSON.stringify(userDoc, null, 2));

    // Check for undefined values
    const undefinedFields = Object.entries(userDoc).filter(
      ([key, value]) => value === undefined,
    );
    if (undefinedFields.length > 0) {
      console.log(
        "❌ Found undefined fields:",
        undefinedFields.map(([key]) => key),
      );
    } else {
      console.log("✅ No undefined fields found - document is clean");
    }
  });

  console.log("\n🎯 User creation test completed!");
};

// Export test function for browser console
if (typeof window !== "undefined") {
  (window as any).testUserCreation = testUserCreation;
}
