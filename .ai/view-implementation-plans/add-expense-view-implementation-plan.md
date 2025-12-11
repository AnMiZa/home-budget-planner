# Plan implementacji widoku AddExpenseSheet

## 1. Przegląd

Widok `AddExpenseSheet` to modalny panel (bottom sheet na mobile, dialog na desktop), który umożliwia użytkownikowi szybkie dodanie nowego wydatku do aktualnego budżetu. Panel jest dostępny z głównej nawigacji poprzez centralny przycisk "Dodaj Wydatek". Widok realizuje historyjkę użytkownika US-010 i jest kluczowym elementem codziennego użytkowania aplikacji, zapewniając prosty i intuicyjny sposób rejestrowania wydatków.

## 2. Routing widoku

Widok `AddExpenseSheet` nie posiada dedykowanej ścieżki URL. Jest to komponent modalny (overlay), który jest wywoływany z dowolnego miejsca w aplikacji poprzez:

- **Przycisk w TabBar (mobile)**: Centralny okrągły przycisk z ikoną "+"
- **Przycisk w Sidebar (desktop)**: Przycisk "Dodaj wydatek" w bocznym panelu nawigacji

Stan otwarcia/zamknięcia jest zarządzany przez `UIContext` na poziomie głównego layoutu aplikacji.

**Lokalizacja komponentu:** `src/components/navigation/overlays/AddExpenseSheet.tsx`

## 3. Struktura komponentów

```
src/components/layout/MainLayout.tsx
└── src/components/navigation/overlays/AddExpenseSheet.tsx (Overlay Component)
    ├── src/components/ui/dialog.tsx (Dialog, DialogContent, DialogHeader, DialogTitle)
    └── src/components/expenses/AddExpenseForm.tsx (Form Component)
        ├── src/components/ui/form.tsx (Form, FormField, FormItem, FormLabel, FormControl, FormMessage)
        ├── src/components/ui/input.tsx (Input)
        ├── src/components/ui/select.tsx (Select, SelectTrigger, SelectValue, SelectContent, SelectItem)
        ├── src/components/ui/popover.tsx (Popover, PopoverTrigger, PopoverContent)
        ├── src/components/ui/calendar.tsx (Calendar)
        ├── src/components/ui/textarea.tsx (Textarea)
        └── src/components/ui/button.tsx (Button)
```

## 4. Szczegóły komponentów

### `AddExpenseSheet.tsx`

- **Opis komponentu**: Główny komponent overlay, który renderuje modalny panel z formularzem dodawania wydatku. Wykorzystuje komponent `Dialog` z Radix UI dla dostępności i animacji. Na urządzeniach mobilnych może być stylizowany jako bottom sheet (wysuwany od dołu ekranu).

- **Główne elementy**:
  - `Dialog` z `@radix-ui/react-dialog` (poprzez `src/components/ui/dialog.tsx`)
  - `DialogContent` z zawartością panelu
  - `DialogHeader` z tytułem "Dodaj wydatek"
  - `DialogTitle` dla nagłówka
  - `AddExpenseForm` jako główna zawartość

- **Obsługiwane interakcje**:
  - Otwarcie panelu przez zewnętrzny trigger (przycisk w nawigacji)
  - Zamknięcie panelu przez przycisk X, kliknięcie overlay lub naciśnięcie Escape
  - Zamknięcie panelu po pomyślnym zapisie wydatku

- **Obsługiwana walidacja**: Brak (walidacja w formularzu)

- **Typy**: `UIContextValue` (z `UIContext`)

- **Propsy**: Brak (komponent pobiera stan z kontekstu)

### `AddExpenseForm.tsx`

- **Opis komponentu**: Formularz do wprowadzania nowego wydatku. Zawiera wszystkie wymagane pola zgodnie z PRD i US-010: kwotę, kategorię, datę transakcji oraz opcjonalne notatki. Wykorzystuje `react-hook-form` z walidacją Zod.

- **Główne elementy**:
  - `Form` wrapper z `react-hook-form`
  - `FormField` dla kwoty z `Input` typu number
  - `FormField` dla kategorii z `Select` (lista rozwijana)
  - `FormField` dla daty z `Popover` + `Calendar` (date picker)
  - `FormField` dla notatki z `Textarea`
  - `Button` typu submit "Zapisz wydatek"
  - `Button` typu button "Anuluj"
  - Obszar na komunikaty błędów API

- **Obsługiwane interakcje**:
  - `onChange` na wszystkich polach formularza
  - `onSubmit` formularza wywołujący API
  - `onClick` na przycisku "Anuluj" zamykający panel
  - Wybór daty z kalendarza

- **Obsługiwana walidacja**:
  - **Kwota (amount)**:
    - Pole wymagane
    - Musi być liczbą dodatnią (> 0)
    - Maksymalnie 2 miejsca po przecinku
    - Komunikat: "Kwota jest wymagana" / "Kwota musi być większa od zera" / "Kwota może mieć maksymalnie dwa miejsca po przecinku"
  - **Kategoria (categoryId)**:
    - Pole wymagane
    - Musi być prawidłowym UUID
    - Komunikat: "Wybierz kategorię"
  - **Data transakcji (transactionDate)**:
    - Pole wymagane
    - Format YYYY-MM-DD
    - Musi być prawidłową datą
    - Domyślna wartość: dzisiejsza data
    - Komunikat: "Podaj poprawną datę"
  - **Notatka (note)**:
    - Pole opcjonalne
    - Maksymalnie 500 znaków
    - Komunikat: "Notatka nie może przekraczać 500 znaków"

- **Typy**:
  - `AddExpenseFormValues` (wartości formularza)
  - `CreateTransactionCommand` (payload API)
  - `CategoryDto` (lista kategorii)

- **Propsy**:
  ```typescript
  interface AddExpenseFormProps {
    readonly categories: readonly CategoryDto[];
    readonly isLoadingCategories: boolean;
    readonly onSubmit: (data: CreateTransactionCommand) => Promise<void>;
    readonly onCancel: () => void;
    readonly isSubmitting: boolean;
    readonly submitError: string | null;
    readonly onClearError: () => void;
  }
  ```

## 5. Typy

### Nowe typy do utworzenia

```typescript
// src/components/expenses/types.ts

import type { CategoryDto, CreateTransactionCommand, TransactionDto } from "@/types";

/**
 * Wartości formularza dodawania wydatku.
 * Wszystkie pola są stringami dla kompatybilności z react-hook-form.
 */
export interface AddExpenseFormValues {
  readonly amount: string;
  readonly categoryId: string;
  readonly transactionDate: string;
  readonly note: string;
}

/**
 * Stan hooka useAddExpense.
 */
export interface AddExpenseState {
  readonly categories: readonly CategoryDto[];
  readonly isLoadingCategories: boolean;
  readonly categoriesError: AddExpenseError | null;
  readonly isSubmitting: boolean;
  readonly submitError: string | null;
  readonly budgetId: string | null;
  readonly isLoadingBudget: boolean;
}

/**
 * Błąd operacji w hooku useAddExpense.
 */
export interface AddExpenseError {
  readonly status: number;
  readonly message: string;
  readonly code?: string;
}

/**
 * Rezultat operacji dodania wydatku.
 */
export interface AddExpenseResult {
  readonly success: boolean;
  readonly transaction?: TransactionDto;
  readonly error?: AddExpenseError;
}
```

### Istniejące typy wykorzystywane

```typescript
// Z src/types.ts
interface CreateTransactionCommand {
  readonly categoryId: string;
  readonly amount: number;
  readonly transactionDate: string;
  readonly note?: string | undefined;
}

interface TransactionDto {
  readonly id: string;
  readonly householdId: string;
  readonly budgetId: string;
  readonly categoryId: string;
  readonly amount: number;
  readonly transactionDate: string;
  readonly note: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface CategoryDto {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface DashboardSummaryDto {
  readonly currentBudgetId: string;
  readonly month: string;
  // ... pozostałe pola
}
```

## 6. Zarządzanie stanem

### Custom hook: `useAddExpense`

**Lokalizacja:** `src/lib/hooks/useAddExpense.ts`

**Przeznaczenie:** Zarządzanie całą logiką biznesową formularza dodawania wydatku, w tym pobieraniem kategorii, identyfikacją aktualnego budżetu oraz wysyłaniem transakcji do API.

**Zarządzany stan:**

- `categories: readonly CategoryDto[]` - lista kategorii z API
- `isLoadingCategories: boolean` - stan ładowania kategorii
- `categoriesError: AddExpenseError | null` - błąd pobierania kategorii
- `budgetId: string | null` - ID aktualnego budżetu
- `isLoadingBudget: boolean` - stan ładowania ID budżetu
- `isSubmitting: boolean` - stan wysyłania formularza
- `submitError: string | null` - komunikat błędu z API

**Udostępniane funkcje:**

- `submitExpense(data: CreateTransactionCommand): Promise<AddExpenseResult>` - wysyła nowy wydatek do API
- `clearSubmitError(): void` - czyści komunikat błędu
- `refetchCategories(): Promise<void>` - ponownie pobiera kategorie

**Logika inicjalizacji:**

1. Przy montowaniu hooka pobierz kategorie z `GET /api/categories`
2. Pobierz `currentBudgetId` z `GET /api/dashboard/current`
3. Zapisz dane w stanie

**Integracja z UIContext:**
Komponent `AddExpenseSheet` używa `useUIContext()` do:

- Odczytu stanu `isAddExpenseSheetOpen`
- Wywołania `closeAddExpenseSheet()` po sukcesie

**Integracja z useDashboard:**
Po pomyślnym dodaniu wydatku należy odświeżyć dane dashboardu. Można to osiągnąć przez:

- Wywołanie `refetch()` z hooka `useDashboard` (jeśli dostępny w kontekście)
- Emitowanie custom eventu, który dashboard nasłuchuje
- Wymuszenie przeładowania strony (mniej eleganckie)

Rekomendowane rozwiązanie: rozszerzenie `UIContext` o callback `onExpenseAdded` lub wykorzystanie custom eventu.

## 7. Integracja API

### Endpointy wykorzystywane przez widok

#### 1. Pobieranie kategorii

- **Endpoint:** `GET /api/categories`
- **Parametry:** `page=1`, `pageSize=100`
- **Typ odpowiedzi:** `CategoriesListResponseDto`
- **Użycie:** Wypełnienie listy rozwijanej kategorii w formularzu
- **Obsługa błędów:**
  - 401 → przekierowanie do `/login`
  - 404 → pusta lista kategorii
  - 500 → komunikat o błędzie

#### 2. Pobieranie aktualnego budżetu

- **Endpoint:** `GET /api/dashboard/current`
- **Typ odpowiedzi:** `DashboardSummaryDto`
- **Użycie:** Pozyskanie `currentBudgetId` wymaganego do utworzenia transakcji
- **Obsługa błędów:**
  - 401 → przekierowanie do `/login`
  - 404 → brak aktywnego budżetu, wyświetl komunikat z linkiem do utworzenia budżetu

#### 3. Tworzenie transakcji (wydatku)

- **Endpoint:** `POST /api/budgets/{budgetId}/transactions`
- **Typ body zapytania:** `CreateTransactionCommand`
  ```typescript
  {
    categoryId: string;    // UUID kategorii
    amount: number;        // kwota > 0, max 2 miejsca po przecinku
    transactionDate: string; // format YYYY-MM-DD
    note?: string;         // opcjonalne, max 500 znaków
  }
  ```
- **Typ odpowiedzi sukcesu:** `TransactionDto` (status 201)
- **Nagłówek sukcesu:** `X-Result-Code: TRANSACTION_CREATED`
- **Kody błędów:**
  - 400 `INVALID_AMOUNT` - nieprawidłowa kwota
  - 400 `INVALID_DATE` - nieprawidłowa data
  - 400 `INVALID_CATEGORY_ID` - nieprawidłowy format UUID kategorii
  - 400 `INVALID_BODY` - nieprawidłowe ciało żądania
  - 401 `UNAUTHENTICATED` - brak autoryzacji
  - 404 `BUDGET_NOT_FOUND` - budżet nie istnieje
  - 404 `HOUSEHOLD_NOT_FOUND` - gospodarstwo nie istnieje
  - 409 `CATEGORY_MISMATCH` - kategoria nie należy do gospodarstwa użytkownika
  - 500 `TRANSACTION_CREATE_FAILED` - błąd serwera

## 8. Interakcje użytkownika

### Scenariusz główny (happy path)

1. **Otwarcie panelu**: Użytkownik klika przycisk "Dodaj Wydatek" w nawigacji
   - Panel się otwiera z animacją
   - Formularz jest zainicjalizowany z dzisiejszą datą
   - Kategorie są załadowane

2. **Wypełnienie formularza**:
   - Użytkownik wpisuje kwotę w polu liczbowym
   - Użytkownik wybiera kategorię z listy rozwijanej
   - Data jest domyślnie ustawiona na dziś (można zmienić)
   - Użytkownik opcjonalnie dodaje notatkę

3. **Zapisanie wydatku**: Użytkownik klika "Zapisz wydatek"
   - Przycisk pokazuje stan ładowania (spinner)
   - Formularz jest zablokowany
   - Żądanie POST jest wysyłane do API

4. **Sukces**:
   - Panel się zamyka
   - Wyświetla się toast "Wydatek dodany"
   - Dashboard jest odświeżany (aktualizacja podsumowania i kategorii)

### Scenariusze alternatywne

**Anulowanie:**

- Użytkownik klika "Anuluj" lub X → panel się zamyka bez zapisu
- Użytkownik klika overlay → panel się zamyka bez zapisu
- Użytkownik naciska Escape → panel się zamyka bez zapisu

**Błąd walidacji frontendu:**

- Pod nieprawidłowym polem pojawia się komunikat błędu
- Przycisk "Zapisz" może być nieaktywny (disabled)
- Fokus przenosi się na pierwsze pole z błędem

**Błąd API:**

- Panel pozostaje otwarty
- Komunikat błędu wyświetla się nad przyciskami
- Użytkownik może poprawić dane i ponowić próbę

**Brak aktywnego budżetu:**

- Zamiast formularza wyświetla się komunikat informacyjny
- Przycisk prowadzący do utworzenia nowego budżetu

## 9. Warunki i walidacja

### Walidacja frontendu (Zod schema)

```typescript
import { z } from "zod";

const AMOUNT_REGEX = /^\d+(?:\.\d{1,2})?$/;

export const addExpenseFormSchema = z.object({
  amount: z
    .string()
    .min(1, "Kwota jest wymagana")
    .refine((value) => AMOUNT_REGEX.test(value), "Kwota może mieć maksymalnie dwa miejsca po przecinku")
    .refine((value) => Number(value) > 0, "Kwota musi być większa od zera"),

  categoryId: z.string().min(1, "Wybierz kategorię").uuid("Wybierz poprawną kategorię"),

  transactionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Podaj datę w formacie RRRR-MM-DD")
    .refine((value) => !Number.isNaN(new Date(value).getTime()), "Podaj poprawną datę"),

  note: z.string().max(500, "Notatka nie może przekraczać 500 znaków").optional().default(""),
});
```

### Mapowanie błędów API na komunikaty użytkownika

| Kod błędu API         | Komunikat dla użytkownika              |
| --------------------- | -------------------------------------- |
| `INVALID_AMOUNT`      | "Wprowadź prawidłową kwotę"            |
| `INVALID_DATE`        | "Wprowadź prawidłową datę"             |
| `INVALID_CATEGORY_ID` | "Wybierz prawidłową kategorię"         |
| `CATEGORY_MISMATCH`   | "Wybrana kategoria nie jest dostępna"  |
| `BUDGET_NOT_FOUND`    | "Nie znaleziono aktywnego budżetu"     |
| `UNAUTHENTICATED`     | "Sesja wygasła. Zaloguj się ponownie." |
| Inne                  | "Wystąpił błąd. Spróbuj ponownie."     |

### Stan przycisków

**Przycisk "Zapisz wydatek":**

- `disabled` gdy: `isSubmitting === true` lub formularz jest nieprawidłowy
- Wyświetla spinner gdy: `isSubmitting === true`

**Przycisk "Anuluj":**

- `disabled` gdy: `isSubmitting === true`

## 10. Obsługa błędów

### Poziomy obsługi błędów

#### 1. Błędy ładowania kategorii

- **Przyczyna:** Brak połączenia, błąd serwera
- **Obsługa:** Wyświetl komunikat w miejscu selecta z przyciskiem "Spróbuj ponownie"
- **UX:** Użytkownik może ponowić ładowanie kategorii bez zamykania panelu

#### 2. Błąd braku aktywnego budżetu

- **Przyczyna:** Użytkownik nie utworzył budżetu na bieżący miesiąc
- **Obsługa:** Wyświetl komunikat "Nie masz jeszcze budżetu na ten miesiąc" z przyciskiem "Utwórz budżet"
- **UX:** Przycisk przekierowuje do `/new-budget`

#### 3. Błędy walidacji (frontend)

- **Przyczyna:** Nieprawidłowe dane wprowadzone przez użytkownika
- **Obsługa:** Komunikaty walidacyjne pod polami formularza
- **UX:** Natychmiastowa informacja zwrotna przy blur lub submit

#### 4. Błędy walidacji (backend - 400)

- **Przyczyna:** Dane przeszły walidację frontendu, ale zostały odrzucone przez backend
- **Obsługa:** Wyświetl komunikat błędu nad przyciskami formularza
- **UX:** Użytkownik może poprawić dane i ponowić próbę

#### 5. Błąd kategorii (409 CATEGORY_MISMATCH)

- **Przyczyna:** Kategoria została usunięta lub nie należy do gospodarstwa
- **Obsługa:** Wyświetl komunikat i odśwież listę kategorii
- **UX:** Użytkownik wybiera inną kategorię

#### 6. Błąd autoryzacji (401)

- **Przyczyna:** Sesja wygasła
- **Obsługa:** Przekierowanie do `/login`
- **UX:** Użytkownik musi się ponownie zalogować

#### 7. Błąd serwera (500)

- **Przyczyna:** Błąd po stronie serwera
- **Obsługa:** Wyświetl generyczny komunikat błędu
- **UX:** Użytkownik może zamknąć panel i spróbować później

### Toast notifications

```typescript
// Sukces
showToast({
  title: "Wydatek dodany",
  description: "Transakcja została zapisana pomyślnie.",
  variant: "default",
});

// Błąd
showToast({
  title: "Błąd",
  description: "Nie udało się dodać wydatku. Spróbuj ponownie.",
  variant: "destructive",
});
```

## 11. Kroki implementacji

### Faza 1: Przygotowanie typów i struktury

1. **Utworzenie pliku typów**
   - Ścieżka: `src/components/expenses/types.ts`
   - Zawartość: `AddExpenseFormValues`, `AddExpenseState`, `AddExpenseError`, `AddExpenseResult`

2. **Utworzenie struktury katalogów**
   - Utworzenie katalogu `src/components/expenses/`
   - Przeniesienie lub utworzenie plików komponentów

### Faza 2: Implementacja hooka useAddExpense

3. **Utworzenie hooka**
   - Ścieżka: `src/lib/hooks/useAddExpense.ts`
   - Implementacja pobierania kategorii z API
   - Implementacja pobierania `currentBudgetId` z dashboard
   - Implementacja funkcji `submitExpense`
   - Obsługa stanów ładowania i błędów

4. **Testy jednostkowe hooka**
   - Mockowanie fetch dla różnych scenariuszy
   - Testowanie stanów ładowania, sukcesu i błędów

### Faza 3: Implementacja komponentu AddExpenseForm

5. **Utworzenie komponentu formularza**
   - Ścieżka: `src/components/expenses/AddExpenseForm.tsx`
   - Integracja z `react-hook-form` i `zod`
   - Implementacja wszystkich pól formularza
   - Stylowanie z Tailwind CSS i shadcn/ui

6. **Implementacja walidacji**
   - Schema Zod dla wszystkich pól
   - Komunikaty błędów w języku polskim
   - Real-time validation on blur

7. **Implementacja date pickera**
   - Użycie `Popover` + `Calendar` z shadcn/ui
   - Domyślna wartość: dzisiejsza data
   - Formatowanie daty do YYYY-MM-DD

### Faza 4: Implementacja komponentu AddExpenseSheet

8. **Rozbudowa istniejącego komponentu**
   - Ścieżka: `src/components/navigation/overlays/AddExpenseSheet.tsx`
   - Zamiana placeholdera na właściwy Dialog
   - Integracja z `useUIContext`
   - Integracja z `useAddExpense`

9. **Implementacja logiki zamykania**
   - Zamknięcie po sukcesie
   - Zamknięcie przez overlay/X/Escape
   - Reset formularza przy otwarciu

### Faza 5: Integracja z dashboardem

10. **Rozszerzenie UIContext** (opcjonalnie)
    - Dodanie callback `onExpenseAdded`
    - Lub użycie custom eventu do odświeżenia dashboardu

11. **Integracja z DashboardView**
    - Nasłuchiwanie na event dodania wydatku
    - Wywołanie `refetch()` po dodaniu wydatku

### Faza 6: Toast i finalizacja

12. **Implementacja toast notifications**
    - Użycie `showToast` z `src/components/ui/toast.tsx`
    - Toast sukcesu po dodaniu wydatku
    - Toast błędu w przypadku niepowodzenia

13. **Testowanie end-to-end**
    - Test scenariusza głównego (happy path)
    - Test scenariuszy błędnych
    - Test dostępności (a11y)

14. **Stylowanie responsywne**
    - Mobile: bottom sheet style
    - Desktop: centered dialog
    - Animacje wejścia/wyjścia

### Faza 7: Dokumentacja i review

15. **Aktualizacja dokumentacji**
    - Aktualizacja statusu implementacji w `.ai/`
    - Dokumentacja komponentów (JSDoc)

16. **Code review i poprawki**
    - Przegląd kodu
    - Optymalizacja wydajności
    - Finalne poprawki UX
