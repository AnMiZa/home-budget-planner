import type { Page, Locator } from "@playwright/test";
import { BasePage } from "./base.page";

/**
 * Login Page Object Model
 *
 * Encapsulates all interactions with the login page
 * Following Page Object Model pattern for maintainable tests
 */
export class LoginPage extends BasePage {
  // Locators
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly registerLink: Locator;
  readonly resetPasswordLink: Locator;

  constructor(page: Page) {
    super(page);

    // Initialize locators using accessible selectors (Polish labels)
    // Use placeholder as fallback since label association might not work with React form
    this.emailInput = page.getByPlaceholder(/kowalski@example\.com/i);
    this.passwordInput = page.getByPlaceholder(/\*\*\*\*\*\*\*\*/);
    this.submitButton = this.getByRole("button", { name: /zaloguj się/i });
    this.errorMessage = page.locator('[role="alert"]');
    this.registerLink = this.getByRole("link", { name: /zarejestruj się/i });
    this.resetPasswordLink = this.getByRole("link", { name: /nie pamiętasz hasła/i });
  }

  /**
   * Navigate to login page
   */
  async goto() {
    await super.goto("/login");
    await this.waitForLoad();
    // Wait for React form to hydrate
    await this.emailInput.waitFor({ state: "visible", timeout: 15000 });
  }

  /**
   * Perform login action
   */
  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  /**
   * Check if error message is displayed
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
   * Navigate to register page
   */
  async goToRegister() {
    await this.registerLink.click();
  }

  /**
   * Navigate to reset password page
   */
  async goToResetPassword() {
    await this.resetPasswordLink.click();
  }
}
