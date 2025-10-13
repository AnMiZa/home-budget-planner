# API Endpoint Implementation Plan: PATCH `/api/budgets/{budgetId}/incomes/{incomeId}`

## 1. Przegląd punktu końcowego

- Aktualizuje kwotę pojedynczego przychodu powiązanego z budżetem w gospodarstwie zalogowanego użytkownika.
- Zapewnia weryfikację własności zasobu i walidację danych oraz zwraca zaktualizowany rekord przy sukcesie.

## 2. Szczegóły żądania

- Metoda HTTP: PATCH
- Struktura URL: `/api/budgets/{budgetId}/incomes/{incomeId}`
- Parametry:
  - Wymagane: `budgetId` (UUID), `incomeId` (UUID)
  - Opcjonalne: brak
- Request Body:
  - JSON: `{ "amount": number }`
  - Walidacja: liczba dodatnia > 0, maks. 2 miejsca po przecinku, ≤ 9_999_999.99

## 3. Wykorzystywane typy

- DTO: `BudgetIncomeDto`, `ApiErrorDto`
- Command: `UpdateBudgetIncomeCommand`
- Ewentualne dodatkowe typy pomocnicze: nowy rezultat serwisu (np. `BudgetIncomeDto`) zwracany bez zmian.

## 3. Szczegóły odpowiedzi

- Sukces 200:
  - Body: `BudgetIncomeDto` zaktualizowanego przychodu
  - Nagłówki: `Content-Type: application/json; charset=utf-8`, `X-Result-Code: INCOME_UPDATED`
- Błędy:
  - 400 `INVALID_BUDGET_ID`, `INVALID_INCOME_ID`, `INVALID_PAYLOAD`
  - 401 `UNAUTHENTICATED`
  - 404 `INCOME_NOT_FOUND`
  - 500 `INCOME_UPDATE_FAILED`

## 4. Przepływ danych

- Klient → endpoint Astro API (walidacja params/body)
- Endpoint → `locals.supabase.auth.getUser()` dla uwierzytelnienia
- Endpoint → `createBudgetsService(supabase)` → `BudgetsService.updateBudgetIncome`
- Serwis:
  1. Pobiera `household_id` użytkownika.
  2. Weryfikuje istnienie budżetu w gospodarstwie.
  3. Pobiera i aktualizuje rekord `incomes` po `id`, `budget_id`, `household_id`.
  4. Zwraca zaktualizowane dane mapowane na `BudgetIncomeDto`.
- Wynik wraca do klienta z nagłówkami statusu.

## 5. Względy bezpieczeństwa

- Autoryzacja: Supabase Auth -> user id; wszystkie operacje filtrowane po `household_id`.
- Zapobieganie IDOR: sprawdzenie zarówno `budgetId`, jak i `incomeId` należy do tego samego gospodarstwa.
- Walidacja wejścia: Zod (UUID, dodatnia kwota, ograniczenie precyzji), dodatkowe guard clause w serwisie.
- Ochrona danych: brak zwracania wrażliwych informacji (tylko DTO).
- RLS: zachowane dzięki użyciu supabase kontekstowego i warunków na `household_id`.

## 6. Obsługa błędów

- Walidacja ścieżki:
  - Niepoprawny UUID → 400 z adekwatnym kodem.
- Brak supabase lub auth error → 500 lub 401 (`UNAUTHENTICATED`).
- Brak użytkownika → 401.
- Household/budget/income nieodnaleziony → mapować do 404 `INCOME_NOT_FOUND` (nawet jeśli upstream sygnalizuje `HOUSEHOLD_NOT_FOUND` lub `BUDGET_NOT_FOUND`).
- Błędy bazy (np. CHECK) → 400 `INVALID_PAYLOAD` gdy dotyczy amount; inne → 500 `INCOME_UPDATE_FAILED`.
- Logowanie: `console.warn` dla walidacji, `console.error` dla błędów serwisu/bazy; brak wymogu wstawień do tabeli błędów.

## 7. Rozważania dotyczące wydajności

- Operacja dotyczy pojedynczego rekordu; narzut minimalny.
- Weryfikacje sekwencyjne (household → budget → income) optymalizowane przez selekcję pojedynczych kolumn.
- W razie potrzeby redukcja zapytań: połączone zapytanie `incomes` z `household_id` i `budget_id` eliminuje dodatkowy select budżetu.

## 8. Etapy wdrożenia

1. Dodaj Zod schematy dla `budgetId`, `incomeId` i body `amount` w pliku `src/pages/api/budgets/[budgetId]/incomes/[incomeId].ts` (nowy plik endpointu).
2. Utwórz helpery odpowiedzi (`createErrorResponse`, `createSuccessResponse`) wzorując się na istniejących endpointach.
3. W endpoincie:
   - Pobierz `supabase` z `locals`, obsłuż brak klienta (500).
   - Uwierzytelnij użytkownika (`getUser`), obsłuż 401/500.
   - Wywołaj nową metodę serwisu `updateBudgetIncome`.
   - Mapuj kody błędów serwisu na odpowiednie odpowiedzi HTTP.
4. Rozszerz `BudgetsService`:
   - Dodaj metodę publiczną `updateBudgetIncome(userId, budgetId, incomeId, command)`.
   - Implementacja: pobranie `household_id`, weryfikacja przynależności budżetu, aktualizacja rekordu `incomes` z `updated_at` = now, zwrócenie `BudgetIncomeDto`.
   - Obsłuż błędy (brak household/budget/income, constraint violations, inne).
5. Dodaj prywatne mapowanie danych `incomes` na `BudgetIncomeDto` jeżeli nie istnieje reuse (np. przez istniejące `getBudgetIncomes`), aby uniknąć duplikacji logiki.
6. Aktualizuj eksport fabryki `createBudgetsService` jeśli konieczne (zapewnienie nowej metody).
