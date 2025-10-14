# API Endpoint Implementation Plan: GET /api/budgets/{budgetId}/summary

## 1. Przegląd punktu końcowego

- Zapewnia historyczne podsumowanie pojedynczego budżetu użytkownika, kompatybilne z danymi `/api/dashboard/current`.
- Umożliwia opcjonalne wyłączenie szczegółów kategorii poprzez parametr `includeCategories`.
- Sukces zwraca `BudgetSummaryResponseDto` z `X-Result-Code: BUDGET_SUMMARY`.

## 2. Szczegóły żądania

- Metoda HTTP: GET
- Struktura URL: `/api/budgets/{budgetId}/summary`
- Parametry:
  - Wymagane: `budgetId` (UUID w segmencie ścieżki).
  - Opcjonalne: `includeCategories` (boolean, domyślnie `true`; akceptować `true/false`, `1/0`).
- Request Body: brak; wszystkie dane w path/query.
- Walidacja:
  - Nowe schematy Zod w `src/lib/validation/budgets.ts` (utworzyć plik, jeżeli nie istnieje) dla `params` i `query` z domyślną wartością `true` dla `includeCategories`.
  - W handlerze upewnić się, że `locals.supabase` istnieje i użytkownik jest uwierzytelniony (`supabase.auth.getUser`).

## 3. Wykorzystywane typy

- DTO: `DashboardSummaryDto`, `BudgetSummaryDto`, `BudgetCategorySummaryDto`, `BudgetSummaryResponseDto`, `ApiErrorDto` (z `src/types.ts`).
- Enum/alias: `BudgetCategorySummaryStatus` dla statusów kategorii.
- Brak nowych command modeli; korzystamy z istniejących struktur DTO.

## 4. Szczegóły odpowiedzi

- 200 OK (`BUDGET_SUMMARY`): body `BudgetSummaryResponseDto` (`budgetId`, `month`, `summary`). `summary` zawiera pola jak w `DashboardSummaryDto`; jeśli `includeCategories=false`, zwrócić `summary.perCategory` jako pustą tablicę lub pominąć (ustalić i udokumentować konsekwentne zachowanie – preferowane `[]`).
- 401 Unauthorized (`UNAUTHENTICATED`): brak tokenu lub nieważna sesja.
- 404 Not Found (`BUDGET_NOT_FOUND`): budżet nie istnieje lub nie należy do gospodarstwa użytkownika.
- 400 Bad Request (`INVALID_REQUEST`): nieprawidłowy `budgetId` lub `includeCategories`.
- 500 Internal Server Error: `SUPABASE_CLIENT_UNAVAILABLE`, `BUDGET_SUMMARY_FETCH_FAILED`, `INTERNAL_SERVER_ERROR`.
- Wszystkie odpowiedzi JSON z nagłówkiem `Content-Type: application/json; charset=utf-8`.

## 5. Przepływ danych

- **Handler (`src/pages/api/budgets/[budgetId]/summary.ts`)**
  - Ustawia `export const prerender = false`.
  - Waliduje parametry (nowy moduł walidacyjny) i domyślną wartość `includeCategories`.
  - Uzyskuje `supabase` z `locals`, następnie `supabase.auth.getUser()`; brak → 401.
  - Inicjuje serwis budżetów przez `createBudgetsService(supabase)`.
  - Wywołuje nową metodę serwisu `getBudgetSummary(userId, budgetId, { includeCategories })`.
  - Na sukces: loguje `console.log`, zwraca 200 z nagłówkiem `X-Result-Code: BUDGET_SUMMARY`.
- **Serwis (`BudgetsService`)**
  - Dodaje publiczną metodę `getBudgetSummary(userId: string, budgetId: string, options?: { includeCategories?: boolean })`.
  - Zapewnia weryfikację gospodarstwa: pobranie `household_id` dla usera, następnie pobranie budżetu po `id` i `household_id`; brak → `BUDGET_NOT_FOUND`.
  - Równolegle pobiera `incomes`, `planned_expenses`, `transactions` w zakresie budżetu i gospodarstwa.
  - Sumuje `totalIncome`, `totalPlanned`, `totalSpent`, wylicza `freeFunds`, `progress` (0–1).
  - Jeśli `includeCategories=false`, pominąć `calculateCategorySummaries` i zwrócić pustą tablicę; w przeciwnym razie użyć istniejącego helpera.
  - Zwraca `BudgetSummaryResponseDto` z `summary.perCategory` zgodnym z parametrem opcji.
- **Walidacja/helpers**
  - W `src/lib/validation/budgets.ts` dodać funkcje `parseGetBudgetSummaryParams` oraz `parseGetBudgetSummaryQuery`, zwracające typy z dopasowaniem do handlera.

## 6. Względy bezpieczeństwa

- Autentykacja Supabase wymagana (401 przy braku).
- Wszystkie zapytania filtrowane po `household_id` użytkownika, korzystając z RLS.
- Nieujawnianie istnienia cudzego budżetu: dla mismatch zwracamy `BUDGET_NOT_FOUND`.
- Brak interpolacji raw SQL; korzystamy z buildera Supabase oraz helperów.
- Walidacja `budgetId` zapobiega próbom SQLi w path.

## 7. Obsługa błędów

- Handler mapuje znane błędy serwisu na statusy:
  - `UNAUTHENTICATED` → 401.
  - `BUDGET_NOT_FOUND` → 404.
  - `INVALID_REQUEST` → 400.
  - `SUPABASE_CLIENT_UNAVAILABLE`, `BUDGET_SUMMARY_FETCH_FAILED`, inne → 500.
- Serwis:
  - Błędy Supabase logować przez `console.error` z kontekstem (`userId`, `budgetId`).
  - Przy braku gospodarstwa/budżetu rzucać `new Error("BUDGET_NOT_FOUND")`.
  - Błędy agregacji danych mapować na `BUDGET_SUMMARY_FETCH_FAILED`.

## 8. Rozważania dotyczące wydajności

- Wykorzystać `Promise.all` dla zapytań `incomes`, `planned_expenses`, `transactions`.
- Przy `includeCategories=false` nie pobierać danych kategorii/nie wykonywać dodatkowych obliczeń.
- Upewnić się, że liczby są castowane do `number` (Supabase może zwracać stringi dla DECIMAL), aby uniknąć kosztów dalszej konwersji po stronie klienta.
- Reużywać istniejących mapowań DTO, aby uniknąć duplikacji i regresji.

## 9. Etapy wdrożenia

1. **Walidacja**: utworzyć/uzupełnić `src/lib/validation/budgets.ts` o schematy Zod (`createGetBudgetSummaryParamsSchema`, `createGetBudgetSummaryQuerySchema`) i eksporty parserów.
2. **Serwis**: w `BudgetsService` dodać metodę `getBudgetSummary`; zapewnić obsługę opcji `includeCategories` i użyć istniejących helperów agregujących.
3. **Handler**: utworzyć plik `src/pages/api/budgets/[budgetId]/summary.ts`; zaimplementować logikę GET, walidację, mapowanie błędów, nagłówki sukcesu.
4. **Logowanie i błędy**: dodać spójne `console.log`/`console.error` z kontekstem w handlerze i serwisie; mapować błędy na `ApiErrorDto`.
