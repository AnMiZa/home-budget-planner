# API Endpoint Implementation Plan: PATCH /api/household-members/{memberId}

## 1. Przegląd punktu końcowego

- Umożliwia autoryzowanemu użytkownikowi aktualizację danych istniejącego domownika w ramach własnego gospodarstwa.
- Obsługuje zmiany `fullName` (trim, 1–120 znaków) oraz `isActive`, zwracając pełny `HouseholdMemberDto` po aktualizacji.
- W przypadku sukcesu zwraca status 200 z nagłówkiem `X-Result-Code: MEMBER_UPDATED`.

## 2. Szczegóły żądania

- Metoda HTTP: `PATCH`
- Struktura URL: `/api/household-members/{memberId}`
- Parametry ścieżki:
  - `memberId` (wymagany): UUID, walidowany na poziomie handlera; identyfikuje domownika powiązanego z gospodarstwem użytkownika.
- Body (`Content-Type: application/json`):
  - `fullName` (opcjonalne): string po `trim()`, długość 1–120, case-insensitive unikalność w obrębie gospodarstwa.
  - `isActive` (opcjonalne): boolean, pozwala na reaktywację lub dezaktywację.
  - Wymagane jest przekazanie co najmniej jednego z powyższych pól.
- Walidacja Zod:
  - Schema z `z.object({ fullName: z.string().trim().min(1).max(120).optional(), isActive: z.boolean().optional() })` z `refine`, że co najmniej jedno pole obecne.
  - Osobny `z.string().uuid()` dla `memberId`.
- Używane modele wejściowe: `UpdateHouseholdMemberCommand` (z `src/types.ts`) jako obiekt przekazywany do warstwy serwisowej.

## 3. Szczegóły odpowiedzi

- Sukces 200:
  - Body: `HouseholdMemberDto` (pola `id`, `fullName`, `isActive`, `createdAt`, `updatedAt`).
  - Nagłówki: `Content-Type: application/json`, `X-Result-Code: MEMBER_UPDATED`.
- Kody błędów:
  - 400 `INVALID_MEMBER_ID` (niepoprawny UUID) lub `INVALID_FULL_NAME` / `INVALID_REQUEST_BODY` (walidacja Zod).
  - 401 `UNAUTHENTICATED` (brak sesji Supabase).
  - 404 `MEMBER_NOT_FOUND` (brak rekordu w gospodarstwie użytkownika).
  - 409 `MEMBER_NAME_CONFLICT` (istniejący członek o tej samej nazwie, case-insensitive).
  - 500 `MEMBER_UPDATE_FAILED` (pozostałe błędy infrastrukturalne/bazy, brak klienta Supabase, nieoczekiwane wyjątki).

## 4. Przepływ danych

1. Handler Astro pobiera i waliduje `memberId` oraz body przy użyciu przygotowanych schematów.
2. Z `locals.supabase` pobierany jest klient Supabase; brak → 500.
3. `supabase.auth.getUser()` dostarcza autoryzowanego użytkownika; brak → 401.
4. Tworzony jest `HouseholdMembersService` poprzez `createHouseholdMembersService`.
5. Serwis pobiera `household_id` przypisane do użytkownika (`households` filtr `user_id = authUser.id`); brak → 404.
6. Serwis wyszukuje członka o `id = memberId` i `household_id = householdId`; brak → błąd `MEMBER_NOT_FOUND`.
7. Jeśli `fullName` przekazane, serwis sprawdza konflikt: zapytanie `household_members` po `household_id` i `lower(full_name) = lower(newName)` z wykluczeniem bieżącego `id`; konflikt → `MEMBER_NAME_CONFLICT`.
8. Serwis aktualizuje rekord `household_members` (`update` z `select().single()`), rely on RLS to ograniczyć zakres.
9. Zmapowany `HouseholdMemberDto` trafia do handlera, który serializuje JSON i ustawia nagłówek wyniku.
10. Wszystkie ścieżki błędów logują `console.error` z kontekstem (`userId`, `memberId`, payload).

## 5. Względy bezpieczeństwa

- Autoryzacja Supabase: wymagany ważny access token; brak → 401.
- RLS w tabelach wymusza, że użytkownik operuje tylko na danych własnego gospodarstwa; dodatkowo filtrujemy w zapytaniach `household_id`.
- Walidacja `memberId` i `fullName` zapobiega SQL injection (parametryzowane zapytania Supabase) oraz trimmed whitespace.
- Przy komunikatach błędów nie ujawniamy istnienia członków w innych gospodarstwach (404 generowane zarówno dla braku rekordu, jak i rekordów spoza zakresu użytkownika).
- Utrzymujemy logowanie bez wrażliwych danych osobowych (logujemy identyfikatory, nie pełne imiona).

## 6. Obsługa błędów

- Walidacja UUID/body → 400 z odpowiednimi kodami (`INVALID_MEMBER_ID`, `INVALID_FULL_NAME`, `INVALID_REQUEST_BODY`).
- `supabase.auth.getUser` zwraca błąd lub `user = null` → 401 `UNAUTHENTICATED`.
- Brak gospodarstwa lub członka → 404 `MEMBER_NOT_FOUND`.
- Konflikt nazwy → 409 `MEMBER_NAME_CONFLICT`.
- Dowolny inny wyjątek serwisu/bazy (np. błąd sieci, brak `locals.supabase`) → 500 `MEMBER_UPDATE_FAILED`.
- Logowanie: `console.error` z kontekstowym komunikatem i obiektem błędu; brak centralnej tabeli logów, więc nie wprowadzamy dodatkowych zapisów.

## 7. Wydajność

- Operujemy na pojedynczych rekordach; liczba zapytań ograniczona do max czterech (household lookup, member fetch, konflikt nazwy, update).
- Indeks `idx_household_members_name (household_id, lower(full_name))` już zdefiniowany w planie DB zapewnia szybkie sprawdzenie konfliktów; weryfikacja że istnieje w rzeczywistej bazie (w razie potrzeby dodać migrację, lecz plan zakłada obecność).
- Warto korzystać z `limit(1)` oraz `single()` aby minimalizować ilość przesyłanych danych.
- Brak potrzeby transakcji, ale można rozważyć w przyszłości przy rozbudowanych scenariuszach (np. aktualizacja powiązanych tabel).

## 8. Kroki implementacji

1. Dodaj do `src/pages/api/household-members.ts` schemat walidacji `memberId` i `patchBodySchema`; pamiętaj o `refine` dla co najmniej jednego pola.
2. Rozszerz `createHouseholdMembersService` w `src/lib/services/household-members.service.ts` o metodę `updateMember` przyjmującą `userId`, `memberId`, `UpdateHouseholdMemberCommand` oraz implementującą krotność zapytań i mapowanie wyjątków na kody (`HOUSEHOLD_NOT_FOUND`, `MEMBER_NOT_FOUND`, `MEMBER_NAME_CONFLICT`, `MEMBER_UPDATE_FAILED`).
3. W handlerze `PATCH`:
   - Pobierz i zweryfikuj Supabase z `locals`, wykonaj `auth.getUser`.
   - Wywołaj `updateMember`, mapując błędy serwisu na kody HTTP i tworząc odpowiedzi JSON (`ApiErrorDto`).
   - Zwróć `HouseholdMemberDto` z `X-Result-Code: MEMBER_UPDATED`.
4. Uzupełnij wspólne helpery odpowiedzi (jeśli istnieją) lub utwórz nowe, aby zachować spójność z GET/POST (np. `createErrorResponse`).
