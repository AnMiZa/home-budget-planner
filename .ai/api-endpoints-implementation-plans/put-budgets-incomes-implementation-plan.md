# API Endpoint Implementation Plan: PUT `/api/budgets/{budgetId}/incomes`

## 1. Przegląd punktu końcowego

- Endpoint zastępuje kompletny zestaw przychodów (`incomes`) dla wybranego budżetu gospodarstwa zalogowanego użytkownika.
- Scenariusz: UI wysyła pełną listę przychodów po każdej edycji; backend usuwa rekordy spoza listy i wstawia nowy zestaw, zwracając zaktualizowaną listę.
- Implementacja w Astro API routes z wykorzystaniem Supabase (uwierzytelnienie, autoryzacja, RLS) i serwisu budżetów.

## 2. Szczegóły żądania

- Metoda HTTP: PUT
- Struktura URL: `/api/budgets/{budgetId}/incomes`
- Parametry:
  - Wymagane: `budgetId` (UUID jako parametr ścieżki)
  - Opcjonalne: brak
- Request Body (JSON, wymagany):

  ```json
  {
    "incomes": [{ "householdMemberId": "uuid", "amount": 3500.0 }]
  }
  ```

- Walidacja payloadu (Zod w endpointzie):
  - `incomes`: wymagana tablica (może być pusta), limit długości opcjonalny (np. ≤ 100, aby chronić API).
  - Element: `{ householdMemberId: UUID string, amount: number > 0 }` z dodatkowymi regułami: wartość liczbowa, max 9_999_999.99, maks. dwie cyfry po przecinku (`refine`).
  - Dodatkowy `refine`: brak duplikatów `householdMemberId` w pojedynczym żądaniu (w przeciwnym razie `DUPLICATE_MEMBER`).
  - Blokady na `NaN`, `Infinity`, wartości tekstowe.

## 3. Wykorzystywane typy

- DTO: `BudgetIncomeDto`, `BudgetIncomesListResponseDto`, `ApiErrorDto` (`src/types.ts`).
- Komendy: `BudgetIncomeCommandItem`, `UpsertBudgetIncomesCommand` (`src/types.ts`).
- Schematy Zod: lokalne w pliku endpointu dla `params` oraz payloadu.
- Potencjalna enumeracja kodów błędów (stałe string) w endpointzie.

## 3. Szczegóły odpowiedzi

- Status 200 OK, nagłówek `X-Result-Code: INCOMES_UPSERTED`.
- Payload (`BudgetIncomesListResponseDto`):

  ```json
  {
    "data": [
      {
        "id": "uuid",
        "householdMemberId": "uuid",
        "amount": 3500,
        "createdAt": "ISO",
        "updatedAt": "ISO"
      }
    ]
  }
  ```

- Błędy (JSON `ApiErrorDto` z `Content-Type: application/json; charset=utf-8`).

## 4. Przepływ danych

- Klient wysyła PUT → endpoint weryfikuje `budgetId` i payload.
- Endpoint pozyskuje `locals.supabase` i `supabase.auth.getUser()`; odrzuca brak sesji.
- Tworzy `BudgetsService` (`createBudgetsService`); wywołuje nową metodę `replaceBudgetIncomes(userId, budgetId, command)`.
- Serwis:
  1. Pobiera `household_id` użytkownika (tabela `households`).
  2. Weryfikuje, że `budgetId` należy do gospodarstwa (`budgets`).
  3. Zbiera wszystkie `householdMemberId` z żądania i woła `validateHouseholdMembers` (rozszerzenie: przenosimy do metody prywatnej, reuse istniejącej) – wymusza aktywność i przynależność.
  4. Usuwa wszystkie rekordy `incomes` powiązane z `budget_id` (lub, dla optymalizacji, usuwa te spoza nowej listy).
  5. Jeśli lista niepusta: przygotowuje nowe rekordy z `household_id`, `budget_id`, `household_member_id`, `amount`; używa `insert` lub `upsert` z `onConflict: "budget_id,household_member_id"`.
  6. Po wstawieniu pobiera aktualną listę przez istniejące `getBudgetIncomes(budgetId, householdId, false)`.
  7. Zwraca `BudgetIncomesListResponseDto`.
- Endpoint mapuje wyjątki serwisowe na poprawne kody HTTP/komunikaty i serializuje odpowiedź.

## 5. Względy bezpieczeństwa

- **Uwierzytelnienie**: obowiązkowe; brak użytkownika → 401 `UNAUTHENTICATED`.
- **Autoryzacja**: jawne sprawdzenie, że budżet i członkowie należą do gospodarstwa użytkownika; zapobiega IDOR.
- **RLS**: Supabase RLS restrykcyjny; dodatkowo limitujemy ręcznie.
- **Walidacja wejścia**: Zod eliminuje wartości spoza zakresu i typy nieoczekiwane; float → decimal, sprawdzamy precyzję.
- **Nagłówki**: `Content-Type` i `X-Result-Code`; brak danych wrażliwych w odpowiedzi.

## 6. Obsługa błędów

- Walidacja `budgetId`: `INVALID_BUDGET_ID`, 400, log `console.warn`.
- Walidacja payloadu: `INVALID_PAYLOAD`, 400.
- Kwoty ≤ 0, > zakresu, zbyt wiele miejsc dziesiętnych: `INVALID_AMOUNT`, 400 (z endpointu lub mapowanie z Postgresa `23514`, `22001`).
- Duplikaty `householdMemberId`: `DUPLICATE_MEMBER`, 400 (wykryte przed wywołaniem serwisu).
- Członek spoza gospodarstwa / nieaktywny: serwis rzuca `INVALID_MEMBER` → mapowanie na 400 `INVALID_MEMBER`.
- Brak gospodarstwa/budżetu: `HOUSEHOLD_NOT_FOUND` / `BUDGET_NOT_FOUND` → 404 `BUDGET_NOT_FOUND`.
- Brak autoryzacji: `UNAUTHENTICATED`, 401.
- Błędy Supabase (np. `23505` duplikat mimo filtra) → mapowanie na 400 `DUPLICATE_MEMBER`.
- Pozostałe / niespodziewane: 500 `INCOMES_UPSERT_FAILED`, log `console.error`.
- Logowanie do tabeli błędów: brak dedykowanej tabeli – stosujemy konsolę (zgodnie z projektem).

## 7. Rozważania dotyczące wydajności

- Operujemy na niewielkich zbiorach (liczba domowników ograniczona); jedna operacja delete + jedna insert to O(n).
- Można użyć `upsert` z `onConflict` aby ograniczyć liczbę zapytań przy aktualizacji (wymaga usunięcia rekordów spoza listy; delete `not in (...)`).
- Brak transakcji w Supabase JS – obsługa błędów musi czyścić stan (np. jeśli insert padnie, lista pozostaje pusta; UI otrzyma błąd, ale w praktyce budżet bez przychodów. Można rozważyć `supabase.rpc` w przyszłości).
- Indeks unikalny `UNIQUE (budget_id, household_member_id)` chroni przed duplikatami.

## 8. Etapy wdrożenia

1. **Endpoint setup** – utwórz `PUT` handler w `src/pages/api/budgets/[budgetId]/incomes.ts`; zaimplementuj schematy Zod, helpery `createErrorResponse`/`createSuccessResponse` (analogicznie do `GET`).
2. **Supabase auth & param checks** – pobierz `locals.supabase`, uwierzytelnij użytkownika, waliduj `budgetId` i payload.
3. **Service API** – rozbuduj `budgets.service.ts` o metodę `replaceBudgetIncomes`; zareużyj `validateHouseholdMembers` i `getBudgetIncomes`; zdefiniuj precyzyjne komunikaty błędów (`INVALID_MEMBER`, `INCOMES_UPSERT_FAILED`).
4. **DB operations** – w serwisie wykonaj sekwencję: (a) znajdź gospodarstwo i budżet, (b) usuń rekordy spoza listy (lub wszystkie), (c) wstaw nowe rekordy (insert/upsert), (d) obsłuż kody błędów Supabase.
5. **Odpowiedź i logowanie** – endpoint mapuje kody na statusy, ustawia `X-Result-Code: INCOMES_UPSERTED`, loguje ostrzeżenia (`console.warn`) i błędy (`console.error`).
