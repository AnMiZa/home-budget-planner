# API Endpoint Implementation Plan: PATCH `/api/budgets/{budgetId}/planned-expenses/{plannedExpenseId}`

## 1. Przegląd punktu końcowego

- Aktualizuje pojedynczy limit planowanego wydatku w budżecie gospodarstwa uwierzytelnionego użytkownika.
- Zapewnia walidację danych wejściowych, weryfikację własności zasobu oraz spójne komunikaty o powodzeniu i błędach.
- Wykorzystuje istniejący serwis `BudgetsService` (rozszerzony o metodę aktualizacji pojedynczego limitu) oraz Supabase jako warstwę danych.

## 2. Szczegóły żądania

- Metoda HTTP: PATCH
- Struktura URL: `/api/budgets/{budgetId}/planned-expenses/{plannedExpenseId}`
- Parametry:
  - Wymagane (path):
    - `budgetId` – UUID budżetu (walidacja Zod `z.string().uuid`).
    - `plannedExpenseId` – UUID limitu (walidacja Zod `z.string().uuid`).
  - Opcjonalne: brak.
- Request Body (`UpdatePlannedExpenseCommand`):

  ```json
  { "limitAmount": 1300.0 }
  ```

  - `limitAmount`: liczba dodatnia, maks. `9_999_999.99`, najwyżej 2 miejsca po przecinku (Zod `refine`).

- Walidacja wejścia:
  - Parsowanie JSON z obsługą błędu `INVALID_PAYLOAD` (400).
  - Zod dla parametrów i body; pierwsze błędy logowane `console.warn`.

## 3. Szczegóły odpowiedzi

- Sukces: `200 OK`, nagłówek `X-Result-Code: PLANNED_EXPENSE_UPDATED`.

  ```json
  {
    "data": {
      "id": "uuid",
      "categoryId": "uuid",
      "limitAmount": 1300.0,
      "createdAt": "ISO",
      "updatedAt": "ISO"
    }
  }
  ```

  - Payload oparty o `BudgetPlannedExpenseDto` (można zagnieździć w polu `data`).

- Błędy: format `ApiErrorDto` z odpowiednim kodem (`error.code`) i statusem HTTP.

## 4. Przepływ danych

- Endpoint (Astro API route) waliduje parametry i body przy użyciu Zod.
- Używa `locals.supabase` do uwierzytelnienia (`supabase.auth.getUser`).
- Tworzy instancję `BudgetsService` poprzez `createBudgetsService`.
- Serwis:
  - Pobiera `household_id` użytkownika (lub rzuca `HOUSEHOLD_NOT_FOUND`).
  - Weryfikuje, że `budgetId` należy do gospodarstwa (inna odpowiedź: `BUDGET_NOT_FOUND`).
  - Pobiera rekord `planned_expenses` i weryfikuje jego przynależność (`PLANNED_EXPENSE_NOT_FOUND`).
  - Aktualizuje `limit_amount` (zwracając zaktualizowane kolumny).
  - Mapuje wynik na `BudgetPlannedExpenseDto` i zwraca do endpointu.
- Endpoint buduje odpowiedź 200 lub mapuje błędy na `ApiErrorDto`.

## 5. Względy bezpieczeństwa

- Wymaga aktywnej sesji Supabase; brak/autoryzacja nieudana → `401 UNAUTHENTICATED`.
- Potwierdzenie przynależności budżetu i planowanego wydatku do gospodarstwa użytkownika (ochrona przed IDOR, uzupełnienie RLS).
- Walidacja typów i formatów (UUID, liczby) zapobiega SQL injection i naruszeniom constraintów.
- Brak ekspozycji poufnych danych w odpowiedzi; logi zawierają minimalny kontekst (`console.warn`/`console.error`).

## 6. Obsługa błędów

- `400 INVALID_BUDGET_ID`/`INVALID_PLANNED_EXPENSE_ID`: niepoprawne UUID w ścieżce.
- `400 INVALID_PAYLOAD`: błędny JSON lub wartość `limitAmount` (<=0, zbyt wiele miejsc po przecinku, przekroczenie zakresu).
- `401 UNAUTHENTICATED`: brak sesji lub błąd auth.
- `404 PLANNED_EXPENSE_NOT_FOUND`: brak gospodarstwa, brak budżetu lub planowany wydatek nie istnieje / nie należy do użytkownika.
- `500 PLANNED_EXPENSE_UPDATE_FAILED`: błędy Supabase lub nieprzewidziane wyjątki (logowane `console.error`).
- W serwisie mapowanie kodów Supabase (`23514` → `INVALID_PAYLOAD`, `PGRST116` → `PLANNED_EXPENSE_NOT_FOUND`).

## 7. Rozważania dotyczące wydajności

- Operacja dotyczy pojedynczego rekordu (`UPDATE ... WHERE id & budget_id`), obciążenie minimalne.
- Wykorzystanie istniejących indeksów PK/FK zapewnia szybkie wyszukiwanie.
- Ograniczyć liczbę zapytań do minimalnych (1 dla gospodarstwa, 1 dla budżetu, 1 dla selekcji limitu, 1 dla update + select). Można połączyć select/update poprzez `update().eq(...).eq(...) .select()`.

## 8. Kroki implementacji

1. **Walidacja i helpery** – przygotuj schemat Zod dla parametrów i body (`limitAmount`), dodaj funkcje `createErrorResponse`/`createSuccessResponse` (spójne z istniejącymi endpointami).
2. **Serwis** – w `BudgetsService` dodaj metodę `updateBudgetPlannedExpense(userId, budgetId, plannedExpenseId, command)` z walidacją gospodarstwa, budżetu i rekordu.
3. **Logika aktualizacji** – zaimplementuj update Supabase (`planned_expenses`) z obsługą kodów błędów (`23514`, `23505`, `PGRST116`) i mapowaniem na własne komunikaty.
4. **Mapowanie DTO** – wykorzystaj istniejący mapper dla planowanych wydatków lub dodaj prywatny helper, aby zachować spójny format `BudgetPlannedExpenseDto`.
5. **Endpoint** – utwórz plik `src/pages/api/budgets/[budgetId]/planned-expenses/[plannedExpenseId].ts`, dodaj handler `export const PATCH`, obsłuż uwierzytelnienie, walidację, wywołanie serwisu i mapowanie błędów → kodów HTTP.
6. **Logowanie** – dodaj `console.warn`/`console.error` zgodnie z typami błędów.
