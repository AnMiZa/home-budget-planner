# API Endpoint Implementation Plan: POST /api/budgets

## 1. Przegląd punktu końcowego

Tworzy nowy miesięczny budżet powiązany z gospodarstwem zalogowanego użytkownika oraz opcjonalnie inicjuje przychody i planowane wydatki w jednej operacji. Zwraca identyfikator nowego budżetu oraz metadane czasu utworzenia.

## 2. Szczegóły żądania

- Metoda HTTP: POST
- Struktura URL: `/api/budgets`
- Parametry:
  - Wymagane: `month`
  - Opcjonalne: `incomes`, `plannedExpenses`
- Request Body:
  - `month` (string, format `YYYY-MM` lub `YYYY-MM-DD` z pierwszym dniem miesiąca)
  - `incomes` (opcjonalna tablica obiektów `{ householdMemberId: UUID, amount: number > 0 }`)
  - `plannedExpenses` (opcjonalna tablica obiektów `{ categoryId: UUID, limitAmount: number > 0 }`)
  - Walidacje dodatkowe: brak duplikatów `householdMemberId`/`categoryId`, brak wartości ujemnych/zerowych, zgodność rekordów z gospodarstwem użytkownika.

## 3. Wykorzystywane typy

- `CreateBudgetCommand`, `BudgetIncomeCommandItem`, `BudgetPlannedExpenseCommandItem` z `src/types.ts`
- `BudgetCreatedDto` z `src/types.ts`
- `ApiErrorDto` dla odpowiedzi błędnych z `src/types.ts`
- Schematy Zod (nowe) dla payloadu: np. `createBudgetSchema`, `incomeItemSchema`, `plannedExpenseItemSchema` w pliku route lub wydzielone do `src/lib/validation/budgets.ts`.

## 4. Szczegóły odpowiedzi

- Sukces: 201 Created, kod domenowy `BUDGET_CREATED`, body typu `BudgetCreatedDto`

  ```json
  {
    "id": "uuid",
    "month": "YYYY-MM-01",
    "createdAt": "ISO timestamp"
  }
  ```

- Błędy walidacji: 400 Bad Request z `ApiErrorDto` (`INVALID_MONTH_FORMAT`, `MISSING_INCOMES`, `INVALID_MEMBER`, `INVALID_CATEGORY`, `INVALID_PAYLOAD`)
- Konflikt: 409 Conflict z `ApiErrorDto` (`BUDGET_ALREADY_EXISTS`)
- Brak autoryzacji: 401 Unauthorized (Astro middleware / Supabase auth)
- Inne błędy serwera: 500 Internal Server Error (`BUDGET_CREATE_FAILED`)

## 5. Przepływ danych

1. Pobranie klienta Supabase z `context.locals` w handlerze Astro.
2. Walidacja request body za pomocą Zod; normalizacja miesiąca do `YYYY-MM-01`.
3. Utworzenie instancji `BudgetsService` poprzez `createBudgetsService`.
4. W serwisie: pobranie `household_id` dla użytkownika; walidacja istnienia.
5. Weryfikacja referencji:
   - Czy wszyscy `householdMemberId` należą do gospodarstwa i są aktywni.
   - Czy `categoryId` należą do gospodarstwa.
6. Utworzenie budżetu w tabeli `budgets`; obsługa unikalności miesiąca.
7. Opcjonalne insert-y do `incomes` i `planned_expenses` z wstrzykniętym `household_id` i `budget_id` (najlepiej w ramach jednej transakcji Postgres przez RPC lub sekwencyjne operacje z rollbackiem ręcznym przy błędach).
8. Zwrócenie responsu `BudgetCreatedDto` po wyrównaniu formatu miesiąca.

## 6. Względy bezpieczeństwa

- Wymagana autoryzacja Supabase; handler odrzuca żądania bez `context.locals.user` (401).
- `BudgetsService` wykorzystuje `households` do powiązania użytkownika z `household_id`, co zapobiega dostępowi do cudzych zasobów.
- Dodatkowa walidacja referencji zapobiega wstrzyknięciu obcych `UUID` mimo RLS.
- Zwracanie ogólnych komunikatów przy błędach serwera, logowanie szczegółów po stronie backendu (`console.error`).
- Brak dedykowanej tabeli logów błędów – pozostajemy przy istniejącym logowaniu (rozszerzenie możliwe w przyszłości).

## 7. Obsługa błędów

- 400 `INVALID_PAYLOAD`: struktura JSON niezgodna z Zod (np. brak `month`).
- 400 `INVALID_MONTH_FORMAT`: `month` nie parsuje się do pierwszego dnia miesiąca.
- 400 `MISSING_INCOMES`: wymóg biznesowy przynajmniej jednego przychodu (jeśli brak).
- 400 `INVALID_MEMBER`: co najmniej jeden `householdMemberId` nie należy do gospodarstwa / jest nieaktywny.
- 400 `INVALID_CATEGORY`: co najmniej jedno `categoryId` spoza gospodarstwa.
- 409 `BUDGET_ALREADY_EXISTS`: naruszenie unikalności miesiąca dla gospodarstwa.
- 404 `HOUSEHOLD_NOT_FOUND`: użytkownik bez gospodarstwa (mapowane do 404 aby ukryć istnienie zasobów).
- 500 `BUDGET_CREATE_FAILED`: inne błędy bazy Supabase; logowanie szczegółów.

## 8. Rozważania dotyczące wydajności

- Minimalizacja liczby zapytań: kiedy możliwe, użycie zapytań z `.in` i pojedynczych insertów batched (`supabase.from('incomes').insert([...])`).
- Rozważenie wykorzystania funkcji RPC w Supabase do transakcyjnego tworzenia budżetu z powiązanymi rekordami, jeśli konieczne jest atomiczne zachowanie.
- Normalizacja i walidacja w kodzie redukująca błędne round-tripy do bazy.
- Potencjalna przyszła optymalizacja: cache identyfikatorów aktywnych członków/kategorii w serwisie przy wielu wstawieniach.

## 9. Kroki implementacji

1. Dodać schematy Zod dla żądania w nowym module walidacyjnym lub bezpośrednio w `src/pages/api/budgets.ts`.
2. Rozszerzyć `BudgetsService.createBudget` o logikę walidacji referencji (kwerendy `household_members`, `categories`) oraz opcjonalne wstawianie `incomes` i `planned_expenses`.
3. Zapewnić atomowość operacji (np. Supabase `rpc`/`pg` procedure lub manualna obsługa błędów i rollback insertów zależnych).
4. Zmapować błędy serwisu na kody domenowe i HTTP w handlerze Astro (`switch` po `error.message`).
5. Zaktualizować `src/pages/api/budgets.ts` o nowy handler `POST`, korzystając z walidacji i serwisu.
