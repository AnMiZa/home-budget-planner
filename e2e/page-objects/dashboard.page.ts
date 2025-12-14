import type { Locator, Page } from "@playwright/test";
import { BasePage } from "../pages/base.page";
import { NavigationComponent } from "./components/navigation.component";
import { AddExpenseDialogComponent } from "./components/add-expense-dialog.component";

/**
 * Dashboard Page Object Model
 *
 * Encapsulates all interactions with the dashboard page
 * Includes navigation and add expense functionality
 */
export class DashboardPage extends BasePage {
  // Components
  readonly navigation: NavigationComponent;
  readonly addExpenseDialog: AddExpenseDialogComponent;

  // Dashboard-specific elements
  readonly pageTitle: Locator;
  readonly overallSummaryCard: Locator;
  readonly categoryCards: Locator;
  readonly emptyState: Locator;
  readonly createBudgetButton: Locator;
  readonly editBudgetButton: Locator;

  constructor(page: Page) {
    super(page);

    // Initialize components
    this.navigation = new NavigationComponent(page);
    this.addExpenseDialog = new AddExpenseDialogComponent(page);

    // Dashboard elements
    this.pageTitle = page.getByRole("heading", { name: /twój budżet/i, level: 1 });
    this.overallSummaryCard = page.getByRole("heading", { name: /podsumowanie budżetu/i });
    this.categoryCards = page.getByRole("heading", { name: /kategorie wydatków/i });
    this.emptyState = page.getByRole("heading", { name: /nie masz jeszcze aktywnego budżetu/i });
    this.createBudgetButton = page.getByRole("button", { name: /stwórz budżet/i });
    this.editBudgetButton = page.getByRole("button", { name: /edytuj budżet/i });
  }

  /**
   * Navigate to dashboard page
   */
  async goto() {
    await super.goto("/");
    await this.waitForLoad();
  }

  /**
   * Check if dashboard is loaded with budget data
   */
  async hasBudgetData(): Promise<boolean> {
    return await this.overallSummaryCard.isVisible();
  }

  /**
   * Check if empty state is displayed (no budget)
   */
  async isEmptyState(): Promise<boolean> {
    return await this.emptyState.isVisible();
  }

  /**
   * Open Add Expense dialog
   * Ensures page is fully loaded before attempting to open dialog
   */
  async openAddExpenseDialog() {
    // Ensure page is fully loaded (including React hydration)
    await this.waitForLoad();
    await this.waitForReactContext();

    // Click the Add Expense button
    await this.navigation.clickAddExpense();

    // Wait for dialog to appear
    await this.addExpenseDialog.waitForDialog();
  }

  /**
   * Add a new expense (complete flow)
   * @param expense - Expense data
   */
  async addExpense(expense: {
    amount: string;
    categoryId?: string;
    categoryName?: string;
    date?: Date;
    note?: string;
  }) {
    // Open dialog (includes wait for page load)
    await this.openAddExpenseDialog();

    // Fill and submit form
    await this.addExpenseDialog.submitExpense(expense);

    // Wait for dialog to close
    await this.addExpenseDialog.waitForDialogToClose();

    // Wait for any post-submission updates
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Get category card by name
   */
  getCategoryCard(categoryName: string): Locator {
    return this.page.getByRole("heading", { name: categoryName, exact: true });
  }

  /**
   * Check if category card exists
   */
  async hasCategoryCard(categoryName: string): Promise<boolean> {
    return await this.getCategoryCard(categoryName).isVisible();
  }

  /**
   * Click Edit Budget button
   */
  async clickEditBudget() {
    await this.editBudgetButton.click();
  }

  /**
   * Click Create Budget button (from empty state)
   */
  async clickCreateBudget() {
    await this.createBudgetButton.click();
  }

  /**
   * Get total income amount from summary
   */
  async getTotalIncome(): Promise<string> {
    const summaryText = await this.overallSummaryCard.locator("..").textContent();
    const match = summaryText?.match(/(\d+[,.]?\d*)\s*zł/);
    return match ? match[1] : "0";
  }

  /**
   * Wait for dashboard to refresh (after adding expense)
   */
  async waitForRefresh() {
    // Wait for network idle after expense is added
    await this.page.waitForLoadState("networkidle");
  }
}
