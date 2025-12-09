# Testing Environment Setup Guide

This guide explains the testing environment setup for the Home Budget Planner project.

## ✅ What's Been Set Up

### Unit & Integration Testing (Vitest)

1. **Installed Packages:**
   - `vitest` - Test framework
   - `@vitest/ui` - Interactive UI for running tests
   - `@vitest/coverage-v8` - Coverage reporting
   - `jsdom` & `happy-dom` - DOM environments for testing
   - `@testing-library/react` - React component testing utilities
   - `@testing-library/jest-dom` - Custom matchers for DOM
   - `@testing-library/user-event` - User interaction simulation

2. **Configuration Files:**
   - `vitest.config.ts` - Main Vitest configuration
   - `tests/setup.ts` - Global test setup and mocks

3. **Test Structure:**
   ```
   tests/
   ├── setup.ts              # Global setup
   ├── utils/
   │   └── test-helpers.ts  # Custom utilities
   ├── mocks/
   │   └── supabase.mock.ts # Supabase mocks
   └── examples/
       ├── formatters.test.ts
       └── component.test.tsx
   ```

### E2E Testing (Playwright)

1. **Installed Packages:**
   - `@playwright/test` - E2E testing framework
   - Chromium browser (Desktop & Mobile)

2. **Configuration Files:**
   - `playwright.config.ts` - Playwright configuration
   - Chromium only (as per requirements)
   - Mobile-first testing enabled

3. **Test Structure:**
   ```
   e2e/
   ├── pages/
   │   ├── base.page.ts    # Base POM
   │   └── login.page.ts   # Login POM
   ├── helpers/
   │   ├── auth.helper.ts  # Auth helpers
   │   └── api.helper.ts   # API helpers
   ├── fixtures/
   │   └── test-data.ts    # Test data
   └── examples/
       └── login.spec.ts   # Example test
   ```

## 🚀 Quick Start

### Running Tests

```bash
# Unit tests
npm test                    # Run all unit tests
npm run test:watch          # Watch mode
npm run test:ui             # Interactive UI
npm run test:coverage       # Generate coverage

# E2E tests
npm run test:e2e           # Run E2E tests
npm run test:e2e:ui        # Interactive mode
npm run test:e2e:headed    # See browser
npm run test:e2e:debug     # Debug mode

# All tests
npm run test:all           # Run everything
```

## 📝 Writing Your First Test

### Unit Test

Create a file ending in `.test.ts` or `.test.tsx`:

```typescript
// src/lib/utils.test.ts
import { describe, it, expect } from 'vitest';
import { myFunction } from './utils';

describe('myFunction', () => {
  it('should work correctly', () => {
    expect(myFunction(input)).toBe(expected);
  });
});
```

### Component Test

```typescript
// src/components/Button.test.tsx
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/tests/utils/test-helpers';
import { Button } from './Button';

describe('Button', () => {
  it('should render', () => {
    renderWithProviders(<Button>Click</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
```

### E2E Test

```typescript
// e2e/my-feature.spec.ts
import { test, expect } from '@playwright/test';

test('my feature works', async ({ page }) => {
  await page.goto('/my-page');
  await page.getByRole('button', { name: /click/i }).click();
  await expect(page).toHaveURL(/success/);
});
```

## 📚 Key Files to Reference

- **TESTING.md** - Complete testing guide and best practices
- **tests/examples/** - Example unit tests
- **e2e/examples/** - Example E2E tests
- **tests/README.md** - Unit testing specifics
- **e2e/README.md** - E2E testing specifics

## 🎯 Best Practices Applied

### Vitest Configuration
- ✅ Global test utilities configured
- ✅ jsdom environment for DOM testing
- ✅ 80% coverage thresholds
- ✅ Path aliases matching tsconfig
- ✅ Custom matchers from jest-dom
- ✅ Mock window.matchMedia, IntersectionObserver, ResizeObserver

### Playwright Configuration
- ✅ Chromium only (Desktop + Mobile)
- ✅ Mobile-first testing enabled
- ✅ Auto-waiting for elements
- ✅ Screenshot on failure
- ✅ Video retention on failure
- ✅ Trace on first retry
- ✅ Page Object Model structure

## 🔧 Configuration Highlights

### Coverage Thresholds

All code must meet 80% coverage for:
- Lines
- Functions
- Branches
- Statements

Excluded from coverage:
- node_modules, tests, e2e
- Type definitions (.d.ts)
- Config files
- Generated code (database.types.ts)

### Test Isolation

- Each test runs in isolated context
- Automatic cleanup after each test
- Mock Supabase client available
- Fixtures for test data

## 🐛 Debugging

### Unit Tests
```bash
npm run test:ui              # Visual interface
npm run test:watch           # Watch mode
npm run test -- --reporter=verbose  # Detailed output
```

### E2E Tests
```bash
npm run test:e2e:debug       # Step through tests
npm run test:e2e:headed      # See browser
npm run test:e2e:report      # View test report
```

## 📊 CI/CD Ready

The testing setup is ready for CI/CD integration:

1. All tests can run in headless mode
2. Coverage reports are generated
3. Test artifacts saved on failure
4. JUnit reports for CI systems
5. Parallel execution supported

Example GitHub Actions snippet:

```yaml
- run: npm test
- run: npm run test:e2e
- uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
```

## 🎓 Learning Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## ✨ Next Steps

1. **Write tests for existing code:**
   - Start with utility functions
   - Then move to services
   - Finally test components

2. **Set up CI/CD:**
   - Add GitHub Actions workflow
   - Configure automated test runs
   - Set up test coverage reporting

3. **Create test data:**
   - Set up test Supabase instance
   - Create seed data for tests
   - Document test user credentials

4. **Implement TDD:**
   - Write tests before code
   - Use watch mode during development
   - Maintain high coverage

## 🚨 Common Issues

### Port Already in Use
If E2E tests fail with port error:
```bash
# Kill process on port 4321
lsof -ti:4321 | xargs kill -9
```

### Coverage Not Collected
Ensure your files are:
- Not in excluded directories
- Imported in tests
- Not in `.gitignore`

### Tests Timing Out
Increase timeout in config:
```typescript
// vitest.config.ts or playwright.config.ts
timeout: 60000 // 60 seconds
```

---

**Environment Status:** ✅ Ready for testing

All testing infrastructure is in place and working correctly. Start writing tests!

