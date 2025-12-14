import type { Page } from "@playwright/test";
import { LoginPage } from "../pages/login.page";

/**
 * Authentication helper for E2E tests
 *
 * Provides reusable authentication functions to avoid code duplication
 */

/**
 * Login helper - can be used in test setup
 */
export async function login(page: Page, email: string, password: string) {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(email, password);

  // Wait for successful login (adjust URL as needed)
  await page.waitForURL(/dashboard|\/$/);
}

/**
 * Logout helper
 */
export async function logout(page: Page) {
  // Implement logout logic based on your app
  // This is a placeholder
  const logoutButton = page.getByRole("button", { name: /log out|sign out/i });
  await logoutButton.click();
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  // Check for presence of authenticated-only elements
  // Adjust based on your app's structure
  const url = page.url();
  return !url.includes("/login") && !url.includes("/register");
}
