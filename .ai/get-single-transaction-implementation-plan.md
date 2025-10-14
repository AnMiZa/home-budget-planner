# API Endpoint Implementation Plan: GET /api/transactions/{transactionId}

## 1. Przegląd punktu końcowego

- Zwraca pojedynczą transakcję przypisaną do gospodarstwa domowego zalogowanego użytkownika na podstawie `transactionId`.
- Dostępny dla uwierzytelnionych użytkowników; odmawia wglądu w transakcje spoza ich gospodarstwa.
- Standardowe odpowiedzi JSON z nagłówkiem `Content-Type: application/json; charset=utf-8` oraz `X-Result-Code`.

## 2. Szczegóły żądania

- Metoda HTTP: `GET`
- Struktura URL: `/api/transactions/{transactionId}`
- Parametry:
  - Wymagane: `transactionId` (UUID; path param)
  - Opcjonalne: brak
- Request Body: brak treści żądania

## 3. Wykorzystywane typy

- `TransactionDto` (z `src/types.ts`) jako struktura datos resultu.
- `ApiErrorDto` (z `src/types.ts`) dla spójnych odpowiedzi błędów.
- Nowe typy pomocnicze w walidacji:
  - `TransactionIdParams` (typ Zod) do walidacji `transactionId`.

## 4. Szczegóły odpowiedzi

- Sukces: `200 OK`
  - Nagłówki: `Content-Type: application/json; charset=utf-8`, `X-Result-Code: TRANSACTION_FETCHED`
  - Payload: `TransactionDto`
- Błędy:
  - `400 INVALID_TRANSACTION_ID` gdy `transactionId` nie jest poprawnym UUID.
  - `401 UNAUTHENTICATED` gdy użytkownik nie jest zalogowany.
  - `404 TRANSACTION_NOT_FOUND` gdy transakcja nie istnieje lub nie należy do gospodarstwa użytkownika.
  - `500 TRANSACTION_FETCH_FAILED` (lub `INTERNAL_SERVER_ERROR`) dla nieoczekiwanych błędów zapytań Supabase.

## 5. Przepływ danych

- Żądanie trafia do handlera Astro w `src/pages/api/transactions/[transactionId].ts`.
- Handler pobiera klienta Supabase z `locals.supabase` i weryfikuje uwierzytelnienie (`supabase.auth.getUser()`).
- Waliduje `transactionId` (schema Zod) i przetwarza go do dalszego użycia.
- Wywołuje `TransactionsService.getTransactionById(user.id, transactionId)`:
  - `TransactionsService` pobiera `household_id` użytkownika z tabeli `households`.
  - Buduje zapytanie do `transactions` filtrowane po `id` i `household_id` (zapewnia własność zasobu).
  - Zwraca rekord transakcji lub sygnalizuje `TRANSACTION_NOT_FOUND`.
  - Mapuje rekord na `TransactionDto`.
- Handler zwraca odpowiedź JSON wraz z odpowiednim kodem statusu i nagłówkiem `X-Result-Code`.

## 6. Względy bezpieczeństwa

- Wymuś uwierzytelnienie przez Supabase; w przypadku braku użytkownika natychmiastowy zwrot `401`.
- Walidacja `transactionId` zapobiega wstrzyknięciom i zbędnym zapytaniom.
- W warstwie serwisu zawsze filtruj po `household_id` powiązanym z użytkownikiem, aby uniemożliwić enumerację cudzych transakcji.
- Polegaj na politykach RLS Supabase jako dodatkowej warstwie, ale nie zakładaj ich skuteczności – logika serwisu ma gwarantować izolację.
- Nie ujawniaj szczegółów wewnętrznych błędów w odpowiedziach – ogranicz komunikaty do ogólnych.

## 7. Obsługa błędów

- Brak klienta Supabase: loguj `console.error` i zwracaj `500 INTERNAL_SERVER_ERROR`.
- Błędy uwierzytelnienia (`authError` lub brak użytkownika): `401 UNAUTHENTICATED`.
- Niepoprawny `transactionId` (walidacja Zod): `400 INVALID_TRANSACTION_ID` (z komunikatem ze schematu).
- Brak gospodarstwa przypisanego do użytkownika: traktuj jako `TRANSACTION_NOT_FOUND`, aby nie ujawniać struktury danych.
- Zapytanie do `transactions` zwróci pusty wynik: rzuć `TRANSACTION_NOT_FOUND` i obsłuż jako `404`.
- Błędy Supabase (np. sieć, kod błędu): loguj (`console.error`) i zwracaj `500 TRANSACTION_FETCH_FAILED`.

## 8. Rozważania dotyczące wydajności

- Zapytanie pojedynczego rekordu po indeksowanym kluczu głównym `id` – minimalne obciążenie.
- Korzystaj z `select(...).single()` aby ograniczyć transfer do jednego wiersza.
- Ewentualne dodatkowe pola (np. `category_id`) już znajdują się w indeksach; nie wymaga optymalizacji.

## 9. Etapy wdrożenia

1. Rozszerz `src/lib/validation/transactions.ts` o schemat `transactionIdParamSchema` i funkcję `parseTransactionIdParam(params)` zwracającą validated UUID.
2. Utwórz `src/lib/services/transactions.service.ts` z klasą/fabryką `createTransactionsService`, która:
   - Udostępnia metodę `getTransactionById(userId: string, transactionId: string): Promise<TransactionDto>`.
   - Wykorzystuje Supabase do pobrania `household_id` użytkownika i transakcji, mapując wynik na DTO.
   - Zwraca `TRANSACTION_NOT_FOUND` jeśli brak gospodarstwa lub transakcji.
3. (Opcjonalnie) Wyodrębnij funkcję mapującą transakcję do DTO z `BudgetsService` do wspólnej metody, aby uniknąć duplikacji kodu, lub zduplikuj implementację w nowym serwisie z odpowiednim komentarzem.
4. Utwórz nowy handler `src/pages/api/transactions/[transactionId].ts`:
   - Skonfiguruj `prerender = false`.
   - Zaimplementuj funkcję `createErrorResponse` i `createSuccessResponse` w oparciu o istniejące wzorce.
   - Zapewnij kroki walidacji, uwierzytelnienia i obsługi błędów zgodnie z sekcjami powyżej.
