# 🗄️ Database Setup for E2E Tests

## Overview

This document explains how the E2E test database is set up and configured. The setup ensures that all tests have consistent, predictable data to work with.

## Automatic Setup

When you run E2E tests, the global setup script (`e2e/global-setup.ts`) automatically:

1. **Registers the test user** (if not already registered)
2. **Creates a household** (via database trigger)
3. **Seeds default categories** (via database trigger)
4. **Creates household members** for testing budgets with incomes
5. **Creates test budgets** with incomes and planned expenses

All of this happens **before any tests run**, ensuring a clean, consistent state.

## Required Environment Variables

Create a `.env.test` file in the project root with the following variables:

```env
# Supabase Configuration
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Test User Credentials
E2E_USERNAME=test@example.com
E2E_PASSWORD=YourSecurePassword123!

# Base URL for tests
BASE_URL=http://localhost:4321
```

**💡 Tip**: Copy the template below and save it as `.env.test` in your project root:

```bash
# E2E Test Environment Configuration
# Copy this file to .env.test and fill in your values

# Supabase Configuration
# Get these from your Supabase project settings (Settings → API)
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Test User Credentials
# These will be used to create a test user and run E2E tests
# The user will be automatically created if it doesn't exist
E2E_USERNAME=test@example.com
E2E_PASSWORD=YourSecurePassword123!

# Base URL for tests
# This is where your application runs during tests
BASE_URL=http://localhost:4321

# Notes:
# - NEVER commit .env.test to version control (it's in .gitignore)
# - Use a separate test database, not your production database
# - The SUPABASE_SERVICE_ROLE_KEY bypasses Row Level Security (RLS)
# - Keep your service role key secure and rotate it if exposed
```

### Where to Find These Values

1. **PUBLIC_SUPABASE_URL**: Your Supabase project URL (Project Settings → API)
2. **SUPABASE_SERVICE_ROLE_KEY**: Service role key with admin privileges (Project Settings → API → service_role key)
   - ⚠️ **NEVER commit this key to version control!**
   - This key bypasses Row Level Security (RLS) and is needed for test data setup
3. **E2E_USERNAME**: Email for the test user (can be any valid email format)
4. **E2E_PASSWORD**: Password for the test user (must meet app requirements)

## Test Data Structure

### Default Categories

These are automatically created by the database trigger when a household is created:

- Żywność (Food)
- Transport (Transportation)
- Mieszkanie (Housing)
- Rachunki (Bills/Utilities)
- Zdrowie (Health)
- Rozrywka (Entertainment)
- Ubrania (Clothing)
- Edukacja (Education)
- Oszczędności (Savings)
- Kredyty (Loans)
- Inne (Other/Miscellaneous)

### Test Household Members

Defined in `e2e/fixtures/database-test-data.ts`:

```typescript
export const testHouseholdMembers = [{ fullName: "Jan Kowalski" }, { fullName: "Anna Kowalska" }];
```

These members are used to create budget incomes in test budgets.

### Test Budgets

Two budgets are automatically created:

1. **Current Month Budget**
   - Incomes from both household members
   - Planned expenses for Food, Transport, and Housing categories
   - Total income: 9,500 PLN

2. **Next Month Budget**
   - Incomes from both household members (slightly increased)
   - Planned expenses for Food and Transport categories
   - Total income: 9,900 PLN

## Database Setup Helpers

### Main Setup Function

Located in `e2e/helpers/database-setup.ts`:

```typescript
import { setupTestData } from "./helpers/database-setup";

const result = await setupTestData(email, password, {
  members: testHouseholdMembers,
  budgets: createTestBudgets(members, categories),
  cleanupFirst: true, // Clean up existing data first
});
```

### Available Helper Functions

#### `createTestSupabaseClient()`

Creates an admin Supabase client for test data operations.

#### `getHouseholdId(supabase, userId)`

Gets the household ID for a given user.

#### `createHouseholdMembers(supabase, householdId, members)`

Creates household members for testing.

#### `getCategories(supabase, householdId)`

Gets existing categories for a household.

#### `createCategories(supabase, householdId, categories)`

Creates additional categories if needed.

#### `createBudget(supabase, householdId, budget)`

Creates a budget with incomes and planned expenses.

#### `cleanupTestData(supabase, userId)`

Cleans up all test data for a user (useful for fresh starts).

#### `setupTestData(email, password, options)`

Main setup function that orchestrates all the above operations.

## Customizing Test Data

### Adding More Household Members

Edit `e2e/fixtures/database-test-data.ts`:

```typescript
export const testHouseholdMembers: TestHouseholdMember[] = [
  { fullName: "Jan Kowalski" },
  { fullName: "Anna Kowalska" },
  { fullName: "Piotr Nowak" }, // Add more members
];
```

### Adding More Categories

Edit `e2e/fixtures/database-test-data.ts`:

```typescript
export const additionalTestCategories = [
  { name: "Test Category 1" },
  { name: "Test Category 2" },
  { name: "Your Custom Category" }, // Add more categories
];
```

Then update `global-setup.ts` to include them:

```typescript
const result = await setupTestData(testUsers.valid.email, testUsers.valid.password, {
  members: testHouseholdMembers,
  additionalCategories: additionalTestCategories, // Add this line
  budgets: createTestBudgets([], []),
  cleanupFirst: userRegistered,
});
```

### Modifying Budget Data

Edit the `createTestBudgets()` function in `e2e/fixtures/database-test-data.ts`:

```typescript
export function createTestBudgets(
  members: Array<{ id: string; fullName: string }>,
  categories: Array<{ id: string; name: string }>
): TestBudget[] {
  // Modify income amounts, planned expenses, etc.
  return [
    {
      month: currentMonth,
      note: "Your custom note",
      incomes: [
        {
          householdMemberId: members[0].id,
          amount: 6000, // Change amount
        },
      ],
      plannedExpenses: [
        {
          categoryId: foodCategory.id,
          limitAmount: 2000, // Change limit
        },
      ],
    },
  ];
}
```

## Database Schema

The test data setup relies on the following database structure:

```
households
├── id (uuid, PK)
├── user_id (uuid, FK to auth.users)
├── name (text)
├── created_at (timestamp)
└── updated_at (timestamp)

household_members
├── id (uuid, PK)
├── household_id (uuid, FK to households)
├── full_name (text)
├── is_active (boolean)
├── created_at (timestamp)
└── updated_at (timestamp)

categories
├── id (uuid, PK)
├── household_id (uuid, FK to households)
├── name (text)
├── created_at (timestamp)
└── updated_at (timestamp)

budgets
├── id (uuid, PK)
├── household_id (uuid, FK to households)
├── month (text, format: YYYY-MM)
├── note (text, nullable)
├── created_at (timestamp)
└── updated_at (timestamp)

incomes
├── id (uuid, PK)
├── budget_id (uuid, FK to budgets)
├── household_member_id (uuid, FK to household_members)
├── amount (numeric)
├── created_at (timestamp)
└── updated_at (timestamp)

planned_expenses
├── id (uuid, PK)
├── budget_id (uuid, FK to budgets)
├── category_id (uuid, FK to categories)
├── limit_amount (numeric)
├── created_at (timestamp)
└── updated_at (timestamp)

transactions
├── id (uuid, PK)
├── household_id (uuid, FK to households)
├── budget_id (uuid, FK to budgets)
├── category_id (uuid, FK to categories)
├── amount (numeric)
├── transaction_date (date)
├── note (text, nullable)
├── created_at (timestamp)
└── updated_at (timestamp)
```

## Database Triggers

### Auto-create Household

When a user registers, a database trigger automatically creates a household:

```sql
-- Trigger: trigger_create_household_for_new_user
-- Fires: AFTER INSERT on auth.users
-- Action: Creates a household with user's email as name
```

### Seed Default Categories

When a household is created, another trigger seeds default categories:

```sql
-- Trigger: trigger_seed_default_categories
-- Fires: AFTER INSERT on households
-- Action: Creates 11 default expense categories
```

## Troubleshooting

### "Household not found for test user"

**Cause**: The auto-creation trigger failed, wasn't installed, or the user was created before the trigger existed.

**Solution**:

The setup script now automatically handles this! If a household doesn't exist, it will:

1. Create the household manually
2. Seed default categories if they don't exist

If you still see this error:

1. Check that your SUPABASE_SERVICE_ROLE_KEY is correct
2. Verify the test user credentials in `.env.test`
3. Check database logs for permission errors
4. Ensure the `households` table exists in your database

### "Failed to authenticate test user"

**Cause**: Invalid credentials or user doesn't exist.

**Solution**:

1. Verify E2E_USERNAME and E2E_PASSWORD in `.env.test`
2. Check that the user was registered successfully
3. Try deleting the user and re-running tests

### "Missing Supabase credentials"

**Cause**: Environment variables not set correctly.

**Solution**:

1. Ensure `.env.test` exists in the project root
2. Verify all required variables are set
3. Restart your terminal/IDE to reload environment variables

### "Failed to create household members" or "new row violates row-level security policy"

**Cause**: The service role key isn't bypassing Row Level Security (RLS) properly, or the key is incorrect.

**Solution**:

1. **Verify your SUPABASE_SERVICE_ROLE_KEY**:
   - Go to Supabase Dashboard → Settings → API
   - Copy the **service_role** key (NOT the anon/public key)
   - Make sure you copied the entire key (they're very long!)
2. **Check your .env.test file**:

   ```bash
   # Make sure there are no extra spaces or quotes
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **Restart your terminal/IDE** after updating .env.test to reload environment variables

4. **Verify the key works** by testing it:

   ```bash
   # In your terminal
   echo $SUPABASE_SERVICE_ROLE_KEY
   # Should print the key (if using bash/zsh)
   ```

5. If still failing, check that your Supabase project allows service role access

### "invalid input syntax for type date" for budget month

**Cause**: The `month` column in the `budgets` table is a `date` type, not a string. It expects a full date (first day of the month) like `2025-12-01`, not just `YYYY-MM`.

**Solution**:

This is now fixed in the code! The budget creation uses the correct format:

```typescript
// Correct format: YYYY-MM-01 (first day of month)
const currentMonth = `${year}-${month.padStart(2, "0")}-01`;
```

If you're creating budgets manually in tests, use this format:

```typescript
await createBudget(supabase, householdId, {
  month: "2025-12-01", // ✅ Correct: Full date
  note: "Test budget",
  incomes: [...],
  plannedExpenses: [...],
});

// ❌ Wrong: Just year-month
// month: "2025-12"
```

### "duplicate key value violates unique constraint"

**Cause**: Test data (household members, budgets, etc.) already exists in the database from a previous test run.

**Solution**:

This is now handled automatically! The setup script:

1. ✅ Checks if household members already exist before creating them
2. ✅ Checks if budgets for the same month already exist
3. ✅ Reuses existing data instead of trying to create duplicates

You should see messages like:

```
ℹ️  All 2 household members already exist
ℹ️  Budget for 2025-12-01 already exists, skipping creation
```

**If you want a completely fresh start:**

Set `cleanupFirst: true` in the setup options, or manually clean up:

```typescript
import { cleanupTestData, createTestSupabaseClient } from "./helpers/database-setup";

const supabase = createTestSupabaseClient();
const { data } = await supabase.auth.signInWithPassword({
  email: "test@example.com",
  password: "password",
});

await cleanupTestData(supabase, data.user.id);
```

## Manual Database Cleanup

If you need to manually clean up test data:

```typescript
import { createTestSupabaseClient, cleanupTestData } from "./helpers/database-setup";

const supabase = createTestSupabaseClient();

// Sign in as test user
const { data } = await supabase.auth.signInWithPassword({
  email: "test@example.com",
  password: "password",
});

// Clean up all test data
await cleanupTestData(supabase, data.user.id);

// Sign out
await supabase.auth.signOut();
```

Or use SQL directly in Supabase Studio:

```sql
-- Find the test user's household
SELECT h.id
FROM households h
JOIN auth.users u ON h.user_id = u.id
WHERE u.email = 'test@example.com';

-- Delete all data for that household (replace <household_id>)
DELETE FROM transactions WHERE household_id = '<household_id>';
DELETE FROM planned_expenses WHERE budget_id IN (SELECT id FROM budgets WHERE household_id = '<household_id>');
DELETE FROM incomes WHERE budget_id IN (SELECT id FROM budgets WHERE household_id = '<household_id>');
DELETE FROM budgets WHERE household_id = '<household_id>';
DELETE FROM household_members WHERE household_id = '<household_id>';
DELETE FROM categories WHERE household_id = '<household_id>';
```

## Best Practices

1. **Don't modify test data during tests** - Tests should be read-only when possible
2. **Use the global setup data** - Leverage the pre-created budgets and members
3. **Clean up after destructive tests** - If a test modifies data, clean it up in `afterEach`
4. **Keep test data realistic** - Use realistic amounts and dates
5. **Document custom test data** - If you add custom data, document it in the test file

## Related Files

- `e2e/global-setup.ts` - Main setup orchestration
- `e2e/helpers/database-setup.ts` - Database helper functions
- `e2e/fixtures/database-test-data.ts` - Test data definitions
- `e2e/fixtures/test-data.ts` - Test user credentials
- `playwright.config.ts` - Playwright configuration (includes globalSetup)
- `.env.test` - Environment variables (not in version control)

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit `.env.test`** - It contains sensitive credentials
2. **Use a separate test database** - Don't run tests against production
3. **Rotate service role keys** - If accidentally exposed, rotate immediately
4. **Limit test user permissions** - Test user should only have access to test data
5. **Clean up after tests** - Don't leave sensitive test data in the database

---

**Need help?** Check the main [README.md](./README.md) or [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) guides.
