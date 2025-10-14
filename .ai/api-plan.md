# REST API Plan

## 1. Resources

- **Auth Sessions** → Supabase `auth.users`, managed via Supabase Auth REST endpoints.
- **Household Profile** → `households` (single per authenticated user).
- **Household Members** → `household_members` (soft-delete via `is_active`).
- **Categories** → `categories` (unique per household, case-insensitive names).
- **Budgets** → `budgets` (unique per month per household; assumes additional `is_locked` boolean column or Supabase storage for lock state).
- **Budget Incomes** → `incomes` (one per member per budget).
- **Planned Expenses** → `planned_expenses` (limit per category per budget).
- **Transactions** → `transactions` (expense ledger per budget & category).
- **Dashboard Summaries** → Aggregations across `budgets`, `incomes`, `planned_expenses`, `transactions`.

## 2. Endpoints

### 2.2 Household Profile

- **GET `/api/household`**
  - Description: Fetches the authenticated user’s household profile and metadata.
  - Query Params: `includeDefaults` (boolean, default `false`) to include seeded default categories.
  - Response JSON:

    ```json
    {
      "id": "uuid",
      "name": "Household name",
      "createdAt": "2025-10-01T12:34:56Z",
      "updatedAt": "2025-10-08T10:00:00Z"
    }
    ```

  - Success: 200 OK — `HOUSEHOLD_FETCHED`.
  - Errors: 401 `UNAUTHENTICATED`; 404 `HOUSEHOLD_NOT_FOUND` (if setup incomplete).

- **PATCH `/api/household`**
  - Description: Updates household display name.
  - Request JSON:

    ```json
    {
      "name": "New household name"
    }
    ```

  - Response JSON mirrors GET.
  - Success: 200 OK — `HOUSEHOLD_UPDATED`.
  - Errors: 400 `INVALID_NAME`; 401 `UNAUTHENTICATED`.

### 2.3 Household Members

- **GET `/api/household-members`**
  - Description: Lists active household members.
  - Query Params: `includeInactive` (boolean), `page` (default 1), `pageSize` (default 20, max 100), `sort` (`fullName`|`createdAt`).
  - Response JSON:

    ```json
    {
      "data": [
        {
          "id": "uuid",
          "fullName": "Alice",
          "isActive": true,
          "createdAt": "2025-10-01T12:34:56Z",
          "updatedAt": "2025-10-08T10:00:00Z"
        }
      ],
      "meta": {
        "page": 1,
        "pageSize": 20,
        "totalItems": 3,
        "totalPages": 1
      }
    }
    ```

  - Success: 200 OK — `MEMBERS_LISTED`.
  - Errors: 401 `UNAUTHENTICATED`.

- **POST `/api/household-members`**
  - Description: Adds a new member.
  - Request JSON:

    ```json
    {
      "fullName": "Bob"
    }
    ```

  - Response JSON returns created resource.
  - Success: 201 Created — `MEMBER_CREATED`.
  - Errors: 400 `INVALID_FULL_NAME`; 409 `MEMBER_NAME_CONFLICT` (case-insensitive uniqueness).

- **PATCH `/api/household-members/{memberId}`**
  - Description: Updates member name or activation status.
  - Request JSON:

    ```json
    {
      "fullName": "Robert",
      "isActive": true
    }
    ```

  - Response JSON returns updated record.
  - Success: 200 OK — `MEMBER_UPDATED`.
  - Errors: 400 `INVALID_FULL_NAME`; 404 `MEMBER_NOT_FOUND`; 409 `MEMBER_NAME_CONFLICT`.

- **DELETE `/api/household-members/{memberId}`**
  - Description: Soft-deactivates member (`isActive = false`); historical records remain.
  - Response: 204 No Content.
  - Success: 204 No Content — `MEMBER_DEACTIVATED`.
  - Errors: 404 `MEMBER_NOT_FOUND`; 409 `MEMBER_IN_USE` (optional guard when member has active incomes in open budget).

### 2.4 Categories

- **GET `/api/categories`**
  - Description: Lists categories.
  - Query Params: `search` (case-insensitive substring), `page`, `pageSize`, `sort` (`name`|`createdAt`).
  - Response JSON mirrors household members list shape.
  - Success: 200 OK — `CATEGORIES_LISTED`.
  - Errors: 401 `UNAUTHENTICATED`.

- **POST `/api/categories`**
  - Description: Creates category.
  - Request JSON:

    ```json
    { "name": "Transport" }
    ```

  - Response JSON returns created category.
  - Success: 201 Created — `CATEGORY_CREATED`.
  - Errors: 400 `INVALID_NAME`; 409 `CATEGORY_NAME_CONFLICT`.

- **PATCH `/api/categories/{categoryId}`**
  - Description: Renames category.
  - Request JSON:

    ```json
    { "name": "Public Transport" }
    ```

  - Success: 200 OK — `CATEGORY_UPDATED`.
  - Errors: 400 `INVALID_NAME`; 404 `CATEGORY_NOT_FOUND`; 409 `CATEGORY_NAME_CONFLICT`.

- **DELETE `/api/categories/{categoryId}`**
  - Description: Deletes category after confirmation; optionally cascades to transactions by reassign/cleanup.
  - Query Params: `force=true` to confirm cascade deletion of dependent transactions and planned expenses.
  - Response: 204 No Content.
  - Success: 204 No Content — `CATEGORY_DELETED`.
  - Errors: 400 `FORCE_CONFIRMATION_REQUIRED`; 404 `CATEGORY_NOT_FOUND`.

### 2.5 Budgets

- **GET `/api/budgets`**
  - Description: Lists budgets for navigation/history.
  - Query Params: `month` (ISO date or `YYYY-MM`), `status` (`current`|`past`|`upcoming`|`all`), `includeSummary` (boolean), `page`, `pageSize`, `sort` (`month_desc` default).
  - Response JSON:

    ```json
    {
      "data": [
        {
          "id": "uuid",
          "month": "2025-10-01",
          "summary": {
            "totalIncome": 7500.0,
            "totalPlanned": 6800.0,
            "totalSpent": 5120.5,
            "freeFunds": 700.0
          }
        }
      ],
      "meta": { "page": 1, "pageSize": 12, "totalItems": 18, "totalPages": 2 }
    }
    ```

  - Success: 200 OK — `BUDGETS_LISTED`.
  - Errors: 401 `UNAUTHENTICATED`.

- **POST `/api/budgets`**
  - Description: Creates a new monthly budget; optionally seeds incomes and planned expenses in one call.
  - Request JSON:

    ```json
    {
      "month": "2025-11",
      "incomes": [{ "householdMemberId": "uuid", "amount": 3500.0 }],
      "plannedExpenses": [{ "categoryId": "uuid", "limitAmount": 1200.0 }]
    }
    ```

  - Response JSON:

    ```json
    {
      "id": "uuid",
      "month": "2025-11-01",
      "createdAt": "2025-10-08T12:00:00Z"
    }
    ```

  - Success: 201 Created — `BUDGET_CREATED`.
  - Errors: 400 `INVALID_MONTH_FORMAT`; 400 `MISSING_INCOMES` (if business rule requires); 409 `BUDGET_ALREADY_EXISTS`.

- **GET `/api/budgets/{budgetId}`**
  - Description: Retrieves full budget detail including incomes, planned expenses, transactions summary.
  - Query Params: `includeTransactions` (boolean), `includeInactiveMembers` (boolean).
  - Response JSON:

    ```json
    {
      "id": "uuid",
      "month": "2025-10-01",
      "incomes": [{ "id": "uuid", "householdMemberId": "uuid", "amount": 3500.0 }],
      "plannedExpenses": [{ "id": "uuid", "categoryId": "uuid", "limitAmount": 1200.0 }],
      "summary": {
        "totalIncome": 7000.0,
        "totalPlanned": 6500.0,
        "totalSpent": 5100.0,
        "freeFunds": 500.0,
        "perCategory": [{ "categoryId": "uuid", "spent": 800.0, "limitAmount": 900.0 }]
      }
    }
    ```

  - Success: 200 OK — `BUDGET_FETCHED`.
  - Errors: 401 `UNAUTHENTICATED`; 404 `BUDGET_NOT_FOUND`.

- **PATCH `/api/budgets/{budgetId}`**
  - Description: Updates mutable metadata (e.g., rename, notes).
  - Request JSON:

    ```json
    {
      "note": "Groceries"
    }
    ```

  - Response JSON mirrors GET.
  - Success: 200 OK — `BUDGET_UPDATED`.
  - Errors: 400 `INVALID_STATE_TRANSITION`; 404 `BUDGET_NOT_FOUND`.

### 2.6 Budget Incomes

- **GET `/api/budgets/{budgetId}/incomes`**
  - Description: Lists incomes for budget.
  - Response JSON:

    ```json
    {
      "data": [
        {
          "id": "uuid",
          "householdMemberId": "uuid",
          "amount": 3500.0,
          "createdAt": "2025-10-01T12:34:56Z"
        }
      ]
    }
    ```

  - Success: 200 OK — `INCOMES_LISTED`.
  - Errors: 404 `BUDGET_NOT_FOUND`

- **PUT `/api/budgets/{budgetId}/incomes`**
  - Description: Replaces income set (bulk upsert).
  - Request JSON:

    ```json
    {
      "incomes": [{ "householdMemberId": "uuid", "amount": 3500.0 }]
    }
    ```

  - Response JSON returns updated list.
  - Success: 200 OK — `INCOMES_UPSERTED`.
  - Errors: 400 `INVALID_AMOUNT`; 400 `DUPLICATE_MEMBER`.

- **PATCH `/api/budgets/{budgetId}/incomes/{incomeId}`**
  - Description: Updates single income amount.
  - Request JSON:

    ```json
    { "amount": 3600.0 }
    ```

  - Success: 200 OK — `INCOME_UPDATED`.
  - Errors: 404 `INCOME_NOT_FOUND`.

- **DELETE `/api/budgets/{budgetId}/incomes/{incomeId}`**
  - Description: Removes income record.
  - Response: 204 No Content.
  - Success: 204 No Content — `INCOME_DELETED`.
  - Errors: 404 `INCOME_NOT_FOUND`.

### 2.7 Planned Expenses

- **GET `/api/budgets/{budgetId}/planned-expenses`**
  - Description: Lists planned expense limits for budget.
  - Response JSON similar to incomes list with `limitAmount` field.
  - Success: 200 OK — `PLANNED_EXPENSES_LISTED`.
  - Errors: 404 `BUDGET_NOT_FOUND`.

- **POST `/api/budgets/{budgetId}/planned-expenses`**
  - Description: Adds a planned expense limit for a category in the budget.
  - Request JSON:

    ```json
    {
      "categoryId": "uuid",
      "limitAmount": 1200.0
    }
    ```

  - Response JSON returns the created planned expense record.
  - Success: 201 Created — `PLANNED_EXPENSE_CREATED`.
  - Errors: 400 `INVALID_LIMIT`; 400 `DUPLICATE_CATEGORY`; 404 `BUDGET_NOT_FOUND`; 404 `CATEGORY_NOT_FOUND`.

- **PUT `/api/budgets/{budgetId}/planned-expenses`**
  - Description: Replaces entire plan; used in edit flow.
  - Request JSON:

    ```json
    {
      "plannedExpenses": [{ "categoryId": "uuid", "limitAmount": 1200.0 }]
    }
    ```

  - Success: 200 OK — `PLANNED_EXPENSES_UPSERTED`.
  - Errors: 400 `INVALID_LIMIT`; 400 `DUPLICATE_CATEGORY`.

- **PATCH `/api/budgets/{budgetId}/planned-expenses/{plannedExpenseId}`**
  - Description: Updates single planned expense limit.
  - Request JSON:

    ```json
    { "limitAmount": 1300.0 }
    ```

  - Success: 200 OK — `PLANNED_EXPENSE_UPDATED`.
  - Errors: 404 `PLANNED_EXPENSE_NOT_FOUND`.

- **DELETE `/api/budgets/{budgetId}/planned-expenses/{plannedExpenseId}`**
  - Description: Removes planned limit and frees funds back to pool.
  - Response: 204 No Content.
  - Success: 204 No Content — `PLANNED_EXPENSE_DELETED`.
  - Errors: 403 `BUDGET_LOCKED`; 404 `PLANNED_EXPENSE_NOT_FOUND`.

### 2.8 Transactions

- **GET `/api/budgets/{budgetId}/transactions`**
  - Description: Lists transactions for budget with filtering.
  - Query Params: `categoryId`, `fromDate`, `toDate`, `searchNote`, `page`, `pageSize`, `sort` (`date_desc` default, `amount_desc`, `amount_asc`).
  - Response JSON:

    ```json
    {
      "data": [
        {
          "id": "uuid",
          "categoryId": "uuid",
          "amount": 120.5,
          "transactionDate": "2025-10-07",
          "note": "Groceries",
          "createdAt": "2025-10-07T19:22:00Z"
        }
      ],
      "meta": {
        "page": 1,
        "pageSize": 25,
        "totalItems": 120,
        "totalPages": 5
      }
    }
    ```

  - Success: 200 OK — `TRANSACTIONS_LISTED`.
  - Errors: 404 `BUDGET_NOT_FOUND`.

- **POST `/api/budgets/{budgetId}/transactions`**
  - Description: Adds expense transaction; updates summaries.
  - Request JSON:

    ```json
    {
      "categoryId": "uuid",
      "amount": 120.5,
      "transactionDate": "2025-10-07",
      "note": "Optional note"
    }
    ```

  - Response JSON returns created transaction.
  - Success: 201 Created — `TRANSACTION_CREATED`.
  - Errors: 400 `INVALID_AMOUNT`; 400 `INVALID_DATE`; 409 `CATEGORY_MISMATCH` (category not linked to household).

- **GET `/api/transactions/{transactionId}`**
  - Description: Fetches single transaction regardless of budget.
  - Success: 200 OK — `TRANSACTION_FETCHED`.
  - Errors: 404 `TRANSACTION_NOT_FOUND`.

- **PATCH `/api/transactions/{transactionId}`**
  - Description: Updates amount, category, date, note.
  - Request JSON:

    ```json
    {
      "categoryId": "uuid",
      "amount": 130.0,
      "transactionDate": "2025-10-08",
      "note": "Updated note"
    }
    ```

  - Success: 200 OK — `TRANSACTION_UPDATED`.
  - Errors: 400 `INVALID_AMOUNT`; 404 `TRANSACTION_NOT_FOUND`.

- **DELETE `/api/transactions/{transactionId}`**
  - Description: Deletes transaction.
  - Response: 204 No Content.
  - Success: 204 No Content — `TRANSACTION_DELETED`.
  - Errors: 404 `TRANSACTION_NOT_FOUND`.

### 2.9 Dashboard & Reporting

- **GET `/api/dashboard/current`**
  - Description: Returns summary of active (current month) budget; selects latest unlocked or current month.
  - Response JSON:

    ```json
    {
      "currentBudgetId": "uuid",
      "month": "2025-10-01",
      "totalIncome": 7000.0,
      "totalPlanned": 6500.0,
      "totalSpent": 5100.0,
      "freeFunds": 500.0,
      "progress": 0.73,
      "categories": [
        {
          "categoryId": "uuid",
          "name": "Groceries",
          "spent": 800.0,
          "limitAmount": 900.0,
          "progress": 0.89,
          "status": "warning"
        }
      ]
    }
    ```

  - Success: 200 OK — `DASHBOARD_SUMMARY`.
  - Errors: 404 `BUDGET_NOT_FOUND` (if no current budget).

- **GET `/api/budgets/{budgetId}/summary`**
  - Description: Provides summary for specific budget (used for history view).
  - Query Params: `includeCategories` (boolean default `true`).
  - Response JSON mirrors `dashboard/current` but scoped to budget.
  - Success: 200 OK — `BUDGET_SUMMARY`.
  - Errors: 404 `BUDGET_NOT_FOUND`.

## 3. Authentication and Authorization

- **Authentication**: Supabase GoTrue JWT tokens. Client obtains session via `/auth/v1/token`; Astro middleware (`src/middleware/index.ts`) verifies JWT and injects Supabase client with user context. Requests to `/api/*` must include `Authorization: Bearer <access_token>` or rely on Supabase session cookie.
- **Authorization**: RLS policies ensure each JWT-scoped request only sees/modifies rows where `household_id = get_current_household_id()`. API handlers must always set `supabase.auth.setSession` to propagate user JWT and rely on database enforcement.
- **Session duration**: honor "Remember me" by extending refresh token lifetime (30 days) before requiring re-authentication.
- **Admin/service operations**: Use Supabase service role with RLS disabled only inside secure backend functions (e.g., nightly jobs). Never expose service role to client.
- **Rate limiting**: Apply middleware-based throttling (e.g., token bucket 60 req/min per user IP) for sensitive endpoints (`POST/PUT/PATCH/DELETE`), returning 429 `RATE_LIMIT_EXCEEDED` with retry metadata.

## 4. Validation and Business Logic

- **Household Profile**: `name` length 1–120 chars; enforce trimming; prevent duplicates by user (single household).
- **Household Members**: `fullName` length 1–120; lowercase uniqueness per household; deleting toggles `isActive=false`
- **Categories**: `name` length 1–100; lowercase uniqueness; deletion requires explicit confirmation if linked to transactions/plans; cascade deletes remove related planned expenses and transactions or reassign prior to delete.
- **Budgets**:
  - `month` must be first day of month; ensure single budget per household+month.
  - Budget creation may auto-seed `planned_expenses` from defaults.
  - Summaries compute `freeFunds = totalIncome - totalPlanned` and `progress = totalSpent / max(totalPlanned, totalIncome)` handling zero-division.
- **Incomes**: `amount > 0`, precision 2 decimals; only one record per member per budget; require member `isActive=true`.
- **Planned Expenses**: `limitAmount > 0`; one per category per budget; editing updates free funds; allow zero entries only if removing category.
- **Transactions**: `amount > 0`; `transactionDate` within budget month; `note` optional but ≤500 chars; on create/update adjust aggregated spend for category & budget; prevent exceeding limits.
- **Dashboard Summaries**: Compute per category status (`ok`, `warning`, `over`) based on spend vs limit; highlight overspend by color metadata.
- **Historical Budgets**: If editing past budgets is allowed (PRD L169-L171), log audit trail of edits (timestamp + user).
- **Error handling**: Return structured error payload `{ "error": { "code": "STRING", "message": "Human readable" } }`. Log backend errors for observability.
- **Input validation**: Use Zod/Valibot on Astro API routes; reject malformed JSON with 400 `INVALID_PAYLOAD`.
- **Pagination**: Standard response envelope with `meta` object; enforce max page size 100.
- **Sorting/filtering**: Validate allowed fields; fall back to defaults if invalid.
- **Concurrency**: Use Supabase `updated_at` timestamps and `If-Unmodified-Since` or `If-Match` headers (etag) to avoid overwriting concurrent edits on budgets, incomes, planned expenses.
