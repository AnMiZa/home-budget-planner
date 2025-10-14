# API Endpoint Implementation Plan: POST /api/household-members

## 1. Przegląd punktu końcowego

- Celem jest umożliwienie autoryzowanemu użytkownikowi dodania nowego domownika do przypisanego gospodarstwa domowego.
- Endpoint tworzy rekord `household_members`, ustawiając domyślnie `is_active = true` i zwraca utworzoną reprezentację DTO.
- Zapewnia walidację wejścia, ochronę przed zduplikowanymi imionami (bez rozróżnienia wielkości liter) i spójne kody wyników (`X-Result-Code`).

## 2. Szczegóły żądania

- **Metoda HTTP:** POST
- **Struktura URL:** `/api/household-members`
- **Parametry:** brak zapytania; nagłówki standardowe (`Content-Type: application/json`)
  - **Wymagane:** brak
  - **Opcjonalne:** brak
- **Request Body:**

  ```json
  {
    "fullName": "Bob"
  }
  ```

  - `fullName` (wymagane): string po trim, długość 1–120 znaków, zgodna z ograniczeniem bazy danych.

## 3. Wykorzystywane typy

- `CreateHouseholdMemberCommand` – użyty do przekazania zwalidowanych danych do warstwy serwisowej.
- `HouseholdMemberDto` – DTO zwracane w odpowiedzi.
- `ApiErrorDto` – standardowe opakowanie odpowiedzi błędu.
- Pomocniczo: `SupabaseClientType` z `household-members.service.ts` do konstrukcji serwisu.

## 4. Szczegóły odpowiedzi

- **Sukces 201 (MEMBER_CREATED):** zwracany DTO domownika oraz nagłówek `X-Result-Code: MEMBER_CREATED`.

  ```json
  {
    "id": "<uuid>",
    "fullName": "Bob",
    "isActive": true,
    "createdAt": "<timestamp>",
    "updatedAt": "<timestamp>"
  }
  ```

- **Błędy:**
  - 400 `INVALID_FULL_NAME` – niepoprawne dane wejściowe.
  - 401 `UNAUTHENTICATED` – brak aktywnej sesji Supabase.
  - 404 `HOUSEHOLD_NOT_FOUND` – użytkownik nie ma gospodarstwa.
  - 409 `MEMBER_NAME_CONFLICT` – konflikt nazwy w obrębie gospodarstwa (case-insensitive).
  - 500 `MEMBER_CREATE_FAILED` – pozostałe błędy serwera / bazy.

## 5. Przepływ danych

1. Klient wysyła żądanie POST z JSON zawierającym `fullName`.
2. Endpoint parsuje i waliduje body przy użyciu schematu Zod (trim, długość, typ).
3. Pobiera klienta Supabase z `locals.supabase` i uwierzytelnia użytkownika (`auth.getUser`).
4. Serwis `HouseholdMembersService`:
   - Wyszukuje gospodarstwo użytkownika (`households` by `user_id`).
   - Sprawdza istnienie aktywnego kontekstu gospodarstwa; w razie braku zwraca kod błędu.
   - Wykonuje selekcję na `household_members` z `ilike`/`eq` na znormalizowanym `full_name` (np. `lower(full_name) = lower(?)`) w transakcji logicznej; w przypadku konfliktu zwraca błąd 409.
   - Wstawia nowy rekord z `household_id`, `full_name`, `is_active = true` i zwraca inserted row (`select().single()`).
   - Mapuje wynik na `HouseholdMemberDto`.
5. Endpoint serializuje DTO do JSON, ustawia status 201 i nagłówek `X-Result-Code`.

## 6. Względy bezpieczeństwa

- Wymagana autoryzacja Supabase; brak usera → 401.
- Zapytania ograniczone do gospodarstwa użytkownika, co respektuje RLS na tabelach.
- Walidacja i trimming `fullName` ogranicza możliwość wstrzyknięcia/whitespace.
- Obsługa konfliktów zapobiega wyciekowi informacji o innych gospodarstwach (zapytania filtrowane po `household_id`).
- Brak potrzeby dodatkowej obsługi CSRF (endpoint API, oczekuje tokenów Supabase).

## 7. Obsługa błędów

- Walidacja Zod → 400 `INVALID_FULL_NAME`, log `console.error` z kontekstem.
- Brak Supabase w `locals` → 500 `MEMBER_CREATE_FAILED` (infrastruktura).
- `auth.getUser` z błędem lub bez usera → 401 `UNAUTHENTICATED`.
- Brak gospodarstwa → 404 `HOUSEHOLD_NOT_FOUND`.
- Duplikat nazwy (po `lower`) → 409 `MEMBER_NAME_CONFLICT`.
- Błędy bazy podczas insert/select → 500 `MEMBER_CREATE_FAILED` (log `console.error` z kodem błędu).
- Wszystkie logi wzbogacone o identyfikatory użytkownika/gospodarstwa; brak dedykowanej tabeli błędów w projekcie – w przyszłości można skierować do centralnego loggera.

## 8. Rozważania dotyczące wydajności

- Odczyt `households` i `household_members` ograniczony do pojedynczego gospodarstwa – brak znaczącego obciążenia.
- Sprawdzenie duplikatu można zoptymalizować przez dodanie indeksu funkcjonalnego (np. `CREATE INDEX ON household_members (household_id, lower(full_name));`) – odnotować dla migracji, choć nie wymagane natychmiast.
- Zapewnić, że zapytanie sprawdzające konflikt używa `select('id').limit(1)` by ograniczyć rozmiar odpowiedzi.

## 9. Etapy wdrożenia

1. **Schemat walidacji:** Dodaj w pliku endpointu Zod schema `bodySchema` walidującą `fullName` (trim, min 1, max 120).
2. **Rozbudowa serwisu:** W `household-members.service.ts` dodaj metodę `createMember(userId: string, command: CreateHouseholdMemberCommand)` obsługującą lookup gospodarstwa, kontrolę duplikatów i insert.
3. **Aktualizacja endpointu:**
   - Zaimportuj `CreateHouseholdMemberCommand`, nową metodę serwisu oraz `HouseholdMemberDto`.
   - Zaimplementuj handler `POST` korzystający z walidacji, autoryzacji, serwisu i mapowania błędów na kody HTTP.
   - Dodaj helpery `createSuccessResponse`/`createErrorResponse` jeśli mogą być współdzielone z `GET` (lub wydziel do współdzielonych funkcji).
4. **Logowanie błędów:** Zapewnij spójne `console.error` z kontekstem (userId, householdId, payload length) w gałęziach błędów.
