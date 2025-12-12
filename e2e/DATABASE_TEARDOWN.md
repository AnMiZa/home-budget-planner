# E2E Database Teardown

## Overview

This document describes the database cleanup process that runs after all E2E tests complete.

## Implementation

### Global Teardown (`e2e/global-teardown.ts`)

The global teardown runs **once after all tests** and performs the following actions:

1. **Loads environment variables** from `.env.test`
2. **Authenticates** as the test user using credentials from `.env.test`
3. **Cleans up all test data** from the Supabase database
4. **Signs out** the test user

### Configuration

The teardown is configured in `playwright.config.ts`:

```typescript
export default defineConfig({
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  // ...
});
```

## Environment Variables

The teardown uses the following environment variables from `.env.test`:

- `PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin operations
- `E2E_USERNAME` - Test user email
- `E2E_PASSWORD` - Test user password

## Cleanup Process

The cleanup is performed by the `cleanupTestData()` function from `e2e/helpers/database-setup.ts`, which deletes data in the correct order to respect foreign key constraints:

1. **Transactions** - All expense/income transactions
2. **Planned Expenses** - Budget planned expenses
3. **Incomes** - Budget incomes
4. **Budgets** - All budgets
5. **Household Members** - All household members
6. **Categories** - All categories (except default ones if configured)

## Error Handling

The teardown is designed to be **non-blocking**:

- If cleanup fails, it logs an error but doesn't fail the test run
- This ensures that test results are not affected by cleanup issues
- The next test run will still work because the setup creates/updates data as needed

## Benefits

1. **Clean State** - Ensures the database is clean after each test run
2. **No Data Accumulation** - Prevents test data from accumulating over time
3. **Consistent Tests** - Each test run starts with a predictable state
4. **Resource Management** - Keeps the test database lean and performant

## Running Tests

The teardown runs automatically when you run E2E tests:

```bash
# Run all E2E tests (teardown runs after all tests complete)
npm run test:e2e

# Run specific test (teardown still runs)
npm run test:e2e -- --grep "Login"
```

## Troubleshooting

### Teardown Fails to Authenticate

**Symptom**: Error message about missing Supabase credentials

**Solution**: Ensure `.env.test` file exists and contains all required variables:
- `PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `E2E_USERNAME`
- `E2E_PASSWORD`

### Teardown Fails to Clean Up Data

**Symptom**: Error about foreign key constraints or missing data

**Solution**: The cleanup function handles foreign key constraints automatically. If this fails, check:
1. Database schema matches the expected structure
2. Test user exists and has a household
3. Service role key has sufficient permissions

### Teardown Takes Too Long

**Symptom**: Teardown process is slow

**Solution**: This is normal if there's a lot of test data. The cleanup deletes data in batches to respect foreign key constraints. Consider:
1. Running fewer tests in parallel
2. Reducing the amount of test data created during setup

## Related Files

- `e2e/global-teardown.ts` - Teardown implementation
- `e2e/global-setup.ts` - Setup implementation (runs before tests)
- `e2e/helpers/database-setup.ts` - Database helper functions
- `playwright.config.ts` - Playwright configuration
- `.env.test` - Environment variables (gitignored)

