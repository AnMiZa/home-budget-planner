# API Endpoint Implementation Plan: GET /api/categories

## 1. Przegląd punktu końcowego

- Zapewnia autoryzowanemu użytkownikowi listę kategorii przypisanych do jego gospodarstwa domowego.
- Obsługuje filtrowanie po fragmencie nazwy (case-insensitive), sortowanie oraz paginację zgodnie z ograniczeniami bazy danych.
- Zwraca zunifikowany format odpowiedzi (`CategoriesListResponseDto`) oraz nagłówek `X-Result-Code: CATEGORIES_LISTED` przy sukcesie.

## 2. Szczegóły żądania

- **Metoda HTTP:** GET
- **Struktura URL:** `/api/categories`
- **Parametry zapytania:**
  - **Wymagane:** brak
  - **Opcjonalne:**
    - `search`: string, po `trim()`, długość 0–100; wykorzystywany w filtrze `ilike` po `name` (z sanitizacją `%`/`_`).
    - `page`: liczba całkowita ≥ 1; domyślnie 1.
    - `pageSize`: liczba całkowita 1–100; domyślnie 20.
    - `sort`: enum `name | createdAt`; domyślnie `name`.
- **Walidacja:**
  - Użyć Zod (`z.object({ search: ..., page: ..., pageSize: ..., sort: ... })`) z konwersją z `URLSearchParams` (`safeParse`).
  - Wartości nieprawidłowe → 400 `INVALID_QUERY_PARAMS` z opisem.
  - Sanitizacja `search`: escape `%` oraz `_`, dodać `%${term}%` przy budowie zapytania.
- **Nagłówki:** standardowe JSON; polega na sesji Supabase przechowywanej w `locals`.

## 3. Wykorzystywane typy

- `CategoryDto`, `CategoriesListResponseDto`, `PaginationMetaDto` z `src/types.ts` jako kontrakt odpowiedzi.
- `ApiErrorDto` dla ujednoliconej struktury błędów.
- Opcjonalnie helper `ListCategoriesOptions` w serwisie (analogiczny do `ListMembersOptions`).
- Brak komend mutujących (endpoint tylko odczytowy).

## 4. Szczegóły odpowiedzi

- **Status 200 (`CATEGORIES_LISTED`):**
  - Payload typu `CategoriesListResponseDto` (`data: CategoryDto[]`, `meta: PaginationMetaDto`).
  - Każdy `CategoryDto` zawiera `id`, `name`, `createdAt`, `updatedAt`.
  - Odpowiedź zwraca `X-Result-Code: CATEGORIES_LISTED`.
- **Nagłówki:** `Content-Type: application/json; charset=utf-8`.

## 5. Przepływ danych

1. Astro handler `GET` odczytuje `locals.supabase`; brak klienta skutkuje błędem serwera.
2. Walidacja query params przez schemat Zod z wartościami domyślnymi.
3. Uwierzytelnienie: `supabase.auth.getUser()`; brak użytkownika → 401.
4. Service `CategoriesService.listCategories(userId, options)`:
   - Pobiera `household_id` dla użytkownika (`households.select('id').eq('user_id', userId).single()`).
   - Buduje zapytanie `categories` z filtrami: `eq('household_id', ...)`, opcjonalne `ilike('name', %term%)`, paginacja (`range`), sortowanie (`order('name')` lub `order('created_at')`).
   - Ustawia `count: 'exact'` dla metadanych.
   - Mapuje rekordy na `CategoryDto` i konstruuje `PaginationMetaDto`.
5. Handler serializuje wynik, ustawia kod 200 + `X-Result-Code`, zwraca JSON.

## 6. Względy bezpieczeństwa

- Wymagana aktywna sesja Supabase; brak → 401 `UNAUTHENTICATED`.
- RLS: wszystkie zapytania zawężone przez `household_id`, brak ujawniania obcych danych.
- Walidacja i sanitizacja `search` minimalizuje ryzyko wstrzykiwania wzorców w `ilike`.
- Brak danych wrażliwych w logach; logować tylko ID użytkownika/gospodarstwa.

## 7. Obsługa błędów

- 400 `INVALID_QUERY_PARAMS`: niepoprawny format paginacji/sort/search; log `console.warn` z danymi wejściowymi.
- 401 `UNAUTHENTICATED`: brak użytkownika w sesji Supabase.
- 404 `HOUSEHOLD_NOT_FOUND`: użytkownik nie posiada gospodarstwa w tabeli `households`.
- 500 `CATEGORIES_LIST_FAILED`: błędy Supabase (brak danych, timeouty, inne wyjątki). Logować przez `console.error` (z kodem błędu, `userId`, `householdId`).

## 8. Wydajność

- Paginated queries (`range`) ograniczają liczbę rekordów.
- `count: 'exact'` może być kosztowne przy dużych zbiorach; w razie potrzeby rozważyć `head: true` lub metryki cache (notatka na przyszłość).
- Dla wyszukiwania zalecić indeks funkcjonalny `CREATE INDEX IF NOT EXISTS categories_household_name_idx ON categories (household_id, lower(name));` (do rozważenia w migracjach).
- Escaping `search` minimalizuje wpływ na plan zapytań (wykorzystanie `ilike` jest wspierane przez indeks z `lower(name)`).

## 9. Kroki implementacji

1. **Przygotowanie schematu walidacji:** w pliku endpointu zdefiniować Zod schema dla `URLSearchParams`, z wartościami domyślnymi oraz sanitizacją `search` (helper do escapowania znaków wildcard).
2. **Service warstwy domenowej:** dodać nowy `src/lib/services/categories.service.ts` z klasą `CategoriesService` (podobną do `HouseholdMembersService`), metodą `listCategories`, mapowaniem DTO i obsługą błędów (`throw new Error("HOUSEHOLD_NOT_FOUND")`, `throw new Error("CATEGORIES_LIST_FAILED")`).
3. **Integracja endpointu:** utworzyć/uzupełnić `src/pages/api/categories.ts`:
   - Pobranie `locals.supabase`, walidacja zapytania, uwierzytelnienie użytkownika.
   - Wywołanie serwisu, mapowanie błędów na kody HTTP, ustawienie `X-Result-Code`.
   - Zwrócenie `CategoriesListResponseDto`.
4. **Logowanie i helpery:** zapewnić spójne helpery odpowiedzi (`createSuccessResponse`, `createErrorResponse`) zgodne z istniejącymi endpointami; użyć `console.error`/`console.warn` z kontekstem.
