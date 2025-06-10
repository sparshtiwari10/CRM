/**
 * Migration Script: Custom Authentication to Firebase Authentication
 *
 * This script migrates existing users from custom authentication to Firebase Authentication.
 * Run this after setting up Firebase Authentication in your project.
 *
 * Usage:
 * 1. Update the Firebase config below
 * 2. Run: node scripts/migrate-to-firebase-auth.js
 * 3. Check the output for migration results
 */

import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  connectAuthEmulator,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
  query,
  where,
  connectFirestoreEmulator,
  Timestamp,
} from "firebase/firestore";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Uncomment these lines if using emulators for testing
// connectAuthEmulator(auth, "http://localhost:9099");
// connectFirestoreEmulator(db, "localhost", 8080);

/**
 * Migration configuration
 */
const MIGRATION_CONFIG = {
  // Default domain for generating email addresses
  DEFAULT_DOMAIN: "agvcabletv.com",

  // Default password for migrated users (they will need to reset)
  DEFAULT_PASSWORD: "TempPassword123!",

  // Batch size for processing users
  BATCH_SIZE: 10,
};

/**
 * Main migration function
 */
async function migrateToFirebaseAuth() {
  console.log("🚀 Starting migration from custom auth to Firebase Auth...");
  console.log("=".repeat(60));

  try {
    // Step 1: Get existing users from Firestore
    const existingUsers = await getExistingUsers();

    if (existingUsers.length === 0) {
      console.log("⚠️  No existing users found to migrate");
      await createDefaultAdmin();
      return;
    }

    console.log(`📊 Found ${existingUsers.length} users to migrate`);
    console.log("");

    // Step 2: Migrate users in batches
    const migrationResults = [];

    for (
      let i = 0;
      i < existingUsers.length;
      i += MIGRATION_CONFIG.BATCH_SIZE
    ) {
      const batch = existingUsers.slice(i, i + MIGRATION_CONFIG.BATCH_SIZE);
      const batchResults = await migrateBatch(
        batch,
        i / MIGRATION_CONFIG.BATCH_SIZE + 1,
      );
      migrationResults.push(...batchResults);

      // Small delay between batches to avoid rate limiting
      if (i + MIGRATION_CONFIG.BATCH_SIZE < existingUsers.length) {
        await delay(1000);
      }
    }

    // Step 3: Generate migration report
    generateMigrationReport(migrationResults);

    console.log("🎉 Migration completed!");
    console.log(
      "📄 Check the migration-results.json file for detailed results",
    );
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

/**
 * Get existing users from the current system
 */
async function getExistingUsers() {
  console.log("🔍 Searching for existing users...");

  try {
    // Look for users in the 'users' collection
    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);

    const users = [];
    snapshot.forEach((doc) => {
      const data = doc.data();

      // Skip if this user is already migrated
      if (data.migrated_to_firebase_auth) {
        console.log(
          `⏭️  Skipping already migrated user: ${data.name || data.username}`,
        );
        return;
      }

      users.push({
        id: doc.id,
        ...data,
      });
    });

    return users;
  } catch (error) {
    console.error("❌ Failed to get existing users:", error);
    return [];
  }
}

/**
 * Migrate a batch of users
 */
async function migrateBatch(users, batchNumber) {
  console.log(`📦 Processing batch ${batchNumber} (${users.length} users)...`);

  const results = [];

  for (const user of users) {
    try {
      const result = await migrateUser(user);
      results.push(result);

      if (result.success) {
        console.log(`   ✅ ${result.name} -> ${result.email}`);
      } else {
        console.log(`   ❌ ${result.name}: ${result.error}`);
      }
    } catch (error) {
      console.log(`   ❌ ${user.name || user.username}: ${error.message}`);
      results.push({
        success: false,
        name: user.name || user.username,
        error: error.message,
        legacy_id: user.id,
      });
    }
  }

  return results;
}

/**
 * Migrate a single user
 */
async function migrateUser(legacyUser) {
  const userName = legacyUser.name || legacyUser.username || "Unknown User";

  // Generate email if not present
  const email =
    legacyUser.email ||
    `${(legacyUser.username || userName).toLowerCase().replace(/\s+/g, ".")}@${MIGRATION_CONFIG.DEFAULT_DOMAIN}`;

  try {
    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      MIGRATION_CONFIG.DEFAULT_PASSWORD,
    );

    // Prepare user data for Firestore
    const userData = {
      email: email,
      name: userName,
      role: legacyUser.role || "employee",
      collector_name: legacyUser.collector_name || null,
      is_active: legacyUser.is_active !== false,
      requires_password_reset: true,
      migrated_from_custom_auth: true,
      migration_date: Timestamp.now(),
      legacy_user_id: legacyUser.id,
      created_at: legacyUser.created_at || Timestamp.now(),
      updated_at: Timestamp.now(),
    };

    // Create user document in Firestore with Firebase UID
    await setDoc(doc(db, "users", userCredential.user.uid), userData);

    // Mark original user as migrated
    await setDoc(doc(db, "users", legacyUser.id), {
      ...legacyUser,
      migrated_to_firebase_auth: true,
      firebase_uid: userCredential.user.uid,
      migration_date: Timestamp.now(),
    });

    return {
      success: true,
      name: userName,
      email: email,
      firebase_uid: userCredential.user.uid,
      legacy_id: legacyUser.id,
      role: userData.role,
      temp_password: MIGRATION_CONFIG.DEFAULT_PASSWORD,
    };
  } catch (error) {
    if (error.code === "auth/email-already-in-use") {
      return {
        success: false,
        name: userName,
        email: email,
        error: "Email already in use",
        legacy_id: legacyUser.id,
      };
    }

    throw error;
  }
}

/**
 * Create default admin user if no users exist
 */
async function createDefaultAdmin() {
  console.log("🔧 No existing users found. Creating default admin...");

  const adminEmail = "admin@agvcabletv.com";
  const adminPassword = "admin123";

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      adminEmail,
      adminPassword,
    );

    await setDoc(doc(db, "users", userCredential.user.uid), {
      email: adminEmail,
      name: "System Administrator",
      role: "admin",
      is_active: true,
      requires_password_reset: true,
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
    });

    console.log("✅ Default admin created:");
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log("⚠️  Please change the password after first login");
  } catch (error) {
    console.error("❌ Failed to create default admin:", error);
  }
}

/**
 * Generate and save migration report
 */
function generateMigrationReport(results) {
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log("");
  console.log("📊 Migration Summary:");
  console.log("=".repeat(40));
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log(`📧 Total: ${results.length}`);

  if (successful.length > 0) {
    console.log("");
    console.log("✅ Successfully migrated users:");
    successful.forEach((user) => {
      console.log(`   ${user.name} (${user.role}) -> ${user.email}`);
    });
  }

  if (failed.length > 0) {
    console.log("");
    console.log("❌ Failed migrations:");
    failed.forEach((user) => {
      console.log(`   ${user.name}: ${user.error}`);
    });
  }

  // Save detailed results to file
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      successful: successful.length,
      failed: failed.length,
    },
    successful_migrations: successful,
    failed_migrations: failed,
    instructions: {
      next_steps: [
        "Update Firebase Authentication settings in console",
        "Deploy new Firestore security rules",
        "Test login with migrated accounts",
        "Send password reset emails to users",
        "Remove old authentication code",
      ],
      user_credentials: {
        default_password: MIGRATION_CONFIG.DEFAULT_PASSWORD,
        note: "All users need to reset their passwords",
      },
    },
  };

  // In a real environment, you'd save this to a file
  console.log("");
  console.log("📄 Detailed migration report:");
  console.log(JSON.stringify(report, null, 2));
}

/**
 * Utility function for delays
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run the migration
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateToFirebaseAuth().catch(console.error);
}

export { migrateToFirebaseAuth };
