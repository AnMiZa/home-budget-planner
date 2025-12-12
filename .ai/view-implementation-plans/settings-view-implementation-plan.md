# Plan implementacji widoków Ustawień

## 1. Przegląd

Widoki ustawień stanowią centralne miejsce do zarządzania konfiguracją aplikacji Home Budget Planner. Obejmują trzy główne ekrany:

1. **SettingsView** (`/settings`) - główny widok ustawień z nawigacją do podsekcji
2. **ManageHouseholdMembersView** (`/settings/members`) - zarządzanie domownikami (CRUD)
3. **ManageCategoriesView** (`/settings/categories`) - zarządzanie kategoriami wydatków (CRUD)

Widoki te realizują wymagania z historyjek użytkownika US-005 (Zarządzanie domownikami) oraz US-006 (Zarządzanie kategoriami wydatków). Wszystkie widoki są dostępne wyłącznie dla uwierzytelnionych użytkowników i zaprojektowane zgodnie z podejściem "mobile-first".

## 2. Routing widoku

| Widok                      | Ścieżka                | Plik strony Astro                     |
| -------------------------- | ---------------------- | ------------------------------------- |
| SettingsView               | `/settings`            | `src/pages/settings/index.astro`      |
| ManageHouseholdMembersView | `/settings/members`    | `src/pages/settings/members.astro`    |
| ManageCategoriesView       | `/settings/categories` | `src/pages/settings/categories.astro` |

## 3. Struktura komponentów

```
src/
├── pages/
│   └── settings/
│       ├── index.astro           # Strona główna ustawień
│       ├── members.astro         # Strona zarządzania domownikami
│       └── categories.astro      # Strona zarządzania kategoriami
│
└── components/
    └── settings/
        ├── SettingsView.tsx                    # Główny widok ustawień
        ├── SettingsNavItem.tsx                 # Element nawigacji w ustawieniach
        │
        ├── ManageHouseholdMembersView.tsx      # Widok zarządzania domownikami
        ├── HouseholdMembersList.tsx            # Lista domowników
        ├── HouseholdMemberListItem.tsx         # Pojedynczy element listy domownika
        ├── HouseholdMemberForm.tsx             # Formularz dodawania/edycji domownika
        ├── useHouseholdMembers.ts              # Hook do zarządzania stanem domowników
        │
        ├── ManageCategoriesView.tsx            # Widok zarządzania kategoriami
        ├── CategoriesList.tsx                  # Lista kategorii
        ├── CategoryListItem.tsx                # Pojedynczy element listy kategorii
        ├── CategoryForm.tsx                    # Formularz dodawania/edycji kategorii
        ├── CategoryDeleteConfirmationDialog.tsx # Dialog potwierdzenia usunięcia kategorii
        ├── useCategories.ts                    # Hook do zarządzania stanem kategorii
        │
        ├── ConfirmationDialog.tsx              # Generyczny dialog potwierdzenia
        ├── SettingsEmptyState.tsx              # Stan pusty dla list
        └── types.ts                            # Typy specyficzne dla widoków ustawień
```

### Drzewo komponentów

```
SettingsView
└── SettingsNavItem (×3)
    ├── "Domownicy" → /settings/members
    ├── "Kategorie" → /settings/categories
    └── "Profil" → /settings/profile (przyszła funkcjonalność)

ManageHouseholdMembersView
├── Header (tytuł + przycisk "Dodaj")
├── HouseholdMembersList
│   └── HouseholdMemberListItem (×n)
│       ├── Nazwa domownika
│       ├── Przycisk "Edytuj"
│       └── Przycisk "Usuń"
├── Dialog (formularz)
│   └── HouseholdMemberForm
├── ConfirmationDialog (usunięcie)
└── SettingsEmptyState (gdy lista pusta)

ManageCategoriesView
├── Header (tytuł + przycisk "Dodaj")
├── CategoriesList
│   └── CategoryListItem (×n)
│       ├── Nazwa kategorii
│       ├── Przycisk "Edytuj"
│       └── Przycisk "Usuń"
├── Dialog (formularz)
│   └── CategoryForm
├── CategoryDeleteConfirmationDialog
└── SettingsEmptyState (gdy lista pusta)
```

## 4. Szczegóły komponentów

### 4.1 SettingsView

- **Opis:** Główny komponent widoku ustawień wyświetlający listę nawigacyjną do podsekcji. Stanowi centralny punkt wejścia do konfiguracji aplikacji.
- **Główne elementy:**
  - `<header>` z tytułem "Ustawienia"
  - `<nav>` z semantyczną listą `<ul>` zawierającą elementy `<li>`
  - `SettingsNavItem` dla każdej sekcji (Domownicy, Kategorie, Profil)
- **Obsługiwane interakcje:**
  - Kliknięcie w element nawigacji → nawigacja do odpowiedniej podstrony
- **Obsługiwana walidacja:** Brak (komponent prezentacyjny)
- **Typy:**
  - `SettingsNavItemData` - dane elementu nawigacji
- **Propsy:** Brak

### 4.2 SettingsNavItem

- **Opis:** Pojedynczy element nawigacji w widoku ustawień. Renderowany jako link ze stylem karty.
- **Główne elementy:**
  - `<li>` jako wrapper
  - `<a>` jako link nawigacyjny
  - Ikona (lucide-react)
  - Tekst etykiety
  - Ikona strzałki (`ChevronRight`)
- **Obsługiwane interakcje:**
  - Kliknięcie → nawigacja do `href`
  - Focus → widoczny outline dla dostępności
- **Obsługiwana walidacja:** Brak
- **Typy:**
  - `SettingsNavItemProps`
- **Propsy:**
  ```typescript
  interface SettingsNavItemProps {
    readonly href: string;
    readonly label: string;
    readonly icon: ComponentType<{ className?: string }>;
    readonly description?: string;
  }
  ```

### 4.3 ManageHouseholdMembersView

- **Opis:** Główny komponent widoku zarządzania domownikami. Odpowiada za wyświetlanie listy, obsługę formularzy i dialogów potwierdzenia.
- **Główne elementy:**
  - `<header>` z tytułem i opisem sekcji
  - `Button` "Dodaj domownika"
  - `HouseholdMembersList` lub `SettingsEmptyState`
  - `Dialog` z `HouseholdMemberForm` (dodawanie/edycja)
  - `ConfirmationDialog` (usuwanie)
  - Banner operacji (sukces/błąd)
- **Obsługiwane interakcje:**
  - Kliknięcie "Dodaj domownika" → otwarcie dialogu formularza (tryb dodawania)
  - Edycja/usunięcie elementu → delegowane do dzieci
- **Obsługiwana walidacja:**
  - Stan ładowania (skeleton)
  - Stan błędu (z możliwością ponowienia)
  - Stan pusty (CTA do dodania)
- **Typy:**
  - Wykorzystuje hook `useHouseholdMembers`
- **Propsy:** Brak

### 4.4 HouseholdMembersList

- **Opis:** Komponent listy domowników z obsługą paginacji i infinite scroll na urządzeniach mobilnych.
- **Główne elementy:**
  - `<ul>` jako semantyczna lista
  - `HouseholdMemberListItem` dla każdego domownika
  - `InfiniteScrollTrigger` (mobile) lub `PaginationControl` (desktop)
- **Obsługiwane interakcje:**
  - Przewijanie w dół → ładowanie kolejnych stron (mobile)
  - Kliknięcie w paginację → ładowanie wybranej strony (desktop)
- **Obsługiwana walidacja:** Brak
- **Typy:**
  - `HouseholdMemberVM[]`
  - `PaginationMetaDto`
- **Propsy:**
  ```typescript
  interface HouseholdMembersListProps {
    readonly members: readonly HouseholdMemberVM[];
    readonly meta: PaginationMetaDto | null;
    readonly isLoadingMore: boolean;
    readonly onEdit: (member: HouseholdMemberVM) => void;
    readonly onDelete: (member: HouseholdMemberVM) => void;
    readonly onLoadMore: () => void;
    readonly onPageChange: (page: number) => void;
  }
  ```

### 4.5 HouseholdMemberListItem

- **Opis:** Pojedynczy element listy domownika z akcjami edycji i usunięcia.
- **Główne elementy:**
  - `<li>` jako wrapper
  - `<span>` z imieniem domownika
  - `<div>` z przyciskami akcji
  - `Button` (ikona edycji) z `aria-label`
  - `Button` (ikona usunięcia) z `aria-label`
- **Obsługiwane interakcje:**
  - Kliknięcie "Edytuj" → wywołanie `onEdit`
  - Kliknięcie "Usuń" → wywołanie `onDelete`
- **Obsługiwana walidacja:** Brak
- **Typy:**
  - `HouseholdMemberVM`
- **Propsy:**
  ```typescript
  interface HouseholdMemberListItemProps {
    readonly member: HouseholdMemberVM;
    readonly onEdit: (member: HouseholdMemberVM) => void;
    readonly onDelete: (member: HouseholdMemberVM) => void;
  }
  ```

### 4.6 HouseholdMemberForm

- **Opis:** Formularz do dodawania i edycji domownika. Używany wewnątrz Dialog.
- **Główne elementy:**
  - `Form` (react-hook-form)
  - `FormField` z `Input` dla imienia
  - `DialogFooter` z przyciskami "Anuluj" i "Zapisz"
  - Komunikat błędu walidacji/API
- **Obsługiwane interakcje:**
  - Zmiana wartości pola → walidacja na bieżąco
  - Submit → wywołanie `onSubmit`
  - Kliknięcie "Anuluj" → wywołanie `onCancel`
- **Obsługiwana walidacja:**
  - Imię wymagane (min 1 znak po trimowaniu)
  - Imię max 120 znaków
  - Unikalność imienia (walidacja po stronie API)
- **Typy:**
  - `HouseholdMemberFormValues`
  - `HouseholdMemberVM` (opcjonalnie dla edycji)
- **Propsy:**
  ```typescript
  interface HouseholdMemberFormProps {
    readonly member?: HouseholdMemberVM;
    readonly onSubmit: (data: CreateHouseholdMemberCommand | UpdateHouseholdMemberCommand) => Promise<void>;
    readonly onCancel: () => void;
    readonly formError?: string | null;
    readonly onClearError?: () => void;
  }
  ```

### 4.7 ManageCategoriesView

- **Opis:** Główny komponent widoku zarządzania kategoriami wydatków. Analogiczny do `ManageHouseholdMembersView`.
- **Główne elementy:**
  - `<header>` z tytułem i opisem sekcji
  - `Button` "Dodaj kategorię"
  - `CategoriesList` lub `SettingsEmptyState`
  - `Dialog` z `CategoryForm`
  - `CategoryDeleteConfirmationDialog`
  - Banner operacji (sukces/błąd)
- **Obsługiwane interakcje:**
  - Kliknięcie "Dodaj kategorię" → otwarcie dialogu formularza
  - Edycja/usunięcie elementu → delegowane do dzieci
- **Obsługiwana walidacja:**
  - Stan ładowania (skeleton)
  - Stan błędu (z możliwością ponowienia)
  - Stan pusty (CTA do dodania)
- **Typy:**
  - Wykorzystuje hook `useCategories`
- **Propsy:** Brak

### 4.8 CategoriesList

- **Opis:** Komponent listy kategorii z obsługą paginacji.
- **Główne elementy:**
  - `<ul>` jako semantyczna lista
  - `CategoryListItem` dla każdej kategorii
  - `InfiniteScrollTrigger` lub `PaginationControl`
- **Obsługiwane interakcje:**
  - Przewijanie/paginacja → ładowanie danych
- **Obsługiwana walidacja:** Brak
- **Typy:**
  - `CategoryVM[]`
  - `PaginationMetaDto`
- **Propsy:**
  ```typescript
  interface CategoriesListProps {
    readonly categories: readonly CategoryVM[];
    readonly meta: PaginationMetaDto | null;
    readonly isLoadingMore: boolean;
    readonly onEdit: (category: CategoryVM) => void;
    readonly onDelete: (category: CategoryVM) => void;
    readonly onLoadMore: () => void;
    readonly onPageChange: (page: number) => void;
  }
  ```

### 4.9 CategoryListItem

- **Opis:** Pojedynczy element listy kategorii z akcjami edycji i usunięcia.
- **Główne elementy:**
  - `<li>` jako wrapper
  - `<span>` z nazwą kategorii
  - `<div>` z przyciskami akcji
- **Obsługiwane interakcje:**
  - Kliknięcie "Edytuj" → wywołanie `onEdit`
  - Kliknięcie "Usuń" → wywołanie `onDelete`
- **Obsługiwana walidacja:** Brak
- **Typy:**
  - `CategoryVM`
- **Propsy:**
  ```typescript
  interface CategoryListItemProps {
    readonly category: CategoryVM;
    readonly onEdit: (category: CategoryVM) => void;
    readonly onDelete: (category: CategoryVM) => void;
  }
  ```

### 4.10 CategoryForm

- **Opis:** Formularz do dodawania i edycji kategorii.
- **Główne elementy:**
  - `Form` (react-hook-form)
  - `FormField` z `Input` dla nazwy
  - `DialogFooter` z przyciskami
  - Komunikat błędu
- **Obsługiwane interakcje:**
  - Zmiana wartości → walidacja
  - Submit → wywołanie `onSubmit`
  - Anuluj → wywołanie `onCancel`
- **Obsługiwana walidacja:**
  - Nazwa wymagana (min 1 znak)
  - Nazwa max 100 znaków
  - Unikalność nazwy (API)
- **Typy:**
  - `CategoryFormValues`
  - `CategoryVM` (opcjonalnie)
- **Propsy:**
  ```typescript
  interface CategoryFormProps {
    readonly category?: CategoryVM;
    readonly onSubmit: (data: CreateCategoryCommand | UpdateCategoryCommand) => Promise<void>;
    readonly onCancel: () => void;
    readonly formError?: string | null;
    readonly onClearError?: () => void;
  }
  ```

### 4.11 CategoryDeleteConfirmationDialog

- **Opis:** Specjalny dialog potwierdzenia usunięcia kategorii z ostrzeżeniem o kaskadowym usunięciu powiązanych transakcji i planowanych wydatków.
- **Główne elementy:**
  - `AlertDialog`
  - Ikona ostrzeżenia
  - Tytuł i opis z informacją o konsekwencjach
  - Checkbox potwierdzenia (opcjonalnie)
  - Przyciski "Anuluj" i "Usuń" (destructive)
- **Obsługiwane interakcje:**
  - Kliknięcie "Usuń" → wywołanie `onConfirm` z `force=true`
  - Kliknięcie "Anuluj" → zamknięcie dialogu
- **Obsługiwana walidacja:**
  - Wymagane zaakceptowanie ostrzeżenia przed usunięciem
- **Typy:**
  - `CategoryVM`
- **Propsy:**
  ```typescript
  interface CategoryDeleteConfirmationDialogProps {
    readonly open: boolean;
    readonly onOpenChange: (open: boolean) => void;
    readonly category: CategoryVM | null;
    readonly onConfirm: () => Promise<void>;
    readonly isProcessing: boolean;
    readonly requiresForce?: boolean;
  }
  ```

### 4.12 ConfirmationDialog

- **Opis:** Generyczny dialog potwierdzenia używany do prostych operacji usunięcia (np. domowników).
- **Główne elementy:**
  - `AlertDialog` (shadcn/ui)
  - Tytuł i opis
  - Przyciski akcji
- **Obsługiwane interakcje:**
  - Potwierdzenie → `onConfirm`
  - Anulowanie → `onOpenChange(false)`
- **Obsługiwana walidacja:** Brak
- **Typy:** Generyczne
- **Propsy:**
  ```typescript
  interface ConfirmationDialogProps {
    readonly open: boolean;
    readonly onOpenChange: (open: boolean) => void;
    readonly title: string;
    readonly description: string;
    readonly confirmLabel?: string;
    readonly cancelLabel?: string;
    readonly onConfirm: () => Promise<void> | void;
    readonly isProcessing?: boolean;
    readonly variant?: "default" | "destructive";
  }
  ```

### 4.13 SettingsEmptyState

- **Opis:** Komponent wyświetlany gdy lista jest pusta, z CTA do dodania pierwszego elementu.
- **Główne elementy:**
  - Kontener z ramką przerywaną
  - Ikona
  - Tytuł i opis
  - `Button` CTA
- **Obsługiwane interakcje:**
  - Kliknięcie CTA → wywołanie `onAction`
- **Obsługiwana walidacja:** Brak
- **Typy:** Generyczne
- **Propsy:**
  ```typescript
  interface SettingsEmptyStateProps {
    readonly title: string;
    readonly description: string;
    readonly actionLabel: string;
    readonly onAction: () => void;
    readonly icon?: ComponentType<{ className?: string }>;
  }
  ```

## 5. Typy

### 5.1 Istniejące typy z `src/types.ts`

```typescript
// Household Members
interface HouseholdMemberDto {
  readonly id: string;
  readonly fullName: string;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

type HouseholdMembersListResponseDto = PaginatedDataDto<HouseholdMemberDto>;

interface CreateHouseholdMemberCommand {
  readonly fullName: string;
}

interface UpdateHouseholdMemberCommand {
  readonly fullName?: string;
  readonly isActive?: boolean;
}

// Categories
interface CategoryDto {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

type CategoriesListResponseDto = PaginatedDataDto<CategoryDto>;

interface CreateCategoryCommand {
  readonly name: string;
}

interface UpdateCategoryCommand {
  readonly name: string;
}

interface DeleteCategoryCommand {
  readonly force?: boolean;
}

// Shared
interface PaginationMetaDto {
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
}

interface ApiErrorDto {
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
}
```

### 5.2 Nowe typy dla widoków (`src/components/settings/types.ts`)

```typescript
// ViewModel dla domownika (rozszerzenie DTO o pola UI)
export interface HouseholdMemberVM extends HouseholdMemberDto {
  // Obecnie identyczny z DTO, ale pozwala na przyszłe rozszerzenia
}

// ViewModel dla kategorii
export interface CategoryVM extends CategoryDto {
  // Możliwe przyszłe rozszerzenia: hasTransactions, transactionCount
}

// Dane elementu nawigacji ustawień
export interface SettingsNavItemData {
  readonly href: string;
  readonly label: string;
  readonly icon: ComponentType<{ className?: string }>;
  readonly description: string;
}

// Wartości formularza domownika
export interface HouseholdMemberFormValues {
  readonly fullName: string;
}

// Wartości formularza kategorii
export interface CategoryFormValues {
  readonly name: string;
}

// Stan operacji (dla bannerów sukces/błąd)
export type OperationType = "create" | "update" | "delete";

export interface OperationResult {
  readonly type: OperationType;
  readonly status: "success" | "error";
  readonly message: string;
}

// Błąd API
export interface SettingsError {
  readonly status: number;
  readonly message: string;
  readonly code?: string;
}
```

## 6. Zarządzanie stanem

### 6.1 useHouseholdMembers

Custom hook do zarządzania stanem domowników.

```typescript
interface HouseholdMembersState {
  readonly members: readonly HouseholdMemberVM[];
  readonly meta: PaginationMetaDto | null;
  readonly isLoading: boolean;
  readonly isLoadingMore: boolean;
  readonly error: SettingsError | null;
  readonly operationResult: OperationResult | null;
}

interface UseHouseholdMembersResult {
  // Stan
  readonly members: readonly HouseholdMemberVM[];
  readonly meta: PaginationMetaDto | null;
  readonly isLoading: boolean;
  readonly isLoadingMore: boolean;
  readonly error: SettingsError | null;
  readonly operationResult: OperationResult | null;

  // Akcje
  readonly loadPage: (page: number) => Promise<void>;
  readonly loadNextPage: () => Promise<void>;
  readonly refresh: () => Promise<void>;
  readonly createMember: (data: CreateHouseholdMemberCommand) => Promise<void>;
  readonly updateMember: (id: string, data: UpdateHouseholdMemberCommand) => Promise<void>;
  readonly deleteMember: (id: string) => Promise<void>;
  readonly retry: () => Promise<void>;
  readonly clearOperationResult: () => void;
}
```

**Funkcjonalności:**

- Pobieranie listy domowników z paginacją
- Infinite scroll (mobile) i paginacja (desktop)
- Tworzenie, edycja i usuwanie (soft-delete) domowników
- Optymistyczne aktualizacje UI
- Obsługa błędów i stanów ładowania
- Auto-refresh po operacjach CRUD

### 6.2 useCategories

Custom hook do zarządzania stanem kategorii.

```typescript
interface CategoriesState {
  readonly categories: readonly CategoryVM[];
  readonly meta: PaginationMetaDto | null;
  readonly isLoading: boolean;
  readonly isLoadingMore: boolean;
  readonly error: SettingsError | null;
  readonly operationResult: OperationResult | null;
  readonly pendingDeleteRequiresForce: boolean;
}

interface UseCategoriesResult {
  // Stan
  readonly categories: readonly CategoryVM[];
  readonly meta: PaginationMetaDto | null;
  readonly isLoading: boolean;
  readonly isLoadingMore: boolean;
  readonly error: SettingsError | null;
  readonly operationResult: OperationResult | null;
  readonly pendingDeleteRequiresForce: boolean;

  // Akcje
  readonly loadPage: (page: number) => Promise<void>;
  readonly loadNextPage: () => Promise<void>;
  readonly refresh: () => Promise<void>;
  readonly createCategory: (data: CreateCategoryCommand) => Promise<void>;
  readonly updateCategory: (id: string, data: UpdateCategoryCommand) => Promise<void>;
  readonly deleteCategory: (id: string, force?: boolean) => Promise<void>;
  readonly retry: () => Promise<void>;
  readonly clearOperationResult: () => void;
  readonly clearPendingDeleteRequiresForce: () => void;
}
```

**Funkcjonalności:**

- Pobieranie listy kategorii z paginacją
- Tworzenie, edycja i usuwanie kategorii
- Obsługa kaskadowego usuwania (force=true)
- Wykrywanie wymagania potwierdzenia force
- Obsługa błędów i stanów ładowania

## 7. Integracja API

### 7.1 Endpointy Household Members

| Metoda | Endpoint                      | Request                                              | Response                          | Kody błędów             |
| ------ | ----------------------------- | ---------------------------------------------------- | --------------------------------- | ----------------------- |
| GET    | `/api/household-members`      | Query: `includeInactive`, `page`, `pageSize`, `sort` | `HouseholdMembersListResponseDto` | 401, 404, 500           |
| POST   | `/api/household-members`      | Body: `CreateHouseholdMemberCommand`                 | `HouseholdMemberDto`              | 400, 401, 409, 500      |
| PATCH  | `/api/household-members/{id}` | Body: `UpdateHouseholdMemberCommand`                 | `HouseholdMemberDto`              | 400, 401, 404, 409, 500 |
| DELETE | `/api/household-members/{id}` | -                                                    | 204 No Content                    | 401, 404, 500           |

### 7.2 Endpointy Categories

| Metoda | Endpoint               | Request                                     | Response                    | Kody błędów             |
| ------ | ---------------------- | ------------------------------------------- | --------------------------- | ----------------------- |
| GET    | `/api/categories`      | Query: `search`, `page`, `pageSize`, `sort` | `CategoriesListResponseDto` | 401, 500                |
| POST   | `/api/categories`      | Body: `CreateCategoryCommand`               | `CategoryDto`               | 400, 401, 409, 500      |
| PATCH  | `/api/categories/{id}` | Body: `UpdateCategoryCommand`               | `CategoryDto`               | 400, 401, 404, 409, 500 |
| DELETE | `/api/categories/{id}` | Query: `force=true`                         | 204 No Content              | 400, 401, 404, 500      |

### 7.3 Mapowanie błędów API na komunikaty UI

```typescript
const ERROR_MESSAGES: Record<string, string> = {
  // Household Members
  UNAUTHENTICATED: "Sesja wygasła. Zaloguj się ponownie.",
  INVALID_FULL_NAME: "Nieprawidłowe imię domownika.",
  MEMBER_NOT_FOUND: "Nie znaleziono domownika.",
  MEMBER_NAME_CONFLICT: "Domownik o tym imieniu już istnieje.",
  MEMBERS_LIST_FAILED: "Nie udało się pobrać listy domowników.",
  MEMBER_CREATE_FAILED: "Nie udało się dodać domownika.",
  MEMBER_UPDATE_FAILED: "Nie udało się zaktualizować domownika.",
  MEMBER_DEACTIVATE_FAILED: "Nie udało się usunąć domownika.",

  // Categories
  INVALID_NAME: "Nieprawidłowa nazwa kategorii.",
  CATEGORY_NOT_FOUND: "Nie znaleziono kategorii.",
  CATEGORY_NAME_CONFLICT: "Kategoria o tej nazwie już istnieje.",
  CATEGORIES_LIST_FAILED: "Nie udało się pobrać listy kategorii.",
  CATEGORY_CREATE_FAILED: "Nie udało się dodać kategorii.",
  CATEGORY_UPDATE_FAILED: "Nie udało się zaktualizować kategorii.",
  CATEGORY_DELETE_FAILED: "Nie udało się usunąć kategorii.",
  FORCE_CONFIRMATION_REQUIRED: "Kategoria ma powiązane transakcje. Potwierdź usunięcie.",
};
```

## 8. Interakcje użytkownika

### 8.1 SettingsView

| Interakcja             | Oczekiwany wynik                                           |
| ---------------------- | ---------------------------------------------------------- |
| Kliknięcie "Domownicy" | Nawigacja do `/settings/members`                           |
| Kliknięcie "Kategorie" | Nawigacja do `/settings/categories`                        |
| Kliknięcie "Profil"    | Nawigacja do `/settings/profile` (przyszła funkcjonalność) |

### 8.2 ManageHouseholdMembersView

| Interakcja                           | Oczekiwany wynik                                                                          |
| ------------------------------------ | ----------------------------------------------------------------------------------------- |
| Kliknięcie "Dodaj domownika"         | Otwarcie dialogu z pustym formularzem                                                     |
| Wypełnienie formularza i submit      | Utworzenie domownika, zamknięcie dialogu, odświeżenie listy, wyświetlenie bannera sukcesu |
| Kliknięcie "Edytuj" przy domowniku   | Otwarcie dialogu z wypełnionym formularzem                                                |
| Edycja formularza i submit           | Aktualizacja domownika, zamknięcie dialogu, aktualizacja listy                            |
| Kliknięcie "Usuń" przy domowniku     | Otwarcie dialogu potwierdzenia                                                            |
| Potwierdzenie usunięcia              | Soft-delete domownika (isActive=false), usunięcie z listy, banner sukcesu                 |
| Anulowanie usunięcia                 | Zamknięcie dialogu, brak zmian                                                            |
| Scroll w dół (mobile)                | Ładowanie kolejnej strony (infinite scroll)                                               |
| Kliknięcie numeru strony (desktop)   | Ładowanie wybranej strony                                                                 |
| Kliknięcie "Spróbuj ponownie" (błąd) | Ponowne pobranie danych                                                                   |

### 8.3 ManageCategoriesView

| Interakcja                         | Oczekiwany wynik                                               |
| ---------------------------------- | -------------------------------------------------------------- |
| Kliknięcie "Dodaj kategorię"       | Otwarcie dialogu z pustym formularzem                          |
| Wypełnienie formularza i submit    | Utworzenie kategorii, zamknięcie dialogu, odświeżenie listy    |
| Kliknięcie "Edytuj" przy kategorii | Otwarcie dialogu z wypełnionym formularzem                     |
| Edycja formularza i submit         | Aktualizacja kategorii, zamknięcie dialogu, aktualizacja listy |
| Kliknięcie "Usuń" przy kategorii   | Otwarcie dialogu potwierdzenia (z ostrzeżeniem o transakcjach) |
| Potwierdzenie usunięcia (force)    | Usunięcie kategorii wraz z powiązanymi transakcjami            |
| Anulowanie usunięcia               | Zamknięcie dialogu, brak zmian                                 |

## 9. Warunki i walidacja

### 9.1 Walidacja formularza domownika (HouseholdMemberForm)

| Pole     | Warunek                      | Komunikat błędu                         |
| -------- | ---------------------------- | --------------------------------------- |
| fullName | Wymagane (nie puste po trim) | "Imię jest wymagane."                   |
| fullName | Max 120 znaków               | "Imię nie może przekraczać 120 znaków." |

Schema Zod:

```typescript
const householdMemberFormSchema = z.object({
  fullName: z.string().trim().min(1, "Imię jest wymagane.").max(120, "Imię nie może przekraczać 120 znaków."),
});
```

### 9.2 Walidacja formularza kategorii (CategoryForm)

| Pole | Warunek                      | Komunikat błędu                                    |
| ---- | ---------------------------- | -------------------------------------------------- |
| name | Wymagane (nie puste po trim) | "Nazwa kategorii jest wymagana."                   |
| name | Max 100 znaków               | "Nazwa kategorii nie może przekraczać 100 znaków." |

Schema Zod:

```typescript
const categoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nazwa kategorii jest wymagana.")
    .max(100, "Nazwa kategorii nie może przekraczać 100 znaków."),
});
```

### 9.3 Walidacja po stronie API

| Warunek                                       | Kod błędu                   | Wpływ na UI                           |
| --------------------------------------------- | --------------------------- | ------------------------------------- |
| Duplikat imienia domownika                    | MEMBER_NAME_CONFLICT        | Wyświetlenie błędu w formularzu       |
| Duplikat nazwy kategorii                      | CATEGORY_NAME_CONFLICT      | Wyświetlenie błędu w formularzu       |
| Kategoria ma powiązane transakcje (bez force) | FORCE_CONFIRMATION_REQUIRED | Wyświetlenie dialogu z ostrzeżeniem   |
| Brak autoryzacji                              | UNAUTHENTICATED             | Przekierowanie do logowania           |
| Nie znaleziono zasobu                         | \*\_NOT_FOUND               | Wyświetlenie błędu, odświeżenie listy |

## 10. Obsługa błędów

### 10.1 Scenariusze błędów i ich obsługa

| Scenariusz                          | Obsługa                                                        |
| ----------------------------------- | -------------------------------------------------------------- |
| Błąd sieci podczas pobierania listy | Wyświetlenie komunikatu błędu z przyciskiem "Spróbuj ponownie" |
| Błąd 401 (nieautoryzowany)          | Przekierowanie do `/login`                                     |
| Błąd 404 (nie znaleziono)           | Odświeżenie listy, wyświetlenie komunikatu                     |
| Błąd 409 (konflikt nazwy)           | Wyświetlenie błędu w formularzu                                |
| Błąd 400 (walidacja)                | Wyświetlenie błędu w formularzu                                |
| Błąd 500 (serwer)                   | Wyświetlenie ogólnego komunikatu błędu                         |
| Błąd podczas operacji CRUD          | Wyświetlenie bannera błędu, możliwość ponowienia               |

### 10.2 Komponenty obsługi błędów

```typescript
// Stan błędu dla całego widoku
if (error) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Nie udało się załadować danych</h1>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
      <Button variant="outline" onClick={handleRetry}>
        Spróbuj ponownie
      </Button>
    </div>
  );
}

// Banner operacji (sukces/błąd)
const renderOperationBanner = (result: OperationResult | null) => {
  if (!result) return null;

  const isSuccess = result.status === "success";
  return (
    <div
      role={isSuccess ? "status" : "alert"}
      aria-live={isSuccess ? "polite" : "assertive"}
      className={cn(
        "flex items-center gap-3 rounded-md border px-4 py-3",
        isSuccess ? "bg-emerald-50 border-emerald-200" : "bg-destructive/10 border-destructive"
      )}
    >
      <Icon className={isSuccess ? "text-emerald-600" : "text-destructive"} />
      <p>{result.message}</p>
      <button onClick={clearOperationResult}>Zamknij</button>
    </div>
  );
};
```

## 11. Kroki implementacji

### Faza 1: Przygotowanie struktury

1. **Utworzenie struktury katalogów**
   - Utworzyć katalog `src/components/settings/`
   - Utworzyć katalog `src/pages/settings/`

2. **Utworzenie pliku typów**
   - Utworzyć `src/components/settings/types.ts` z definicjami ViewModeli i typów

3. **Utworzenie stron Astro**
   - Utworzyć `src/pages/settings/index.astro`
   - Utworzyć `src/pages/settings/members.astro`
   - Utworzyć `src/pages/settings/categories.astro`

### Faza 2: Komponenty współdzielone

4. **Implementacja ConfirmationDialog**
   - Utworzyć generyczny komponent dialogu potwierdzenia
   - Wykorzystać `AlertDialog` z shadcn/ui

5. **Implementacja SettingsEmptyState**
   - Utworzyć komponent stanu pustego z CTA
   - Bazować na istniejącym `EmptyState` z dashboard

### Faza 3: SettingsView

6. **Implementacja SettingsNavItem**
   - Utworzyć komponent elementu nawigacji
   - Dodać stylizację karty z ikoną i strzałką

7. **Implementacja SettingsView**
   - Utworzyć główny komponent widoku ustawień
   - Dodać listę nawigacyjną z trzema sekcjami

### Faza 4: Zarządzanie domownikami

8. **Implementacja useHouseholdMembers**
   - Utworzyć custom hook do zarządzania stanem
   - Zaimplementować pobieranie listy z paginacją
   - Zaimplementować operacje CRUD
   - Dodać obsługę błędów i stanów ładowania

9. **Implementacja HouseholdMemberForm**
   - Utworzyć formularz z react-hook-form i zod
   - Dodać walidację po stronie klienta

10. **Implementacja HouseholdMemberListItem**
    - Utworzyć komponent pojedynczego elementu listy
    - Dodać przyciski akcji z odpowiednimi aria-labels

11. **Implementacja HouseholdMembersList**
    - Utworzyć komponent listy z paginacją
    - Dodać obsługę infinite scroll (mobile) i pagination (desktop)

12. **Implementacja ManageHouseholdMembersView**
    - Złożyć komponenty w główny widok
    - Dodać obsługę dialogów i bannerów
    - Przetestować wszystkie interakcje

### Faza 5: Zarządzanie kategoriami

13. **Implementacja useCategories**
    - Utworzyć custom hook analogiczny do useHouseholdMembers
    - Dodać obsługę `force` przy usuwaniu

14. **Implementacja CategoryForm**
    - Utworzyć formularz kategorii
    - Dodać walidację

15. **Implementacja CategoryDeleteConfirmationDialog**
    - Utworzyć specjalny dialog z ostrzeżeniem
    - Dodać obsługę parametru force

16. **Implementacja CategoryListItem**
    - Utworzyć komponent pojedynczego elementu

17. **Implementacja CategoriesList**
    - Utworzyć komponent listy

18. **Implementacja ManageCategoriesView**
    - Złożyć komponenty w główny widok
    - Przetestować wszystkie interakcje

### Faza 6: Integracja i testy

19. **Aktualizacja nawigacji**
    - Zweryfikować, że link do `/settings` w `Sidebar` działa poprawnie

20. **Testy jednostkowe**
    - Napisać testy dla hooków (useHouseholdMembers, useCategories)
    - Napisać testy dla formularzy (walidacja)

21. **Testy E2E**
    - Napisać testy Playwright dla flow zarządzania domownikami
    - Napisać testy Playwright dla flow zarządzania kategoriami

22. **Przegląd dostępności**
    - Zweryfikować nawigację klawiaturą
    - Zweryfikować atrybuty ARIA
    - Przetestować z czytnikiem ekranu

### Faza 7: Polish

23. **Responsywność**
    - Przetestować na różnych rozdzielczościach
    - Dostosować układ dla urządzeń mobilnych

24. **Optymalizacja**
    - Dodać React.memo dla często renderowanych komponentów
    - Zoptymalizować ponowne renderowania

25. **Dokumentacja**
    - Zaktualizować dokumentację komponentów
    - Dodać komentarze JSDoc

