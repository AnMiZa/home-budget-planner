import { Page, Locator } from "@playwright/test";
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

    // Initialize locators using accessible selectors
    this.emailInput = this.getByLabel(/email/i);
    this.passwordInput = this.getByLabel(/password/i);
    this.submitButton = this.getByRole("button", { name: /log in|sign in/i });
    this.errorMessage = page.locator('[role="alert"]');
    this.registerLink = this.getByRole("link", { name: /register|sign up/i });
    this.resetPasswordLink = this.getByRole("link", { name: /forgot password|reset/i });
  }

  /**
   * Navigate to login page
   */
  async goto() {
    await super.goto("/login");
    await this.waitForLoad();
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
