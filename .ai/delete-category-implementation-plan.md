# API Endpoint Implementation Plan: DELETE /api/categories/{categoryId}

## 1. Przegląd punktu końcowego

- Usuwa wskazaną kategorię wydatków należącą do gospodarstwa aktualnie uwierzytelnionego użytkownika.
- Wymaga potwierdzenia kaskadowej operacji (`force=true`), jeśli istnieją zależne rekordy w `planned_expenses` lub `transactions`.
- Sukces oznacza fizyczne usunięcie kategorii (ON DELETE CASCADE wyczyści powiązania) i zwraca status 204 oraz nagłówek `X-Result-Code: CATEGORY_DELETED`.

## 2. Szczegóły żądania

- Metoda HTTP: `DELETE`
- Struktura URL: `/api/categories/{categoryId}`
- Parametry:
  - Wymagane: `categoryId` (path, UUID zgodny ze specyfikacją Zod).
  - Opcjonalne: `force` (query, `true` wymaga dokładnej wartości tekstowej "true" i mapuje się na boolean `true`).
- Request Body: brak (endpoint nie przyjmuje treści).
- Nagłówki: standardowe nagłówki uwierzytelnienia Supabase (token sesji lub cookie) automatycznie dostarczane.

## 3. Wykorzystywane typy

- `DeleteCategoryCommand` (`force?: boolean`) – przekazywany do warstwy serwisu.
- `ApiErrorDto` – standardowa struktura odpowiedzi błędów.
- `CategoryDto` – pomocniczo w serwisie przy walidacji istnienia, choć nie jest zwracany na zewnątrz.

## 4. Szczegóły odpowiedzi

- Sukces: `204 No Content`, nagłówek `X-Result-Code: CATEGORY_DELETED`, bez body.
- Błędy:
  - `400 Bad Request`: `INVALID_CATEGORY_ID`, `INVALID_FORCE_FLAG`, `FORCE_CONFIRMATION_REQUIRED`.
  - `401 Unauthorized`: `UNAUTHENTICATED`.
  - `404 Not Found`: `HOUSEHOLD_NOT_FOUND`, `CATEGORY_NOT_FOUND`.
  - `500 Internal Server Error`: `CATEGORY_DELETE_FAILED`.
- Format błędów: JSON zgodny z `ApiErrorDto` z nagłówkiem `Content-Type: application/json; charset=utf-8`.

## 5. Przepływ danych

- Astro API route otrzymuje żądanie i waliduje `categoryId` oraz parametr `force` za pomocą Zod.
- Pozyskuje klienta Supabase z `locals.supabase`, uwierzytelnia użytkownika przez `supabase.auth.getUser()`.
- Tworzy `DeleteCategoryCommand` i przekazuje do nowej metody `deleteCategoryByUserId` w `CategoriesService`.
- Serwis:
  - Odczytuje `household_id` powiązany z `user.id`.
  - Weryfikuje istnienie kategorii (`select ... single`) w ramach gospodarstwa.
  - Liczy rekordy powiązane (`planned_expenses`, `transactions`) wykorzystując zapytania agregujące (preferencyjnie count = exact).
  - Jeśli zależności > 0 i `force !== true`, rzuca kontrolowany błąd `CATEGORY_DEPENDENCIES_EXIST`.
  - W przypadku `force=true`, wykonuje `delete` na `categories` z filtrami `id` i `household_id`; rely on DB cascade.
- Endpoint tłumaczy wyjątki serwisu na odpowiedzi HTTP i loguje odpowiednie komunikaty.

## 6. Względy bezpieczeństwa

- Użycie `supabase.auth.getUser()` do potwierdzenia uwierzytelnienia; brak użytkownika → 401.
- Serwis filtruje po `household_id` zależnym od `user.id`, zapobiegając usuwaniu cudzych zasobów.
- Walidacja UUID i boolean query minimalizuje ryzyko SQL injection (Supabase RPC i filtry parametryzowane dodatkowo zabezpieczają).
- ON DELETE CASCADE w bazie działa tylko w obrębie gospodarstwa; brak ekspozycji szczegółowych danych w odpowiedziach błędów.
- Zachować standardową politykę logowania (tylko high-level komunikaty w konsoli, bez danych osobowych).

## 7. Obsługa błędów

- `INVALID_CATEGORY_ID` (400): niepoprawny path param (Zod).
- `INVALID_FORCE_FLAG` (400): `force` obecny, ale inna wartość niż "true".
- `FORCE_CONFIRMATION_REQUIRED` (400): zależności istnieją, `force` nie ustawione; zwrócić informację o konieczności potwierdzenia.
- `UNAUTHENTICATED` (401): brak ważnej sesji Supabase.
- `HOUSEHOLD_NOT_FOUND` (404): brak gospodarstwa dla użytkownika.
- `CATEGORY_NOT_FOUND` (404): kategoria nie istnieje lub nie należy do gospodarstwa.
- `CATEGORY_DELETE_FAILED` (500): pozostałe błędy Supabase/serwera; logować `console.error`.
- W serwisie błędy sygnalizowane przez rzucenie `Error` z kodem; endpoint mapuje na HTTP.

## 8. Rozważania dotyczące wydajności

- Zapytania liczące zależności mogą używać `count` z Supabase; indeksy (`planned_expenses(category_id)`, `transactions(category_id)`) istnieją implicit; potwierdzić w bazie.
- Operacja DELETE jest pojedyncza; ON DELETE CASCADE może usunąć wiele rekordów – monitorować czas odpowiedzi przy dużych datasetach.
- Ewentualna optymalizacja: połączenie liczników w jeden `rpc` lub `union` zamiast dwóch oddzielnych zapytań, jeżeli liczba zależności duża.
- Przestrzegaj limitów Supabase (np. `range` nieużywany w delete) – brak dodatkowych działań.

## 9. Etapy wdrożenia

1. Utwórz schemat walidacji Zod dla parametru zapytania `force` w pliku endpointu (`z.literal("true").optional()` lub custom boolean parser).
2. Rozszerz `CategoriesService` o metodę `deleteCategoryByUserId(userId, categoryId, command)` z logiką sprawdzania gospodarstwa, zależności i usuwania.
3. Dodaj pomocniczą metodę w serwisie (np. `getCategoryDependenciesCounts`) liczącą wpisy w `planned_expenses` i `transactions` dla danej kategorii i gospodarstwa.
4. Zaimplementuj w endpointzie `DELETE` w `src/pages/api/categories/[categoryId].ts` nową funkcję eksportowaną `DELETE` korzystającą z walidacji, uwierzytelnienia i serwisu.
5. Zmapuj wyjątki serwisu (`HOUSEHOLD_NOT_FOUND`, `CATEGORY_NOT_FOUND`, `CATEGORY_DEPENDENCIES_EXIST`, `CATEGORY_DELETE_FAILED`) na odpowiednie kody/komunikaty.
6. Dodaj logowanie `console.warn`/`console.error` dla walidacji i błędów serwisu (spójne z istniejącymi endpointami).
