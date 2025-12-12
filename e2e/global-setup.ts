import { chromium, FullConfig } from "@playwright/test";
import { testUsers } from "./fixtures/test-data";
import { setupTestData } from "./helpers/database-setup";
import { testHouseholdMembers, createTestBudgets } from "./fixtures/database-test-data";

/**
 * Global setup for Playwright tests
 *
 * This runs once before all tests and:
 * 1. Creates test users if they don't exist
 * 2. Sets up required database data (household, members, categories, budgets)
 * 3. Ensures consistent test data across all E2E tests
 *
 * Note: For this to work, you need to:
 * - Have PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.test
 * - Have E2E_USERNAME and E2E_PASSWORD configured
 */
async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;

  console.log("🔧 Running global setup...");

  const browser = await chromium.launch();
  const page = await browser.newPage();

  let userRegistered = false;

  try {
    // Try to register the test user (will fail if already exists, which is fine)
    console.log(`📝 Attempting to register test user: ${testUsers.valid.email}`);

    await page.goto(`${baseURL}/register`);
    await page.waitForLoadState("networkidle");

    // Fill registration form
    const emailInput = page.getByPlaceholder(/kowalski@example\.com/i);
    const passwordInput = page.getByPlaceholder(/\*\*\*\*\*\*\*\*/);
    const submitButton = page.getByRole("button", { name: /zarejestruj się/i });

    // Wait for form to be ready
    await emailInput.waitFor({ state: "visible", timeout: 10000 }).catch(() => {
      console.log("⚠️  Registration form not found, test user may already exist");
    });

    if (await emailInput.isVisible()) {
      await emailInput.fill(testUsers.valid.email);
      await passwordInput.fill(testUsers.valid.password);
      await submitButton.click();

      // Wait for redirect or error
      await page.waitForTimeout(2000);

      const currentUrl = page.url();
      if (currentUrl.includes("/login") || currentUrl === `${baseURL}/`) {
        console.log("✅ Test user registered successfully");
        userRegistered = true;
      } else {
        console.log("⚠️  Registration may have failed, but continuing...");
      }
    }
  } catch (error) {
    console.log("⚠️  Could not register test user (may already exist):", error);
  } finally {
    await browser.close();
  }

  // Set up database test data
  try {
    console.log("\n📦 Setting up database test data...");

    const result = await setupTestData(testUsers.valid.email, testUsers.valid.password, {
      members: testHouseholdMembers,
      budgets: createTestBudgets([], []), // Will be populated after members are created
      cleanupFirst: userRegistered, // Only cleanup if we just registered (fresh start)
    });

    // If we have members and categories, create budgets with proper references
    if (result.members.length > 0 && result.categories.length > 0) {
      console.log("💰 Creating budgets with incomes and planned expenses...");
      const budgets = createTestBudgets(result.members, result.categories);

      // Import the helper again to create budgets
      const { createTestSupabaseClient, getHouseholdId, createBudget } = await import("./helpers/database-setup");
      const supabase = createTestSupabaseClient();

      // Sign in to get user ID
      const { data: authData } = await supabase.auth.signInWithPassword({
        email: testUsers.valid.email,
        password: testUsers.valid.password,
      });

      if (authData?.user) {
        const householdId = await getHouseholdId(supabase, authData.user.id);

        if (householdId) {
          for (const budgetConfig of budgets) {
            await createBudget(supabase, householdId, budgetConfig);
          }
          console.log(`✅ Created ${budgets.length} budgets with test data`);
        }

        await supabase.auth.signOut();
      }
    }

    console.log("\n✅ Database test data setup complete");
    console.log(`   - Household ID: ${result.householdId}`);
    console.log(`   - Members: ${result.members.length}`);
    console.log(`   - Categories: ${result.categories.length}`);
    console.log(`   - Budgets: ${result.budgets.length}`);
  } catch (error) {
    console.error("❌ Failed to set up database test data:", error);
    throw error;
  }

  console.log("\n✅ Global setup complete");
}

export default globalSetup;
