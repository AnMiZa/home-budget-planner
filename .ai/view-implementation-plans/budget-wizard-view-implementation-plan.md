# Plan implementacji widoku BudgetWizardView

## 1. Przegląd

`BudgetWizardView` to wieloetapowy kreator, który umożliwia użytkownikom tworzenie nowego budżetu miesięcznego lub edycję istniejącego. Proces składa się z dwóch głównych kroków: wprowadzania przychodów dla członków gospodarstwa domowego oraz planowania wydatków poprzez alokację limitów do poszczególnych kategorii. Widok dynamicznie oblicza i wyświetla kluczowe wskaźniki, takie jak suma przychodów, suma zaplanowanych wydatków i kwota "środków wolnych".

## 2. Routing widoku

- **Tworzenie nowego budżetu:** `/new-budget`
- **Edycja istniejącego budżetu:** `/budget/{budgetId}/edit`

Strony te zostaną utworzone w technologii Astro (`.astro`), a wewnątrz nich będzie renderowany komponent React `BudgetWizardView`.

## 3. Struktura komponentów

Hierarchia komponentów będzie wyglądać następująco, renderowana wewnątrz `BudgetWizardView`:

```
BudgetWizardView
├── WizardStepper
├── IncomesForm (wyświetlany w kroku 1)
├── PlannedExpensesForm (wyświetlany w kroku 2)
├── ReadOnlyBudgetView (wyświetlany po zapisaniu lub w trybie tylko do odczytu)
└── Przyciski nawigacyjne (Wstecz, Dalej, Zapisz, Anuluj, Edytuj)
```

## 4. Szczegóły komponentów

### `BudgetWizardView.tsx` (Komponent kontenerowy)

- **Opis komponentu:** Główny komponent zarządzający logiką i stanem całego kreatora. Odpowiada za pobieranie danych początkowych (członkowie, kategorie, dane budżetu do edycji), przełączanie między krokami, obsługę formularzy oraz komunikację z API.
- **Główne elementy:** `div` jako kontener, warunkowe renderowanie `IncomesForm`, `PlannedExpensesForm` lub `ReadOnlyBudgetView` w zależności od stanu. Zawiera także komponent `WizardStepper` i przyciski nawigacyjne.
- **Obsługiwane interakcje:** Nawigacja między krokami, zapisywanie budżetu (tworzenie/edycja), przełączanie w tryb edycji, anulowanie edycji.
- **Obsługiwana walidacja:** Brak bezpośredniej walidacji, deleguje ją do komponentów podrzędnych. Blokuje możliwość przejścia do następnego kroku lub zapisu, jeśli formularze podrzędne są niepoprawne.
- **Typy:** `BudgetWizardViewModel`, `HouseholdMemberDto`, `CategoryDto`, `BudgetDetailDto`.
- **Propsy:** `budgetId?: string` (opcjonalny; jego obecność determinuje tryb 'edycja').

### `WizardStepper.tsx`

- **Opis komponentu:** Komponent wizualny, który wyświetla kroki kreatora i zaznacza, który z nich jest aktualnie aktywny.
- **Główne elementy:** Lista (`ol` lub `ul`) z elementami (`li`) reprezentującymi poszczególne kroki.
- **Obsługiwane interakcje:** Brak (lub opcjonalnie nawigacja po kliknięciu).
- **Obsługiwana walidacja:** Brak.
- **Typy:** `steps: { title: string }[]`, `currentStep: number`.
- **Propsy:** `steps`, `currentStep`.

### `IncomesForm.tsx`

- **Opis komponentu:** Formularz dla pierwszego kroku kreatora. Wyświetla listę członków gospodarstwa domowego i pola do wprowadzenia ich miesięcznych przychodów. Podsumowuje i wyświetla całkowity przychód.
- **Główne elementy:** Formularz (`form`) zawierający listę pól `Input` z `Label` (z biblioteki `shadcn/ui`) dla każdego członka. Wyświetla również podsumowanie.
- **Obsługiwane interakcje:** Wprowadzanie kwot w polach `Input`.
- **Obsługiwana walidacja:**
  - Kwota musi być wartością dodatnią.
  - Kwota może mieć maksymalnie 2 miejsca po przecinku.
  - Kwota nie może przekraczać `9,999,999.99`.
- **Typy:** `IncomeFormViewModel`, `HouseholdMemberDto`.
- **Propsy:** `incomes: IncomeFormViewModel[]`, `onIncomesChange: (incomes: IncomeFormViewModel[]) => void`, `totalIncome: number`.

### `PlannedExpensesForm.tsx`

- **Opis komponentu:** Formularz dla drugiego kroku kreatora. Wyświetla listę kategorii wydatków i pola do wprowadzenia planowanych limitów. Dynamicznie pokazuje sumę planowanych wydatków i kwotę "środków wolnych".
- **Główne elementy:** Formularz (`form`) z listą pól `Input` z `Label` dla każdej kategorii. Wyświetla podsumowania finansowe.
- **Obsługiwane interakcje:** Wprowadzanie kwot w polach `Input`.
- **Obsługiwana walidacja:**
  - Kwota limitu musi być wartością dodatnią.
  - Kwota limitu może mieć maksymalnie 2 miejsca po przecinku.
  - Kwota limitu nie może przekraczać `9,999,999.99`.
- **Typy:** `PlannedExpenseFormViewModel`, `CategoryDto`.
- **Propsy:** `plannedExpenses: PlannedExpenseFormViewModel[]`, `onPlannedExpensesChange: (expenses: PlannedExpenseFormViewModel[]) => void`, `totalIncome: number`, `totalPlanned: number`, `freeFunds: number`.

### `ReadOnlyBudgetView.tsx`

- **Opis komponentu:** Wyświetla podsumowanie zapisanego budżetu w trybie tylko do odczytu. Zawiera przycisk "Edytuj plan", który przełącza kreator w tryb edycji.
- **Główne elementy:** Komponenty `Card` z `CardHeader`, `CardContent` (z `shadcn/ui`) do prezentacji danych. Listy przychodów i planowanych wydatków. Przycisk `Button`.
- **Obsługiwane interakcje:** Kliknięcie przycisku "Edytuj plan".
- **Obsługiwana walidacja:** Brak.
- **Typy:** `BudgetDetailDto`.
- **Propsy:** `budget: BudgetDetailDto`, `onEditClick: () => void`.

## 5. Typy

Do implementacji widoku potrzebne będą następujące nowe typy ViewModel, które będą zarządzać stanem formularzy. Będą one istnieć obok typów DTO (`HouseholdMemberDto`, `CategoryDto`, `CreateBudgetCommand` etc.) używanych do komunikacji z API.

```typescript
/**
 * Reprezentuje pojedynczy wiersz w formularzu przychodów.
 */
interface IncomeFormViewModel {
  // Dane członka gospodarstwa domowego
  readonly householdMemberId: string;
  readonly fullName: string;

  // ID oryginalnego rekordu przychodu (istotne przy edycji)
  readonly originalIncomeId?: string;

  // Wartość pola formularza (string dla łatwiejszej obsługi)
  amount: string;
}

/**
 * Reprezentuje pojedynczy wiersz w formularzu planowanych wydatków.
 */
interface PlannedExpenseFormViewModel {
  // Dane kategorii
  readonly categoryId: string;
  readonly name: string;

  // ID oryginalnego rekordu planowanego wydatku (istotne przy edycji)
  readonly originalPlannedExpenseId?: string;

  // Wartość pola formularza
  limitAmount: string;
}

/**
 * Główny obiekt stanu dla kreatora budżetu.
 */
interface BudgetWizardViewModel {
  // ID budżetu (w trybie edycji)
  readonly budgetId?: string;
  // Miesiąc budżetu (np. "2025-11")
  month: string;
  note?: string;

  // Dane z formularzy dla obu kroków
  incomes: IncomeFormViewModel[];
  plannedExpenses: PlannedExpenseFormViewModel[];

  // Wartości obliczone, wyświetlane w UI
  readonly totalIncome: number;
  readonly totalPlanned: number;
  readonly freeFunds: number;
}
```

## 6. Zarządzanie stanem

Logika i stan kreatora zostaną zamknięte w niestandardowym hooku `useBudgetWizard`, który będzie używany przez komponent `BudgetWizardView`. Takie podejście pozwoli na oddzielenie logiki od prezentacji.

**Hook `useBudgetWizard` będzie zarządzał:**

- **Stanem:**
  - `wizardState: BudgetWizardViewModel`: Główny obiekt przechowujący dane formularzy i podsumowania.
  - `currentStep: number`: Aktualny krok kreatora.
  - `isEditMode: boolean`: Flaga określająca, czy widok jest w trybie edycji.
  - `isLoading: boolean`: Status ładowania podczas operacji API.
  - `error: string | null`: Komunikaty o błędach z API.
  - `householdMembers: HouseholdMemberDto[]`: Lista członków gospodarstwa domowego.
  - `categories: CategoryDto[]`: Lista kategorii wydatków.
- **Funkcjami:**
  - `initialize()`: Inicjalizuje stan, pobierając potrzebne dane (w tym dane budżetu w trybie edycji).
  - `updateIncome()`: Aktualizuje pojedynczy przychód w stanie i przelicza sumy.
  - `updatePlannedExpense()`: Aktualizuje pojedynczy planowany wydatek i przelicza sumy.
  - `goToNextStep()` / `goToPreviousStep()`: Zmieniają `currentStep`.
  - `setEditMode()`: Przełącza tryb edycji.
  - `saveBudget()`: Transformuje stan ViewModel na komendy API i wysyła żądania.

## 7. Integracja API

Komunikacja z API będzie odbywać się z poziomu hooka `useBudgetWizard`.

- **Pobieranie danych początkowych:**
  - Przy inicjalizacji komponentu wywoływane będą:
    - `GET /api/household-members`
    - `GET /api/categories`
  - W trybie edycji dodatkowo:
    - `GET /api/budgets/{budgetId}`

- **Tworzenie nowego budżetu:**
  - **Akcja:** Kliknięcie "Zapisz" w ostatnim kroku kreatora.
  - **Endpoint:** `POST /api/budgets`
  - **Typ żądania:** `CreateBudgetCommand`
  - **Typ odpowiedzi:** `BudgetCreatedDto`

- **Aktualizacja istniejącego budżetu:**
  - **Akcja:** Kliknięcie "Zapisz" w trybie edycji.
  - **Endpointy:**
    - `PUT /api/budgets/{budgetId}/incomes` (zakładamy istnienie tego endpointu do hurtowej aktualizacji)
    - `PUT /api/budgets/{budgetId}/planned-expenses`
  - **Typy żądań:** `UpsertBudgetIncomesCommand`, `UpsertPlannedExpensesCommand`.
  - **Typy odpowiedzi:** `BudgetIncomeDto[]`, `PlannedExpensesListResponseDto`.

## 8. Interakcje użytkownika

- **Wprowadzanie kwot:** Zmiana wartości w polach `Input` powoduje aktualizację stanu w `useBudgetWizard` i natychmiastowe przeliczenie sum `totalIncome`, `totalPlanned` i `freeFunds`, które są odzwierciedlane w UI.
- **Nawigacja "Dalej" / "Wstecz":** Zmienia `currentStep` w stanie, co powoduje renderowanie odpowiedniego komponentu formularza (`IncomesForm` lub `PlannedExpensesForm`). Stan wprowadzonych danych jest zachowywany.
- **Zapis (nowy budżet):** Po pomyślnym utworzeniu budżetu użytkownik jest przekierowywany do widoku nowo utworzonego budżetu (np. `/budget/{newBudgetId}`).
- **Kliknięcie "Edytuj plan":** Przełącza widok z `ReadOnlyBudgetView` na interaktywne formularze kreatora, wypełnione istniejącymi danymi.
- **Zapis (edycja):** Po pomyślnej aktualizacji, formularze są ukrywane, a `ReadOnlyBudgetView` jest ponownie wyświetlany z zaktualizowanymi danymi.
- **Anulowanie edycji:** Widok wraca do trybu tylko do odczytu bez zapisywania zmian.

## 9. Warunki i walidacja

- Walidacja po stronie klienta będzie realizowana przy użyciu biblioteki `zod` w połączeniu z `react-hook-form`.
- Schematy walidacji dla formularzy będą odzwierciedlać reguły zaimplementowane w API (wartości dodatnie, max 2 miejsca po przecinku, limity wartości).
- Przyciski "Dalej" i "Zapisz" będą nieaktywne (`disabled`), dopóki wszystkie wymagane i widoczne pola w formularzu nie zostaną poprawnie wypełnione.
- Komunikaty o błędach walidacji będą wyświetlane bezpośrednio pod odpowiednimi polami formularza.

## 10. Obsługa błędów

- **Błędy sieciowe / serwera (5xx):** Globalny, generyczny komunikat o błędzie (np. w formie komponentu Toast) informujący użytkownika, że operacja się nie powiodła.
- **Błędy walidacji API (400):**
  - `BUDGET_ALREADY_EXISTS`: Wyświetlenie dedykowanego komunikatu "Budżet dla wybranego miesiąca już istnieje."
  - Inne błędy walidacji: Wyświetlenie komunikatu o niepoprawnych danych.
- **Błąd autoryzacji (401):** Użytkownik zostanie automatycznie przekierowany na stronę logowania.
- **Brak zasobu (404):** W trybie edycji, jeśli budżet o danym ID nie zostanie znaleziony, użytkownik zobaczy komunikat "Nie znaleziono budżetu" i zostanie przekierowany na stronę główną.

## 11. Kroki implementacji

1. Utworzenie plików dla nowych komponentów: `BudgetWizardView.tsx`, `WizardStepper.tsx`, `IncomesForm.tsx`, `PlannedExpensesForm.tsx`, `ReadOnlyBudgetView.tsx`.
2. Implementacja niestandardowego hooka `useBudgetWizard.ts` z podstawową logiką stanu (bez API).
3. Implementacja komponentu `BudgetWizardView` wykorzystującego hook `useBudgetWizard` do renderowania struktury, steppera i nawigacji.
4. Implementacja formularza `IncomesForm` wraz z walidacją po stronie klienta.
5. Implementacja formularza `PlannedExpensesForm` wraz z walidacją po stronie klienta.
6. Zintegrowanie logiki pobierania danych początkowych (członkowie, kategorie) w hooku `useBudgetWizard`.
7. Implementacja logiki tworzenia nowego budżetu (`POST /api/budgets`) w hooku i podłączenie jej do przycisku "Zapisz".
8. Implementacja widoku `ReadOnlyBudgetView`.
9. Implementacja logiki trybu edycji: pobieranie danych istniejącego budżetu, wypełnianie formularzy i przełączanie stanu `isEditMode`.
10. Implementacja logiki aktualizacji budżetu (`PUT` do API) w hooku.
11. Finalne stylowanie wszystkich komponentów przy użyciu Tailwind CSS i `shadcn/ui` oraz obsługa stanów ładowania i błędów.
12. Utworzenie stron Astro (`new-budget.astro`, `edit.astro`) i umieszczenie w nich komponentu `BudgetWizardView` z dyrektywą `client:load`.
