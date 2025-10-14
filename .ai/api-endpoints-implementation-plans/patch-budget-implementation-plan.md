# API Endpoint Implementation Plan: PATCH /api/budgets/{budgetId}

## 1. Endpoint Overview

- Updates mutable metadata of a budget that belongs to the authenticated user’s household (initial scope: `note`; extensible for future metadata fields).
- Ensures updates respect business rules around budget state and household ownership.
- Returns the refreshed budget detail payload identical to GET `/api/budgets/{budgetId}` with result code `BUDGET_UPDATED` on success.

## 2. Request Details

- HTTP Method: PATCH
- URL Structure: `/api/budgets/{budgetId}`
- Parameters:
  - Required: `budgetId` (path, UUID format enforced via Zod).
  - Optional: none in query string.
- Request Body:
  - JSON object allowing partial updates of metadata. Current schema: `{ note?: string | null }`.
  - Validation rules:
    - Reject empty body (must supply at least one mutable field).
    - `note`: allow `null` to clear, or trimmed string with length 1–500; collapse empty strings to null.
    - Additional fields trigger validation error.
  - Map validated payload to `UpdateBudgetCommand` from `src/types.ts`.

## 3. Response Details

- Success 200 OK with header `X-Result-Code: BUDGET_UPDATED`.
- Body: `BudgetDetailDto` (same shape as GET endpoint), sourced by reusing `BudgetsService.getBudgetDetail` after update.
- Error responses (all use `ApiErrorDto`):
  - 400 `INVALID_PAYLOAD` for JSON parse/validation failures.
  - 400 `INVALID_STATE_TRANSITION` when business rules disallow modification (e.g., finalized/locked budgets – service raises domain error).
  - 401 `UNAUTHENTICATED` if Supabase auth fails or user absent.
  - 404 `BUDGET_NOT_FOUND` when budget does not belong to user household.
  - 500 `BUDGET_UPDATE_FAILED` for unexpected Supabase errors.

## 4. Data Flow

- Astro route `src/pages/api/budgets/[budgetId].ts` exports new `PATCH` handler alongside existing `GET`.
- Handler responsibilities:
  - Validate `params` with existing `paramsSchema` (UUID).
  - Parse JSON body, run new Zod schema (`patchBudgetSchema`) ensuring allowed fields and constraints.
  - Acquire Supabase client from `locals.supabase`; fetch authenticated user via `auth.getUser()`.
  - Instantiate `BudgetsService` through `createBudgetsService` and call new `updateBudgetMetadata(user.id, budgetId, command)`.
  - On success, optionally log audit info (`console.log`) and return response with headers/status.
- Service responsibilities (`BudgetsService`):
  - New method `updateBudgetMetadata(userId, budgetId, command: UpdateBudgetCommand)`.
  - Steps: retrieve household for user; ensure budget exists for household; enforce state rules (e.g., disallow update if status indicates closed – leverage status column when introduced, otherwise placeholder check); normalize note (trim, clamp to 500 chars); execute `update` on `budgets` table with `supabase.from("budgets").update({ note, updated_at: new Date().toISOString() }).eq("id", budgetId).eq("household_id", householdId).select("id")` and ensure single row affected.
  - On zero rows: throw `BUDGET_NOT_FOUND`; on Postgres constraint (e.g., length) errors: map to validation error; on state guard failure: throw `INVALID_STATE_TRANSITION`.
  - After successful update, reuse existing `getBudgetDetail` to fetch latest detail for response (ensures consistency of response shape).
  - Log database errors with `console.error` prior to throwing `BUDGET_UPDATE_FAILED`.

## 5. Security Considerations

- Authentication mandatory via Supabase session (`auth.getUser()`); unauthenticated requests blocked with 401.
- Authorization enforced by filtering on `household_id` derived from authenticated user before update + reliance on Supabase RLS.
- Input sanitation through Zod (length trimming) prevents oversized or malicious strings; output is encoded JSON so no injection risk.
- Consider rate limiting or audit logging for frequent metadata changes (future enhancement).

## 6. Error Handling

- Validation layer returns structured 400 responses with descriptive messages (first violation surfaced).
- Service throws domain errors mapped in handler:
  - `HOUSEHOLD_NOT_FOUND` -> 404 `BUDGET_NOT_FOUND` (mirrors GET logic).
  - `BUDGET_NOT_FOUND` -> 404 `BUDGET_NOT_FOUND`.
  - `INVALID_STATE_TRANSITION` -> 400 `INVALID_STATE_TRANSITION`.
  - `BUDGET_UPDATE_FAILED` -> 500 `BUDGET_UPDATE_FAILED`.
- Unexpected exceptions caught at handler level -> 500 with generic message; details logged server-side via `console.error`.

## 7. Performance Considerations

- Single-row update and follow-up detail fetch; minimal overhead.
- Use `single()`/`maybeSingle()` to ensure Supabase doesn’t scan beyond required row.
- Avoid redundant queries by caching household lookup if service already obtains during detail fetch (e.g., pass householdId to both operations within method to prevent duplicate lookups).
- Consider future optimization to fetch updated record via `select` in update statement to remove extra round trip (requires columns for DTO assembled locally).

## 8. Implementation Steps

1. Confirm `budgets` table includes nullable `note` column with CHECK length ≤ 500; add migration if missing (not part of endpoint code but prerequisite).
2. Extend `src/pages/api/budgets/[budgetId].ts`:
   - Import `UpdateBudgetCommand` type.
   - Define `patchBudgetSchema` (Zod) with `.strict()` and refinement for non-empty payload.
   - Implement `PATCH` handler following validation/auth/service invocation patterns.
   - Reuse shared `createErrorResponse`/`createSuccessResponse` helpers (add `createPatchSuccessResponse` if clarity needed).
3. Update `src/lib/services/budgets.service.ts`:
   - Add method `updateBudgetMetadata` (and exported helper `createBudgetsService` update if required) handling household lookup, state guard, note normalization, Supabase update, and result retrieval via `getBudgetDetail`.
   - Introduce private helper `ensureMutableBudget(budgetId, householdId)` if state machine needed later; currently returns budget row and placeholder check.
   - Ensure all errors mapped to domain strings as outlined.
4. Adjust `createBudgetsService` factory (if present in same file or separate module) to expose new method in returned service instance.
