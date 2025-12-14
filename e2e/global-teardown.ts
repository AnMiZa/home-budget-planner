import dotenv from "dotenv";
import path from "path";
import { testUsers } from "./fixtures/test-data";
import { cleanupTestData, createTestSupabaseClient } from "./helpers/database-setup";

// Load environment variables from .env.test
dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });

/**
 * Global teardown for Playwright tests
 *
 * This runs once after all tests complete and:
 * 1. Cleans up all test data from the database
 * 2. Ensures a clean state for the next test run
 *
 * Note: This uses environment variables from .env.test:
 * - PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - E2E_USERNAME (test user email)
 * - E2E_PASSWORD (test user password)
 */
async function globalTeardown() {
  console.log("\n🧹 Running global teardown...");

  try {
    // Create Supabase client with service role key
    const supabase = createTestSupabaseClient();

    // Sign in as the test user to get their user ID
    console.log(`🔑 Authenticating as test user: ${testUsers.valid.email}`);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: testUsers.valid.email,
      password: testUsers.valid.password,
    });

    if (authError || !authData.user) {
      console.error("❌ Failed to authenticate test user:", authError?.message);
      throw new Error(`Failed to authenticate test user: ${authError?.message || "Unknown error"}`);
    }

    const userId = authData.user.id;
    console.log(`✅ Authenticated as user: ${userId}`);

    // Clean up all test data
    console.log("🗑️  Cleaning up test data from database...");
    await cleanupTestData(supabase, userId);

    // Sign out
    await supabase.auth.signOut();

    console.log("✅ Global teardown complete - database cleaned up");
  } catch (error) {
    console.error("❌ Failed to clean up test data:", error);
    // Don't throw error to avoid failing the test run
    // The cleanup is nice to have but not critical
    console.log("⚠️  Continuing despite cleanup failure...");
  }
}

export default globalTeardown;
