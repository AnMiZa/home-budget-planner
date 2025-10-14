# API Endpoint Implementation Plan: GET /api/budgets/{budgetId}

## 1. Przegląd punktu końcowego

- Punkt końcowy zwraca pełne dane budżetu przypisanego do gospodarstwa zalogowanego użytkownika.
- Odpowiedź zawiera informacje o budżecie (miesiąc), przychodach, planowanych wydatkach oraz podsumowaniu finansowym.
- Parametry zapytania pozwalają kontrolować dołączenie transakcji do podsumowań oraz filtrowanie przychodów według aktywności domowników.
- Sukces sygnalizowany nagłówkiem `X-Result-Code: BUDGET_FETCHED` i kodem odpowiedzi 200.

## 2. Szczegóły żądania

- Metoda HTTP: GET
- Struktura URL: `/api/budgets/{budgetId}`
- Parametry:
  - Wymagane:
    - `budgetId` (path, UUID): jednoznaczny identyfikator budżetu.
  - Opcjonalne:
    - `includeTransactions` (query, bool, domyślnie `false`): gdy `true`, oblicz podsumowania wydatków per kategoria wykorzystując transakcje związane z budżetem.
    - `includeInactiveMembers` (query, bool, domyślnie `false`): gdy `true`, dołącz przychody nieaktywnych domowników; standardowo filtrujemy tylko aktywnych.
- Request Body: brak (operacja GET).
- Walidacja wejścia (Zod w pliku routingu):
  - `budgetId` jako UUID (mapowane z `params` do schematu).
  - Query: `includeTransactions` i `includeInactiveMembers` przyjmowane jako stringi (`"true"/"false"`) i transformowane do booleanów; odrzucamy wartości inne niż te dozwolone.
  - Brak dodatkowych parametrów — schemat odfiltrowuje/zwraca błąd dla nieznanych kluczy jeżeli przyjmiemy `strict`.

## 3. Wykorzystywane typy

- `BudgetDetailDto` (główna odpowiedź, pola: `id`, `month`, `createdAt`, `updatedAt`, `incomes`, `plannedExpenses`, `summary`).
- `BudgetIncomeDto` oraz `BudgetPlannedExpenseDto` dla kolekcji w odpowiedzi.
- `BudgetSummaryDto`, `BudgetCategorySummaryDto`, `BudgetSummaryTotalsDto` dla sekcji `summary` (z opcjonalnym `perCategory` i `progress`).
- Możliwy nowy typ pomocniczy w serwisie, np. `GetBudgetDetailOptions` z polami `includeTransactions` oraz `includeInactiveMembers`.
- `ApiErrorDto` dla błędów.

## 3. Szczegóły odpowiedzi

- Status 200 + `X-Result-Code: BUDGET_FETCHED`; body zgodne z `BudgetDetailDto`:
  - `id`, `month`, `createdAt`, `updatedAt`.
  - `incomes`: lista przychodów, filtrowana wg aktywności domowników, chyba że żądano włączenia nieaktywnych.
  - `plannedExpenses`: lista limitów wydatków.
  - `summary`: zawiera `totalIncome`, `totalPlanned`, `totalSpent`, `freeFunds`, `progress` oraz warunkowo `perCategory` (gdy dołączono transakcje). Kategorie obejmują `categoryId`, `name`, `spent`, `limitAmount`, `progress`, `status`.
- Kody błędów:
  - 400 `INVALID_QUERY_PARAMS` / `INVALID_BUDGET_ID` dla błędnego UUID lub parametrów.
  - 401 `UNAUTHENTICATED` przy braku sesji.
  - 404 `BUDGET_NOT_FOUND` gdy brak budżetu w gospodarstwie użytkownika.
  - 500 `BUDGET_FETCH_FAILED` dla błędów Supabase lub nieoczekiwanych wyjątków.

## 4. Przepływ danych

- Router Astro (`src/pages/api/budgets/[budgetId].ts`):
  - Waliduje parametry i uzyskuje klienta Supabase z `locals`.
  - Pobiera aktualnego użytkownika (`supabase.auth.getUser()`); obsługuje brak autentykacji.
  - Instancjuje `BudgetsService` (za pomocą `createBudgetsService`).
  - Wywołuje np. `budgetsService.getBudgetDetail(user.id, budgetId, options)` i mapuje odpowiedź do `BudgetDetailDto`.
- Warstwa serwisowa (`BudgetsService`):
  - Znajduje `household_id` przypisany do użytkownika, cache'uje/id reuse.
  - Pobiera rekord budżetu powiązany z gospodarstwem; wyrzuca `BUDGET_NOT_FOUND` gdy brak.
  - Równolegle (Promise.all) pobiera:
    - przychody (`incomes`) filtrowane po `household_id`, `budget_id`, oraz `household_members.is_active` zależnie od flagi.
    - planowane wydatki (`planned_expenses` + join z `categories` dla nazwy — do perCategory summary).
    - transakcje (`transactions`) tylko jeśli `includeTransactions === true`.
  - Agreguje sumaryczne wartości: sumy przychodów, limitów, wydatków.
  - Oblicza `freeFunds = totalIncome - totalPlanned` oraz `progress` (np. `totalIncome > 0 ? totalSpent / totalIncome * 100 : 0`).
  - Gdy dołączono transakcje: buduje `perCategory`, łącząc limity z sumą wydatków, obliczając `progress` i `status` (`ok`/`warning`/`over` na podstawie stosunku wydatków do limitu — np. progi 80% i 100%; potwierdzić w repo czy istnieje analogiczna logika, reuse jeśli jest).
  - Zwraca złożoną strukturę do routingu.
- API route formatuje odpowiedź, dodaje nagłówki i kody.

## 5. Względy bezpieczeństwa

- Uwierzytelnianie: wymagane Supabase auth; każda odpowiedź weryfikuje `user`.
- Autoryzacja: wszystkie zapytania filtrowane po `household_id` przypisanym do użytkownika; brak osobnego dostępu do budżetów innych użytkowników. RLS w Supabase dodatkowo chroni dane.
- Walidacja danych wejściowych zapobiega wstrzyknięciu; parametry boole'owskie transformowane w kontrolowany sposób.
- Brak logowania wrażliwych danych; logować jedynie identyfikatory i kody błędów.
- Przy wyłączeniu filtrów (np. `includeInactiveMembers`) upewnić się, że nie ujawniamy nieaktywnych domowników bez wyraźnej prośby.

## 6. Obsługa błędów

- Walidacja (`safeParse`) -> 400 `INVALID_QUERY_PARAMS` lub `INVALID_BUDGET_ID` (przy niemożności sparsowania UUID).
- Brak `locals.supabase` -> 500 `BUDGET_FETCH_FAILED` (analogicznie do istniejących endpointów).
- `auth.getUser()` zwraca błąd lub `user === null` -> 401 `UNAUTHENTICATED`.
- `BudgetsService.getBudgetDetail` rzuca:
  - `HOUSEHOLD_NOT_FOUND` -> 404 mapowane na `BUDGET_NOT_FOUND` (lub dedykowany kod, zgodnie ze specyfikacją, ale logika: brak gospodarstwa = brak dostępu).
  - `BUDGET_NOT_FOUND` -> 404.
  - `INVALID_MEMBER_ACCESS`/`INVALID_CATEGORY` (jeśli powstaną w logice) -> 500 lub 400 (w zależności od kontekstu; spodziewane brak, bo to GET).
  - `BUDGET_FETCH_FAILED` -> 500.
- Niezłapane wyjątki -> 500 z `BUDGET_FETCH_FAILED` i logowaniem `console.error`.

## 7. Rozważania dotyczące wydajności

- Wykorzystać `Promise.all` do równoległego pobierania przychodów, wydatków i transakcji.
- Rozważyć wybiórcze pola w zapytaniach Supabase (`select` tylko potrzebnych kolumn).
- Dla `perCategory` agregować transakcje po stronie bazy (np. `select category_id, sum(amount)` z `group`), redukując obciążenie aplikacji.
- Indeksy: relacje kluczowe (`budget_id`, `household_id`) już istnieją. Upewnić się, że zapytania filtrują po tych kolumnach.
- Ograniczyć logikę biznesową w kodzie do prostych obliczeń; cięższe operacje (sumy, joiny) przenieść do SQL gdy to możliwe.
- Kontrolować opcjonalne dane (`includeTransactions`) by unikać zbędnych zapytań.

## 8. Etapy wdrożenia

1. **Przygotowanie pliku routingu**: utworzyć `src/pages/api/budgets/[budgetId].ts` wzorując się na istniejących endpointach (`GET /api/budgets`), skonfigurować `export const prerender = false` i zdefiniować schematy Zod dla parametrów.
2. **Rozszerzenie serwisu**: dodać do `BudgetsService` metodę `getBudgetDetail`, interfejs opcji i pomocnicze metody (np. agregacja transakcji, status kategorii). Zapewnić spójne błędy (`BUDGET_NOT_FOUND`, `BUDGET_FETCH_FAILED`).
3. **Implementacja logiki danych**: w serwisie pobrać budżet, przychody (z joinem do `household_members` dla `is_active`), planowane wydatki (join z `categories`), oraz sumy transakcji (z opcją pominięcia). Obliczyć podsumowania.
4. **Obsługa odpowiedzi API**: w routingu mapować wynik serwisu na `BudgetDetailDto`, ustawiać nagłówki i kody statusu. Zapewnić standardowe formatowanie błędów (`ApiErrorDto`).
5. **Dokumentacja/logowanie**: dodać sensowne logi (`console.log` dla sukcesu, `console.error` dla błędów) zgodne z dotychczasowym stylem.
