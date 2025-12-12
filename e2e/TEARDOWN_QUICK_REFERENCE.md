# E2E Teardown - Quick Reference

## What Is It?

Automatic database cleanup that runs **after all E2E tests complete**.

## Files

```text
e2e/
├── global-setup.ts       ← Runs BEFORE tests (creates data)
├── global-teardown.ts    ← Runs AFTER tests (cleans data) ✨ NEW
└── helpers/
    └── database-setup.ts ← Shared cleanup function
```

## Configuration

```typescript
// playwright.config.ts
export default defineConfig({
  globalSetup: "./e2e/global-setup.ts",      // Before tests
  globalTeardown: "./e2e/global-teardown.ts", // After tests ✨ NEW
  // ...
});
```

## Environment Variables

Uses `.env.test`:

```env
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
E2E_USERNAME=test@example.com
E2E_PASSWORD=YourPassword123!
```

## What Gets Cleaned Up?

1. ✅ All transactions
2. ✅ All planned expenses
3. ✅ All incomes
4. ✅ All budgets
5. ✅ All household members
6. ✅ All categories

## How to Use

Just run your tests normally:

```bash
npm run test:e2e
```

The teardown runs automatically after all tests complete.

## Console Output

```
🧹 Running global teardown...
🔑 Authenticating as test user: test@example.com
✅ Authenticated as user: abc-123-def
🗑️  Cleaning up test data from database...
✅ Cleaned up test data for household xyz-789
✅ Global teardown complete - database cleaned up
```

## Benefits

- 🧹 **Clean Database**: No leftover test data
- 🚀 **Consistent Tests**: Each run starts fresh
- 💾 **Resource Efficient**: Keeps database lean
- 🤖 **Automatic**: No manual cleanup needed

## Error Handling

If cleanup fails:
- ❌ Error is logged
- ⚠️ Test run continues (non-blocking)
- ✅ Tests results are not affected

## Documentation

- 📖 [Full Documentation](./DATABASE_TEARDOWN.md)
- 📖 [Implementation Summary](./TEARDOWN_IMPLEMENTATION.md)
- 📖 [Database Setup](./DATABASE_SETUP.md)

## Troubleshooting

### "Missing Supabase credentials"
→ Check `.env.test` file exists and has all variables

### "Failed to authenticate test user"
→ Verify credentials in `.env.test` match test user

### Cleanup takes too long
→ Normal with lots of data, respects foreign key constraints

## That's It!

The teardown works automatically. Just run your tests and enjoy a clean database after each run! 🎉

