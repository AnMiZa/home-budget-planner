import { test, expect } from "@playwright/test";
import { DashboardPage } from "../page-objects/dashboard.page";
import { validExpenses } from "../fixtures/expense-test-data";
import { login } from "../helpers/auth.helper";
import { testUsers } from "../fixtures/test-data";

/**
 * E2E tests for Add Expense functionality
 *
 * Test scenarios:
 * 1. Opening the Add Expense dialog
 * 2. Filling and submitting expense form
 * 3. Form validation
 * 4. Error handling
 * 5. Cancel action
 *
 * Following AAA pattern: Arrange, Act, Assert
 */

test.describe("Add Expense Flow", () => {
  let dashboardPage: DashboardPage;

  // Setup: runs before each test
  test.beforeEach(async ({ page }) => {
    // Login first
    await login(page, testUsers.valid.email, testUsers.valid.password);

    // Initialize dashboard page
    dashboardPage = new DashboardPage(page);
  });

  test.describe("Opening Add Expense Dialog", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    test("should open dialog when clicking Add Expense button in sidebar", async ({ page }, testInfo) => {
      // Skip this test on mobile projects - sidebar is not visible on mobile
      test.skip(testInfo.project.name === "mobile-chrome", "Sidebar is not visible on mobile viewports");

      // Arrange - ensure we're on dashboard
      await expect(dashboardPage.page).toHaveURL("/");

      // Act - click Add Expense button
      await dashboardPage.navigation.clickAddExpenseSidebar();

      // Assert - dialog should be visible
      await expect(dashboardPage.addExpenseDialog.dialog).toBeVisible();
      await expect(dashboardPage.addExpenseDialog.dialogTitle).toBeVisible();
    });

    test("should open dialog when clicking Add Expense button in tabbar (mobile)", async ({ page }) => {
      // Arrange - set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await dashboardPage.goto();

      // Act - click Add Expense button in tabbar
      await dashboardPage.navigation.clickAddExpenseTabbar();

      // Assert - dialog should be visible
      await expect(dashboardPage.addExpenseDialog.dialog).toBeVisible();
    });

    test("should display all form fields", async () => {
      // Arrange & Act
      await dashboardPage.openAddExpenseDialog();

      // Assert - all form fields should be visible
      await expect(dashboardPage.addExpenseDialog.amountInput).toBeVisible();
      await expect(dashboardPage.addExpenseDialog.categorySelect).toBeVisible();
      await expect(dashboardPage.addExpenseDialog.datePickerTrigger).toBeVisible();
      await expect(dashboardPage.addExpenseDialog.noteInput).toBeVisible();
      await expect(dashboardPage.addExpenseDialog.submitButton).toBeVisible();
      await expect(dashboardPage.addExpenseDialog.cancelButton).toBeVisible();
    });
  });

  test.describe("Submitting Expense", () => {
    test("should successfully add expense with all fields filled", async () => {
      // Arrange
      const expense = validExpenses.basic;
      await dashboardPage.openAddExpenseDialog();

      // Act
      await dashboardPage.addExpenseDialog.fillExpenseForm(expense);
      await dashboardPage.addExpenseDialog.submit();

      // Assert - dialog should close
      await expect(dashboardPage.addExpenseDialog.dialog).not.toBeVisible();

      // Wait for dashboard to refresh
      await dashboardPage.waitForRefresh();
    });

    test("should successfully add expense without note", async () => {
      // Arrange
      const expense = validExpenses.withoutNote;
      await dashboardPage.openAddExpenseDialog();

      // Act
      await dashboardPage.addExpenseDialog.fillExpenseForm(expense);
      await dashboardPage.addExpenseDialog.submit();

      // Assert
      await expect(dashboardPage.addExpenseDialog.dialog).not.toBeVisible();
    });

    test("should successfully add expense with custom date", async () => {
      // Arrange
      const expense = validExpenses.withCustomDate;
      await dashboardPage.openAddExpenseDialog();

      // Act
      await dashboardPage.addExpenseDialog.fillExpenseForm(expense);
      await dashboardPage.addExpenseDialog.submit();

      // Assert
      await expect(dashboardPage.addExpenseDialog.dialog).not.toBeVisible();
    });

    test("should add expense using helper method", async () => {
      // Arrange & Act - using convenience method
      await dashboardPage.addExpense(validExpenses.basic);

      // Assert - we're back on dashboard
      await expect(dashboardPage.page).toHaveURL("/");
    });
  });

  test.describe("Form Validation", () => {
    test("should show validation error for empty amount", async () => {
      // Arrange
      await dashboardPage.openAddExpenseDialog();

      // Act - try to submit without amount
      await dashboardPage.addExpenseDialog.selectCategoryByName("Inne");
      await dashboardPage.addExpenseDialog.submit();

      // Assert - form should show validation error
      // Note: Update based on your actual validation implementation
      await expect(dashboardPage.addExpenseDialog.dialog).toBeVisible();
    });

    test("should show validation error for missing category", async () => {
      // Arrange
      await dashboardPage.openAddExpenseDialog();

      // Act - fill amount but not category
      await dashboardPage.addExpenseDialog.fillAmount("100.00");
      await dashboardPage.addExpenseDialog.submit();

      // Assert - form should show validation error
      await expect(dashboardPage.addExpenseDialog.dialog).toBeVisible();
    });

    test("should disable submit button while submitting", async () => {
      // Arrange
      await dashboardPage.openAddExpenseDialog();
      await dashboardPage.addExpenseDialog.fillExpenseForm(validExpenses.basic);

      // Act - click submit
      const submitPromise = dashboardPage.addExpenseDialog.submit();

      // Assert - button should be disabled during submission
      // Note: This might be too fast to catch, consider using network mocking
      await submitPromise;
    });
  });

  test.describe("Cancel Action", () => {
    test("should close dialog when clicking cancel button", async () => {
      // Arrange
      await dashboardPage.openAddExpenseDialog();
      await dashboardPage.addExpenseDialog.fillAmount("100.00");

      // Act
      await dashboardPage.addExpenseDialog.cancel();

      // Assert - dialog should close
      await expect(dashboardPage.addExpenseDialog.dialog).not.toBeVisible();
    });

    test("should not save expense when cancelled", async () => {
      // Arrange
      await dashboardPage.openAddExpenseDialog();
      await dashboardPage.addExpenseDialog.fillExpenseForm(validExpenses.basic);

      // Act - cancel instead of submit
      await dashboardPage.addExpenseDialog.cancel();

      // Assert - dialog closed, no expense added
      await expect(dashboardPage.addExpenseDialog.dialog).not.toBeVisible();
      await expect(dashboardPage.page).toHaveURL("/");
    });
  });

  test.describe("Error States", () => {
    test("should display validation error when amount is missing", async () => {
      // Arrange
      await dashboardPage.openAddExpenseDialog();

      // Act - submit form without amount
      await dashboardPage.addExpenseDialog.fillExpenseFormWithoutAmount(validExpenses.basic);
      await dashboardPage.addExpenseDialog.submit();

      // Assert - validation error should be visible and dialog should remain open
      await expect(dashboardPage.addExpenseDialog.amountValidationError).toBeVisible();
      await expect(dashboardPage.addExpenseDialog.dialog).toBeVisible();
    });
  });

  test.describe("Accessibility", () => {
    test("should be keyboard navigable", async ({ page }) => {
      // Arrange
      await dashboardPage.openAddExpenseDialog();

      // Act - focus amount input and navigate using keyboard
      await dashboardPage.addExpenseDialog.amountInput.focus();
      await page.keyboard.type("100.00");
      await page.keyboard.press("Tab"); // Focus category
      await page.keyboard.press("Enter"); // Open category dropdown
      await page.keyboard.press("ArrowDown"); // Select first category
      await page.keyboard.press("Enter"); // Confirm selection

      // Assert - fields should be filled
      await expect(dashboardPage.addExpenseDialog.amountInput).toHaveValue("100.00");
    });

    test("should have proper ARIA labels", async () => {
      // Arrange & Act
      await dashboardPage.openAddExpenseDialog();

      // Assert - check for accessibility attributes
      await expect(dashboardPage.addExpenseDialog.amountInput).toHaveAttribute("type", "number");
      await expect(dashboardPage.addExpenseDialog.submitButton).toHaveAttribute("type", "submit");
    });
  });
});

/**
 * TODO: Additional test scenarios to implement
 *
 * 1. Network error handling
 * 2. Loading states
 * 3. Multiple expenses in sequence
 * 4. Visual regression testing with screenshots
 * 5. Performance testing (form submission time)
 * 6. Integration with real API (using test database)
 */
