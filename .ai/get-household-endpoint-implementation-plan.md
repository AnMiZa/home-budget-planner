# API Endpoint Implementation Plan: GET /api/household

## 1. Przegląd punktu końcowego

- Pobiera profil gospodarstwa domowego powiązanego z aktualnie zalogowanym użytkownikiem.
- Obsługuje opcjonalne dołączenie domyślnych kategorii seedowanych dla nowego gospodarstwa.
- Zwraca dane w formacie `HouseholdDto` zgodnie z `src/types.ts`.

## 2. Szczegóły żądania

- Metoda HTTP: `GET`.
- Struktura URL: `/api/household`.
- Parametry zapytania:
  - Wymagane: brak.
  - Opcjonalne: `includeDefaults` (`boolean`, domyślnie `false`).
- Request body: brak; wszystkie dane wejściowe przekazywane w query string.
- Walidacja danych wejściowych: Zod schema (`z.object({ includeDefaults: z.coerce.boolean().default(false) })`); w przypadku niepowodzenia zwrócić `400 INVALID_QUERY_PARAM` w strukturze `ApiErrorDto`.

## 3. Szczegóły odpowiedzi

- Status 200 `HOUSEHOLD_FETCHED` z payloadem:`HouseholdDto` (`id`, `name`, `createdAt`, `updatedAt`).
- Gdy `includeDefaults=true`, rozszerzyć payload o pole `defaultCategories` (tablica obiektów `{ id, name }`) reprezentujące seeded kategorie; ustandaryzować typ jako `DefaultCategoryDto` (do dodania w `src/types.ts`, jeśli nie istnieje).
- Błędy zwracane w formacie `ApiErrorDto` z odpowiednim kodem i komunikatem.
- Nagłówki: `Content-Type: application/json`.

## 4. Przepływ danych

- Handler Astro odczytuje Supabase clienta z `locals.supabase` i wykonuje walidację query param przy pomocy Zod.
- Autoryzacja: pobranie sesji (`supabase.auth.getUser()`) lub użycie dostępnego helpera; brak sesji → 401.
- Serwis `getHouseholdProfile` (w `src/lib/services/household.service.ts`) wykonuje zapytanie do tabeli `households` filtrowanej po `user_id=requestUserId`.
- Jeśli `includeDefaults=true`, serwis/dodatkowa funkcja dokłada seeded kategorie (np. z tabeli `categories` z flagą systemową lub z konfiguracji statycznej).
- Handler mapuje wynik do `HouseholdDto`, dołącza ewentualne `defaultCategories`, loguje sukces i zwraca JSON.

## 5. Względy bezpieczeństwa

- Wymagana autoryzacja Supabase; korzystać z RLS zapewniającego dostęp tylko do gospodarstw przypisanych do użytkownika.
- Serwis musi jawnie filtrować po `user_id` otrzymanym z sesji, aby uniknąć wycieków danych.
- W przypadku dołączania `defaultCategories`, upewnić się, że dane pochodzą z zasobów bezpiecznych (np. read-only seed) i nie zawierają identyfikatorów innych gospodarstw.
- Nie ujawniać dodatkowych metadanych (np. `user_id`) w odpowiedzi.

## 6. Obsługa błędów

- `401 UNAUTHENTICATED`: brak lub wygasła sesja Supabase.
- `404 HOUSEHOLD_NOT_FOUND`: brak gospodarstwa powiązanego z użytkownikiem.
- `400 INVALID_QUERY_PARAM`: nieprawidłowa wartość `includeDefaults` (niekonwertowalna do boolean) lub inne błędy walidacji.
- `500 HOUSEHOLD_FETCH_FAILED`: błędy Supabase / nieoczekiwane wyjątki; logować szczegóły (bez wrażliwych danych) i zwracać generyczny komunikat.
- Wszystkie odpowiedzi błędów powinny używać `ApiErrorDto` z `code` dopasowanym do powyższych etykiet i przyjaznym `message`.

## 7. Rozważania dotyczące wydajności

- Wykorzystać pojedyncze zapytanie do `households`; jeśli potrzebne domyślne kategorie, zastosować jedno dodatkowe zapytanie lub pobrać z lokalnego cache/configu.
- Dopilnować, aby zapytania wykorzystywały istniejący indeks unikalny na `user_id` (zapytanie po kolumnie z UNIQUE będzie efektywne).
- Zapewnić brak nadmiarowych obliczeń w handlerze (np. brak mapowania danych, jeśli brak gospodarstwa).

## 8. Kroki implementacji

1. Dodać (lub potwierdzić) definicje DTO: `HouseholdDto`, `ApiErrorDto`, ewentualnie `DefaultCategoryDto` w `src/types.ts`.
2. Utworzyć `src/lib/services/household.service.ts` z funkcją `getHouseholdProfile(userId: string, options)` obsługującą pobranie gospodarstwa i domyślnych kategorii.
3. W pliku `src/pages/api/household.ts` utworzyć handler Astro: walidacja query param Zod, pobranie użytkownika, wywołanie serwisu i mapowanie odpowiedzi.
4. Zaimplementować jednolitą obsługę błędów: mapowanie wyjątków Supabase na kody 404/500, walidacja na 400, brak sesji na 401; logowanie błędów przez `console.error` lub istniejący logger.
