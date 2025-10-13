# API Endpoint Implementation Plan: GET /api/budgets/{budgetId}/incomes

## 1. Przegląd punktu końcowego

- Endpoint zwraca listę przychodów powiązanych z budżetem gospodarstwa zalogowanego użytkownika.
- Umożliwia warstwie UI prezentację szczegółów budżetu (np. tabeli przychodów, wykresów sumowania).
- Wykorzystuje Supabase jako backend (uwierzytelnianie, RLS) oraz Astro API routes do obsługi żądań.

## 2. Szczegóły żądania

- Metoda HTTP: GET
- Struktura URL: `/api/budgets/{budgetId}/incomes`
- Parametry:
  - Wymagane: `budgetId` (parametr ścieżki, UUID)
  - Opcjonalne: brak w pierwszej wersji (potencjalne rozszerzenia jak `includeInactiveMembers` zostaną opisane w backlogu)
- Request Body: brak

## 3. Wykorzystywane typy

- `BudgetIncomeDto` (`src/types.ts`) – reprezentacja pojedynczego przychodu budżetu.
- `BudgetIncomesListResponseDto` (`src/types.ts`) – struktura odpowiedzi z listą przychodów.
- `ApiErrorDto` (`src/types.ts`) – standardowy format błędów HTTP.
- Nie są wymagane dodatkowe command modele; walidacja ogranicza się do parametrów ścieżki.

## 4. Szczegóły odpowiedzi

- 200 OK (`X-Result-Code: INCOMES_LISTED`):

  ```json
  {
    "data": [
      {
        "id": "uuid",
        "householdMemberId": "uuid",
        "amount": 3500.0,
        "createdAt": "2025-10-01T12:34:56Z"
      }
    ]
  }
  ```

- 400 BAD REQUEST (`INVALID_BUDGET_ID`): nieprawidłowy UUID w ścieżce.
- 401 UNAUTHORIZED (`UNAUTHENTICATED`): brak prawidłowej sesji Supabase.
- 404 NOT FOUND (`BUDGET_NOT_FOUND`): budżet nie istnieje lub nie należy do gospodarstwa użytkownika.
- 500 INTERNAL SERVER ERROR (`INCOMES_LIST_FAILED`): błąd Supabase lub inne niespodziewane wyjątki.

## 5. Przepływ danych

- Klient wysyła żądanie GET do `/api/budgets/{budgetId}/incomes`.
- Handler API (Astro) waliduje `budgetId` za pomocą Zod (`z.string().uuid()`).
- Pobierany jest klient Supabase z `locals.supabase`; następuje weryfikacja sesji (`supabase.auth.getUser()`).
- Serwis (nowa metoda `listBudgetIncomes`) pobiera `household_id` użytkownika, sprawdza istnienie budżetu oraz jego przynależność do gospodarstwa.
- Serwis wykorzystuje istniejącą logikę `getBudgetIncomes` (udostępnić ją publicznie lub wydzielić) do pobrania danych z tabeli `incomes` z filtrem po `budget_id` i `household_id`.
- Dane mapowane są do `BudgetIncomeDto`, pakowane w `BudgetIncomesListResponseDto` i zwracane do handlera.
- Handler serializuje odpowiedź, ustawia nagłówki (`Content-Type`, `X-Result-Code`) i odsyła 200 OK.

## 6. Względy bezpieczeństwa

- Autentykacja: wyłącznie zalogowani użytkownicy Supabase (sprawdzenie `supabase.auth.getUser()`).
- Autoryzacja: cross-check budżetu z gospodarstwem użytkownika poprzez `households.user_id = user.id` oraz `budgets.household_id`.
- Ochrona danych: korzystanie z RLS Supabase zapewnia dodatkowy poziom izolacji; wszystkie zapytania ograniczone do `household_id`.
- Walidacja wejścia: Zod + wczesne odrzucanie niepoprawnego `budgetId` eliminuje ryzyko SQL injection.
- Brak logowania do tabeli błędów – utrzymywać spójne logowanie `console.warn/error` (zgodnie z istniejącymi wzorcami) i monitorować konieczność rozszerzenia o storage błędów.

## 7. Obsługa błędów

- Walidacja parametrów – zwrócić 400 z kodem `INVALID_BUDGET_ID` i komunikatem Zod.
- Brak sesji lub błąd uwierzytelniania – zwrócić 401 `UNAUTHENTICATED`.
- Brak gospodarstwa lub budżetu – zwrócić 404 `BUDGET_NOT_FOUND`.
- Błędy Supabase (np. problemy z bazą) – log `console.error`, zwrócić 500 `INCOMES_LIST_FAILED`.
- Nieznane wyjątki – zabezpieczyć blokiem `try/catch` w handlerze i serwisie, mapować na kod 500.

## 8. Rozważania dotyczące wydajności

- Zapytanie wykorzystuje istniejący indeks z kluczem głównym na `incomes` (oraz FK z `budget_id`), co zapewnia efektywne filtrowanie.
- Brak paginacji – dataset spodziewanie niewielki; w przyszłości rozważyć paginację lub stronicowanie jeśli liczba przychodów istotnie wzrośnie.
- Współdzielenie logiki z serwisem budżetów eliminuje duplikację i utrzymuje pojedyncze zapytanie do Supabase.
- Minimalizować dodatkowe zapytania – po weryfikacji budżetu dane przychodów pobierane są jednym zapytaniem.

## 9. Etapy wdrożenia

1. Dodaj publiczną metodę `listBudgetIncomes(userId, budgetId)` w `BudgetsService`, wykorzystując istniejącą logikę `getBudgetIncomes` (refaktor prywatnej metody lub wydzielenie helpera) i zwracając `BudgetIncomesListResponseDto`.
2. Zapewnij mapowanie błędów serwisu (`HOUSEHOLD_NOT_FOUND`, `BUDGET_NOT_FOUND`, `BUDGET_FETCH_FAILED`) na komunikaty wymagane przez endpoint.
3. Utwórz plik `src/pages/api/budgets/[budgetId]/incomes.ts` z handlerem GET: walidacja Zod, pobranie Supabase z `locals`, uwierzytelnianie, wywołanie serwisu, mapowanie odpowiedzi i błędów.
4. Ustal nagłówek `X-Result-Code: INCOMES_LISTED` w odpowiedzi 200.
