# API Endpoint Implementation Plan: PATCH /api/transactions/{transactionId}

## 1. Przegląd punktu końcowego

- Umożliwia aktualizację szczegółów pojedynczej transakcji (kwota, kategoria, data, notatka) należącej do bieżącego gospodarstwa domowego zalogowanego użytkownika.
- Zapewnia, że transakcja istnieje i należy do gospodarstwa powiązanego z użytkownikiem przed zastosowaniem zmian.
- Zwraca zaktualizowany rekord transakcji wraz z nagłówkiem `X-Result-Code: TRANSACTION_UPDATED`.

## 2. Szczegóły żądania

- Metoda HTTP: `PATCH`.
- Struktura URL: `/api/transactions/{transactionId}`.
- Parametry:
  - Wymagane path param: `transactionId` (UUID), walidowany przez `parseTransactionIdParam`.
  - Brak parametrów zapytania.
- Nagłówki: `Content-Type: application/json`, sesja Supabase (cookies) zapewnia uwierzytelnienie.
- Body JSON (co najmniej jedno pole obowiązkowe):
  - `categoryId?: string` (UUID należący do gospodarstwa użytkownika).
  - `amount?: number` (`> 0`, maks. 2 miejsca po przecinku, zgodne z DECIMAL(10,2)).
  - `transactionDate?: string` (format `YYYY-MM-DD`, poprawna data, zgodna z ograniczeniem tabeli `DATE`).
  - `note?: string | null` (maks. 500 znaków; dopuszczalne `null` do wyczyszczenia notatki, zgodnie z CHECK).
- Walidacja wejścia: nowy `updateTransactionSchema` w `src/lib/validation/transactions.ts`, wykorzystujący Zod do walidacji powyższych pól i reguły „co najmniej jedno pole”. Eksportowane pomocnicze `parseUpdateTransactionBody` zwraca `UpdateTransactionCommand` (istniejący typ z `src/types.ts`).

## 3. Szczegóły odpowiedzi

- Sukces 200:
  - Body: `TransactionDto` zaktualizowanego rekordu (JSON identyczny jak w GET).
  - Nagłówki: `Content-Type: application/json; charset=utf-8`, `X-Result-Code: TRANSACTION_UPDATED`.
- Błędy (standardowy `ApiErrorDto`):
  - 400 `INVALID_BODY`/`INVALID_AMOUNT`/inne kody walidacyjne.
  - 401 `UNAUTHENTICATED` gdy Supabase nie zwróci użytkownika.
  - 404 `TRANSACTION_NOT_FOUND` dla nieistniejącego lub niedostępnego rekordu.
  - 500 `TRANSACTION_UPDATE_FAILED` lub `INTERNAL_SERVER_ERROR` dla pozostałych błędów.

## 4. Przepływ danych

- Uwierzytelnij użytkownika poprzez `locals.supabase.auth.getUser()` i uzyskaj `user.id`.
- Waliduj `transactionId` oraz body (Zod) → otrzymaj `UpdateTransactionCommand` (pola opcjonalne) i flagę minimalnego zestawu.
- Skorzystaj z `createTransactionsService(locals.supabase)` i nowej metody `updateTransaction`.
- W serwisie:
  - Zapytaj `households` o id gospodarstwa dla użytkownika (zachowane z istniejącej logiki).
  - Pobierz transakcję po `id` i `household_id`; zwróć 404, jeśli brak.
  - Jeśli przekazano `categoryId`, upewnij się, że kategoria należy do tego samego gospodarstwa (`categories` join/eq) oraz (opcjonalnie) że budżet linkowany do transakcji należy do gospodarstwa (posiadany klucz złożony).
  - Przygotuj obiekt aktualizacji tylko z dostarczonymi polami; dla `note` dopuszczaj `null`.
  - Wykonaj `update` na `transactions` (filtry `id` + `household_id`), poproś o `select` po aktualizacji, aby uzyskać świeże dane.
  - Obsłuż błędy Supabase (np. `PGRST116` → 404, naruszenia walidacji → zmapowane na kody walidacyjne, inne → 500).
- Zmapuj wynik na `TransactionDto` i zwróć w odpowiedzi.

## 5. Względy bezpieczeństwa

- Polegaj na Supabase Auth (cookies) i `locals.supabase`; brak danych zwraca 401.
- Potwierdź przynależność transakcji i ewentualnej kategorii do gospodarstwa użytkownika, aby uniknąć eskalacji uprawnień.
- Opieraj się na politykach RLS w tabelach (zapytania zawsze obejmują `household_id`).
- Waliduj i sanityzuj wejście (UUID, liczby, daty) przed użyciem.
- Nie ujawniaj, czy zasób istnieje dla innych gospodarstw; 404 dla wszystkich przypadków braku dostępu.

## 6. Obsługa błędów

- Walidacja wejścia: mapuj pierwszy błąd na kody (`INVALID_AMOUNT`, `INVALID_CATEGORY_ID`, `INVALID_BODY`, `INVALID_NOTE`, `INVALID_DATE`), zwracaj 400.
- Supabase `auth.getUser()` zwraca błąd → 401 z kodem `UNAUTHENTICATED`.
- Brak gospodarstwa dla użytkownika lub brak transakcji → błąd serwisu `TRANSACTION_NOT_FOUND` → 404.
- Naruszenie ograniczeń bazy (np. spoza gospodarstwa, constraint) → mapowane na `TRANSACTION_UPDATE_FAILED` 500, z logiem błędu.
- Nieobsłużone wyjątki → 500 `INTERNAL_SERVER_ERROR`, z logowaniem w konsoli (obecnie brak dedykowanej tabeli błędów, więc wykorzystujemy `console.error`).

## 7. Rozważania dotyczące wydajności

- Używaj pojedynczych zapytań do Supabase (1 dla gospodarstwa, 1 do odczytu transakcji, 1 do aktualizacji z `select`).
- Gwarantuj użycie istniejących indeksów po kluczach `id`/`household_id`; brak dodatkowych indeksów potrzebnych przy aktualizacji jednego rekordu.
- Minimalizuj transfer danych, wybierając tylko wymagane kolumny.
- Brak paginacji ani agregacji, więc obciążenie jest znikome.

## 8. Etapy wdrożenia

1. Dodaj `updateTransactionSchema` i `parseUpdateTransactionBody` do `src/lib/validation/transactions.ts` (Zod: wszystkie pola opcjonalne, `at least one`, walidacja zgodna z ograniczeniami DB, obsługa `note: null`).
2. Rozszerz `TransactionsService` o metodę `updateTransaction(userId, transactionId, command)` wykorzystując istniejące mapowania i mechanikę gospodarstwa; uwzględnij walidację kategorii oraz obsłuż kody błędów Supabase.
3. Zaimplementuj handler `export const PATCH` w `src/pages/api/transactions/[transactionId].ts`: auth, walidacje, wywołanie serwisu, mapowanie błędów na `ApiErrorDto`, zwrócenie 200 z nagłówkiem `TRANSACTION_UPDATED` i ciałem `TransactionDto`.
4. Ustandaryzuj logowanie błędów (`console.error`) w gałęziach 500; rozważ wspólne pomocniki w przyszłości.
