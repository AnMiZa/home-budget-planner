# API Endpoint Implementation Plan: POST /api/budgets/{budgetId}/planned-expenses

## 1. Przegląd punktu końcowego

- Dodaje pojedynczy limit wydatku planowanego do wskazanego budżetu należącego do uwierzytelnionego gospodarstwa domowego.
- Zapewnia walidację danych wejściowych i własności zasobów, zapobiegając duplikacji kategorii w ramach budżetu.
- Zwraca utworzony rekord planowanego wydatku zgodny z `BudgetPlannedExpenseDto` oraz nagłówek `X-Result-Code: PLANNED_EXPENSE_CREATED`.

## 2. Szczegóły żądania

- Metoda HTTP: `POST`
- Struktura URL: `/api/budgets/{budgetId}/planned-expenses`
- Parametry:
  - Wymagane: `budgetId` (UUID w ścieżce)
  - Opcjonalne: brak
- Request Body (`application/json`):
  - `categoryId` (UUID) — identyfikator kategorii istniejącej w gospodarstwie.
  - `limitAmount` (number) — dodatnia kwota z maks. 2 miejscami po przecinku, ≤ 9 999 999,99.
- Wymagane nagłówki: `Content-Type: application/json`.
- Powiązane typy: `BudgetPlannedExpenseDto`, `BudgetPlannedExpenseCommandItem` (alias `CreatePlannedExpenseCommand`), helpery Zod w `src/lib/validation/budgets`.

## 3. Szczegóły odpowiedzi

- 201 Created — zwraca `BudgetPlannedExpenseDto` oraz nagłówek `X-Result-Code: PLANNED_EXPENSE_CREATED`.
- Błędy:
  - 400 `INVALID_PAYLOAD` / `INVALID_LIMIT` / `DUPLICATE_CATEGORY` / `CATEGORY_NOT_FOUND`.
  - 401 `UNAUTHENTICATED`.
  - 404 `BUDGET_NOT_FOUND`.
  - 500 `PLANNED_EXPENSE_CREATE_FAILED` / `INTERNAL_SERVER_ERROR`.
- Odpowiedzi w formacie `application/json; charset=utf-8` zgodne z `ApiErrorDto` dla błędów.

## 4. Przepływ danych

1. `Astro` endpoint pobiera `locals.supabase` i uwierzytelnia użytkownika (`supabase.auth.getUser`).
2. Walidacja `budgetId` (path) oraz JSON body przez Zod; w razie błędów natychmiastowe odpowiedzi 400.
3. Endpoint tworzy instancję `BudgetsService` (factory `createBudgetsService`).
4. Nowa metoda `createBudgetPlannedExpense(userId, budgetId, command)` w serwisie:
   - Pobiera `household_id` użytkownika.
   - Weryfikuje istnienie budżetu i jego powiązanie z gospodarstwem.
   - Weryfikuje kategorię (przynależność do gospodarstwa, aktywność; wykorzystuje istniejące `validateCategories`).
   - Sprawdza brak istniejącego limitu dla tej pary (select + unique constraint fallback).
   - Wstawia rekord do `planned_expenses` (ustawia `household_id`, `budget_id`, `category_id`, `limit_amount`).
   - Pobiera świeżo dodany rekord i mapuje do `BudgetPlannedExpenseDto` (można wykorzystać istniejący mapper lub dedykowane zapytanie `select`).
5. Endpoint mapuje wynik serwisu na odpowiedź 201, loguje zdarzenie `console.log`.
6. Serwis i endpoint logują błędy (`console.error`) i mapują kody na odpowiednie statusy HTTP.

## 5. Względy bezpieczeństwa

- Autoryzacja: wymaga aktywnej sesji Supabase; brak użytkownika → 401.
- Własność zasobów: wszystkie zapytania filtrują po `household_id` uzyskanym dla użytkownika, co eliminuje IDOR.
- RLS: korzystanie z Supabase jako użytkownika końcowego, zachowuje polityki rls; obsługa błędów `PGRST116` jako 404.
- Walidacja danych: Zod zapobiega SQL injection/invalid payload. Limit decimal -> ochrona przed overflow.
- Logowanie: `console.error` zawiera identyfikatory (userId/budgetId/categoryId) bez wrażliwych danych.

## 6. Obsługa błędów

- Walidacja:
  - Niepoprawne UUID lub JSON → 400 `INVALID_PAYLOAD`.
  - Błędny limit (≤0, > max, >2 miejsca) → 400 `INVALID_LIMIT`.
  - Duplikat kategorii w payloadzie (opcjonalna wstępna walidacja) → 400 `DUPLICATE_CATEGORY`.
- Własność/istnienie:
  - Brak gospodarstwa lub budżetu → 404 `BUDGET_NOT_FOUND`.
  - Kategoria spoza gospodarstwa → 404 `CATEGORY_NOT_FOUND` (mapować błąd serwisu `INVALID_CATEGORY`).
- Konflikty DB:
  - Unique constraint (budżet + kategoria) → 400 `DUPLICATE_CATEGORY`.
  - Check constraint (limit) → 400 `INVALID_LIMIT`.
- Supabase klient niedostępny / inne błędy → 500 `PLANNED_EXPENSE_CREATE_FAILED`.
- Brak sesji Supabase → 401 `UNAUTHENTICATED`.

## 7. Wydajność

- Operacja jednostkowa: pojedynczy insert; domyślna transakcja Supabase wystarczy.
- Minimalizować zapytania: po wstawieniu pobrać rekord jednym `select ... single` zamiast ponownego listowania.
- Można cache’ować identyfikator gospodarstwa w metodzie (lokalna zmienna) bez dodatkowych odczytów.
- Upewnić się, że walidacja nie wykonuje zbędnych zapytań (np. `validateCategories` z `Set`em ID).

## 8. Kroki implementacji

1. Dodać/rozszerzyć schematy Zod w `src/lib/validation/budgets.ts` (path + body parser) i wyeksportować helpery.
2. Rozszerzyć `types.ts`, jeśli potrzebny jest nowy `CreatePlannedExpenseCommand` (alias do istniejącego itema).
3. W `BudgetsService` zaimplementować `createBudgetPlannedExpense` z wykorzystaniem istniejących helperów (`validateCategories`, prywatne mapery DTO); dodać obsługę kodów Supabase (23505, 23514, 23503) → rzucane błędy domenowe.
4. Utworzyć endpoint `POST /api/budgets/[budgetId]/planned-expenses` (nowy plik lub rozszerzenie istniejącego) oparty na schemacie GET/PUT: walidacja, autoryzacja, wywołanie serwisu, mapowanie kodów.
5. Upewnić się, że endpoint zwraca 201 oraz `X-Result-Code: PLANNED_EXPENSE_CREATED` z `BudgetPlannedExpenseDto`.
6. Dodać logowanie `console.log` dla sukcesu oraz `console.error` z kontekstowymi danymi dla błędów.
