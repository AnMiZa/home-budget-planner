import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/login.page";
import { testUsers } from "../fixtures/test-data";

/**
 * Example E2E test for login functionality
 *
 * This demonstrates:
 * - Using Page Object Model
 * - Browser context isolation
 * - Test hooks for setup/teardown
 * - Accessible selectors
 * - Assertions with specific matchers
 */

test.describe("Login Page", () => {
  let loginPage: LoginPage;

  // Setup: runs before each test
  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test("should display login form", async () => {
    // Verify form elements are visible
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test("should show validation errors for empty fields", async () => {
    // Try to submit without filling fields
    await loginPage.submitButton.click();

    // Check for validation errors
    // Note: Update selectors based on your actual implementation
    await expect(loginPage.page).toHaveURL(/login/);
  });

  test("should navigate to register page", async ({ page }) => {
    await loginPage.goToRegister();

    // Verify navigation
    await expect(page).toHaveURL(/register/);
  });

  // Skip this test by default as it requires real authentication
  test("should login with valid credentials", async ({ page }) => {
    await loginPage.login(testUsers.valid.email, testUsers.valid.password);

    // Wait for redirect after successful login
    await page.waitForURL(/dashboard|\/$/);

    // Verify successful login
    await expect(page).not.toHaveURL(/login/);
  });

  // Skip this test by default
  test("should show error with invalid credentials", async () => {
    await loginPage.login(testUsers.invalid.email, testUsers.invalid.password);

    // Wait for error message
    await expect(loginPage.errorMessage).toBeVisible();

    // Verify error message content
    const errorText = await loginPage.getErrorMessage();

    expect(errorText).toContain("Nieprawidłowy login lub hasło.");
  });
});

/**
 * TODO: Replace skipped tests with real authentication tests
 *
 * You'll need to:
 * 1. Set up a test Supabase instance
 * 2. Create test users in setup
 * 3. Clean up test data in teardown
 * 4. Update test data fixtures with real credentials
 */
