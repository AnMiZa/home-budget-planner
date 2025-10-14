# API Endpoint Implementation Plan: GET /api/budgets

## 1. Przegląd punktu końcowego

- Celem jest zwrócenie stronicowanej listy budżetów przypisanych do gospodarstwa zalogowanego użytkownika.
- Umożliwia filtrowanie po miesiącu i statusie (przeszłe/bieżące/przyszłe), sterowanie sortowaniem i paginacją oraz opcjonalne dołączenie agregowanych podsumowań finansowych.
- Punkt końcowy ma być dostępny tylko dla uwierzytelnionych użytkowników i zwracać kod rezultatu `BUDGETS_LISTED`.

## 2. Szczegóły żądania

- Metoda HTTP: `GET`
- Struktura URL: `/api/budgets`
- Parametry:
  - Wymagane: brak
  - Opcjonalne:
    - `month`: string (`YYYY-MM` lub pełna data ISO); filtruje budżet dla danego miesiąca (zamieniany na pierwszy dzień miesiąca).
    - `status`: enum (`current` | `past` | `upcoming` | `all`); domyślnie `current` (lub `all`, do uzgodnienia – przyjmujemy `current` dla spójności z nawigacją).
    - `includeSummary`: boolean (`true`/`false`), domyślnie `false`.
    - `page`: liczba całkowita ≥1, domyślnie `1`.
    - `pageSize`: liczba całkowita 1–100, domyślnie `12`.
    - `sort`: enum (`month_desc` domyślnie, `month_asc` jako alternatywa).
- Request Body: brak.

## 3. Wykorzystywane typy

- `BudgetsListResponseDto`, `BudgetListItemDto`, `BudgetSummaryTotalsDto`, `PaginationMetaDto`, `ApiErrorDto` z `src/types.ts`.
- Nowe typy pomocnicze (np. `ListBudgetsOptions`) zdefiniowane w serwisie budżetów.
- Ewentualne mapowania agregacji (lokalne interfejsy typu `{ budget_id: string; sum: number | null }`).

## 3. Szczegóły odpowiedzi

- Sukces `200 OK` z nagłówkiem `X-Result-Code: BUDGETS_LISTED`.
- Forma JSON zgodna z `BudgetsListResponseDto`:
  - `data`: tablica elementów zawierających `id`, `month`, opcjonalnie `summary` (tylko gdy `includeSummary=true`).
  - `meta`: stronicowanie (`page`, `pageSize`, `totalItems`, `totalPages`).
- Błędy:
  - `400 INVALID_QUERY_PARAMS` (z `ApiErrorDto`).
  - `401 UNAUTHENTICATED`.
  - `404 HOUSEHOLD_NOT_FOUND`.
  - `500 BUDGETS_LIST_FAILED`.

## 4. Przepływ danych

- `Astro` route (`src/pages/api/budgets.ts`) odbiera żądanie, waliduje query przez Zod.
- Po walidacji pobiera `locals.supabase` oraz wykonuje `supabase.auth.getUser()` w celu identyfikacji użytkownika.
- Serwis `createBudgetsService` (nowy plik `src/lib/services/budgets.service.ts`) realizuje logikę:
  1. Pobiera `household_id` dla użytkownika.
  2. Buduje zapytanie do tabeli `budgets` z filtrami `month`, `status`, `household_id`.
  3. Stosuje stronicowanie oraz sortowanie.
  4. Wykonuje zapytanie z `count: 'exact'` i mapuje wynik na DTO.
  5. Jeśli `includeSummary=true`, wykonuje równoległe agregacje:
     - `incomes`: sumy `amount` per `budget_id`.
     - `planned_expenses`: sumy `limit_amount`.
     - `transactions`: sumy `amount`.
     - Każde zapytanie filtruje po `household_id` oraz `budget_id` z listy wyników.
     - Serwis łączy dane w mapy i oblicza `freeFunds = totalIncome - totalPlanned` oraz zwraca `totalSpent`.
  6. Zwraca `BudgetsListResponseDto`.
- Endpoint mapuje odpowiedź serwisu na `Response`.
- Wszystkie błędy biznesowe zwracane przez serwis jako `Error(message)` są mapowane na odpowiednie kody HTTP.

## 5. Względy bezpieczeństwa

- Wymagane uwierzytelnienie `supabase.auth.getUser()`; brak użytkownika → 401.
- Dostęp do danych ograniczony przez filtr `household_id` (tenant isolation).
- Parametry `sort` i `status` ograniczone do enumeracji, by zapobiec manipulacjom.
- `includeSummary` wymusza agregacje również ograniczone do gospodarstwa.
- Rejestrowanie błędów bez ujawniania wrażliwych danych w odpowiedzi (logi przez `console.warn/error`).

## 6. Obsługa błędów

- Walidacja Zod: `400 INVALID_QUERY_PARAMS`, log przez `console.warn`, pierwsza wiadomość walidacji w `message`.
- Brak `locals.supabase`: `500 BUDGETS_LIST_FAILED`.
- Błąd uwierzytelnienia / brak użytkownika: `401 UNAUTHENTICATED`.
- Brak gospodarstwa (`PGRST116` lub `null`): `404 HOUSEHOLD_NOT_FOUND`.
- Błąd w zapytaniu bazodanowym lub agregacjach: `500 BUDGETS_LIST_FAILED` z logiem szczegółowym.
- Niespodziewane wyjątki w handlerze: blok `catch` → `500 BUDGETS_LIST_FAILED`.
- Brak danych nie jest błędem: zwróć pustą kolekcję z poprawnym `meta`.

## 7. Rozważania dotyczące wydajności

- Użycie `count: 'exact'` jest akceptowalne przy niskiej skali; dla dużych wolumenów można rozważyć `count: 'estimated'` lub osobne endpointy do liczenia.
- Agregacje wykonane w trzech zapytaniach grupujących po `budget_id`; brak efektu N+1.
- `pageSize` ograniczone do 100; domyślnie 12 (nawigacja miesięczna).
- Przy walidacji `month` stosować normalizację do pierwszego dnia miesiąca, aby zachować dopasowanie indeksów.
- Sortowanie po `month` korzysta z indeksów w Supabase.

## 8. Etapy wdrożenia

1. Dodaj `src/lib/services/budgets.service.ts` z funkcją `createBudgetsService`, interfejsem `ListBudgetsOptions` i metodą `listBudgets` obejmującą pobranie gospodarstwa, zapytanie do `budgets`, agregacje oraz mapowanie na DTO.
2. Utwórz endpoint `src/pages/api/budgets.ts`: walidacja Zod, obsługa Supabase z `locals`, autoryzacja użytkownika, wywołanie serwisu, mapowanie błędów (`INVALID_QUERY_PARAMS`, `UNAUTHENTICATED`, `HOUSEHOLD_NOT_FOUND`, `BUDGETS_LIST_FAILED`) i zwrot sukcesu z `X-Result-Code`.
3. (Opcjonalnie) Dodaj testy jednostkowe/integracyjne dla serwisu i walidacji zapytań, przygotuj scenariusze z mockami Supabase.
4. Uruchom linting/formatowanie oraz manualnie sprawdź żądanie (np. Postman) na danych z Supabase.
