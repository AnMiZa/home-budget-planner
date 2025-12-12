# E2E Testing with Playwright

This directory contains end-to-end tests for the Home Budget Planner application using Playwright.

## Structure

```
e2e/
├── examples/          # Example test files
├── fixtures/          # Test data and fixtures
│   ├── test-data.ts
│   ├── expense-test-data.ts
│   └── database-test-data.ts  # Database setup fixtures
├── helpers/           # Helper functions for tests
│   ├── api.helper.ts
│   ├── auth.helper.ts
│   └── database-setup.ts      # Database setup utilities
├── pages/             # Base Page Object Models
│   ├── base.page.ts
│   └── login.page.ts
├── page-objects/      # Feature-specific Page Objects
│   ├── components/    # Reusable component objects
│   │   ├── add-expense-dialog.component.ts
│   │   └── navigation.component.ts
│   └── dashboard.page.ts
├── specs/             # Test specifications
│   └── add-expense.spec.ts
├── global-setup.ts    # Global test setup (runs before all tests)
├── DATABASE_SETUP.md  # Database setup documentation
├── RUN_TESTS.md       # Quick start guide
├── TROUBLESHOOTING.md # Troubleshooting guide
└── README.md          # This file
```

## Getting Started

### Prerequisites

- Node.js installed
- Dependencies installed (`npm install`)
- Application running locally
- `.env.test` file configured with Supabase credentials (see [Database Setup](./DATABASE_SETUP.md))

### Running Tests

#### Recommended Workflow (Manual Server)

**Terminal 1** - Start dev server:

```bash
npm run dev
```

**Terminal 2** - Run tests:

```bash
# Run all tests
npm run test:e2e

# Run tests in UI mode (interactive, best for development)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Run specific test file
npx playwright test e2e/specs/add-expense.spec.ts

# Run tests in debug mode
npx playwright test --debug

# Run tests with trace
npx playwright test --trace on
```

#### Alternative: Automatic Server (may have issues)

If you want Playwright to start the server automatically:

```bash
npm run test:e2e:ui
```

⚠️ **Note**: If you get "Process from config.webServer exited early" error, use the manual server approach above.

## Page Object Model Pattern

Tests use the Page Object Model (POM) pattern for better maintainability:

### Component-Level POMs

For reusable UI components:

```typescript
// Example: Using AddExpenseDialogComponent
import { AddExpenseDialogComponent } from "../page-objects/components/add-expense-dialog.component";

const addExpenseDialog = new AddExpenseDialogComponent(page);
await addExpenseDialog.waitForDialog();
await addExpenseDialog.fillAmount("150.50");
await addExpenseDialog.selectCategoryByName("Inne");
await addExpenseDialog.submit();
```

### Page-Level POMs

For complete pages with integrated components:

```typescript
// Example: Using DashboardPage
import { DashboardPage } from "../page-objects/dashboard.page";

const dashboardPage = new DashboardPage(page);
await dashboardPage.goto();
await dashboardPage.addExpense({
  amount: "150.50",
  categoryName: "Żywność",
  note: "Zakupy",
});
```

## Writing Tests

### Test Structure

Follow the AAA (Arrange, Act, Assert) pattern:

```typescript
test("should add new expense", async ({ page }) => {
  // Arrange - Set up test conditions
  const dashboardPage = new DashboardPage(page);
  await dashboardPage.goto();

  // Act - Perform actions
  await dashboardPage.addExpense({
    amount: "150.50",
    categoryName: "Inne",
    note: "Test expense",
  });

  // Assert - Verify results
  await expect(dashboardPage.page).toHaveURL("/");
  await expect(dashboardPage.addExpenseDialog.dialog).not.toBeVisible();
});
```

### Best Practices

1. **Use Page Objects**: Encapsulate page interactions in Page Object classes
2. **Use data-testid**: All interactive elements have `data-testid` attributes
3. **Component Composition**: Break down complex pages into reusable components
4. **Use Accessible Selectors**: Prefer `getByRole`, `getByLabel`, `getByTestId`
5. **Avoid Hard Waits**: Use Playwright's auto-waiting features
6. **Isolate Tests**: Each test should be independent
7. **Use Test Hooks**: Set up and tear down in `beforeEach`/`afterEach`
8. **Descriptive Names**: Test names should clearly describe what they test

### Selectors Priority

1. `getByTestId` - Primary method for elements with `data-testid` attributes
2. `getByRole` - Most resilient, accessibility-focused
3. `getByLabel` - Good for form inputs
4. `getByPlaceholder` - Alternative for inputs
5. CSS/XPath - Last resort, avoid if possible

### Using data-testid Attributes

All key interactive elements have `data-testid` attributes:

```typescript
// Access elements by test ID
const amountInput = page.getByTestId("expense-amount-input");
const submitButton = page.getByTestId("submit-expense-button");
const dialog = page.getByTestId("add-expense-dialog");

// Or use the helper method from BasePage
const dashboardPage = new DashboardPage(page);
const amountInput = dashboardPage.getByTestId("expense-amount-input");
```

## Test Data

### Database Test Data

The E2E tests use a real test database with pre-configured data. Before tests run, the global setup script automatically creates:

- **Test User**: Registered user with credentials from `.env.test`
- **Household**: Automatically created for the test user
- **Default Categories**: 11 default expense categories (Food, Transport, Housing, etc.)
- **Household Members**: 2 test members (Jan Kowalski, Anna Kowalska)
- **Test Budgets**: 2 budgets (current month and next month) with incomes and planned expenses

**📖 For detailed information about database setup, see [DATABASE_SETUP.md](./DATABASE_SETUP.md)**

### Fixture Test Data

Test data for UI interactions is stored in `fixtures/` directory:

```typescript
import { validExpenses } from "../fixtures/expense-test-data";

// Use predefined test data
await dashboardPage.addExpense(validExpenses.basic);

// Or create custom data
await dashboardPage.addExpense({
  amount: "100.00",
  categoryName: "Transport",
  note: "Custom test expense",
});
```

### Available Test Data

- `validExpenses` - Valid expense scenarios
- `invalidExpenses` - Invalid data for validation testing
- `testCategories` - Category test data
- `testHouseholdMembers` - Household member data (created in database)
- Helper functions: `getToday()`, `getYesterday()`, `getDaysAgo(n)`

## Component Objects

### AddExpenseDialogComponent

Handles all interactions with the Add Expense dialog:

```typescript
const dialog = new AddExpenseDialogComponent(page);

// Wait for dialog
await dialog.waitForDialog();

// Fill form fields
await dialog.fillAmount("150.50");
await dialog.selectCategoryByName("Inne");
await dialog.fillNote("Test note");

// Or fill all at once
await dialog.fillExpenseForm({
  amount: "150.50",
  categoryName: "Inne",
  note: "Test note",
});

// Submit or cancel
await dialog.submit();
await dialog.cancel();

// Check states
const isVisible = await dialog.isVisible();
const hasError = await dialog.hasFormError();
```

### NavigationComponent

Handles navigation interactions:

```typescript
const navigation = new NavigationComponent(page);

// Open Add Expense dialog
await navigation.clickAddExpense(); // Auto-detects sidebar/tabbar

// Or specify variant
await navigation.clickAddExpenseSidebar(); // Desktop
await navigation.clickAddExpenseTabbar(); // Mobile

// Navigate to pages
await navigation.goToDashboard();
await navigation.goToTransactions();
await navigation.goToSettings();

// Check viewport mode
const isDesktop = await navigation.isDesktopMode();
const isMobile = await navigation.isMobileMode();
```

## Debugging

### Visual Debugging

```bash
# Open Playwright Inspector
npx playwright test --debug

# Debug specific test
npx playwright test e2e/specs/add-expense.spec.ts --debug

# Generate trace
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

### View Test Report

```bash
npx playwright show-report
```

### Screenshots

```bash
# Take screenshot on failure (enabled by default)
npx playwright test --screenshot=only-on-failure

# Take screenshot always
npx playwright test --screenshot=on
```

## CI/CD Integration

Tests can be run in CI/CD pipelines. See `.github/workflows/test.yml.example` for configuration.

## Test Coverage

### Current Coverage

- ✅ Add Expense dialog opening
- ✅ Form field interactions
- ✅ Form submission
- ✅ Cancel action
- ✅ Basic validation
- ✅ Keyboard navigation
- ✅ Mobile/Desktop variants

### TODO

- [x] Set up test Supabase instance
- [x] Add authentication helpers
- [x] Set up automatic database test data creation
- [ ] Complete API error handling tests
- [ ] Add visual regression tests
- [ ] Set up parallel test execution
- [ ] Add performance tests
- [ ] Add more budget and transaction tests

## Troubleshooting

Having issues? Check the [Troubleshooting Guide](./TROUBLESHOOTING.md) for common problems and solutions.

Common issues:

- **"Process from config.webServer exited early"** → Run dev server manually
- **"net::ERR_CONNECTION_REFUSED"** → Make sure dev server is running
- **"Executable doesn't exist"** → Run `npx playwright install chromium`

## Resources

### Documentation

- [Quick Start Guide](./RUN_TESTS.md) - Fast guide to running tests
- [Database Setup](./DATABASE_SETUP.md) - Database configuration and test data
- [Troubleshooting Guide](./TROUBLESHOOTING.md) - Common issues and solutions

### External Resources

- [Playwright Documentation](https://playwright.dev)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Accessibility Testing](https://playwright.dev/docs/accessibility-testing)
