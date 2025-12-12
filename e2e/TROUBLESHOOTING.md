# E2E Tests Troubleshooting Guide

## Common Issues and Solutions

### 1. "Process from config.webServer exited early"

**Problem**: Playwright cannot start the Astro dev server automatically.

**Solutions**:

#### Option A: Run dev server manually (RECOMMENDED for development)

This is the most reliable approach during development:

**Terminal 1** - Start the dev server:

```bash
npm run dev
```

Wait for the server to start (you should see "Local: http://localhost:4321")

**Terminal 2** - Run tests:

```bash
npm run test:e2e:ui
```

#### Option B: Check environment variables

Make sure `.env.test` file exists and contains all required variables:

```bash
# Check if file exists
ls -la .env.test

# If missing, copy from example
cp .env.example .env.test
```

#### Option C: Check if port 4321 is available

```bash
# Check if something is already running on port 4321
lsof -i :4321

# If something is running, kill it
kill -9 <PID>
```

#### Option D: Increase timeout

If the server is slow to start, increase the timeout in `playwright.config.ts`:

```typescript
webServer: {
  timeout: 180 * 1000, // 3 minutes instead of 2
}
```

### 2. Tests fail with "page.goto: net::ERR_CONNECTION_REFUSED"

**Problem**: Dev server is not running.

**Solution**: Make sure the dev server is running on `http://localhost:4321`

```bash
# Terminal 1
npm run dev

# Terminal 2
npm run test:e2e
```

### 3. "Executable doesn't exist" or browser errors

**Problem**: Playwright browsers are not installed.

**Solution**: Install Playwright browsers:

```bash
npx playwright install chromium
```

### 4. Tests are very slow

**Problem**: Running all tests takes too long during development.

**Solutions**:

- Run specific test file:

  ```bash
  npx playwright test e2e/specs/add-expense.spec.ts
  ```

- Run specific test by name:

  ```bash
  npx playwright test -g "should add expense"
  ```

- Use UI mode to run tests selectively:
  ```bash
  npm run test:e2e:ui
  ```

### 5. Tests fail randomly or intermittently

**Problem**: Race conditions or timing issues.

**Solutions**:

- Run in headed mode to see what's happening:

  ```bash
  npm run test:e2e:headed
  ```

- Run in debug mode:

  ```bash
  npm run test:e2e:debug
  ```

- Check if tests are properly isolated (each test should be independent)

### 6. "Cannot find module" errors

**Problem**: TypeScript or module resolution issues.

**Solution**: Make sure all dependencies are installed:

```bash
npm install
```

### 7. Authentication/Database errors during tests

**Problem**: Tests need real authentication or database.

**Solution**:

- Make sure `.env.test` has valid Supabase credentials
- Consider using test database/project
- Mock authentication if needed

## Best Practices for Reliable Tests

### 1. Always run dev server manually during development

```bash
# Terminal 1
npm run dev

# Terminal 2
npm run test:e2e:ui
```

### 2. Use UI mode for development

UI mode is the best way to develop and debug tests:

```bash
npm run test:e2e:ui
```

### 3. Run specific tests

Don't run all tests while developing:

```bash
npx playwright test e2e/specs/add-expense.spec.ts
```

### 4. Check test isolation

Each test should:

- Not depend on other tests
- Clean up after itself
- Use unique test data

### 5. Use proper waits

Don't use `page.waitForTimeout()`. Instead use:

- `page.waitForSelector()`
- `page.waitForLoadState()`
- `expect().toBeVisible()`

## Debugging Workflow

1. **Run in UI mode** - See what's happening:

   ```bash
   npm run test:e2e:ui
   ```

2. **Run in headed mode** - Watch the browser:

   ```bash
   npm run test:e2e:headed
   ```

3. **Run in debug mode** - Step through test:

   ```bash
   npm run test:e2e:debug
   ```

4. **Check the HTML report** - See screenshots and traces:

   ```bash
   npm run test:e2e:report
   ```

5. **Use trace viewer** - Detailed debugging:
   ```bash
   npx playwright test --trace on
   npx playwright show-trace trace.zip
   ```

## Getting Help

If you're still having issues:

1. Check Playwright logs
2. Check dev server logs
3. Check browser console (in headed mode)
4. Review test code for timing issues
5. Check if selectors are correct

## Quick Commands Reference

| Issue                     | Command                                             |
| ------------------------- | --------------------------------------------------- |
| Start dev server          | `npm run dev`                                       |
| Run tests (manual server) | `npm run test:e2e`                                  |
| Run UI mode               | `npm run test:e2e:ui`                               |
| Run headed mode           | `npm run test:e2e:headed`                           |
| Debug tests               | `npm run test:e2e:debug`                            |
| View report               | `npm run test:e2e:report`                           |
| Install browsers          | `npx playwright install chromium`                   |
| Check port 4321           | `lsof -i :4321`                                     |
| Run specific test         | `npx playwright test e2e/specs/add-expense.spec.ts` |
