# API Endpoint Implementation Plan: DELETE /api/transactions/{transactionId}

## 1. Przegląd punktu końcowego

- Usuwa pojedynczą transakcję należącą do gospodarstwa uwierzytelnionego użytkownika.
- Wykorzystuje istniejącą logikę serwisową do weryfikacji własności rekordów i synchronizacji podsumowań budżetu po usunięciu.
- Zwraca pustą odpowiedź z kodem 204 i nagłówkiem `X-Result-Code: TRANSACTION_DELETED`.

## 2. Szczegóły żądania

- Metoda HTTP: DELETE
- Struktura URL: `/api/transactions/{transactionId}`
- Parametry:
  - Wymagane: `transactionId` (UUID; path)
  - Opcjonalne: brak
- Request Body: brak (żądanie nie przyjmuje treści)

## 3. Wykorzystywane typy

- `ApiErrorDto` z `src/types.ts` do standaryzacji błędów.
- `TransactionDto` do reprezentacji danych transakcji w warstwie serwisowej (walidacja istnienia, aktualizacja podsumowania).
- Brak dodatkowych Command modeli; operacja opiera się wyłącznie na parametrze ścieżki.

## 4. Szczegóły odpowiedzi

- 204 No Content + `X-Result-Code: TRANSACTION_DELETED` (sukces).
- 400 Bad Request (`INVALID_TRANSACTION_ID`) przy niepoprawnym UUID w ścieżce.
- 401 Unauthorized (`UNAUTHENTICATED`) przy braku uwierzytelnienia.
- 404 Not Found (`TRANSACTION_NOT_FOUND`) gdy transakcja nie istnieje lub należy do innego gospodarstwa.
- 500 Internal Server Error (`TRANSACTION_DELETE_FAILED` / `INTERNAL_SERVER_ERROR`) w przypadku błędów Supabase lub nieoczekiwanych wyjątków.
- Odpowiedzi błędów w formacie `ApiErrorDto` z nagłówkiem `X-Result-Code`.

## 5. Przepływ danych

1. Handler DELETE pobiera `locals.supabase`; brak klienta => 500 (spójne z innymi handlerami).
2. Wywołuje `locals.supabase.auth.getUser()`; brak użytkownika => 401.
3. Waliduje `transactionId` przez `parseTransactionIdParam` z `src/lib/validation/transactions.ts`; błędy walidacji mapowane na 400.
4. Tworzy `TransactionsService` via `createTransactionsService`.
5. Nowa metoda `deleteTransaction(userId, transactionId)`:
   - Odczyt `households` dla `user_id` (jak w `getTransactionById`), obsługa błędów Supabase (`TRANSACTION_DELETE_FAILED`).
   - Pobranie transakcji z filtrem po `id` i `household_id`; brak => `TRANSACTION_NOT_FOUND`.
   - Wykonanie `.delete()` z tymi filtrami; na podstawie `count` lub `returning` potwierdzenie usunięcia.
   - Jeżeli istnieje logika aktualizacji podsumowań budżetu po zmianie transakcji, wywołanie odpowiedniego helpera z `BudgetsService` lub współdzielonego modułu, aby odświeżyć dane budżetu.
6. Handler zwraca 204 bez ciała, ustawiając nagłówek `X-Result-Code: TRANSACTION_DELETED` (opcjonalnie można pominąć `Content-Type`).
7. W przypadku błędów metoda serwisowa rzuca kontrolowane wyjątki; handler mapuje je na odpowiednie kody HTTP oraz `ApiErrorDto`.
8. Logowanie błędów przy pomocy `console.error`, aby zachować spójność z istniejącymi handlerami.

## 6. Względy bezpieczeństwa

- Wymuś uwierzytelnienie przez Supabase przed jakąkolwiek operacją.
- Sprawdzenie `household_id` zapobiega dostępowi do cudzych danych mimo UUID enumeration; uzupełnia polityki RLS.
- Walidacja UUID w ścieżce ogranicza wektory błędów parsera i ewentualne wstrzyknięcia.
- Nie ujawniaj, czy transakcja istniała w innym gospodarstwie; zwracaj jednolite `TRANSACTION_NOT_FOUND`.

## 7. Obsługa błędów

- Walidacja parametrów: 400 `INVALID_TRANSACTION_ID`.
- Brak sesji: 401 `UNAUTHENTICATED`.
- Transakcja nie istnieje / nie należy do gospodarstwa: 404 `TRANSACTION_NOT_FOUND`.
- Błędy Supabase przy pobieraniu/usuwaniu lub niespodziewane wyjątki: 500 `TRANSACTION_DELETE_FAILED`; fallback `INTERNAL_SERVER_ERROR`.
- Logowanie błędów (`console.error`) przy błędach Supabase lub nieobsłużonych wyjątkach; brak dedykowanej tabeli błędów.

## 7. Rozważania dotyczące wydajności

- Operacja dotyczy pojedynczego rekordu; wykorzystuje indeksy na `transactions.id` i `transactions.household_id`.
- Ogranicz liczbę zapytań do minimum (re-use `select` wyniku zamiast wielokrotnych odczytów).
- Unikaj pobierania wszystkich kolumn przy sprawdzaniu istnienia (można użyć `select("id, budget_id")` jeżeli potrzebne do odświeżenia budżetu).
- Odświeżenie podsumowań powinno korzystać z istniejących funkcji serwisowych, aby uniknąć nadmiarowych zapytań.

## 8. Etapy wdrożenia

1. Zweryfikować, że `parseTransactionIdParam` spełnia wymagania i nie wymaga zmian; dodać testy jednostkowe, jeśli istnieją testy walidatora.
2. Rozszerzyć `TransactionsService` o metodę `deleteTransaction`, implementując kroki z sekcji 5 i standardowe mapowanie błędów.
3. Jeżeli potrzebne, udostępnić w serwisie pomocniczą funkcję do ponownego przeliczenia podsumowania budżetu (np. poprzez współpracę z `BudgetsService`), reużywając istniejące mechanizmy z create/update.
4. Dodać handler `DELETE` w `src/pages/api/transactions/[transactionId].ts`, z obsługą autoryzacji, walidacji, mapowaniem błędów oraz zwracaniem 204 i `X-Result-Code: TRANSACTION_DELETED`.
5. Uzupełnić mapowanie błędów o nowy kod `TRANSACTION_DELETE_FAILED` (jeżeli nie istnieje), dbając o spójność komunikatów.
