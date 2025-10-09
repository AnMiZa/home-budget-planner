# API Endpoint Implementation Plan: GET /api/household-members

## 1. Przegląd punktu końcowego

- Cel: udostępnić uwierzytelnionemu użytkownikowi listę członków jego gospodarstwa domowego, domyślnie tylko aktywnych.
- Zakres: filtrowanie po aktywności, paginacja, sortowanie po `fullName` lub `createdAt`, zgodnie z wymaganiami specyfikacji.
- Wynik: odpowiedź 200 z kodem rezultatu `MEMBERS_LISTED` oraz strukturą `HouseholdMembersListResponseDto`.

## 2. Szczegóły żądania

- Metoda HTTP: `GET`.
- URL: `/api/household-members`.
- Parametry zapytania:
  - Wymagane: brak.
  - Opcjonalne: `includeInactive` (boolean, domyślnie `false`), `page` (liczba całkowita ≥ 1, domyślnie `1`), `pageSize` (liczba całkowita z przedziału 1-100, domyślnie `20`), `sort` (enum: `fullName` | `createdAt`, domyślnie `fullName`).
- Walidacja wejścia: schemat Zod w warstwie routingu, korzystający z `z.coerce` dla wartości liczbowych i logicznych; błędne wartości kończą się odpowiedzią 400 `INVALID_QUERY_PARAM`.
- Autoryzacja: wymaga poprawnej sesji Supabase (nagłówki ustawione przez klienta); brak dodatkowych nagłówków wejściowych.

## 3. Szczegóły odpowiedzi

- Format: JSON (`Content-Type: application/json`).
- Body: `HouseholdMembersListResponseDto` z `data` będącym tablicą `HouseholdMemberDto` (pola: `id`, `fullName`, `isActive`, `createdAt`, `updatedAt`) oraz `meta` będącym `PaginationMetaDto` (`page`, `pageSize`, `totalItems`, `totalPages`).
- Sukces: status 200, nagłówek `X-Result-Code: MEMBERS_LISTED`.
- Brak treści w przypadku 401/400/500 poza `ApiErrorDto`.

## 4. Przepływ danych

- Router Astro (`src/pages/api/household-members.ts`):
  - Ustawia `prerender = false`, parsuje i waliduje query params przez schemat Zod oraz normalizuje wartości do typów prymitywnych.
  - Pozyskuje klienta Supabase z `locals.supabase`, wywołuje `supabase.auth.getUser()` w celu uzyskania `user.id`.
  - Deleguje logikę do nowej usługi `HouseholdMembersService.listMembers(userId, options)`; w przypadku braku gospodarstwa zwraca 404 `HOUSEHOLD_NOT_FOUND`.
- `HouseholdMembersService` (`src/lib/services/household-members.service.ts`):
  - Odszukuje `household_id` dla użytkownika (`households.user_id = userId`), rzuca błąd `HOUSEHOLD_NOT_FOUND` gdy nie istnieje.
  - Buduje zapytanie do `household_members` ograniczone do `household_id`, warunkowo `.eq("is_active", true)` przy `includeInactive=false`.
  - Ustawia sortowanie (`order("full_name")` lub `order("created_at", { ascending: true })`), stosuje zakres `range(offset, offset + pageSize - 1)`.
  - Włącza `select("id, full_name, is_active, created_at, updated_at", { count: "exact" })` aby pozyskać dane i licznik rekordów.
  - Mapuje rekordy na `HouseholdMemberDto` (konwersja `snake_case` → `camelCase`) i oblicza `PaginationMetaDto` (`totalPages = Math.ceil(totalItems / pageSize)` lub 0 gdy brak danych).
  - Zwraca DTO gotowe do serializacji.
- Router serializuje wynik, ustawia nagłówki i zwraca `Response` zgodne ze specyfikacją.

## 5. Względy bezpieczeństwa

- Autentykacja: wyłącznie uwierzytelnieni użytkownicy (błąd 401 gdy brak sesji lub `authError`).
- Autoryzacja: identyfikacja gospodarstwa na podstawie `user.id`; nie przyjmujemy `householdId` z zewnątrz, eliminujemy możliwość enumeracji obcych zasobów.
- RLS: zakładamy aktywowaną politykę RLS w Supabase ograniczającą dostęp do wierszy `households` i `household_members` po `user_id`/`household_id`; implementacja nie obchodzi RLS.
- Walidacja wejścia usuwa możliwość wstrzyknięcia nieprawidłowych parametrów (np. `pageSize` > 100) i zapobiega nadużyciom.
- Logowanie: używamy `console.error` dla nieoczekiwanych wyjątków; brak dedykowanej tabeli logów w aktualnym zakresie.

## 6. Obsługa błędów

- 400 `INVALID_QUERY_PARAM`: schemat Zod odrzuca nieprawidłowe typy, wartości spoza zakresów, lub błędne `sort`.
- 401 `UNAUTHENTICATED`: brak sesji Supabase albo błąd `supabase.auth.getUser()`.
- 404 `HOUSEHOLD_NOT_FOUND`: brak gospodarstwa powiązanego z użytkownikiem (np. konto nieukończone) — opcjonalne, jeżeli RLS blokuje wiersze.
- 500 `MEMBERS_LIST_FAILED`: nieoczekiwane błędy Supabase / serwera; logujemy szczegóły i zwracamy generyczny komunikat.
- Wszystkie odpowiedzi błędów zgodne z `ApiErrorDto`.

## 7. Wydajność

- Paginacja i limit `pageSize ≤ 100` ogranicza ilość danych.
- Zapytanie wybiera tylko potrzebne kolumny i korzysta z istniejącego indeksu po `household_id`; w razie potrzeby można rozważyć indeks złożony `(household_id, is_active)` dla częstych filtrów.
- Brak dodatkowych round-tripów: pojedyncze wywołanie Supabase per lista.
- Możliwość dołączenia `prefer: count=exact` tylko gdy wymagane (Supabase `select` z `count: "exact"`).

## 8. Kroki implementacji

1. Dodać nowy plik `src/lib/services/household-members.service.ts` definiujący `HouseholdMembersService` z metodą `listMembers(userId, options)` oraz fabryką `createHouseholdMembersService`.
2. Zaimplementować w serwisie pobranie `household_id`, budowę zapytania do `household_members`, mapowanie rekordów do `HouseholdMemberDto`, obliczenie `PaginationMetaDto`, obsługę błędów (`HOUSEHOLD_NOT_FOUND`, `MEMBERS_LIST_FAILED`).
3. Utworzyć plik routingu `src/pages/api/household-members.ts` (lub zaktualizować istniejący) z `prerender = false`, schematem Zod dla parametrów i standardowymi helperami odpowiedzi (można współdzielić z innymi routerami przez util w `src/lib`).
4. W warstwie routingu pobrać sesję Supabase, obsłużyć przypadki 401 oraz zbudować obiekt opcji (`includeInactive`, `page`, `pageSize`, `sort`).
5. Wywołać serwis `listMembers`, przechwycić znane wyjątki i na ich podstawie zwrócić odpowiednie kody HTTP (`400`, `401`, `404`, `500`).
6. Serializować wynik do `HouseholdMembersListResponseDto`, ustawić nagłówki (`Content-Type`, `X-Result-Code`) i zwrócić odpowiedź 200.
