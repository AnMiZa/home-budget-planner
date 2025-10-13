# API Endpoint Implementation Plan: GET /api/budgets/{budgetId}/planned-expenses

## 1. Przegląd punktu końcowego

- Endpoint zwraca limity planowanych wydatków dla budżetu należącego do uwierzytelnionego gospodarstwa.
- Struktura odpowiedzi jest zgodna z listą przychodów, lecz operuje na polu `limitAmount`.
- Dostęp wymaga zalogowanego użytkownika i budżetu przypisanego do jego gospodarstwa.
- Sukces oznaczony nagłówkiem `X-Result-Code: PLANNED_EXPENSES_LISTED`.

## 2. Szczegóły żądania

- Metoda HTTP: `GET`.
- Struktura URL: `/api/budgets/{budgetId}/planned-expenses`.
- Parametry wymagane: `budgetId` (UUID w segmencie ścieżki).
- Parametry opcjonalne: brak.
- Request Body: brak.

## 3. Wykorzystywane typy

- `BudgetPlannedExpenseDto` z `src/types.ts`.
- `PlannedExpensesListResponseDto` jako kształt odpowiedzi.
- `ApiErrorDto` do ustandaryzowanych błędów.

## 4. Szczegóły odpowiedzi

- 200 `OK` z JSON-em `{ data: BudgetPlannedExpenseDto[] }` i nagłówkiem `X-Result-Code: PLANNED_EXPENSES_LISTED`.
- Rekord zawiera `id`, `categoryId`, `limitAmount`, `createdAt`, `updatedAt`.
- Błędy mapowane na `ApiErrorDto` z kodami: 400 `INVALID_BUDGET_ID`, 401 `UNAUTHENTICATED`, 404 `BUDGET_NOT_FOUND`, 500 `PLANNED_EXPENSES_LIST_FAILED`.

## 5. Przepływ danych

- Astro route pobiera `locals.supabase` i identyfikuje użytkownika przez `supabase.auth.getUser()`.
- Walidacja `budgetId` poprzez Zod (`z.string().uuid`).
- Serwis `BudgetsService` pobiera `household_id` użytkownika, weryfikuje powiązanie budżetu, a następnie odczytuje rekordy z `planned_expenses`.
- Serwis korzysta z istniejącej metody prywatnej `getBudgetPlannedExpenses` lub nowej dedykowanej, aby odwzorować w `BudgetPlannedExpenseDto`.
- Odpowiedź wraca do handlera, który serializuje JSON i ustawia nagłówki.

## 6. Względy bezpieczeństwa

- Wymagana autentykacja Supabase; brak użytkownika skutkuje 401.
- Zweryfikować przynależność budżetu do gospodarstwa użytkownika, aby zapobiec ABAC bypass.
- Polegać na RLS Supabase oraz filtrach `household_id` dla ochrony danych.
- Logować niepowodzenia autoryzacji i błędy serwisu (`console.error`) bez ujawniania danych wrażliwych.

## 7. Obsługa błędów

- 400: `INVALID_BUDGET_ID` przy niepoprawnym UUID.
- 401: `UNAUTHENTICATED` gdy `getUser` zwróci błąd lub brak użytkownika.
- 404: `BUDGET_NOT_FOUND` jeśli brak gospodarstwa lub budżetu dla użytkownika.
- 500: `PLANNED_EXPENSES_LIST_FAILED` dla błędów Supabase lub wyjątków serwisu.
- Logowanie szczegółów serwerowych i zwracanie przyjaznych komunikatów JSON.

## 8. Rozważania dotyczące wydajności

- Zapytanie ograniczone do pojedynczego budżetu; oczekiwany mały zestaw danych.
- Wspierane indeksami na `planned_expenses.budget_id` i FKs; brak potrzeb caching.
- W przypadku większych wolumenów rozważyć stronicowanie po stronie bazy i limit nagłówków, lecz obecnie zbędne.

## 9. Etapy wdrożenia

1. Dodać metodę `listBudgetPlannedExpenses` do `BudgetsService`, korzystając z `getBudgetPlannedExpenses` i walidując przynależność budżetu.
2. Utworzyć plik `src/pages/api/budgets/[budgetId]/planned-expenses.ts` na wzór endpointu przychodów, reużywając helpery do odpowiedzi.
3. Zaimplementować Zod `paramsSchema` dla `budgetId` oraz logikę pobrania użytkownika z `locals.supabase`.
4. Wywołać nowy serwis w handlerze `GET`, mapować błędy serwisu na kody HTTP i ustawiać `X-Result-Code`.
