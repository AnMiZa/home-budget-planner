# E2E Tests

This directory contains end-to-end tests using Playwright.

## Structure

```
e2e/
├── pages/          # Page Object Models
├── helpers/        # Reusable helper functions
├── fixtures/       # Test data and fixtures
└── examples/       # Example test files
```

## Page Object Model (POM)

All page interactions should be encapsulated in Page Objects:

```typescript
// e2e/pages/my-page.page.ts
import { BasePage } from './base.page';

export class MyPage extends BasePage {
  // Define locators as class properties
  readonly myButton = this.getByRole('button', { name: /click me/i });

  // Define actions as methods
  async clickButton() {
    await this.myButton.click();
  }
}
```

## Writing Tests

```typescript
// e2e/my-feature.spec.ts
import { test, expect } from '@playwright/test';
import { MyPage } from './pages/my-page.page';

test.describe('My Feature', () => {
  test('should work correctly', async ({ page }) => {
    const myPage = new MyPage(page);
    await myPage.goto('/my-route');
    await myPage.clickButton();
    await expect(myPage.myButton).toBeVisible();
  });
});
```

## Best Practices

1. **Use Page Object Model** - Keep page logic separate from tests
2. **Use accessible selectors** - Prefer getByRole, getByLabel
3. **Avoid hardcoded waits** - Use Playwright's auto-waiting
4. **Clean test data** - Use beforeEach/afterEach for setup/teardown
5. **Test critical paths** - Focus on important user journeys

## Running Tests

See main [TESTING.md](../TESTING.md) for all available commands.

Quick reference:
```bash
npm run test:e2e          # Run all E2E tests
npm run test:e2e:ui       # Interactive UI mode
npm run test:e2e:debug    # Debug mode
```

