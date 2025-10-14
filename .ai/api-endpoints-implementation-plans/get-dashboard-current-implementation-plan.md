# API Endpoint Implementation Plan: GET /api/dashboard/current

## 1. Przegląd punktu końcowego

- Zwraca `DashboardSummaryDto` dla aktywnego budżetu gospodarstwa uwierzytelnionego użytkownika.
- Wybiera budżet miesiąca bieżącego (`month = YYYY-MM-01`) lub najnowszy wcześniejszy, jeśli bieżący nie istnieje; należy potwierdzić sposób oznaczania „odblokowanych” budżetów (brak kolumny `status` w schemacie ‒ przyjmujemy, że wszystkie są odblokowane, ewentualnie dodać filtr po `status`, jeśli kolumna istnieje w kodzie).
- Nagłówek sukcesu `X-Result-Code: DASHBOARD_SUMMARY`, kod 200; brak budżetu → 404 `BUDGET_NOT_FOUND`.

## 2. Szczegóły żądania

- Metoda HTTP: GET
- Struktura URL: `/api/dashboard/current`
- Parametry: brak path/query; wszystkie dane pochodzą z kontekstu użytkownika.
- Nagłówki: standardowe; opcjonalnie `Accept: application/json` (obsługujemy JSON domyślnie).
- Walidacja: zapewnić obecność klienta Supabase (`locals.supabase`) i uwierzytelnionego użytkownika (`supabase.auth.getUser`).

## 3. Szczegóły odpowiedzi

- 200 OK (`DASHBOARD_SUMMARY`): body w formacie `DashboardSummaryDto` (`currentBudgetId`, `month`, `totalIncome`, `totalPlanned`, `totalSpent`, `freeFunds`, `progress`, `categories[]` z polami `BudgetCategorySummaryDto`).
- 401 `UNAUTHENTICATED`: brak sesji użytkownika.
- 404 `BUDGET_NOT_FOUND`: brak gospodarstwa lub brak aktywnego budżetu dla gospodarstwa.
- 500 `SUPABASE_CLIENT_UNAVAILABLE` (brak klienta w `locals`) lub `DASHBOARD_FETCH_FAILED` / `INTERNAL_SERVER_ERROR` przy problemach z bazą.
- Wszystkie odpowiedzi błędów jako `ApiErrorDto` z nagłówkiem `Content-Type: application/json; charset=utf-8`.

## 4. Przepływ danych

- **Route (`src/pages/api/dashboard/current.ts`)**
  - Pobiera `locals.supabase`; jeśli brak → 500.
  - Wywołuje `supabase.auth.getUser` → 401 bez użytkownika.
  - Tworzy serwis (np. `createBudgetsService` lub nowy `createDashboardService`).
- **Serwis**
  - Metoda `getCurrentDashboardSummary(userId: string): Promise<DashboardSummaryDto>`:
    1. Odczytuje `households.id` przypisane do użytkownika; brak → błąd `BUDGET_NOT_FOUND` (unikamy ujawniania braku gospodarstwa).
    2. Wyznacza docelowy budżet:
       - Szuka rekordu dla bieżącego miesiąca; jeśli brak, wybiera najnowszy (`ORDER BY month DESC LIMIT 1`) nie późniejszy niż bieżący (lub inny zgodnie z uzgodnionym kryterium „unlocked”).
       - Brak wyników → `BUDGET_NOT_FOUND`.
    3. Agreguje dane dla budżetu i gospodarstwa:
       - Sumuje `incomes.amount`.
       - Sumuje `planned_expenses.limit_amount`.
       - Sumuje `transactions.amount` + zestawienie per kategoria (join z `categories` + planned).
    4. Oblicza `freeFunds`, `progress` (zwracamy proporcję 0-1 jak w specyfikacji; dopilnować, by w kodzie nie mnożyć przez 100 jeśli API ma zwracać wartość 0.73).
    5. Mapuje wyniki do `DashboardSummaryDto` (w tym `BudgetCategorySummaryStatus` na podstawie relacji `spent` vs `limitAmount`).
  - Można wykorzystać istniejące prywatne metody `BudgetsService` (`calculateCategorySummaries`, mapowania DTO); jeśli są niedostępne, wydzielić wspólne helpery do prywatnych metod lub modułu util.
- **Odpowiedź**
  - Route serializuje DTO do JSON, ustawia nagłówki (`Content-Type`, `X-Result-Code`).

## 5. Względy bezpieczeństwa

- Wymagane uwierzytelnienie Supabase; brak → 401.
- Wszystkie zapytania do tabel (`budgets`, `incomes`, `planned_expenses`, `transactions`, `categories`) filtrowane po `household_id` użytkownika; respektuje to RLS i zapobiega wyciekom danych między gospodarstwami.
- Odpowiedzi 404 dla braku gospodarstwa/budżetu, aby nie zdradzać struktury danych nieuprawnionym.
- Brak danych wejściowych od użytkownika eliminuje potrzebę dodatkowej walidacji; mimo to upewnić się, że zapytania SQL nie używają interpolacji (tylko metody Supabase).

## 6. Obsługa błędów

- Mapowanie wyjątków serwisu na odpowiedzi HTTP w handlerze:
  - `UNAUTHENTICATED` → 401.
  - `BUDGET_NOT_FOUND` → 404 (obejmuje brak gospodarstwa lub brak budżetu).
  - `SUPABASE_CLIENT_UNAVAILABLE` → 500 (brak klienta w `locals`).
  - `DASHBOARD_FETCH_FAILED` → 500 dla błędów bazodanowych; logować szczegóły `console.error`.
  - Nieznane błędy → 500 `INTERNAL_SERVER_ERROR`.
- Serwis powinien rzucać błędy z czytelnymi kodami tekstowymi (spójne z istniejącym stylem `BudgetsService`).

## 7. Wydajność

- Minimalizować liczbę zapytań: pobranie budżetu + jedna agregacja lub równoległe zapytania do `incomes`, `planned_expenses`, `transactions` poprzez `Promise.all` (Ścieżka zgodna z istniejącą logiką). Rozważyć pojedyńcze zapytanie SQL z CTE jeśli agregacje okażą się zbyt kosztowne.
- Upewnić się, że wykorzystywane kolumny (`household_id`, `month`, `budget_id`, `category_id`) korzystają z istniejących indeksów (są kluczami obcymi).
- Wstrzymać cache po stronie serwera; endpoint dostarcza dynamiczne dane użytkownika – brak dodatkowego cachowania w Astro.

## 8. Kroki implementacji

1. **Serwis**: dodać metodę `getCurrentDashboardSummary` (lub dedykowany `DashboardService`) w `src/lib/services/budgets.service.ts`; wykorzystać istniejące helpery do agregacji i mapowania; dodać testy jednostkowe jeśli projekt używa (w przeciwnym razie pozostawić notatkę TODO).
2. **Routing**: utworzyć plik `src/pages/api/dashboard/current.ts` z handlerem GET; zaimplementować schemat odpowiedzi i mapowanie błędów zgodne z sekcjami 5–6; ustawić `export const prerender = false`.
3. **Obsługa błędów**: zaktualizować serwis/handler o spójne komunikaty (`console.error` w przypadku błędów Supabase, bez ujawniania szczegółów klientowi).
   .
