# Testing Guide for Home Budget Planner

This document provides comprehensive information about the testing setup and best practices for the Home Budget Planner project.

## Table of Contents

1. [Overview](#overview)
2. [Unit & Integration Testing (Vitest)](#unit--integration-testing-vitest)
3. [E2E Testing (Playwright)](#e2e-testing-playwright)
4. [Running Tests](#running-tests)
5. [Writing Tests](#writing-tests)
6. [Best Practices](#best-practices)
7. [CI/CD Integration](#cicd-integration)

## Overview

Our testing strategy consists of two main layers:

- **Unit & Integration Tests (Vitest)**: Fast, isolated tests for functions, components, and business logic
- **E2E Tests (Playwright)**: Full user journey tests running in a real browser

### Tech Stack

- **Vitest**: Unit and integration testing framework
- **React Testing Library**: Component testing utilities
- **Playwright**: End-to-end testing framework (Chromium only)

## Unit & Integration Testing (Vitest)

### Configuration

Vitest is configured in `vitest.config.ts` with:

- **Environment**: jsdom (for DOM testing)
- **Coverage**: v8 provider with 80% threshold
- **Setup**: Global test utilities in `tests/setup.ts`

### Directory Structure

```
tests/
├── setup.ts                  # Global test configuration
├── utils/
│   └── test-helpers.ts      # Custom render functions and utilities
├── mocks/
│   └── supabase.mock.ts     # Mock Supabase client
└── examples/
    ├── formatters.test.ts   # Example unit test
    └── component.test.tsx   # Example component test
```

### Writing Unit Tests

```typescript
import { describe, it, expect } from "vitest";

describe("MyFunction", () => {
  it("should return expected value", () => {
    const result = myFunction(input);
    expect(result).toBe(expected);
  });
});
```

### Writing Component Tests

```typescript
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../utils/test-helpers';
import { MyComponent } from '@/components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    renderWithProviders(<MyComponent />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
```

### Mocking Supabase

```typescript
import { vi } from "vitest";
import { mockSupabaseClient } from "../mocks/supabase.mock";

vi.mock("@/db/supabase.client", () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));
```

## E2E Testing (Playwright)

### Configuration

Playwright is configured in `playwright.config.ts` with:

- **Browsers**: Chromium Desktop and Mobile Chrome only (as per requirements)
- **Base URL**: http://localhost:4321
- **Trace**: On first retry
- **Screenshots**: On failure only
- **Video**: Retain on failure

### Directory Structure

```
e2e/
├── pages/
│   ├── base.page.ts        # Base Page Object Model
│   └── login.page.ts       # Login page POM
├── helpers/
│   ├── auth.helper.ts      # Authentication helpers
│   └── api.helper.ts       # API testing helpers
├── fixtures/
│   └── test-data.ts        # Test data fixtures
└── examples/
    └── login.spec.ts       # Example E2E test
```

### Page Object Model Pattern

All E2E tests should use the Page Object Model pattern:

```typescript
import { Page, Locator } from "@playwright/test";
import { BasePage } from "./base.page";

export class MyPage extends BasePage {
  readonly myButton: Locator;

  constructor(page: Page) {
    super(page);
    this.myButton = this.getByRole("button", { name: /my button/i });
  }

  async clickMyButton() {
    await this.myButton.click();
  }
}
```

### Writing E2E Tests

```typescript
import { test, expect } from "@playwright/test";
import { MyPage } from "../pages/my.page";

test.describe("My Feature", () => {
  test("should perform action", async ({ page }) => {
    const myPage = new MyPage(page);
    await myPage.goto();
    await myPage.clickMyButton();
    await expect(myPage.myButton).toBeVisible();
  });
});
```

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

### E2E Tests

```bash
# Run E2E tests (headless)
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug tests
npm run test:e2e:debug

# Show test report
npm run test:e2e:report
```

### All Tests

```bash
# Run both unit and E2E tests
npm run test:all
```

## Best Practices

### General

1. **Write tests first** (TDD) or immediately after implementing features
2. **Keep tests simple and focused** - one assertion per test when possible
3. **Use descriptive test names** - describe what the test does and expected outcome
4. **Isolate tests** - each test should be independent
5. **Clean up after tests** - use afterEach hooks to reset state

### Unit Testing

1. **Test behavior, not implementation** - focus on inputs and outputs
2. **Mock external dependencies** - isolate the unit under test
3. **Use meaningful test data** - avoid magic numbers
4. **Group related tests** - use describe blocks for organization
5. **Prefer user-centric queries** - getByRole, getByLabel over getByTestId

### E2E Testing

1. **Use Page Object Model** - encapsulate page logic in page objects
2. **Use accessible selectors** - prefer role-based selectors (getByRole)
3. **Wait for elements** - use Playwright's auto-waiting or explicit waits
4. **Test critical user journeys** - focus on high-value flows
5. **Use API helpers for setup** - faster than UI interactions
6. **Keep tests maintainable** - avoid duplicated selectors

### Vitest-Specific

1. **Leverage vi object** - use vi.fn() for mocks, vi.spyOn() for spies
2. **Use inline snapshots** - for readable assertion of complex objects
3. **Configure coverage wisely** - focus on meaningful coverage, not 100%
4. **Use watch mode during development** - for instant feedback
5. **Type your mocks** - maintain type safety in tests

### Playwright-Specific

1. **Use browser contexts** - for test isolation
2. **Leverage trace viewer** - for debugging failures
3. **Use codegen tool** - to generate test selectors
4. **Implement visual testing** - use screenshot comparison when needed
5. **Test mobile responsiveness** - use mobile-chrome project

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npx playwright install chromium --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Coverage Thresholds

Current coverage thresholds are set to 80% for:

- Lines
- Functions
- Branches
- Statements

Excluded from coverage:

- node_modules
- tests
- e2e
- Type definitions (.d.ts)
- Config files
- Mock data
- Generated types (database.types.ts)

## Debugging Tests

### Unit Tests

1. Use `test.only()` to run a single test
2. Use `console.log()` or debugger statements
3. Run tests with `--reporter=verbose` for detailed output
4. Use Vitest UI (`npm run test:ui`) for visual debugging

### E2E Tests

1. Use `test.only()` to run a single test
2. Run with `--headed` flag to see the browser
3. Use `--debug` flag to step through tests
4. Use trace viewer to inspect test execution
5. Add `await page.pause()` to pause execution

## Common Issues

### Unit Tests

**Issue**: Tests fail with "Cannot find module"
**Solution**: Check path aliases in vitest.config.ts match tsconfig.json

**Issue**: DOM elements not found
**Solution**: Ensure setup.ts is loaded and jsdom environment is configured

### E2E Tests

**Issue**: Tests timeout
**Solution**: Increase timeout in playwright.config.ts or use explicit waits

**Issue**: Flaky tests
**Solution**: Use Playwright's auto-waiting, avoid hardcoded delays

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Getting Help

If you encounter issues with testing:

1. Check this documentation
2. Review example tests in `tests/examples/` and `e2e/examples/`
3. Check test output for error messages
4. Use debug tools (Vitest UI, Playwright trace viewer)
5. Ask the team for help

---

**Last updated**: December 2024
