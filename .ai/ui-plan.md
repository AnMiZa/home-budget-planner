# Architektura UI dla Home Budget Planner

## 1. Przegląd struktury UI

Architektura interfejsu użytkownika (UI) dla aplikacji "Home Budget Planner" została zaprojektowana w oparciu o podejście "mobile-first", z myślą o zapewnieniu prostoty, intuicyjności i responsywności. Rdzeniem architektury jest kompozycja widoków opartych na bibliotece React, stylizowanych za pomocą Tailwind CSS i zbudowanych z wykorzystaniem predefiniowanych komponentów z Shadcn/ui, opakowanych we własne, spójne implementacje.

Nawigacja w aplikacji jest scentralizowana i dostosowana do platformy:

- **Na urządzeniach mobilnych** przyjmuje formę dolnego paska zakładek (Tab Bar), zapewniając szybki dostęp do kluczowych sekcji: Pulpitu, Historii Transakcji i Ustawień, z centralnie umieszczonym przyciskiem akcji do dodawania wydatków.
- **Na urządzeniach desktopowych** transformuje się w boczny panel (Sidebar), oferując identyczną funkcjonalność w układzie bardziej przystosowanym do większych ekranów.

Zarządzanie stanem aplikacji opiera się na bibliotece Zustand z modularnym podejściem (slices), co zapewnia skalowalność i separację logiki domenowej. Formularze są obsługiwane przez React Hook Form, co gwarantuje wysoką wydajność i natychmiastową walidację. Interakcja z API jest zoptymalizowana poprzez mechanizmy takie jak UI Skeletons dla stanów ładowania, globalne powiadomienia (toasty) dla informacji o statusie operacji oraz optymistyczne aktualizacje interfejsu dla najczęstszych akcji, co znacząco poprawia postrzeganą szybkość aplikacji.

## 2. Lista widoków

### Widoki publiczne (przed uwierzytelnieniem)

---

#### **1. Widok Logowania (LoginView)**

- **Ścieżka:** `/login`
- **Główny cel:** Umożliwienie użytkownikowi bezpiecznego zalogowania się do aplikacji.
- **Kluczowe informacje:** Pola na adres e-mail i hasło, opcja "Zapamiętaj mnie".
- **Kluczowe komponenty:** `LoginForm`, `EmailInput`, `PasswordInput`, `Checkbox`, `PrimaryButton`.
- **UX, dostępność i bezpieczeństwo:**
  - **UX:** Wyraźne komunikaty o błędach walidacji i nieudanym logowaniu. Link do resetowania hasła.
  - **Dostępność:** Poprawne etykiety dla pól formularza (`<label>`), obsługa nawigacji klawiaturą.
  - **Bezpieczeństwo:** Komunikacja z API przez HTTPS. Brak przechowywania hasła w stanie aplikacji.

#### **2. Widok Resetowania Hasła (PasswordResetViews)**

- **Ścieżka:** `/reset-password` (żądanie) i `/update-password` (formularz)
- **Główny cel:** Umożliwienie użytkownikowi odzyskania dostępu do konta w przypadku zapomnienia hasła.
- **Kluczowe informacje:** Pole na adres e-mail (żądanie); pola na nowe hasło i jego powtórzenie (formularz).
- **Kluczowe komponenty:** `RequestPasswordResetForm`, `UpdatePasswordForm`.
- **UX, dostępność i bezpieczeństwo:**
  - **UX:** Jasne instrukcje prowadzące użytkownika przez cały proces. Informacja o wysłaniu linku na e-mail.
  - **Dostępność:** Zgodność formularzy ze standardami WCAG.
  - **Bezpieczeństwo:** Link do resetowania hasła jest unikalny i ma ograniczony czas ważności.

### Widoki prywatne (po uwierzytelnieniu)

---

#### **3. Widok Onboardingu (OnboardingView)**

- **Ścieżka:** `/welcome`
- **Główny cel:** Przeprowadzenie nowego użytkownika przez wstępną konfigurację konta, aby mógł jak najszybciej rozpocząć korzystanie z aplikacji.
- **Kluczowe informacje:** Kreator krok po kroku: 1. Powitanie, 2. Dodanie domowników, 3. Personalizacja kategorii.
- **Kluczowe komponenty:** `WizardStepper`, `HouseholdMemberForm`, `CategoryCustomizationList`, `PrimaryButton`.
- **UX, dostępność i bezpieczeństwo:**
  - **UX:** Prosty, prowadzący za rękę proces. Możliwość pominięcia i dokończenia konfiguracji później.
  - **Dostępność:** Wskaźnik postępu w kreatorze jest czytelny dla czytników ekranu.
  - **Bezpieczeństwo:** Dane są zapisywane na bieżąco po każdym kroku.

#### **4. Widok Pulpitu (DashboardView)**

- **Ścieżka:** `/`
- **Główny cel:** Prezentacja szybkiego i czytelnego podsumowania stanu bieżącego budżetu miesięcznego.
- **Kluczowe informacje:** Sumaryczny pasek postępu, kwota pozostałych środków, lista kategorii z indywidualnymi paskami postępu ("wydano X z Y zł").
- **Kluczowe komponenty:** `OverallSummaryCard`, `CategoryProgressCard`, `HistoricalBudgetNavigator`, `UISkeletonLoader`.
- **UX, dostępność i bezpieczeństwo:**
  - **UX:** Stan pusty (empty state) z CTA "Stwórz budżet" dla nowych użytkowników. Wyraźna wizualizacja przekroczenia budżetu (zmiana koloru, ikona).
  - **Dostępność:** Paski postępu z atrybutami ARIA (`role`, `aria-valuenow`). Sygnalizacja przekroczenia budżetu nie opiera się wyłącznie na kolorze.
  - **Bezpieczeństwo:** Wyświetlane dane są pobierane w kontekście zalogowanego użytkownika.

#### **5. Widok Historii Transakcji (TransactionHistoryView)**

- **Ścieżka:** `/transactions`
- **Główny cel:** Zapewnienie dostępu do pełnej, chronologicznej listy wszystkich wydatków w bieżącym miesiącu.
- **Kluczowe informacje:** Lista transakcji (data, kwota, kategoria, notatki), akcje (edycja, usunięcie).
- **Kluczowe komponenty:** `TransactionListItem`, `InfiniteScroll`, `PaginationControl` (desktop), `ConfirmationModal`.
- **UX, dostępność i bezpieczeństwo:**
  - **UX:** "Nieskończone przewijanie" na mobile dla płynnego przeglądania, paginacja na desktopie dla precyzyjnej nawigacji.
  - **Dostępność:** Każdy element listy jest interaktywny i dostępny z klawiatury.
  - **Bezpieczeństwo:** Operacje edycji/usunięcia wymagają potwierdzenia i są autoryzowane po stronie serwera.

#### **6. Kreator Tworzenia/Edycji Budżetu (BudgetWizardView)**

- **Ścieżka:** `/new-budget` lub `/budget/{budgetId}/edit`
- **Główny cel:** Umożliwienie użytkownikowi zaplanowania budżetu na nowy miesiąc lub modyfikacji istniejącego planu.
- **Kluczowe informacje:** Dwuetapowy kreator: 1. Wprowadzenie przychodów dla domowników, 2. Alokacja limitów wydatków do kategorii. Dynamicznie aktualizowana kwota "środków wolnych".
- **Kluczowe komponenty:** `WizardStepper`, `IncomesForm`, `PlannedExpensesForm`, `ReadOnlyBudgetView`.
- **UX, dostępność i bezpieczeństwo:**
  - **UX:** Wyraźne rozróżnienie między trybem edycji a trybem tylko do odczytu. Stan formularza jest zachowywany przy przechodzeniu między krokami.
  - **Dostępność:** Poprawne etykietowanie wszystkich pól formularza.
  - **Bezpieczeństwo:** Walidacja wprowadzanych kwot (muszą być dodatnie).

#### **7. Widok Ustawień (SettingsView)**

- **Ścieżka:** `/settings`
- **Główny cel:** Centralne miejsce do zarządzania konfiguracją aplikacji.
- **Kluczowe informacje:** Nawigacja do podsekcji: "Domownicy", "Kategorie", "Profil".
- **Kluczowe komponenty:** `NavigationList`, `ListItem`.
- **UX, dostępność i bezpieczeństwo:**
  - **UX:** Prosta, przejrzysta lista opcji.
  - **Dostępność:** Lista nawigacyjna zaimplementowana jako semantyczna lista (`<ul>`, `<li>`) z linkami.
  - **Bezpieczeństwo:** Dostęp ograniczony do uwierzytelnionych użytkowników.

#### **8. Widoki Zarządzania (ManageHouseholdMembersView, ManageCategoriesView)**

- **Ścieżka:** `/settings/members`, `/settings/categories`
- **Główny cel:** Umożliwienie użytkownikowi pełnego zarządzania (CRUD) domownikami i kategoriami wydatków.
- **Kluczowe informacje:** Lista istniejących elementów z opcjami edycji/usunięcia, formularz do dodawania nowych.
- **Kluczowe komponenty:** `DataTable`, `AddEditMemberForm`, `AddEditCategoryForm`, `ConfirmationModal`.
- **UX, dostępność i bezpieczeństwo:**
  - **UX:** Informacyjny stan pusty z CTA. Operacje usunięcia wymagają dodatkowego potwierdzenia, aby zapobiec przypadkowym akcjom.
  - **Dostępność:** Wszystkie akcje (dodaj, edytuj, usuń) są dostępne z klawiatury.
  - **Bezpieczeństwo:** Logika biznesowa (np. blokada usunięcia ostatniego domownika) jest walidowana po stronie serwera.

### Elementy modalne

---

#### **9. Panel Dodawania Wydatku (AddExpenseSheet)**

- **Wyzwalacz:** Centralny przycisk w głównej nawigacji.
- **Główny cel:** Zapewnienie najszybszej możliwej ścieżki do zarejestrowania nowego wydatku.
- **Kluczowe informacje:** Formularz z polami: kwota, kategoria, data, notatki.
- **Kluczowe komponenty:** `BottomSheet` (mobile), `Modal` (desktop), `AddTransactionForm`.
- **UX, dostępność i bezpieczeństwo:**
  - **UX:** Optymistyczna aktualizacja UI po dodaniu wydatku. Formularz jest zoptymalizowany pod kątem szybkiego wypełniania.
  - **Dostępność:** Focus jest "uwięziony" wewnątrz modala/panelu. Możliwość zamknięcia za pomocą klawisza `Esc`.
  - **Bezpieczeństwo:** Walidacja danych wejściowych po stronie klienta i serwera.

## 3. Mapa podróży użytkownika

Podstawowy przepływ pracy w aplikacji koncentruje się na regularnym monitorowaniu i aktualizowaniu budżetu.

**Scenariusz 1: Pierwsze logowanie i konfiguracja**

1. Użytkownik loguje się po raz pierwszy -> `LoginView`.
2. Zostaje przekierowany do `OnboardingView` (`/welcome`).
3. Przechodzi przez kreator: dodaje domowników, personalizuje kategorie.
4. Po zakończeniu onboardingu jest proszony o stworzenie pierwszego budżetu -> `BudgetWizardView` (`/new-budget`).
5. Wypełnia przychody i planowane wydatki.
6. Po zapisaniu zostaje przekierowany na `DashboardView` (`/`), gdzie widzi podsumowanie swojego nowo utworzonego budżetu.

**Scenariusz 2: Codzienne użytkowanie - dodanie wydatku**

1. Użytkownik otwiera aplikację i jest już zalogowany -> `DashboardView`.
2. Klika centralny przycisk "Dodaj Wydatek" w nawigacji.
3. Otwiera się `AddExpenseSheet`.
4. Wypełnia formularz i zapisuje transakcję.
5. Panel się zamyka, wyświetla się toast "Wydatek dodany", a dane na `DashboardView` są natychmiast (optymistycznie) aktualizowane.

**Scenariusz 3: Przeglądanie i edycja budżetu**

1. Użytkownik przechodzi do `TransactionHistoryView` (`/transactions`), aby sprawdzić historię wydatków.
2. Decyduje, że musi zmienić plan budżetu. Wraca na `DashboardView`.
3. Na widoku planu budżetu klika "Edytuj plan".
4. Interfejs przełącza się w tryb edycji, który jest częścią `BudgetWizardView`.
5. Użytkownik modyfikuje limity w kategoriach i zapisuje zmiany.
6. Widok ponownie przechodzi w tryb tylko do odczytu z zaktualizowanymi danymi.

## 4. Układ i struktura nawigacji

**Nawigacja główna:**

- Implementacja: `TabBar` (dół ekranu na mobile), `Sidebar` (lewa strona na desktopie).
- Elementy:
  - **Pulpit** (`/`): Domyślny widok po zalogowaniu.
  - **Transakcje** (`/transactions`): Widok historii wydatków.
  - **Dodaj Wydatek** (Przycisk Akcji): Otwiera `AddExpenseSheet/Modal`.
  - **Ustawienia** (`/settings`): Dostęp do konfiguracji aplikacji.

**Nawigacja drugorzędna:**

- **Ustawienia:** Wewnątrz `SettingsView` znajduje się `NavigationList` prowadząca do podstron (`/settings/members`, `/settings/categories`).
- **Nawigacja historyczna:** Na `DashboardView` komponent `HistoricalBudgetNavigator` pozwala przełączać się między miesiącami za pomocą strzałek oraz modala wyboru miesiąca/roku.

**Routing:**

- Każdy pełnoekranowy widok posiada unikalny, stały URL, co umożliwia głębokie linkowanie i korzystanie z historii przeglądarki.
- Stan kreatorów i formularzy jest zarządzany przez Zustand, a nie przez parametry URL, aby uprościć linki.

## 5. Kluczowe komponenty

Poniżej znajduje się lista reużywalnych komponentów-wrapperów, które zapewnią spójność wizualną i funkcjonalną w całej aplikacji.

- **`PrimaryButton`**: Standardowy przycisk akcji z obsługą stanu ładowania (wyświetla spinner).
- **`AmountInput`**: Pole formularza zoptymalizowane do wprowadzania kwot (walidacja, formatowanie, klawiatura numeryczna).
- **`CategoryProgressCard`**: Komponent na pulpicie, wyświetlający nazwę kategorii, pasek postępu i podsumowanie kwotowe.
- **`TransactionListItem`**: Element listy na stronie historii, wyświetlający szczegóły pojedynczej transakcji wraz z menu akcji (edytuj/usuń).
- **`ConfirmationModal`**: Generyczny modal używany do potwierdzania operacji destrukcyjnych (np. usunięcia), wymagający dodatkowej interakcji od użytkownika.
- **`UISkeletonLoader`**: Komponent wyświetlający szkielet interfejsu w miejscu danych, które są aktualnie ładowane z API.
- **`GlobalNotification`**: System toastów/snackbarów do informowania o sukcesach i błędach operacji API.
- **`FormError`**: Komponent do wyświetlania komunikatów o błędach walidacji pod polami formularzy.
