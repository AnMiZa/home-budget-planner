# 🚀 Quick Start Guide - Running E2E Tests

## ⚙️ Prerequisites

Before running tests, ensure you have:

1. **Environment Variables**: Create a `.env.test` file with:

   ```env
   PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   E2E_USERNAME=test@example.com
   E2E_PASSWORD=YourSecurePassword123!
   BASE_URL=http://localhost:4321
   ```

2. **Dependencies Installed**: Run `npm install`

**📖 For detailed database setup, see [DATABASE_SETUP.md](./DATABASE_SETUP.md)**

## ✅ Step-by-Step Instructions

### Step 1: Start the Dev Server

Open **Terminal 1** and run:

```bash
npm run dev
```

**Wait until you see:**

```
✓ astro v5.x.x ready in XXXms

┃ Local    http://localhost:4321/
┃ Network  use --host to expose
```

✅ Server is ready when you see the URL!

### Step 2: Run the Tests

Open **Terminal 2** and run one of these commands:

#### Option A: UI Mode (RECOMMENDED - Interactive)

```bash
npm run test:e2e:ui
```

This opens a visual interface where you can:

- See all tests
- Run tests individually
- Watch tests execute
- Debug failures

#### Option B: Run All Tests

```bash
npm run test:e2e
```

#### Option C: Run with Visible Browser

```bash
npm run test:e2e:headed
```

#### Option D: Run Specific Test File

```bash
npx playwright test e2e/specs/add-expense.spec.ts
```

## 🐛 Troubleshooting

### Problem: "Process from config.webServer exited early"

**Solution**: Make sure dev server is running manually (see Step 1 above)

### Problem: "net::ERR_CONNECTION_REFUSED"

**Solution**:

1. Check if dev server is running on http://localhost:4321
2. If it's on a different port, update `playwright.config.ts`

### Problem: Port 4321 is in use

**Solution**:

```bash
# Find what's using port 4321
lsof -i :4321

# Kill the process
kill -9 <PID>
```

### Problem: Browsers not installed

**Solution**:

```bash
npx playwright install chromium
```

## 📋 Quick Commands

| What you want to do      | Command                                             |
| ------------------------ | --------------------------------------------------- |
| Start dev server         | `npm run dev`                                       |
| Run tests (UI mode)      | `npm run test:e2e:ui`                               |
| Run all tests            | `npm run test:e2e`                                  |
| Run with browser visible | `npm run test:e2e:headed`                           |
| Debug tests              | `npm run test:e2e:debug`                            |
| View test report         | `npm run test:e2e:report`                           |
| Run specific file        | `npx playwright test e2e/specs/add-expense.spec.ts` |
| Run specific test        | `npx playwright test -g "should add expense"`       |

## ✨ Pro Tips

1. **Always use UI mode during development** - It's the easiest way to work with tests
2. **Keep dev server running** - Don't restart it between test runs
3. **Run specific tests** - Don't run all tests while developing a feature
4. **Check the HTML report** - After test failures, run `npm run test:e2e:report`

## 🎯 Example Workflow

```bash
# Terminal 1 - Start and leave running
npm run dev

# Terminal 2 - Run tests as needed
npm run test:e2e:ui

# Make changes to tests or code...
# Tests will auto-reload in UI mode!
```

## 🗄️ Database Test Data

The first time you run tests, the global setup script will:

1. ✅ Register the test user (if not already registered)
2. ✅ Create a household automatically
3. ✅ Seed default categories (Food, Transport, Housing, etc.)
4. ✅ Create test household members (Jan Kowalski, Anna Kowalska)
5. ✅ Create test budgets with incomes and planned expenses

This happens **automatically** before any tests run. You don't need to do anything!

**📖 For more details, see [DATABASE_SETUP.md](./DATABASE_SETUP.md)**

## 📚 More Help

- Full documentation: [README.md](./README.md)
- Database setup: [DATABASE_SETUP.md](./DATABASE_SETUP.md)
- Troubleshooting: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- Playwright docs: https://playwright.dev

---

**Need help?** Check the troubleshooting guide or Playwright documentation.
