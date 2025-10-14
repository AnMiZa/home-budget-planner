# API Endpoint Implementation Plan: GET /api/budgets/{budgetId}/transactions

## 1. Przegląd punktu końcowego

- Punkt końcowy zwraca stronicowaną listę transakcji dla wskazanego budżetu gospodarstwa zalogowanego użytkownika, z możliwością filtrowania i sortowania.
- Dane zasilają widok szczegółów budżetu (np. tabela wydatków, wykresy) i muszą być zgodne z `TransactionsListResponseDto`.
- Implementacja opiera się na Astro API routes oraz Supabase (uwierzytelnianie, RLS, zapytania SQL).

## 2. Szczegóły żądania

- Metoda HTTP: `GET`
- Struktura URL: `/api/budgets/{budgetId}/transactions`
- Parametry:
  - Wymagane: `budgetId` (parametr ścieżki; UUID).
  - Opcjonalne query params (wszystkie walidowane i domyślnie ustawiane po walidacji):
    - `categoryId` (UUID) – filtr transakcji po kategorii.
    - `fromDate` (YYYY-MM-DD) – data dolnej granicy (włącznie).
    - `toDate` (YYYY-MM-DD) – data górnej granicy (włącznie).
    - `searchNote` (string do 500 znaków) – case-insensitive filtr po fragmencie notatki.
    - `page` (int ≥ 1, domyślnie 1).
    - `pageSize` (int z zakresu 1–100, domyślnie 25).
    - `sort` (enum: `date_desc` – domyślne, `amount_desc`, `amount_asc`).
- Request body: brak.
- Walidacja: Zod w handlerze, z koercją/parsowaniem typów oraz weryfikacją zależności (np. `fromDate` ≤ `toDate`).

## 3. Szczegóły odpowiedzi

- 200 OK (`X-Result-Code: TRANSACTIONS_LISTED`):

  ```json
  {
    "data": [
      {
        "id": "uuid",
        "categoryId": "uuid",
        "amount": 120.5,
        "transactionDate": "2025-10-07",
        "note": "Groceries",
        "createdAt": "2025-10-07T19:22:00Z"
      }
    ],
    "meta": {
      "page": 1,
      "pageSize": 25,
      "totalItems": 120,
      "totalPages": 5
    }
  }
  ```

- Pozostałe kody stanu: 400 (walidacja), 401 (brak sesji), 404 (`BUDGET_NOT_FOUND`), 500 (`TRANSACTIONS_LIST_FAILED`).
- **DTOs**: `TransactionDto`, `TransactionsListResponseDto`, `PaginationMetaDto`, `ApiErrorDto` (`src/types.ts`). W razie potrzeby lokalny typ serwisowy `ListTransactionsFilters` opisujący przetworzone parametry.

## 4. Przepływ danych

- Klient wysyła żądanie GET z parametrami zapytania.
- Handler Astro pobiera Supabase z `locals.supabase`, waliduje parametry Zod (ustawia domyślne wartości) i sprawdza sesję użytkownika (`supabase.auth.getUser`).
- Serwis budżetów (nowa metoda `listBudgetTransactions`) weryfikuje gospodarstwo użytkownika oraz właścicielstwo budżetu (wykorzystać istniejące metody pomocnicze, np. `getUserHousehold` / `assertBudgetBelongsToHousehold`).
- Serwis buduje zapytanie do Supabase `transactions` z filtrami (`eq`, `gte`, `lte`, `ilike` z bezpiecznie escapowanym wzorcem), stronicowaniem (`range`) i sortowaniem (`order` po `transaction_date` lub `amount`). Żądanie powinno zwracać `select` z `count: "exact"`.
- Wynik mapowany jest do `TransactionDto` (konwersja `amount` na `number`, nazwy pól na camelCase) oraz metadanych paginacji (`totalItems`, `totalPages`).
- Handler wysyła JSON z kodem 200 i nagłówkiem `X-Result-Code`; błędy mapowane są na kody HTTP i `ApiErrorDto`.

## 5. Względy bezpieczeństwa

- Autentykacja: wymagane aktywne logowanie w Supabase; brak sesji → 401.
- Autoryzacja: sprawdzić, że budżet należy do gospodarstwa przypisanego do zalogowanego użytkownika zanim pobierzemy transakcje (zapytanie z `households.user_id = user.id`).
- Ograniczenie zapytań do `household_id` użytkownika zapobiega odczytowi cudzych danych; RLS w Supabase zapewnia dodatkową izolację.
- Walidacja i sanitacja parametrów (zwłaszcza `searchNote`) minimalizuje ryzyko SQL injection/DoS; `pageSize` ograniczone do rozsądnego maksimum.
- Logowanie błędów jedynie na serwerze (`console.error`), bez ujawniania szczegółów w odpowiedzi.

## 6. Obsługa błędów

- 400 `INVALID_QUERY_PARAMS`: nieprawidłowy `budgetId` (nie-UUID), błędny format daty, `fromDate` > `toDate`, wartości spoza zakresu (`page`, `pageSize`, `sort`). Zwrócić szczegóły walidacji z Zod (skrócone, przyjazne komunikaty).
- 401 `UNAUTHENTICATED`: brak lub nieważna sesja Supabase.
- 404 `BUDGET_NOT_FOUND`: budżet nie istnieje, nie należy do gospodarstwa użytkownika lub użytkownik nie ma gospodarstwa.
- 500 `TRANSACTIONS_LIST_FAILED`: błąd Supabase, nieobsługiwany wyjątek lub problemy sieciowe; zlogować pełny błąd, odpowiedzieć generycznie.
- Wszelkie dodatkowe błędy serwisowe mapować na powyższe kody zgodnie z konwencją `ApiErrorDto`.

## 7. Wydajność

- Zapytanie wykorzystuje indeksy FKs (`budget_id`, `household_id`, `category_id`) — stosowanie kombinacji filtrów nie powinno degradować wydajności.
- Stronicowanie (`range`) ogranicza zakres danych; domyślne `pageSize = 25`, maksimum 100.
- Zastosować pojedyncze zapytanie do Supabase z `count: "exact"`; unikać dodatkowych rund (np. oddzielnego liczenia).
- `searchNote` powinno używać escapowanego wzorca (`%term%`), ewentualnie pre-processować znak `%`/`_` aby uniknąć pełnych LIKE-scanów.
- Rozważyć dodanie limitu czasu/guardów po stronie klienta (poziom API: brak dedykowanych, rely on Supabase timeout) oraz monitorować konieczność indeksu po `transaction_date` jeżeli filtr daty będzie dominujący.

## 8. Kroki implementacji

1. Zidentyfikuj/utwórz helper do mapowania zapytań (np. `parseTransactionsQuery`) wykorzystujący Zod: walidacja UUID/daty, domyślne wartości, obcięcie `searchNote` i limit `pageSize`.
2. Rozszerz `BudgetsService` o publiczną metodę `listBudgetTransactions(userId, budgetId, filters)` (lub podobną):
   - Ustal `householdId` użytkownika i zweryfikuj budżet (wykorzystaj istniejące metody serwisu lub dodaj nową prywatną).
   - Na bazie `filters` zbuduj zapytanie Supabase: `select`, `eq('household_id', householdId)`, `eq('budget_id', budgetId)`, `ilike` (po uprzednim escapowaniu wzorca), `gte/lte` dla dat, `order` zgodnie z `sort`, `range` dla stronicowania, `count: "exact"`.
   - Mapuj wynik na `TransactionsListResponseDto` z poprawną konwersją pól oraz obliczeniem `totalPages`.
3. Dodaj ewentualny util do escapowania wzorca LIKE (np. w `src/lib/sql.ts`) i wykorzystaj go w serwisie.
4. Utwórz plik `src/pages/api/budgets/[budgetId]/transactions.ts`:
   - `export const prerender = false;`
   - Zdefiniuj handler `GET`: pobierz Supabase z `locals`, zweryfikuj sesję, sparsuj parametry (Zod), wywołaj metodę serwisu, ustaw nagłówki (`Content-Type`, `X-Result-Code`) i zwróć 200.
   - W bloku `try/catch` mapuj znane błędy serwisu na kody HTTP i `ApiErrorDto`.
