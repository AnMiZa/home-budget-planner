# API Endpoint Implementation Plan: DELETE `/api/budgets/{budgetId}/planned-expenses/{plannedExpenseId}`

## 1. Przegląd punktu końcowego

- Usuwa pojedynczy limit planowanego wydatku z budżetu gospodarstwa uwierzytelnionego użytkownika, zwalniając przypisane środki.
- Egzekwuje politykę blokady budżetów, uniemożliwiając modyfikacje, jeśli budżet znajduje się w stanie `locked`.

## 2. Szczegóły żądania

- Metoda HTTP: DELETE
- Struktura URL: `/api/budgets/{budgetId}/planned-expenses/{plannedExpenseId}`
- Parametry:
  - Wymagane (path): `budgetId` (UUID), `plannedExpenseId` (UUID)
  - Opcjonalne: brak
- Request Body: brak (ignorować lub zwrócić 400 przy niepustym ciele)

## 3. Wykorzystywane typy

- `ApiErrorDto` (odpowiedzi błędów)
- `BudgetPlannedExpenseDto` (używany serwisowo, brak odpowiedzi w DELETE)
- Komendy: brak dedykowanej komendy; identyfikatory przekazywane w parametrach
- Opcjonalny nowy typ serwisowy: `DeletePlannedExpenseResult` (jeśli potrzebna jawna informacja o rezultacie)

## 3. Szczegóły odpowiedzi

- Sukces: `204 No Content`, nagłówek `X-Result-Code: PLANNED_EXPENSE_DELETED`, brak body
- Błędy (`ApiErrorDto`):
  - `400`: `INVALID_BUDGET_ID`, `INVALID_PLANNED_EXPENSE_ID`
  - `401`: `UNAUTHENTICATED`
  - `404`: `PLANNED_EXPENSE_NOT_FOUND`
  - `500`: `PLANNED_EXPENSE_DELETE_FAILED`

## 4. Przepływ danych

- Astro API route:
  1. Waliduje parametry ścieżki (Zod, UUID).
  2. Opcjonalnie weryfikuje brak body.
  3. Pozyskuje `locals.supabase` i wykonuje `supabase.auth.getUser`.
  4. Tworzy `BudgetsService` (factory `createBudgetsService`).
  5. Wywołuje `deleteBudgetPlannedExpense(user.id, budgetId, plannedExpenseId)`.
  6. Mapuje rezultat na `204` lub błędy na `ApiErrorDto`.
- Serwis:
  1. Pobiera `household_id` użytkownika.
  2. Weryfikuje, że budżet istnieje i należy do gospodarstwa.
  3. Wykonuje `delete` na `planned_expenses` (warunki: `id`, `budget_id`, `household_id`).
  4. Jeśli brak rekordu → `PLANNED_EXPENSE_NOT_FOUND`.
  5. Inne błędy → loguje i rzuca `PLANNED_EXPENSE_DELETE_FAILED`.

## 5. Względy bezpieczeństwa

- Autoryzacja: weryfikacja gospodarstwa i budżetu chroni przed IDOR.
- RLS Supabase wymaga filtrów na `household_id` i `budget_id`.
- Brak ciała żądania ogranicza powierzchnię ataku.
- Logowanie pozbawione danych wrażliwych.

## 6. Obsługa błędów

- `400 INVALID_BUDGET_ID` / `INVALID_PLANNED_EXPENSE_ID`: błędne UUID (Zod).
- `401 UNAUTHENTICATED`: brak sesji lub błąd w `getUser`.
- `404 PLANNED_EXPENSE_NOT_FOUND`: brak gospodarstwa, budżetu lub planowanego wydatku.
- `500 PLANNED_EXPENSE_DELETE_FAILED`: problemy z bazą/Supabase lub inne wyjątki.
- Logi: walidacje → `console.warn`, błędy → `console.error`.

## 7. Rozważania dotyczące wydajności

- Operacja dotyczy pojedynczego rekordu; istniejące indeksy (`id`, `budget_id`, `household_id`) zapewniają wysoką wydajność.
- Brak dodatkowych odczytów oprócz walidacji gospodarstwa/budżetu.
- Brak odpowiedzi treści → minimalny transfer.

## 8. Etapy wdrożenia

1. Dodaj nowy endpoint DELETE w `src/pages/api/budgets/[budgetId]/planned-expenses/[plannedExpenseId].ts` (można współdzielić plik z PATCH, używając tego samego schematu parametrów).
2. Zaimplementuj walidację parametrów i obsługę autoryzacji (Zod + `supabase.auth.getUser`).
3. Rozszerz `BudgetsService` o `deleteBudgetPlannedExpense` zgodnie z przepływem danych (obsługa `PLANNED_EXPENSE_NOT_FOUND`).
4. Mapuj błędy serwisu na kody HTTP, ustawiaj `X-Result-Code` przy sukcesie.
5. Dodaj logowanie (`console.warn`/`console.error`) w odpowiednich miejscach.
