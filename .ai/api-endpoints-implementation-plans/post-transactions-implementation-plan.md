# API Endpoint Implementation Plan: POST /api/budgets/{budgetId}/transactions

## 1. Przegląd punktu końcowego

- Dodaje nową transakcję wydatkową do budżetu należącego do gospodarstwa uwierzytelnionego użytkownika.
- Zwraca pełne dane `TransactionDto` utworzonego rekordu wraz z nagłówkiem `X-Result-Code: TRANSACTION_CREATED` i kodem 201.
- Weryfikuje spójność danych (kategoria należy do gospodarstwa, budżet istnieje) i odświeża podsumowania budżetu.

## 2. Szczegóły żądania

- Metoda HTTP: POST
- Struktura URL: `/api/budgets/{budgetId}/transactions`
- Parametry:
  - Wymagane path: `budgetId` (UUID)
  - Brak parametrów zapytania
- Request Body (JSON):
  - `categoryId`: UUID (wymagane)
  - `amount`: number > 0 (maks. 2 miejsca dziesiętne, wymagane)
  - `transactionDate`: string w formacie YYYY-MM-DD (wymagane)
  - `note`: string (opcjonalne, maks. 500 znaków)
- Walidacja: nowy schema Zod `createTransactionSchema` w `src/lib/validation/transactions.ts`, mapujący na `CreateTransactionCommand`.

## 3. Szczegóły odpowiedzi

- 201 Created
  - Body: `TransactionDto`
  - Nagłówki: `Content-Type: application/json; charset=utf-8`, `X-Result-Code: TRANSACTION_CREATED`
- Kody błędów:
  - 400 `INVALID_BODY` z kodami szczegółowymi (`INVALID_AMOUNT`, `INVALID_DATE`, `INVALID_CATEGORY_ID`, `INVALID_NOTE`)
  - 401 `UNAUTHENTICATED`
  - 404 `HOUSEHOLD_NOT_FOUND`, `BUDGET_NOT_FOUND`
  - 409 `CATEGORY_MISMATCH`
  - 500 `TRANSACTION_CREATE_FAILED`, `INTERNAL_SERVER_ERROR`

## 4. Przepływ danych

- API route (POST) uzyskuje `supabase` z `locals` i uwierzytelnia użytkownika (`supabase.auth.getUser`).
- Waliduje `budgetId` oraz body przez `createTransactionSchema`, tworząc `CreateTransactionCommand`.
- Tworzy instancję `BudgetsService` i wywołuje `createBudgetTransaction(user.id, budgetId, command)`.
- Serwis:
  - Pobiera `household_id` dla użytkownika.
  - Weryfikuje istnienie budżetu przypisanego do gospodarstwa.
  - Weryfikuje kategorię (`categories`) należącą do tego gospodarstwa; w razie braku zgłasza `CATEGORY_MISMATCH`.
  - Wstawia rekord `transactions` (w tym `household_id`, `budget_id`, `category_id`, `amount`, `transaction_date`, `note`).
  - Aktualizuje agregaty/podsumowania (np. ponownie liczy `totalSpent` przez dedykowaną metodę lub reużywa istniejącej logiki agregującej).
- Serwis zwraca `TransactionDto`; route buduje odpowiedź HTTP 201.

## 5. Względy bezpieczeństwa

- Wymagane uwierzytelnienie poprzez Supabase; brak użytkownika → 401.
- Kontrola autoryzacji przez sprawdzenie `household_id` i powiązania budżetu/kategorii (dodatkowe zabezpieczenie poza RLS).
- Walidacja UUID i limit długości `note` minimalizują ryzyko wstrzyknięć i nadużyć.
- Odpowiedzi błędów ujawniają tylko kody biznesowe, bez szczegółów wewnętrznych.

## 6. Obsługa błędów

- Walidacja Zod: konwersja błędów na `INVALID_BODY` i szczegółowe kody.
- Brak gospodarstwa/budżetu powoduje wyjątki w serwisie (`HOUSEHOLD_NOT_FOUND`, `BUDGET_NOT_FOUND`) mapowane na 404.
- Nieprawidłowa kategoria (brak powiązania lub należy do innego gospodarstwa) → wyjątek `CATEGORY_MISMATCH` mapowany na 409.
- Błędy bazy danych podczas inserta → `TRANSACTION_CREATE_FAILED` (500) z logiem `console.error`.
- Niezidentyfikowane wyjątki → `INTERNAL_SERVER_ERROR` (500).

## 7. Rozważania dotyczące wydajności

- Operacja pojedynczego inserta, minimalne obciążenie.
- Weryfikacje budżetu i kategorii mogą być wykonywane równolegle (`Promise.all`) przed insertem.
- Aktualizacja podsumowań powinna używać istniejących zapytań agregujących, aby uniknąć wielokrotnych odczytów.
- Indeksowane kolumny (`budget_id`, `household_id`, `category_id`) zapewniają szybkie filtrowanie.

## 8. Etapy wdrożenia

1. Dodać `createTransactionSchema` oraz parser do `src/lib/validation/transactions.ts` (uwzględnić komunikaty błędów zgodne ze specyfikacją).
2. Rozszerzyć `BudgetsService` o metodę `createBudgetTransaction` wraz z helperami do walidacji budżetu, kategorii i mapowania `TransactionDto`.
3. Zaktualizować `src/pages/api/budgets/[budgetId]/transactions.ts`, dodając handler POST korzystający z nowego schematu i metody serwisu.
4. Zaimplementować mapowanie wyjątków na `ApiErrorDto` oraz kody odpowiedzi zgodnie z sekcją 6.
