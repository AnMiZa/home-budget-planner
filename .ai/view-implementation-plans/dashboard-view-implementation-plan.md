# Plan implementacji widoku DashboardView

## 1. Przegląd

Widok Pulpitu (DashboardView) jest głównym ekranem aplikacji, wyświetlanym po zalogowaniu użytkownika. Jego celem jest przedstawienie zwięzłego i czytelnego podsumowania bieżącego budżetu miesięcznego. Użytkownik może na nim szybko ocenić ogólny stan swoich finansów, w tym całkowite dochody, wydatki, dostępne środki oraz postęp w realizacji budżetu w poszczególnych kategoriach.

## 2. Routing widoku

Widok będzie dostępny pod główną ścieżką (root) aplikacji:

- **Ścieżka:** `/`

## 3. Struktura komponentów

Komponenty zostaną zaimplementowane jako dynamiczne komponenty React (`client:load`) wewnątrz strony Astro. Hierarchia komponentów będzie następująca:

```
- src/pages/index.astro
  - <Layout>
    - <DashboardView client:load>
      - (Logika warunkowa)
      - Stan ładowania: <UISkeletonLoader />
      - Stan błędu (brak budżetu): <EmptyState />
      - Stan błędu (inny): <ErrorDisplay />
      - Stan sukcesu:
        - <HistoricalBudgetNavigator />
        - <OverallSummaryCard />
        - <CategoriesList>
          - <CategoryProgressCard /> (mapowany dla każdej kategorii)
```

## 4. Szczegóły komponentów

### `DashboardView` (Komponent kontenerowy)

- **Opis komponentu**: Główny komponent zarządzający stanem całego widoku. Odpowiedzialny za pobieranie danych, obsługę stanów ładowania, błędów oraz renderowanie odpowiednich komponentów podrzędnych.
- **Główne elementy**: Wykorzystuje niestandardowy hook `useDashboard` do zarządzania logiką. Renderuje warunkowo `UISkeletonLoader`, `EmptyState`, `ErrorDisplay` lub widok z danymi.
- **Obsługiwane interakcje**:
  - Kliknięcie przycisku "Stwórz budżet" w komponencie `EmptyState`, co powoduje nawigację do formularza tworzenia budżetu.
- **Obsługiwana walidacja**: Brak. Logika walidacyjna jest po stronie API.
- **Typy**: `DashboardSummaryDto`, `ApiErrorDto`.
- **Propsy**: Brak.

### `OverallSummaryCard`

- **Opis komponentu**: Wyświetla ogólne podsumowanie budżetu, w tym kwotę wolnych środków, tekst podsumowujący (np. "Wydano X zł z Y zł") oraz główny pasek postępu.
- **Główne elementy**: Komponent `Card` z Shadcn/ui, `Progress` z Shadcn/ui do wizualizacji ogólnego postępu budżetu.
- **Obsługiwane interakcje**: Brak.
- **Obsługiwana walidacja**: Brak.
- **Typy**: `OverallSummaryViewModel`.
- **Propsy**:
  - `data: OverallSummaryViewModel`

### `CategoryProgressCard`

- **Opis komponentu**: Karta dla pojedynczej kategorii wydatków. Wyświetla nazwę kategorii, informację tekstową "wydano X z Y zł" oraz indywidualny pasek postępu. Kolor paska postępu jest zależny od statusu kategorii.
- **Główne elementy**: Komponent `Card` z Shadcn/ui, `Progress` z Shadcn/ui, ikona ostrzegawcza w przypadku przekroczenia budżetu.
- **Obsługiwane interakcje**: Brak.
- **Obsługiwana walidacja**: Brak.
- **Typy**: `CategoryProgressViewModel`.
- **Propsy**:
  - `category: CategoryProgressViewModel`

### `EmptyState`

- **Opis komponentu**: Wyświetlany, gdy API zwróci błąd 404, informując, że dla danego okresu nie istnieje żaden budżet. Zachęca użytkownika do podjęcia pierwszej akcji.
- **Główne elementy**: Tekst informacyjny, przycisk `Button` z Shadcn/ui z wezwaniem do działania ("Stwórz budżet").
- **Obsługiwane interakcje**: `onClick` na przycisku.
- **Obsługiwana walidacja**: Brak.
- **Typy**: Brak.
- **Propsy**:
  - `onCreateBudget: () => void`

### `UISkeletonLoader`

- **Opis komponentu**: Komponent typu "skeleton", który naśladuje finalny układ interfejsu. Wyświetlany podczas ładowania danych z API, aby poprawić odczucia użytkownika (UX).
- **Główne elementy**: Zestaw komponentów `Skeleton` z Shadcn/ui ułożonych w strukturę przypominającą `OverallSummaryCard` i listę `CategoryProgressCard`.
- **Obsługiwane interakcje**: Brak.
- **Obsługiwana walidacja**: Brak.
- **Typy**: Brak.
- **Propsy**: Brak.

## 5. Typy

Do implementacji widoku wykorzystane zostaną istniejące typy DTO oraz zdefiniowane zostaną nowe typy ViewModel, aby zapewnić czystą architekturę i separację logiki.

- **`DashboardSummaryDto` (DTO z API)**: Zdefiniowany w `src/types.ts`. Reprezentuje pełny obiekt odpowiedzi z endpointu `/api/dashboard/current`.

- **`OverallSummaryViewModel` (ViewModel)**: Uproszczony model dla komponentu `OverallSummaryCard`.

  ```typescript
  interface OverallSummaryViewModel {
    readonly totalSpent: number;
    readonly totalIncome: number;
    readonly freeFunds: number;
    readonly progressPercentage: number; // postęp w procentach (0-100)
  }
  ```

- **`CategoryProgressViewModel` (ViewModel)**: Uproszczony model dla komponentu `CategoryProgressCard`.

  ```typescript
  interface CategoryProgressViewModel {
    readonly id: string;
    readonly name: string;
    readonly spent: number;
    readonly limit: number;
    readonly progressPercentage: number; // postęp w procentach (0-100)
    readonly status: "ok" | "warning" | "over";
  }
  ```

## 6. Zarządzanie stanem

Zarządzanie stanem będzie realizowane lokalnie w komponencie `DashboardView` przy użyciu wbudowanych hooków React. W celu hermetyzacji logiki pobierania danych i obsługi stanu zostanie stworzony niestandardowy hook `useDashboard`.

- **Hook `useDashboard`**:
  - **Cel**: Abstrakcja logiki komunikacji z API.
  - **Zarządzany stan**:
    - `data: DashboardSummaryDto | null`
    - `isLoading: boolean`
    - `error: { status: number; message: string } | null`
  - **Funkcjonalność**: Wywołuje żądanie do API przy montowaniu komponentu, aktualizuje stany `isLoading`, `data` i `error` w zależności od odpowiedzi serwera.
  - **Zwraca**: `{ data, isLoading, error }`

## 7. Integracja API

Integracja z backendem będzie polegała na komunikacji z jednym endpointem.

- **Endpoint**: `GET /api/dashboard/current`
- **Żądanie**:
  - Metoda: `GET`
  - Autoryzacja: Wymagane (sesja użytkownika)
  - Ciało: Brak
- **Odpowiedź (sukces - 200 OK)**:
  - Typ: `DashboardSummaryDto`
- **Odpowiedź (błąd - 404 Not Found)**:
  - Typ: `ApiErrorDto`
  - Znaczenie: Brak aktywnego budżetu. Frontend powinien zinterpretować ten stan jako `EmptyState`.
- **Odpowiedź (inne błędy - 401, 500)**:
  - Typ: `ApiErrorDto`
  - Znaczenie: Błędy autoryzacji lub serwera. Frontend powinien wyświetlić ogólny komunikat o błędzie.

## 8. Interakcje użytkownika

- **Wejście na stronę główną (`/`)**:
  - **Oczekiwany rezultat**: Użytkownik widzi `UISkeletonLoader` na czas ładowania danych. Po załadowaniu wyświetlany jest pulpit z danymi budżetowymi lub `EmptyState`, jeśli budżet nie istnieje.
- **Kliknięcie przycisku "Stwórz budżet"**:
  - **Oczekiwany rezultat**: Użytkownik zostaje przekierowany na stronę tworzenia nowego budżetu (np. `/budgets/new`).

## 9. Warunki i walidacja

Interfejs użytkownika będzie reagował na dane i statusy otrzymane z API.

- **Przekroczenie budżetu w kategorii**:
  - **Warunek**: `category.status === 'over'`
  - **Komponent**: `CategoryProgressCard`
  - **Efekt**: Pasek postępu zmieni kolor na czerwony (lub inny kolor ostrzegawczy) oraz obok nazwy kategorii pojawi się ikona ostrzeżenia, aby zapewnić dostępność.
- **Brak budżetu**:
  - **Warunek**: API zwraca status `404`.
  - **Komponent**: `DashboardView`
  - **Efekt**: Renderowany jest komponent `EmptyState`.

## 10. Obsługa błędów

- **Brak budżetu (404 Not Found)**: To oczekiwany scenariusz dla nowych użytkowników. Obsługiwany przez wyświetlenie komponentu `EmptyState`, który jasno komunikuje sytuację i prowadzi użytkownika do następnego kroku.
- **Błąd autoryzacji (401 Unauthorized)**: Hook `useDashboard` przechwyci ten błąd. Główny komponent powinien zainicjować przekierowanie na stronę logowania.
- **Błąd serwera (500 Internal Server Error) lub błąd sieci**: Hook `useDashboard` przechwyci błąd. Zostanie wyświetlony generyczny komponent `ErrorDisplay`, informujący o problemie technicznym i sugerujący próbę odświeżenia strony. Szczegółowe informacje o błędzie zostaną zalogowane w konsoli deweloperskiej.

## 11. Kroki implementacji

1. **Stworzenie struktury plików**: Utworzenie plików dla nowych komponentów React w katalogu `src/components/dashboard/`: `DashboardView.tsx`, `OverallSummaryCard.tsx`, `CategoryProgressCard.tsx`, `EmptyState.tsx`, `UISkeletonLoader.tsx`.
2. **Implementacja hooka `useDashboard`**: Stworzenie pliku `src/lib/hooks/useDashboard.ts` i zaimplementowanie w nim logiki pobierania danych, zarządzania stanem ładowania i błędów.
3. **Implementacja komponentu `UISkeletonLoader`**: Zbudowanie komponentu z użyciem `Skeleton` z biblioteki Shadcn/ui, aby wizualnie odpowiadał układowi pulpitu.
4. **Implementacja komponentu `EmptyState`**: Stworzenie widoku dla braku budżetu z odpowiednim komunikatem i przyciskiem CTA.
5. **Implementacja komponentów `OverallSummaryCard` i `CategoryProgressCard`**: Stworzenie komponentów prezentacyjnych, które przyjmują dane przez propsy i renderują je. Wykorzystanie komponentów `Card` i `Progress` z Shadcn/ui. Dodanie logiki warunkowej zmiany stylu dla statusu `over`.
6. **Implementacja głównego komponentu `DashboardView`**: Połączenie wszystkich elementów. Wykorzystanie hooka `useDashboard` do pobrania danych i warunkowe renderowanie `UISkeletonLoader`, `EmptyState` lub widoku z danymi na podstawie stanu.
7. **Integracja z Astro**: Umieszczenie komponentu `<DashboardView client:load />` na stronie `src/pages/index.astro`.
8. **Stylowanie i RWD**: Zapewnienie, że widok jest w pełni responsywny i zgodny z podejściem "mobile-first" przy użyciu Tailwind CSS.
9. **Testowanie i poprawki**: Ręczne przetestowanie wszystkich scenariuszy: stanu ładowania, sukcesu, braku budżetu oraz błędów serwera. Weryfikacja dostępności (ARIA).
