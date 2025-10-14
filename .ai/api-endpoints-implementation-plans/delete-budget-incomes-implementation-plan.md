# API Endpoint Implementation Plan: DELETE `/api/budgets/{budgetId}/incomes/{incomeId}`

## 1. Przegląd punktu końcowego

- Usuwa pojedynczy rekord przychodu powiązany z budżetem należącym do gospodarstwa uwierzytelnionego użytkownika.
- Zapewnia walidację parametrów, weryfikację własności zasobu i bezpieczne usunięcie danych w Supabase.
- Zwraca status `204 No Content` wraz z nagłówkiem `X-Result-Code: INCOME_DELETED` przy powodzeniu.

## 2. Szczegóły żądania

- Metoda HTTP: DELETE
- Struktura URL: `/api/budgets/{budgetId}/incomes/{incomeId}`
- Parametry:
  - Wymagane:
    - `budgetId` (path, UUID): identyfikator budżetu.
    - `incomeId` (path, UUID): identyfikator rekordu przychodu do usunięcia.
  - Opcjonalne: brak
- Request Body: brak

## 3. Wykorzystywane typy

- `ApiErrorDto` (istniejący) – format odpowiedzi błędu w API.
- `BudgetIncomeDto` (istniejący) – używany w serwisie do weryfikacji danych (np. przy mapowaniu); odpowiedź DELETE go nie wykorzystuje, ale logika może się odwoływać.
- Brak potrzeby nowych Command modeli – operacja wymaga jedynie identyfikatorów z parametrów ścieżki.

## 4. Szczegóły odpowiedzi

- Sukces:
  - Status: `204 No Content`
  - Nagłówki: `X-Result-Code: INCOME_DELETED`
  - Treść: brak
- Błędy:
  - `400 Bad Request`: nieprawidłowe identyfikatory (`INVALID_BUDGET_ID`, `INVALID_INCOME_ID`, `INVALID_PATH_PARAMS`)
  - `401 Unauthorized`: użytkownik nie uwierzytelniony (`UNAUTHENTICATED`)
  - `404 Not Found`: budżet lub przychód nie istnieje lub nie należy do użytkownika (`INCOME_NOT_FOUND`)
  - `500 Internal Server Error`: błąd serwera lub Supabase (`INCOME_DELETE_FAILED`)

## 5. Przepływ danych

1. Klient wysyła żądanie DELETE z UUID budżetu i przychodu.
2. Warstwa API (Astro):
   - Waliduje parametry ścieżki za pomocą Zod (`uuid()`).
   - Pozyskuje klienta Supabase z `locals`.
   - Uwierzytelnia użytkownika (`supabase.auth.getUser()`).
   - Tworzy instancję `BudgetsService`.
   - Wywołuje metodę `deleteBudgetIncome(userId, budgetId, incomeId)`.
3. Serwis (`BudgetsService`):
   - Pobiera gospodarstwo użytkownika (istniejący helper wykorzystywany w innych metodach).
   - Weryfikuje, że wskazany budżet należy do gospodarstwa (`budgets.id` + `household_id`).
   - Sprawdza istnienie przychodu w budżecie (`incomes.id`, `budget_id`, `household_id`).
   - Usuwa rekord z tabeli `incomes`.
4. API zwraca status 204 przy sukcesie lub mapuje błędy serwisu na odpowiednią odpowiedź JSON z `ApiErrorDto`.

## 6. Względy bezpieczeństwa

- Uwierzytelnianie: wymagane aktywne sesje Supabase; brak sesji → 401.
- Autoryzacja: potwierdzenie, że budżet i przychód należą do gospodarstwa użytkownika (zapobiega dostępowi do cudzych danych mimo RLS).
- Walidacja danych wejściowych: UUID-y weryfikowane po stronie serwera (Zod).
- Logowanie: `console.warn` dla błędów walidacji, `console.error` dla problemów z Supabase lub nieoczekiwanych wyjątków; brak osobnej tabeli logów – stosujemy standardową konserwację logów.

## 7. Obsługa błędów

- Nieprawidłowe UUID-y → 400 z kodami `INVALID_BUDGET_ID` / `INVALID_INCOME_ID`.
- Nieudane parsowanie parametrów → 400 `INVALID_PATH_PARAMS`.
- Brak użytkownika / błąd uwierzytelniania → 401 `UNAUTHENTICATED`.
- Gospodarstwo, budżet lub przychód niedostępne → serwis zgłasza `INCOME_NOT_FOUND`; API mapuje na 404.
- Błędy Supabase (np. sieciowe, `delete` zwraca error) → log + 500 `INCOME_DELETE_FAILED`.
- Nieoczekiwane wyjątki → log + 500 `INCOME_DELETE_FAILED` (obsługa try/catch zarówno w API, jak i w serwisie).

## 8. Rozważania dotyczące wydajności

- Operacja dotyczy pojedynczego rekordu – obciążenie minimalne.
- Dodanie indeksu na `incomes.id` i `incomes.budget_id` już zapewnione przez klucze główne/obce (PostgreSQL).
- Unikać dodatkowych zapytań: wykorzystać selekcję `select("id")` z filtrami do potwierdzenia własności (jedno zapytanie per zasób).
- Potencjalna optymalizacja: transakcja nie jest potrzebna (pojedyncze `delete`), ale należy zachować sekwencję walidacji, aby ograniczyć zbędne operacje.

## 9. Etapy wdrożenia

1. **Analiza istniejącego serwisu**: zidentyfikuj dostępne metody w `BudgetsService` do ponownego użycia (np. pobieranie gospodarstwa, walidacja budżetu).
2. **Rozszerzenie serwisu**:
   - Dodaj metodę `deleteBudgetIncome(userId: string, budgetId: string, incomeId: string): Promise<void>`.
   - Zaimplementuj kroki: pobranie gospodarstwa, weryfikacja budżetu, weryfikacja przychodu, usunięcie rekordu, obsługa błędów (mapowanie kodów Supabase).
3. **Implementacja endpointu**:
   - Utwórz plik `src/pages/api/budgets/[budgetId]/incomes/[incomeId]/delete.ts` lub dodaj handler `export const DELETE` w istniejącym pliku (zgodnie z konwencją projektu).
   - Dodaj walidację Zod dla parametrów ścieżki.
   - Zaimplementuj logikę uwierzytelniania, wywołanie serwisu, mapowanie błędów i ustawienie nagłówka `X-Result-Code`.
