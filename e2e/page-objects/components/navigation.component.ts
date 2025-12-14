import type { Locator, Page } from "@playwright/test";

/**
 * Navigation Component Object Model
 *
 * Encapsulates interactions with the main navigation (Sidebar and TabBar)
 * Handles both desktop (sidebar) and mobile (tabbar) navigation variants
 */
export class NavigationComponent {
  readonly page: Page;

  // Add Expense buttons (different variants for desktop/mobile)
  readonly addExpenseButtonSidebar: Locator;
  readonly addExpenseButtonTabbar: Locator;

  // Navigation links
  readonly dashboardLink: Locator;
  readonly transactionsLink: Locator;
  readonly settingsLink: Locator;

  constructor(page: Page) {
    this.page = page;

    // Add Expense buttons
    this.addExpenseButtonSidebar = page.getByTestId("add-expense-button-sidebar");
    this.addExpenseButtonTabbar = page.getByTestId("add-expense-button-tabbar");

    // Navigation links - using accessible role-based selectors as fallback
    this.dashboardLink = page.getByRole("link", { name: /pulpit/i });
    this.transactionsLink = page.getByRole("link", { name: /transakcje/i });
    this.settingsLink = page.getByRole("link", { name: /ustawienia/i });
  }

  /**
   * Click Add Expense button
   * Automatically detects which variant (sidebar/tabbar) is visible
   * Waits for React hydration before clicking
   */
  async clickAddExpense() {
    // Wait for UI Context to be ready (React hydration complete)
    await this.waitForUIContextReady();

    // Try sidebar first (desktop), then tabbar (mobile)
    if (await this.addExpenseButtonSidebar.isVisible()) {
      await this.clickAddExpenseSidebar();
    } else if (await this.addExpenseButtonTabbar.isVisible()) {
      await this.clickAddExpenseTabbar();
    } else {
      throw new Error("Add Expense button not found in navigation");
    }
  }

  /**
   * Wait for UI Context to be ready
   * This ensures React has hydrated and the context is available
   */
  private async waitForUIContextReady() {
    await this.page.waitForSelector('[data-ui-context-ready="true"]', {
      state: "attached",
      timeout: 15000,
    });
  }

  /**
   * Click Add Expense button in sidebar (desktop)
   * Waits for button to be ready (React hydration)
   */
  async clickAddExpenseSidebar() {
    // Wait for UI Context to be ready
    await this.waitForUIContextReady();

    // Wait for button to be visible and enabled
    await this.addExpenseButtonSidebar.waitFor({ state: "visible", timeout: 10000 });

    // Verify button is enabled (not disabled)
    const isDisabled = await this.addExpenseButtonSidebar.isDisabled();
    if (isDisabled) {
      throw new Error("Add Expense button is disabled - React may not be hydrated");
    }

    // Click the button
    await this.addExpenseButtonSidebar.click({ timeout: 5000 });

    // Wait for React state to update
    await this.page.waitForTimeout(300);
  }

  /**
   * Click Add Expense button in tabbar (mobile)
   * Waits for button to be ready (React hydration)
   */
  async clickAddExpenseTabbar() {
    // Wait for UI Context to be ready
    await this.waitForUIContextReady();

    // Wait for button to be visible and enabled
    await this.addExpenseButtonTabbar.waitFor({ state: "visible", timeout: 10000 });

    // Verify button is enabled (not disabled)
    const isDisabled = await this.addExpenseButtonTabbar.isDisabled();
    if (isDisabled) {
      throw new Error("Add Expense button is disabled - React may not be hydrated");
    }

    // Click the button
    await this.addExpenseButtonTabbar.click({ timeout: 5000 });

    // Wait for React state to update
    await this.page.waitForTimeout(300);
  }

  /**
   * Navigate to Dashboard
   */
  async goToDashboard() {
    await this.dashboardLink.click();
  }

  /**
   * Navigate to Transactions
   */
  async goToTransactions() {
    await this.transactionsLink.click();
  }

  /**
   * Navigate to Settings
   */
  async goToSettings() {
    await this.settingsLink.click();
  }

  /**
   * Check if sidebar is visible (desktop view)
   */
  async isSidebarVisible(): Promise<boolean> {
    return await this.addExpenseButtonSidebar.isVisible();
  }

  /**
   * Check if tabbar is visible (mobile view)
   */
  async isTabbarVisible(): Promise<boolean> {
    return await this.addExpenseButtonTabbar.isVisible();
  }

  /**
   * Check if navigation is in desktop mode
   */
  async isDesktopMode(): Promise<boolean> {
    return await this.isSidebarVisible();
  }

  /**
   * Check if navigation is in mobile mode
   */
  async isMobileMode(): Promise<boolean> {
    return await this.isTabbarVisible();
  }
}
