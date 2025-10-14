# API Endpoint Implementation Plan: PATCH /api/household

## 1. Przegląd punktu końcowego

- Aktualizuje nazwę gospodarstwa domowego zalogowanego użytkownika.
- Korzysta z Supabase Auth i serwisu `HouseholdService` do dostępu do danych.
- Po zakończonej operacji zwraca najnowszy profil gospodarstwa w formacie kompatybilnym z GET.
- Handler działa w kontekście SSR Astro (bez prerenderingu) i wymaga `locals.supabase`.

## 2. Szczegóły żądania

- `HTTP`: PATCH
- `URL`: /api/household
- `Headers`: `Content-Type: application/json`, `Accept: application/json`
- `Body`: `{"name": "New household name"}`; string po trimie 1–120 znaków UTF-8, zakazane puste wartości
- `Parameters`: wymagane pole `name`, brak opcjonalnych pól ani query parametrów

## 3. Wykorzystywane typy

- `HouseholdDto` z `src/types.ts` jako payload odpowiedzi.
- `UpdateHouseholdCommand` z `src/types.ts` jako kontrakt serwisu do aktualizacji nazwy.
- `ApiErrorDto` do ujednoliconego formatu błędów.
- `HouseholdResponseDto` (lokalny typ handlera) łączący `household` oraz opcjonalne `defaultCategories`.

## 4. Szczegóły odpowiedzi

- `200 HOUSEHOLD_UPDATED` z `{"household": HouseholdDto, "defaultCategories"?: DefaultCategoryDto[]}`; `defaultCategories` obecne tylko gdy serwis je zwróci.
- `400 INVALID_NAME` dla błędów walidacji requestu lub niemożności sparsowania JSON.
- `401 UNAUTHENTICATED` gdy Supabase nie zwróci prawidłowej sesji.
- `500 HOUSEHOLD_UPDATE_FAILED` dla wyjątków bazodanowych; logować szczegóły po stronie serwera.

## 5. Przepływ danych

1. Handler PATCH pobiera JSON z `request`, waliduje schematem Zod i normalizuje `name` (trim, bez zmian wielkości liter).
2. Wyciąga `supabase` z `locals`, wywołuje `auth.getUser()` i weryfikuje obecność użytkownika.
3. Tworzy `HouseholdService` za pomocą `createHouseholdService`.
4. Wywołuje nową metodę `updateHouseholdName(user.id, command)` aktualizując rekord w `households` po `user_id`.
5. Po sukcesie ponownie pobiera dane przez `getHouseholdProfile(user.id)` (domyślnie `includeDefaults=false`) w celu spójnej odpowiedzi.
6. Buduje `Response` JSON z status 200 oraz nagłówkiem `Content-Type: application/json`.

## 6. Względy bezpieczeństwa

- Wymagaj uwierzytelnienia Supabase; brak użytkownika kończy się `401`.
- Filtruj update po `user_id` oraz `select().single()` by uniknąć aktualizacji cudzego gospodarstwa mimo RLS.
- Zabezpiecz `name` przed SQL injection poprzez użycie Supabase query buildera oraz walidacji długości.
- Nie ujawniaj `user_id` i innych metadanych w odpowiedzi; logi nie mogą zawierać pełnych payloadów użytkownika.

## 7. Obsługa błędów

- `400 INVALID_NAME`: walidacja Zod nie powiodła się, JSON niepoprawny, lub nazwa poza zakresem 1–120.
- `401 UNAUTHENTICATED`: `auth.getUser()` zwróci błąd lub `user` jest `null`.
- `404 HOUSEHOLD_NOT_FOUND`: zwróć gdy update nie zaktualizuje żadnego wiersza (brak gospodarstwa dla użytkownika).
- `500 HOUSEHOLD_UPDATE_FAILED`: błędy Supabase (np. timeout, constraint) lub inne nieoczekiwane wyjątki.
- Loguj błędy przez `console.error` (brak dedykowanej tabeli błędów); uwzględnij identyfikator użytkownika oraz kod operacji bez wrażliwych danych.

## 8. Rozważania dotyczące wydajności

- Update wykorzystuje indeks unikalny na `user_id`, więc zapytanie pozostaje O(1).
- Unikaj podwójnego zapytania, jeśli `getHouseholdProfile` może zwrócić wynik z joinem; rozważ `update ... select()` z `single()` do pobrania zaktualizowanego rekordu.
- Minimalizuj logowanie w sukcesie (opcjonalne `console.log` tylko na poziomie debug).
- Walidacja Zod wykonuje się lokalnie i ma stały koszt.

## 9. Etapy wdrożenia

1. Rozszerz `HouseholdService` o metodę `updateHouseholdName(userId: string, command: UpdateHouseholdCommand): Promise<HouseholdDto>` z obsługą 0 wierszy i mapowaniem błędów.
2. Dodaj schemat `patchBodySchema` w `src/pages/api/household.ts` (np. `z.object({ name: z.string().trim().min(1).max(120) })`) oraz helper do walidacji payloadu.
3. Zaimplementuj handler `PATCH` w `src/pages/api/household.ts`, reużywając `createErrorResponse` i `createSuccessResponse`.
4. Zmapuj błędy serwisu na odpowiedzi HTTP (`HOUSEHOLD_NOT_FOUND`→404, inne→500) i dodaj nowe kody (`HOUSEHOLD_UPDATE_FAILED`, `INVALID_NAME`).
