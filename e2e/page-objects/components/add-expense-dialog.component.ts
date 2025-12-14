import type { Locator, Page } from "@playwright/test";

/**
 * Add Expense Dialog Component Object Model
 *
 * Encapsulates all interactions with the Add Expense dialog/sheet
 * This is a component-level POM that can be reused across different pages
 */
export class AddExpenseDialogComponent {
  readonly page: Page;

  // Dialog container
  readonly dialog: Locator;
  readonly dialogTitle: Locator;

  // Form fields
  readonly amountInput: Locator;
  readonly categorySelect: Locator;
  readonly categoryOptions: Locator;
  readonly datePickerTrigger: Locator;
  readonly datePickerCalendar: Locator;
  readonly noteInput: Locator;

  // Action buttons
  readonly submitButton: Locator;
  readonly cancelButton: Locator;

  // Error states
  readonly formErrorMessage: Locator;
  readonly errorMessage: Locator;
  readonly retryButton: Locator;
  readonly amountValidationError: Locator;
  readonly categoryValidationError: Locator;

  // No budget state
  readonly createBudgetLink: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize locators using data-testid attributes
    this.dialog = page.getByTestId("add-expense-dialog");
    this.dialogTitle = this.dialog.getByRole("heading", { name: /dodaj wydatek/i });

    // Form fields
    this.amountInput = page.getByTestId("expense-amount-input");
    this.categorySelect = page.getByTestId("expense-category-select");
    this.categoryOptions = page.getByTestId("expense-category-options");
    this.datePickerTrigger = page.getByTestId("expense-date-trigger");
    this.datePickerCalendar = page.getByTestId("expense-date-calendar");
    this.noteInput = page.getByTestId("expense-note-input");

    // Action buttons
    this.submitButton = page.getByTestId("submit-expense-button");
    this.cancelButton = page.getByTestId("cancel-expense-button");

    // Error states
    this.formErrorMessage = page.getByTestId("form-error-message");
    this.errorMessage = page.getByTestId("error-message");
    this.retryButton = page.getByTestId("retry-button");
    this.amountValidationError = this.dialog.getByText(/kwota jest wymagana/i);
    this.categoryValidationError = this.dialog.getByText(/kategoria jest wymagana/i);

    // No budget state
    this.createBudgetLink = page.getByTestId("create-budget-link");
  }

  /**
   * Wait for dialog to be visible
   * Increased timeout to account for React hydration and state updates
   */
  async waitForDialog() {
    await this.dialog.waitFor({
      state: "visible",
      timeout: 10000,
    });
  }

  /**
   * Wait for dialog to be hidden
   * Increased timeout to account for animations and state cleanup
   */
  async waitForDialogToClose() {
    await this.dialog.waitFor({
      state: "hidden",
      timeout: 10000,
    });
  }

  /**
   * Check if dialog is visible
   */
  async isVisible(): Promise<boolean> {
    return await this.dialog.isVisible();
  }

  /**
   * Fill amount field
   * Waits for input to be ready before filling
   */
  async fillAmount(amount: string) {
    await this.amountInput.waitFor({ state: "visible" });
    await this.amountInput.fill(amount);
  }

  /**
   * Select category by ID
   * Waits for select to be ready before clicking
   */
  async selectCategory(categoryId: string) {
    await this.categorySelect.waitFor({ state: "visible" });
    await this.categorySelect.click();

    const option = this.page.getByTestId(`expense-category-option-${categoryId}`);
    await option.waitFor({ state: "visible" });
    await option.click();
  }

  /**
   * Select category by name
   * Waits for select to be ready before clicking
   */
  async selectCategoryByName(categoryName: string) {
    await this.categorySelect.waitFor({ state: "visible" });
    await this.categorySelect.click();

    const option = this.categoryOptions.getByText(categoryName, { exact: true });
    await option.waitFor({ state: "visible" });
    await option.click();
  }

  /**
   * Open date picker
   * Waits for trigger to be ready before clicking
   */
  async openDatePicker() {
    await this.datePickerTrigger.waitFor({ state: "visible" });
    await this.datePickerTrigger.click();
  }

  /**
   * Select date from calendar
   * @param date - Date object to select
   */
  async selectDate(date: Date) {
    await this.openDatePicker();

    // Wait for calendar to be visible
    await this.datePickerCalendar.waitFor({ state: "visible", timeout: 5000 });

    // Format date to match data-day attribute (M/D/YYYY format)
    const month = date.getMonth() + 1; // getMonth() is 0-indexed
    const day = date.getDate();
    const year = date.getFullYear();
    const dataDay = `${month}/${day}/${year}`;

    // Find button by data-day attribute for precise matching
    const dayButton = this.datePickerCalendar.locator(`button[data-day="${dataDay}"]`);
    await dayButton.waitFor({ state: "visible" });
    await dayButton.click();
  }

  /**
   * Fill note field
   * Waits for textarea to be ready before filling
   */
  async fillNote(note: string) {
    await this.noteInput.waitFor({ state: "visible" });
    await this.noteInput.fill(note);
  }

  /**
   * Submit the form
   * Waits for button to be enabled before clicking
   */
  async submit() {
    await this.submitButton.waitFor({ state: "visible" });
    await this.submitButton.click();
  }

  /**
   * Cancel the form
   * Waits for button to be visible before clicking
   */
  async cancel() {
    await this.cancelButton.waitFor({ state: "visible" });
    await this.cancelButton.click();
  }

  /**
   * Fill complete expense form
   * @param expense - Expense data to fill
   */
  async fillExpenseForm(expense: {
    amount: string;
    categoryId?: string;
    categoryName?: string;
    date?: Date;
    note?: string;
  }) {
    // Fill amount
    await this.fillAmount(expense.amount);

    // Select category
    if (expense.categoryId) {
      await this.selectCategory(expense.categoryId);
    } else if (expense.categoryName) {
      await this.selectCategoryByName(expense.categoryName);
    }

    // Select date if provided
    if (expense.date) {
      await this.selectDate(expense.date);
    }

    // Fill note if provided
    if (expense.note) {
      await this.fillNote(expense.note);
    }
  }

  /**
   * Fill expense form without amount (for testing validation errors)
   * @param expense - Expense data to fill (excluding amount)
   */
  async fillExpenseFormWithoutAmount(expense: {
    categoryId?: string;
    categoryName?: string;
    date?: Date;
    note?: string;
  }) {
    // Select category
    if (expense.categoryId) {
      await this.selectCategory(expense.categoryId);
    } else if (expense.categoryName) {
      await this.selectCategoryByName(expense.categoryName);
    }

    // Select date if provided
    if (expense.date) {
      await this.selectDate(expense.date);
    }

    // Fill note if provided
    if (expense.note) {
      await this.fillNote(expense.note);
    }
  }

  /**
   * Submit expense with complete data
   * @param expense - Expense data
   */
  async submitExpense(expense: {
    amount: string;
    categoryId?: string;
    categoryName?: string;
    date?: Date;
    note?: string;
  }) {
    await this.fillExpenseForm(expense);
    await this.submit();
  }

  /**
   * Check if form error is displayed
   */
  async hasFormError(): Promise<boolean> {
    return await this.formErrorMessage.isVisible();
  }

  /**
   * Get form error message text
   */
  async getFormErrorMessage(): Promise<string> {
    return (await this.formErrorMessage.textContent()) || "";
  }

  /**
   * Check if general error is displayed (e.g., categories loading error)
   */
  async hasError(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string> {
    return (await this.errorMessage.textContent()) || "";
  }

  /**
   * Check if "no budget" state is displayed
   */
  async isNoBudgetStateVisible(): Promise<boolean> {
    return await this.createBudgetLink.isVisible();
  }

  /**
   * Click create budget link
   */
  async clickCreateBudget() {
    await this.createBudgetLink.click();
  }

  /**
   * Check if submit button is disabled
   */
  async isSubmitButtonDisabled(): Promise<boolean> {
    return await this.submitButton.isDisabled();
  }

  /**
   * Check if submit button is enabled
   */
  async isSubmitButtonEnabled(): Promise<boolean> {
    return await this.submitButton.isEnabled();
  }

  /**
   * Get submit button text
   */
  async getSubmitButtonText(): Promise<string> {
    return (await this.submitButton.textContent()) || "";
  }
}
