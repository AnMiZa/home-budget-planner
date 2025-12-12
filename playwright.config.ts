import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });
/**
 * Playwright E2E Testing Configuration
 *
 * This configuration follows best practices:
 * - Chromium only (as per project requirements)
 * - Browser contexts for test isolation
 * - Trace on first retry for debugging
 * - Screenshot on failure
 * - Base URL configuration
 * - Separate test environments
 */

export default defineConfig({
  // Global setup - runs once before all tests
  globalSetup: "./e2e/global-setup.ts",

  // Global teardown - runs once after all tests
  globalTeardown: "./e2e/global-teardown.ts",

  // Test directory
  testDir: "./e2e",

  // Maximum time one test can run for
  timeout: 30 * 1000,

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["list"],
    ["junit", { outputFile: "test-results/junit.xml" }],
  ],

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.BASE_URL || "http://localhost:4321",

    // Collect trace when retrying the failed test
    trace: "on-first-retry",

    // Screenshot on failure
    screenshot: "only-on-failure",

    // Video on failure
    video: "retain-on-failure",

    // Browser context options
    contextOptions: {
      // Ignore HTTPS errors (useful for local testing)
      ignoreHTTPSErrors: true,
    },
  },

  // Configure projects for major browsers
  // Only Chromium as per project requirements
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },

    // Mobile testing - critical for mobile-first app
    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 5"],
      },
    },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: "npm run dev",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
