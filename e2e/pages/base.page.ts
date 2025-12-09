import { Page, Locator } from "@playwright/test";

/**
 * Base Page Object Model class
 * All page objects should extend this class
 *
 * This provides common functionality and enforces consistent patterns
 */
export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a specific path
   */
  async goto(path: string) {
    await this.page.goto(path);
  }

  /**
   * Wait for page to be loaded
   */
  async waitForLoad() {
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Get element by test ID
   * Prefer data-testid for resilient element selection
   */
  getByTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  /**
   * Get element by role (accessible)
   */
  getByRole(
    role: "button" | "link" | "heading" | "textbox" | "checkbox" | "radio",
    options?: { name?: string | RegExp }
  ): Locator {
    return this.page.getByRole(role, options);
  }

  /**
   * Get element by label text (for form inputs)
   */
  getByLabel(text: string | RegExp): Locator {
    return this.page.getByLabel(text);
  }

  /**
   * Get element by placeholder
   */
  getByPlaceholder(text: string | RegExp): Locator {
    return this.page.getByPlaceholder(text);
  }

  /**
   * Get element by text content
   */
  getByText(text: string | RegExp): Locator {
    return this.page.getByText(text);
  }

  /**
   * Take a screenshot
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({ path: `screenshots/${name}.png` });
  }

  /**
   * Wait for element to be visible
   */
  async waitForElement(locator: Locator) {
    await locator.waitFor({ state: "visible" });
  }

  /**
   * Fill form field
   */
  async fillField(locator: Locator, value: string) {
    await locator.fill(value);
  }

  /**
   * Click element
   */
  async click(locator: Locator) {
    await locator.click();
  }

  /**
   * Check if element is visible
   */
  async isVisible(locator: Locator): Promise<boolean> {
    return await locator.isVisible();
  }
}
