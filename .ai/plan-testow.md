# Plan Testów - Home Budget Planner

## 1. Wprowadzenie i Cele Testowania

### 1.1 Cel Dokumentu

Niniejszy dokument przedstawia kompleksowy plan testów dla aplikacji Home Budget Planner - aplikacji webowej typu "mobile-first" do zarządzania budżetem domowym. Plan uwzględnia specyfikę architektury opartej na Astro 5, React 19 oraz backend Supabase z PostgreSQL.

### 1.2 Cele Testowania

1. **Weryfikacja funkcjonalności** - Zapewnienie, że wszystkie funkcje określone w PRD działają zgodnie z wymaganiami
2. **Zapewnienie jakości** - Potwierdzenie wysokiej jakości kodu i niezawodności aplikacji
3. **Walidacja bezpieczeństwa** - Weryfikacja poprawności implementacji uwierzytelniania i autoryzacji
4. **Optymalizacja wydajności** - Potwierdzenie, że aplikacja działa płynnie na urządzeniach mobilnych
5. **Zapewnienie zgodności** - Weryfikacja zgodności z podejściem mobile-first i UX
6. **Minimalizacja regresji** - Wykrycie błędów przed wdrożeniem do produkcji

### 1.3 Zakres MVP

Plan testów koncentruje się na funkcjonalnościach MVP:

- Zarządzanie kontem użytkownika i gospodarstwem domowym
- Tworzenie i zarządzanie budżetem miesięcznym
- Śledzenie wydatków
- Wizualizacja stanu budżetu przez dashboard
- Przeglądanie historii transakcji i budżetów

## 2. Zakres Testów

### 2.1 W Zakresie Testów

#### 2.1.1 Moduł Uwierzytelniania i Autoryzacji

- Rejestracja użytkownika (email + hasło)
- Logowanie z opcją "Zapamiętaj mnie" (30 dni sesji)
- Resetowanie hasła
- Wylogowanie
- Ochrona tras przed nieautoryzowanym dostępem
- Walidacja sesji i tokenów JWT
- Automatyczne tworzenie gospodarstwa domowego dla nowego użytkownika

#### 2.1.2 Zarządzanie Gospodarstwem Domowym

- Wyświetlanie profilu gospodarstwa
- Aktualizacja nazwy gospodarstwa
- CRUD operacje na członkach gospodarstwa
- Soft-delete członków (zachowanie danych historycznych)
- CRUD operacje na kategoriach wydatków
- Walidacja unikalności kategorii (case-insensitive)
- Obsługa kaskadowego usuwania kategorii wraz z transakcjami

#### 2.1.3 Zarządzanie Budżetem Miesięcznym

- Tworzenie nowego budżetu dla wybranego miesiąca
- Wprowadzanie przychodów dla członków gospodarstwa
- Definiowanie planowanych wydatków dla kategorii
- Edycja istniejącego budżetu
- Obliczanie "Środków wolnych"
- Walidacja unikalności budżetu (jeden na miesiąc)
- Tryb edycji planu budżetu

#### 2.1.4 Śledzenie Transakcji

- Dodawanie nowych wydatków
- Edycja istniejących transakcji
- Usuwanie transakcji
- Walidacja kwot (tylko wartości dodatnie)
- Przypisywanie transakcji do kategorii i dat
- Opcjonalne notatki do transakcji

#### 2.1.5 Dashboard i Raportowanie

- Wyświetlanie podsumowania bieżącego budżetu
- Obliczanie postępu wydatków
- Wizualizacja limitów kategorii
- Sygnalizacja przekroczenia budżetu (kolory, statusy)
- Lista transakcji z paginacją
- Przeglądanie archiwalnych budżetów
- Nawigacja między miesiącami

#### 2.1.6 API Endpoints

Wszystkie endpointy REST API zgodnie z dokumentacją:

- Auth: `/api/auth/*`
- Household: `/api/household`
- Members: `/api/household-members/*`
- Categories: `/api/categories/*`
- Budgets: `/api/budgets/*`
- Incomes: `/api/budgets/{id}/incomes/*`
- Planned Expenses: `/api/budgets/{id}/planned-expenses/*`
- Transactions: `/api/transactions/*`
- Dashboard: `/api/dashboard/current`

#### 2.1.7 Baza Danych

- Integralność danych w PostgreSQL
- Row Level Security (RLS) policies
- Kaskadowe usuwanie powiązanych rekordów
- Triggery (np. auto-create household)
- Walidacja constraints
- Indeksy i wydajność zapytań

### 2.2 Poza Zakresem Testów

Zgodnie z ograniczeniami MVP, poza zakresem znajdują się:

- Współdzielenie budżetu między wieloma kontami użytkowników
- Upload i przechowywanie multimediów (skany, zdjęcia paragonów)
- Mechanizmy AI do analizy plików
- Integracja z pocztą email dla automatycznego importu
- Zaawansowane sortowanie i filtrowanie transakcji
- Onboarding i tutorial dla nowych użytkowników
- Transakcje ujemne (zwroty)

### 2.3 Priorytety Testowe

**P0 - Krytyczne** (Blokują release)

- Uwierzytelnianie i autoryzacja
- Tworzenie budżetu i dodawanie transakcji
- Dashboard - wyświetlanie podsumowania
- Security policies (RLS)

**P1 - Wysokie** (Konieczne dla MVP)

- Zarządzanie członkami i kategoriami
- Edycja budżetu i transakcji
- Historia transakcji
- Walidacja danych

**P2 - Średnie** (Ważne dla UX)

- Paginacja list
- Responsywność UI
- Komunikaty o błędach
- Optymalizacja wydajności

**P3 - Niskie** (Nice to have)

- Edge cases
- Testowanie różnych przeglądarek
- Accessibility

## 3. Typy Testów do Przeprowadzenia

### 3.1 Testy Jednostkowe (Unit Tests)

**Narzędzie:** Vitest (rekomendowane dla Astro) lub Jest

**Zakres:**

- Funkcje walidacji (Zod schemas w `src/lib/validation/`)
- Funkcje formatowania (`src/lib/formatters.ts`)
- Funkcje utility (`src/lib/utils.ts`)
- Custom hooks (`src/lib/hooks/`)
- Serwisy biznesowe (`src/lib/services/*.service.ts`)
- Funkcje SQL (`src/lib/sql.ts`)

**Cel:** Weryfikacja poprawności działania pojedynczych funkcji i modułów w izolacji.

**Przykładowe przypadki testowe:**

```typescript
// formatters.ts
- formatCurrency() poprawnie formatuje kwoty z separatorami
- formatDate() zwraca poprawny format daty
- formatMonth() zwraca czytelną nazwę miesiąca

// validation/budgets.ts
- Schema waliduje poprawne dane budżetu
- Schema odrzuca nieprawidłowe kwoty (ujemne, zero)
- Schema wymaga wymaganych pól

// services/budgets.service.ts
- createBudget() zwraca poprawny DTO
- getBudgetById() zwraca null dla nieistniejącego budżetu
- calculateFreeFunds() poprawnie oblicza środki wolne
```

**Metryka sukcesu:** Pokrycie kodu testami > 80% dla modułów logiki biznesowej.

### 3.2 Testy Integracyjne (Integration Tests)

**Narzędzie:** Vitest z Supabase Test Helpers lub testcontainers

**Zakres:**

- Integracja serwisów z bazą danych Supabase
- Middleware uwierzytelniania (`src/middleware/index.ts`)
- Endpointy API (`src/pages/api/*`)
- Row Level Security policies
- Triggery i funkcje bazy danych
- Kaskadowe usuwanie rekordów

**Cel:** Weryfikacja poprawności współpracy między warstwami aplikacji.

**Przykładowe przypadki testowe:**

```typescript
// API Integration Tests
- POST /api/auth/register tworzy użytkownika i automatycznie gospodarstwo
- GET /api/dashboard/current zwraca podsumowanie dla zalogowanego użytkownika
- DELETE /api/categories/{id}?force=true usuwa kategorię i powiązane transakcje
- POST /api/budgets tworzy budżet z incomami i planned expenses w jednej transakcji

// Database Integration Tests
- RLS policy blokuje dostęp do cudzych gospodarstw
- Trigger updated_at aktualizuje timestamp przy modyfikacji
- Constraint unikalności kategorii działa case-insensitive
- Kaskadowe usunięcie gospodarstwa usuwa wszystkie powiązane dane
```

**Metryka sukcesu:** Wszystkie kluczowe przepływy danych między warstwami działają poprawnie.

### 3.3 Testy Komponentów (Component Tests)

**Narzędzie:** React Testing Library + Vitest

**Zakres:**

- Komponenty UI z Shadcn/ui (`src/components/ui/`)
- Komponenty formularzy (`src/components/auth/`, `src/components/budget-wizard/`)
- Komponenty dashboard (`src/components/dashboard/`)
- Komponenty transakcji (`src/components/transactions/`)
- Custom hooks React (`src/components/*/use*.ts`)

**Cel:** Weryfikacja renderowania, interakcji użytkownika i stanów komponentów.

**Przykładowe przypadki testowe:**

```typescript
// LoginForm.tsx
- Renderuje formularz z polami email i password
- Waliduje format email
- Wyświetla błędy walidacji
- Wywołuje onSubmit z poprawnymi danymi
- Pokazuje loader podczas logowania

// CategoryProgressCard.tsx
- Wyświetla nazwę kategorii i postęp
- Zmienia kolor paska na czerwony przy przekroczeniu (status="over")
- Formatuje kwoty z separatorami

// TransactionForm.tsx
- Waliduje wymagane pola (amount, category)
- Domyślnie ustawia dzisiejszą datę
- Akceptuje tylko dodatnie kwoty
- Wyświetla listę kategorii w select
```

**Metryka sukcesu:** Wszystkie komponenty UI renderują się poprawnie i reagują na interakcje.

### 3.4 Testy End-to-End (E2E Tests)

**Narzędzie:** Playwright (wskazane w package.json)

**Zakres:**

- Kompletne user journey zgodnie z user stories z PRD
- Przepływy multi-step (kreator budżetu, dodawanie transakcji)
- Nawigacja między stronami
- Responsywność (mobile + desktop)
- Integracja z realną instancją Supabase (test environment)

**Cel:** Weryfikacja kompletnych przepływów biznesowych z perspektywy użytkownika końcowego.

**Przykładowe scenariusze testowe:**

#### US-001: Rejestracja nowego konta

```gherkin
Given użytkownik otwiera stronę rejestracji
When wypełnia formularz (email, hasło, powtórz hasło)
And kliknie "Zarejestruj się"
Then konto jest tworzone
And użytkownik jest automatycznie zalogowany
And zostaje przekierowany na pulpit główny
And gospodarstwo domowe jest automatycznie utworzone
```

#### US-002: Logowanie do aplikacji

```gherkin
Given użytkownik ma utworzone konto
When otwiera stronę logowania
And wprowadza poprawne dane
And zaznacza "Zapamiętaj mnie"
And kliknie "Zaloguj"
Then użytkownik jest zalogowany
And sesja trwa 30 dni
And zostaje przekierowany na dashboard
```

#### US-007 + US-008: Inicjalizacja budżetu na nowy miesiąc

```gherkin
Given użytkownik jest zalogowany
And dodał członków gospodarstwa
And dodał kategorie wydatków
When klika "Stwórz nowy budżet"
And wybiera miesiąc
And wprowadza przychody dla każdego członka
And klika "Dalej"
Then wyświetla się formularz planowania wydatków
When przypisuje limity do kategorii
And klika "Zapisz plan"
Then budżet jest utworzony
And wyświetla się podsumowanie na dashboardzie
And plan jest zablokowany (tylko do odczytu)
```

#### US-010: Dodawanie nowego wydatku

```gherkin
Given użytkownik ma aktywny budżet
When klika przycisk "Dodaj wydatek"
And wypełnia formularz (kwota, kategoria, data, notatka)
And klika "Zapisz"
Then transakcja jest dodana
And dashboard jest aktualizowany
And postęp kategorii jest przeliczany
And jeśli limit przekroczony, pasek zmienia kolor na czerwony
```

#### US-011: Przeglądanie pulpitu głównego

```gherkin
Given użytkownik ma aktywny budżet z transakcjami
When otwiera stronę główną
Then widzi ogólny pasek postępu
And widzi kwotę pozostałą do wydania
And widzi listę wszystkich kategorii
And każda kategoria ma własny pasek postępu
And widzi format "wydano X zł z Y zł"
And kategorie z przekroczonym limitem są czerwone
```

**Metryka sukcesu:** Wszystkie user stories z PRD przechodzą testy E2E bez błędów.

### 3.5 Testy Bezpieczeństwa (Security Tests)

**Narzędzie:** Manualne + narzędzia SAST (np. SonarQube, Snyk)

**Zakres:**

- Uwierzytelnianie JWT tokens (Supabase GoTrue)
- Row Level Security policies
- SQL Injection (przez Supabase client)
- XSS (Cross-Site Scripting)
- CSRF protection
- Bezpieczeństwo sesji
- Walidacja input danych (Zod schemas)
- Bezpieczne przechowywanie haseł (Supabase Auth)

**Przykładowe przypadki testowe:**

```typescript
// Authorization Tests
- Użytkownik A nie może odczytać danych użytkownika B
- Nieautoryzowany request do /api/* zwraca 401
- Token JWT wygasły jest odrzucany
- Middleware poprawnie przekierowuje na /login

// RLS Policy Tests
- SELECT z households zwraca tylko własne gospodarstwo
- UPDATE kategorii cudzego gospodarstwa jest blokowany
- DELETE transakcji innego użytkownika zwraca error

// Input Validation Tests
- API odrzuca niebezpieczne znaki w polach tekstowych
- Zod schema blokuje nieprawidłowe typy danych
- SQL injection próby są neutralizowane przez Supabase client
```

**Metryka sukcesu:** Brak krytycznych luk bezpieczeństwa, RLS policies działają poprawnie.

### 3.6 Testy Wydajnościowe (Performance Tests)

**Narzędzie:** Lighthouse, WebPageTest, k6 lub Artillery dla API

**Zakres:**

- Czas ładowania strony (FCP, LCP)
- Rozmiar bundle (JavaScript, CSS)
- Responsywność na urządzeniach mobilnych
- Wydajność zapytań do bazy danych
- Optymalizacja obrazów i assetów
- Lazy loading komponentów

**Przykładowe metryki:**

```
// Lighthouse Scores (Mobile)
- Performance: > 90
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 90

// Core Web Vitals
- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1

// API Response Times
- GET /api/dashboard/current: < 500ms
- POST /api/transactions: < 300ms
- GET /api/budgets (lista): < 1000ms

// Database Query Performance
- Dashboard summary query: < 200ms
- Transaction list (paginated): < 150ms
- Budget creation: < 500ms
```

**Metryka sukcesu:** Aplikacja spełnia standardy Core Web Vitals, API odpowiada poniżej 500ms.

### 3.7 Testy Regresji (Regression Tests)

**Narzędzie:** Playwright (automated E2E tests z CI/CD)

**Zakres:**

- Automatyczne uruchamianie testów E2E przy każdym PR
- Weryfikacja, że nowe zmiany nie psują istniejącej funkcjonalności
- Smoke tests dla krytycznych przepływów

**Cel:** Zapewnienie stabilności aplikacji podczas iteracji rozwojowych.

**Metryka sukcesu:** Regression test suite przechodzi na zielono przed każdym mergem do main.

### 3.8 Testy Akceptacyjne Użytkownika (UAT)

**Narzędzie:** Manualne testowanie z użytkownikami testowymi

**Zakres:**

- Weryfikacja zgodności z oczekiwaniami użytkowników
- Użyteczność interfejsu (UX)
- Intuicyjność nawigacji
- Czytelność komunikatów
- Mobile-first experience

**Cel:** Potwierdzenie, że aplikacja spełnia potrzeby użytkowników końcowych.

**Metryka sukcesu:** > 80% użytkowników testowych potrafi wykonać kluczowe zadania bez pomocy.

## 4. Scenariusze Testowe dla Kluczowych Funkcjonalności

### 4.1 Moduł Uwierzytelniania

#### TC-AUTH-001: Rejestracja z poprawnymi danymi

- **Priorytet:** P0
- **Warunki wstępne:** Użytkownik nie ma konta
- **Kroki:**
  1. Przejdź do `/register`
  2. Wprowadź email: `test@example.com`
  3. Wprowadź hasło: `SecurePass123!`
  4. Powtórz hasło: `SecurePass123!`
  5. Kliknij "Zarejestruj się"
- **Oczekiwany rezultat:**
  - Konto jest utworzone w Supabase Auth
  - Gospodarstwo domowe jest automatycznie utworzone (trigger)
  - Użytkownik jest zalogowany
  - Przekierowanie na `/` (dashboard)
  - Token JWT jest zapisany

#### TC-AUTH-002: Rejestracja z zajętym emailem

- **Priorytet:** P1
- **Warunki wstępne:** Użytkownik z emailem `test@example.com` już istnieje
- **Kroki:**
  1. Przejdź do `/register`
  2. Wprowadź email: `test@example.com`
  3. Wprowadź hasła
  4. Kliknij "Zarejestruj się"
- **Oczekiwany rezultat:**
  - Wyświetla się błąd "Email jest już zajęty"
  - Użytkownik pozostaje na stronie rejestracji
  - Konto nie jest tworzone

#### TC-AUTH-003: Logowanie z opcją "Zapamiętaj mnie"

- **Priorytet:** P0
- **Warunki wstępne:** Użytkownik ma aktywne konto
- **Kroki:**
  1. Przejdź do `/login`
  2. Wprowadź poprawne dane
  3. Zaznacz checkbox "Zapamiętaj mnie"
  4. Kliknij "Zaloguj"
- **Oczekiwany rezultat:**
  - Użytkownik jest zalogowany
  - Cookie sesji jest ustawiony na 30 dni
  - Przekierowanie na `/`
  - Po zamknięciu przeglądarki sesja pozostaje aktywna

#### TC-AUTH-004: Resetowanie hasła

- **Priorytet:** P1
- **Warunki wstępne:** Użytkownik ma konto z emailem `user@example.com`
- **Kroki:**
  1. Przejdź do `/login`
  2. Kliknij "Nie pamiętasz hasła?"
  3. Wprowadź email: `user@example.com`
  4. Kliknij "Wyślij link resetujący"
  5. Otwórz email z linkiem
  6. Kliknij link
  7. Wprowadź nowe hasło
  8. Zatwierdź
- **Oczekiwany rezultat:**
  - Email z linkiem resetującym jest wysłany
  - Link prowadzi do `/update-password`
  - Hasło jest zmienione
  - Użytkownik może zalogować się nowym hasłem

#### TC-AUTH-005: Ochrona tras przed nieautoryzowanym dostępem

- **Priorytet:** P0
- **Warunki wstępne:** Użytkownik nie jest zalogowany
- **Kroki:**
  1. Otwórz URL `/` bezpośrednio
  2. Spróbuj otworzyć `/transactions`
  3. Spróbuj otworzyć `/new-budget`
- **Oczekiwany rezultat:**
  - Każda próba dostępu przekierowuje na `/login`
  - Middleware blokuje dostęp
  - Po zalogowaniu użytkownik ma dostęp do wszystkich tras

### 4.2 Zarządzanie Gospodarstwem Domowym

#### TC-HOUSEHOLD-001: Dodawanie członka gospodarstwa

- **Priorytet:** P1
- **Warunki wstępne:** Użytkownik jest zalogowany
- **Kroki:**
  1. API: POST `/api/household-members`
  2. Body: `{ "fullName": "Jan Kowalski" }`
- **Oczekiwany rezultat:**
  - Status 201 Created
  - Header `X-Result-Code: MEMBER_CREATED`
  - Response zawiera `HouseholdMemberDto` z ID, fullName, isActive=true
  - Rekord w bazie `household_members`

#### TC-HOUSEHOLD-002: Soft-delete członka gospodarstwa

- **Priorytet:** P1
- **Warunki wstępne:** Członek "Jan Kowalski" istnieje, ma przypisane przychody w budżecie
- **Kroki:**
  1. API: PATCH `/api/household-members/{id}`
  2. Body: `{ "isActive": false }`
- **Oczekiwany rezultat:**
  - Status 200 OK
  - `isActive` jest ustawione na `false`
  - Historyczne dane (incomes) pozostają nienaruszone
  - Członek nie pojawia się w liście aktywnych

#### TC-HOUSEHOLD-003: Dodawanie kategorii wydatków

- **Priorytet:** P1
- **Warunki wstępne:** Użytkownik jest zalogowany
- **Kroki:**
  1. API: POST `/api/categories`
  2. Body: `{ "name": "Transport" }`
- **Oczekiwany rezultat:**
  - Status 201 Created
  - Header `X-Result-Code: CATEGORY_CREATED`
  - Response zawiera `CategoryDto`
  - Kategoria widoczna w dropdown formularzy

#### TC-HOUSEHOLD-004: Walidacja unikalności kategorii (case-insensitive)

- **Priorytet:** P1
- **Warunki wstępne:** Kategoria "Transport" już istnieje
- **Kroki:**
  1. API: POST `/api/categories`
  2. Body: `{ "name": "TRANSPORT" }`
- **Oczekiwany rezultat:**
  - Status 409 Conflict
  - Header `X-Result-Code: CATEGORY_NAME_CONFLICT`
  - Komunikat o duplikacie
  - Kategoria nie jest dodana

#### TC-HOUSEHOLD-005: Usuwanie kategorii z transakcjami (force=true)

- **Priorytet:** P1
- **Warunki wstępne:** Kategoria "Żywność" ma 5 powiązanych transakcji
- **Kroki:**
  1. API: DELETE `/api/categories/{id}?force=true`
- **Oczekiwany rezultat:**
  - Status 204 No Content
  - Kategoria jest usunięta
  - Wszystkie 5 transakcji jest usunięte (kaskadowo)
  - Środki zaplanowane dla kategorii wracają do "Środków wolnych"

### 4.3 Zarządzanie Budżetem

#### TC-BUDGET-001: Tworzenie budżetu na nowy miesiąc

- **Priorytet:** P0
- **Warunki wstępne:** Użytkownik ma członków i kategorie, brak budżetu na 2025-10
- **Kroki:**
  1. API: POST `/api/budgets`
  2. Body:
     ```json
     {
       "month": "2025-10-01",
       "note": "Budżet październik",
       "incomes": [
         { "householdMemberId": "uuid-1", "amount": 5000 },
         { "householdMemberId": "uuid-2", "amount": 3000 }
       ],
       "plannedExpenses": [
         { "categoryId": "uuid-cat-1", "limitAmount": 2000 },
         { "categoryId": "uuid-cat-2", "limitAmount": 1500 }
       ]
     }
     ```
- **Oczekiwany rezultat:**
  - Status 201 Created
  - Header `X-Result-Code: BUDGET_CREATED`
  - Budżet utworzony w tabeli `budgets`
  - 2 rekordy w `incomes`
  - 2 rekordy w `planned_expenses`
  - Podsumowanie: totalIncome=8000, totalPlanned=3500, freeFunds=4500

#### TC-BUDGET-002: Próba utworzenia duplikatu budżetu na ten sam miesiąc

- **Priorytet:** P1
- **Warunki wstępne:** Budżet na 2025-10 już istnieje
- **Kroki:**
  1. API: POST `/api/budgets`
  2. Body: `{ "month": "2025-10-01" }`
- **Oczekiwany rezultat:**
  - Status 409 Conflict
  - Header `X-Result-Code: BUDGET_MONTH_CONFLICT`
  - Budżet nie jest tworzony

#### TC-BUDGET-003: Edycja istniejącego budżetu (notatka)

- **Priorytet:** P2
- **Warunki wstępne:** Budżet na 2025-10 istnieje
- **Kroki:**
  1. API: PATCH `/api/budgets/{id}`
  2. Body: `{ "note": "Budżet poprawiony" }`
- **Oczekiwany rezultat:**
  - Status 200 OK
  - Pole `note` jest zaktualizowane
  - `updated_at` jest zaktualizowany (trigger)

#### TC-BUDGET-004: Upsert przychodów (aktualizacja kwot)

- **Priorytet:** P1
- **Warunki wstępne:** Budżet z dwoma przychodami istnieje
- **Kroki:**
  1. API: POST `/api/budgets/{id}/incomes`
  2. Body:
     ```json
     {
       "incomes": [
         { "householdMemberId": "uuid-1", "amount": 5500 },
         { "householdMemberId": "uuid-2", "amount": 3500 }
       ]
     }
     ```
- **Oczekiwany rezultat:**
  - Status 200 OK
  - Istniejące rekordy są aktualizowane (nie duplikowane)
  - totalIncome przeliczone na 9000

#### TC-BUDGET-005: Upsert planowanych wydatków

- **Priorytet:** P1
- **Warunki wstępne:** Budżet z planned_expenses istnieje
- **Kroki:**
  1. API: POST `/api/budgets/{id}/planned-expenses`
  2. Body:
     ```json
     {
       "plannedExpenses": [
         { "categoryId": "uuid-cat-1", "limitAmount": 2500 },
         { "categoryId": "uuid-cat-3", "limitAmount": 800 }
       ]
     }
     ```
- **Oczekiwany rezultat:**
  - Status 200 OK
  - Kategoria 1 jest zaktualizowana
  - Kategoria 3 jest dodana
  - totalPlanned przeliczone

#### TC-BUDGET-006: Pobieranie podsumowania budżetu

- **Priorytet:** P0
- **Warunki wstępne:** Budżet z transakcjami istnieje
- **Kroki:**
  1. API: GET `/api/budgets/{id}/summary?includeCategories=true`
- **Oczekiwany rezultat:**
  - Status 200 OK
  - Response zawiera `BudgetSummaryResponseDto`:
    - budgetId, month
    - totalIncome, totalPlanned, totalSpent, freeFunds
    - progress (np. 0.65)
    - perCategory[] z danymi każdej kategorii (spent, limitAmount, progress, status)

### 4.4 Śledzenie Transakcji

#### TC-TRANSACTION-001: Dodawanie transakcji z wszystkimi polami

- **Priorytet:** P0
- **Warunki wstępne:** Aktywny budżet z kategorią "Żywność" istnieje
- **Kroki:**
  1. API: POST `/api/budgets/{budgetId}/transactions`
  2. Body:
     ```json
     {
       "categoryId": "uuid-zywnosc",
       "amount": 150.5,
       "transactionDate": "2025-10-15",
       "note": "Zakupy w Biedronce"
     }
     ```
- **Oczekiwany rezultat:**
  - Status 201 Created
  - Header `X-Result-Code: TRANSACTION_CREATED`
  - Response zawiera `TransactionDto` z wypełnionymi polami
  - Transakcja w bazie

#### TC-TRANSACTION-002: Walidacja kwoty - tylko wartości dodatnie

- **Priorytet:** P1
- **Warunki wstępne:** Aktywny budżet istnieje
- **Kroki:**
  1. API: POST `/api/budgets/{budgetId}/transactions`
  2. Body: `{ "amount": -50, "categoryId": "uuid", "transactionDate": "2025-10-15" }`
- **Oczekiwany rezultat:**
  - Status 400 Bad Request
  - Header `X-Result-Code: INVALID_AMOUNT`
  - Komunikat o nieprawidłowej kwocie
  - Transakcja nie jest dodana

#### TC-TRANSACTION-003: Edycja istniejącej transakcji

- **Priorytet:** P1
- **Warunki wstępne:** Transakcja o ID "txn-123" istnieje
- **Kroki:**
  1. API: PATCH `/api/transactions/txn-123`
  2. Body:
     ```json
     {
       "amount": 175.0,
       "note": "Zaktualizowana notatka"
     }
     ```
- **Oczekiwany rezultat:**
  - Status 200 OK
  - Pola amount i note są zaktualizowane
  - Podsumowanie kategorii jest przeliczone
  - Dashboard odzwierciedla nową kwotę

#### TC-TRANSACTION-004: Usuwanie transakcji

- **Priorytet:** P1
- **Warunki wstępne:** Transakcja "txn-456" istnieje
- **Kroki:**
  1. API: DELETE `/api/transactions/txn-456`
- **Oczekiwany rezultat:**
  - Status 204 No Content
  - Transakcja usunięta z bazy
  - Podsumowanie kategorii zaktualizowane
  - totalSpent przeliczone

#### TC-TRANSACTION-005: Lista transakcji z paginacją

- **Priorytet:** P1
- **Warunki wstępne:** Budżet ma 25 transakcji
- **Kroki:**
  1. API: GET `/api/budgets/{budgetId}/transactions?page=1&pageSize=10`
- **Oczekiwany rezultat:**
  - Status 200 OK
  - Response zawiera `TransactionsListResponseDto`:
    - data[] - 10 transakcji
    - meta: { page: 1, pageSize: 10, totalItems: 25, totalPages: 3 }
  - Transakcje posortowane od najnowszej (DESC transaction_date)

### 4.5 Dashboard i Raportowanie

#### TC-DASHBOARD-001: Podsumowanie bieżącego miesiąca

- **Priorytet:** P0
- **Warunki wstępne:** Użytkownik ma aktywny budżet na bieżący miesiąc z transakcjami
- **Kroki:**
  1. API: GET `/api/dashboard/current`
- **Oczekiwany rezultat:**
  - Status 200 OK
  - Header `X-Result-Code: DASHBOARD_SUMMARY`
  - Response zawiera `DashboardSummaryDto`:
    - currentBudgetId
    - month (np. "2025-10-01")
    - totalIncome (suma wszystkich incomes)
    - totalPlanned (suma limitAmount)
    - totalSpent (suma transactions)
    - freeFunds (totalIncome - totalPlanned)
    - progress (totalSpent / totalIncome)
    - categories[] - lista z statusami:
      - status: "ok" gdy spent < limitAmount \* 0.8
      - status: "warning" gdy spent >= 0.8 i < limitAmount
      - status: "over" gdy spent > limitAmount

#### TC-DASHBOARD-002: Brak aktywnego budżetu

- **Priorytet:** P1
- **Warunki wstępne:** Użytkownik nie ma budżetu na bieżący miesiąc
- **Kroki:**
  1. API: GET `/api/dashboard/current`
- **Oczekiwany rezultat:**
  - Status 404 Not Found
  - Header `X-Result-Code: BUDGET_NOT_FOUND`
  - Komunikat zachęcający do utworzenia budżetu

#### TC-DASHBOARD-003: Sygnalizacja przekroczenia budżetu w kategorii

- **Priorytet:** P1
- **Warunki wstępne:** Kategoria "Transport" ma limit 500 zł, wydano 550 zł
- **Kroki:**
  1. Pobierz dashboard
  2. Sprawdź kategorię "Transport"
- **Oczekiwany rezultat:**
  - Kategoria ma status: "over"
  - UI wyświetla pasek postępu w kolorze czerwonym
  - progress > 1.0 (np. 1.1)
  - spent = 550, limitAmount = 500

#### TC-DASHBOARD-004: Obliczanie środków wolnych

- **Priorytet:** P1
- **Warunki wstępne:** totalIncome = 8000, totalPlanned = 6500
- **Kroki:**
  1. Pobierz podsumowanie budżetu
- **Oczekiwany rezultat:**
  - freeFunds = 1500 (8000 - 6500)
  - Wartość wyświetlana na dashboardzie
  - Po dodaniu nowej kategorii z limitem 1000, freeFunds = 500

### 4.6 Przepływy Wieloetapowe (User Journeys)

#### TC-JOURNEY-001: Kompletny przepływ nowego użytkownika

- **Priorytet:** P0
- **Opis:** Symulacja pełnego użycia aplikacji przez nowego użytkownika
- **Kroki:**
  1. **Rejestracja**
     - POST `/api/auth/register`
     - Email: `newuser@test.com`, password: `Test123!`
     - Weryfikuj: konto utworzone, gospodarstwo automatycznie utworzone
  2. **Dodanie członków gospodarstwa**
     - POST `/api/household-members` → "Anna" (5000 zł)
     - POST `/api/household-members` → "Jan" (3500 zł)
  3. **Dodanie kategorii**
     - POST `/api/categories` → "Żywność"
     - POST `/api/categories` → "Transport"
     - POST `/api/categories` → "Rachunki"
  4. **Utworzenie budżetu**
     - POST `/api/budgets`
     - Month: "2025-10-01"
     - Incomes: Anna 5000, Jan 3500
     - PlannedExpenses: Żywność 2000, Transport 800, Rachunki 1200
  5. **Dodanie transakcji**
     - POST `/api/budgets/{id}/transactions` → Żywność 450 zł
     - POST `/api/budgets/{id}/transactions` → Transport 120 zł
     - POST `/api/budgets/{id}/transactions` → Rachunki 350 zł
  6. **Sprawdzenie dashboardu**
     - GET `/api/dashboard/current`
     - Weryfikuj: totalIncome=8500, totalPlanned=4000, totalSpent=920, freeFunds=4500
  7. **Edycja transakcji**
     - PATCH `/api/transactions/{id}` → Zmień kwotę Żywność na 500
     - Weryfikuj przeliczenie
  8. **Przeglądanie historii**
     - GET `/api/budgets/{id}/transactions`
     - Weryfikuj listę 3 transakcji

- **Oczekiwany rezultat:**
  - Wszystkie operacje kończą się sukcesem
  - Dane są spójne na każdym etapie
  - Dashboard wyświetla aktualne podsumowanie

## 5. Środowisko Testowe

### 5.1 Środowiska

#### Środowisko Lokalne (Development)

- **Cel:** Testy jednostkowe, integracyjne podczas rozwoju
- **Baza danych:** Supabase Local (Docker via `supabase start`)
- **Konfiguracja:**
  - Node.js v22.14.0
  - Astro dev server (`npm run dev`)
  - Supabase CLI dla migracji
- **Dostęp:** `http://localhost:4321`

#### Środowisko Testowe (Staging)

- **Cel:** Testy E2E, UAT przed wdrożeniem
- **Baza danych:** Supabase Project (dedykowana instancja testowa)
- **Konfiguracja:**
  - Deployment na DigitalOcean (staging)
  - Dane testowe seedowane przez skrypty
  - Izolacja od produkcji
- **Dostęp:** `https://staging.home-budget-planner.app` (przykład)

#### Środowisko Produkcyjne (Production)

- **Cel:** Smoke tests, monitoring po wdrożeniu
- **Baza danych:** Supabase Project (produkcja)
- **Konfiguracja:**
  - DigitalOcean production deployment
  - Supabase Edge Functions
  - CI/CD przez GitHub Actions
- **Dostęp:** `https://home-budget-planner.app` (przykład)

### 5.2 Dane Testowe

#### Seed Data dla Testów

Przygotować skrypty SQL do seedowania testowych danych:

```sql
-- User: test@example.com / Test123!
-- Household: "Rodzina Kowalskich"
-- Members: Anna (5000), Jan (3500), Zosia (2000)
-- Categories: Żywność, Transport, Rachunki, Rozrywka, Oszczędności
-- Budgets:
--   - 2025-09-01 (kompletny z transakcjami)
--   - 2025-10-01 (aktywny)
-- Transactions: 20+ różnorodnych transakcji w różnych kategoriach
```

#### Strategie Danych Testowych

- **Testy jednostkowe:** Mock data, stubs
- **Testy integracyjne:** Transaction rollback lub setup/teardown
- **Testy E2E:** Dedykowane konta testowe, automatyczne czyszczenie po testach
- **UAT:** Realistyczne dane zbliżone do prawdziwych przypadków użycia

### 5.3 Narzędzia Testowe

| Kategoria         | Narzędzie                | Przeznaczenie                    |
| ----------------- | ------------------------ | -------------------------------- |
| Test Runner       | Vitest                   | Testy jednostkowe i integracyjne |
| E2E               | Playwright               | Testy end-to-end, UI automation  |
| Component Testing | React Testing Library    | Testowanie komponentów React     |
| API Testing       | Playwright lub Supertest | Testowanie endpointów API        |
| Coverage          | Vitest Coverage (c8)     | Raportowanie pokrycia kodu       |
| Linting           | ESLint                   | Jakość kodu, wykrywanie błędów   |
| Type Checking     | TypeScript               | Walidacja typów                  |
| Database          | Supabase CLI             | Migracje, seedowanie danych      |
| CI/CD             | GitHub Actions           | Automatyzacja testów             |
| Performance       | Lighthouse CLI           | Audyt wydajności                 |
| Security          | Snyk / SonarQube         | Skanowanie podatności            |

### 5.4 Infrastruktura CI/CD

#### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  pull_request:
  push:
    branches: [main, master]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run lint

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:unit
      - run: npm run coverage

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase start
      - run: npm ci
      - run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-screenshots
          path: test-results/
```

## 6. Narzędzia do Testowania

### 6.1 Vitest - Test Runner

**Konfiguracja:**

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./test/setup.ts",
    coverage: {
      provider: "c8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "test/", "**/*.d.ts", "**/*.config.*"],
    },
  },
});
```

**Użycie:**

```bash
npm run test:unit         # Testy jednostkowe
npm run test:integration  # Testy integracyjne
npm run coverage          # Raport pokrycia
```

### 6.2 Playwright - E2E Testing

**Konfiguracja:**

```typescript
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:4321",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 13"] },
    },
  ],
  webServer: {
    command: "npm run preview",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
  },
});
```

**Przykładowy test E2E:**

```typescript
// e2e/auth/login.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Login Flow", () => {
  test("should login successfully with valid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.fill('input[name="email"]', "test@example.com");
    await page.fill('input[name="password"]', "Test123!");
    await page.check('input[name="remember"]');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL("/");
    await expect(page.locator("h1")).toContainText("Dashboard");
  });
});
```

### 6.3 React Testing Library

**Przykładowy test komponentu:**

```typescript
// src/components/auth/LoginForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('validates email format', async () => {
    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /zaloguj/i });

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/nieprawidłowy format email/i)).toBeInTheDocument();
    });
  });
});
```

### 6.4 Supabase Test Helpers

**Setup dla testów integracyjnych:**

```typescript
// test/helpers/supabase.helper.ts
import { createClient } from "@supabase/supabase-js";

export const createTestSupabaseClient = () => {
  return createClient(process.env.SUPABASE_TEST_URL!, process.env.SUPABASE_TEST_ANON_KEY!);
};

export const cleanupTestData = async (userId: string) => {
  const supabase = createTestSupabaseClient();

  // Cascade delete via RLS
  await supabase.from("households").delete().eq("user_id", userId);
};

export const seedTestData = async (userId: string) => {
  const supabase = createTestSupabaseClient();

  // Create household, members, categories, budgets
  // ...
};
```

### 6.5 Lighthouse CLI

**Audyt wydajności:**

```bash
# Instalacja
npm install -g @lhci/cli

# Uruchomienie audytu
lhci autorun --config=lighthouserc.js

# lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:4321/'],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
      },
    },
  },
};
```

## 7. Harmonogram Testów

### 7.1 Fazy Testowania

| Faza               | Typy Testów                        | Czas Trwania | Odpowiedzialny     |
| ------------------ | ---------------------------------- | ------------ | ------------------ |
| **Sprint N**       | Unit tests (nowe funkcje)          | Ongoing      | Deweloperzy        |
| **Sprint N+1**     | Integration tests, Component tests | 2 dni        | Deweloperzy + QA   |
| **Pre-release**    | E2E tests, Regression              | 3 dni        | QA Team            |
| **Staging**        | UAT, Performance, Security         | 1 tydzień    | QA + Product Owner |
| **Pre-production** | Smoke tests                        | 1 dzień      | QA Lead            |
| **Post-release**   | Monitoring, Smoke tests            | Ongoing      | DevOps + QA        |

### 7.2 Milestone Testowy MVP

#### Tydzień 1-2: Setup Testów

- [ ] Konfiguracja Vitest i Playwright
- [ ] Setup CI/CD pipeline (GitHub Actions)
- [ ] Przygotowanie środowisk testowych
- [ ] Seedowanie danych testowych
- [ ] Napisanie pierwszych testów jednostkowych

#### Tydzień 3-4: Testy Jednostkowe i Integracyjne

- [ ] Testy walidacji (Zod schemas)
- [ ] Testy serwisów biznesowych
- [ ] Testy middleware
- [ ] Testy API endpoints
- [ ] Testy RLS policies

#### Tydzień 5-6: Testy Komponentów

- [ ] Testy komponentów UI (Shadcn)
- [ ] Testy formularzy
- [ ] Testy dashboard components
- [ ] Testy navigation
- [ ] Testy hooks

#### Tydzień 7-8: Testy E2E

- [ ] User stories: US-001 do US-004 (Auth)
- [ ] User stories: US-005 do US-006 (Household)
- [ ] User stories: US-007 do US-009 (Budget)
- [ ] User stories: US-010 (Transactions)
- [ ] User stories: US-011 do US-013 (Dashboard, History)

#### Tydzień 9: Testy Wydajności i Bezpieczeństwa

- [ ] Lighthouse audits (mobile + desktop)
- [ ] Load testing API endpoints
- [ ] Security audit (SAST)
- [ ] RLS policies penetration test
- [ ] Optymalizacja wykrytych bottlenecków

#### Tydzień 10: UAT i Finalizacja

- [ ] User Acceptance Testing z użytkownikami testowymi
- [ ] Regression test suite (pełny przebieg)
- [ ] Dokumentacja wyników testów
- [ ] Bug fixing
- [ ] Final smoke tests

### 7.3 Cykl Testów w CI/CD

**Przy każdym Pull Request:**

1. Linting (ESLint) - 1 min
2. Type checking (TypeScript) - 2 min
3. Unit tests - 3-5 min
4. Integration tests - 5-8 min
5. Build verification - 2 min

**Przy merge do main:**

1. Wszystkie powyższe
2. E2E tests (kluczowe scenariusze) - 10-15 min
3. Deployment do staging
4. Smoke tests na staging - 5 min

**Przed release do produkcji:**

1. Pełny regression test suite - 30-45 min
2. Performance tests - 15 min
3. Security scan - 10 min
4. Manual UAT sign-off

## 8. Kryteria Akceptacji Testów

### 8.1 Definicja "Gotowe do Wdrożenia" (Done)

Aplikacja jest gotowa do wdrożenia na produkcję, gdy:

#### Krytyczne (Muszą być spełnione - P0)

- [ ] ✅ Wszystkie testy jednostkowe przechodzą (0 failures)
- [ ] ✅ Wszystkie testy integracyjne przechodzą
- [ ] ✅ Wszystkie testy E2E dla user stories P0 przechodzą
- [ ] ✅ Pokrycie kodu testami > 80% dla logiki biznesowej
- [ ] ✅ Wszystkie endpointy API zwracają poprawne statusy HTTP
- [ ] ✅ RLS policies działają poprawnie (brak dostępu do cudzych danych)
- [ ] ✅ Middleware autoryzacji blokuje nieautoryzowany dostęp
- [ ] ✅ Brak krytycznych błędów bezpieczeństwa (SAST scan pass)
- [ ] ✅ Lighthouse Performance Score > 85 (mobile)
- [ ] ✅ Brak błędów w konsoli przeglądarki
- [ ] ✅ Aplikacja działa na Chrome, Firefox, Safari

#### Wysokie (Powinny być spełnione - P1)

- [ ] ✅ Wszystkie testy E2E dla user stories P1 przechodzą
- [ ] ✅ Walidacja formularzy działa poprawnie
- [ ] ✅ Komunikaty o błędach są czytelne i pomocne
- [ ] ✅ Responsywność UI na mobile (< 768px) jest poprawna
- [ ] ✅ Accessibility Score > 90
- [ ] ✅ API response time < 500ms (p95)

#### Średnie (Pożądane - P2)

- [ ] ⚠️ UAT z użytkownikami testowymi zakończony sukcesem
- [ ] ⚠️ Dokumentacja API jest aktualna
- [ ] ⚠️ Brak ostrzeżeń w ESLint
- [ ] ⚠️ SEO Score > 90

### 8.2 Metryki Jakości

#### Code Coverage

- **Cel:** > 80% dla logiki biznesowej
- **Minimalny próg:** > 60% (blokuje merge)
- **Zakres:**
  - Services: > 90%
  - Validation: > 95%
  - API handlers: > 80%
  - Components: > 70%

#### Test Success Rate

- **Cel:** 100% testów przechodzi
- **Tolerancja:** Flaky tests < 1% (retry pass)
- **Action:** Jeśli > 1% flaky → investigate and fix

#### Bug Escape Rate

- **Cel:** < 5% bugów wykrytych na produkcji
- **Pomiar:** Liczba bugów znalezionych w produkcji / Total bugs
- **Action:** Jeśli > 5% → wzmocnić testy regresji

#### Performance Metrics

- **Lighthouse Performance:** > 90 (target), > 85 (min)
- **API Response Time (p95):** < 500ms
- **LCP:** < 2.5s
- **FID:** < 100ms
- **CLS:** < 0.1

### 8.3 Exit Criteria

**Testy mogą być zakończone, gdy:**

1. Wszystkie zaplanowane testy zostały wykonane
2. Kryteria akceptacji są spełnione (P0 + P1)
3. Wszystkie krytyczne i wysokie bugi są naprawione
4. Regression test suite przeszedł na zielono
5. UAT został zaakceptowany przez Product Ownera
6. Performance i security audits nie wykazały krytycznych problemów
7. Dokumentacja jest aktualna

**Blokery wdrożenia (Stopper Issues):**

- Critical security vulnerability
- Data loss bug
- Authentication bypass
- Payment/financial calculation error (jeśli dotyczy)
- Crash na głównym przepływie (login, create budget, add transaction)

## 9. Role i Odpowiedzialności w Procesie Testowania

### 9.1 Zespół Projektowy

#### Deweloperzy (Developers)

**Odpowiedzialności:**

- Pisanie testów jednostkowych dla nowych funkcji (coverage > 80%)
- Naprawianie bugów wykrytych przez testy
- Code review z perspektywy testowalności
- Utrzymanie testów w stanie "zielonym"
- Lokalne uruchamianie testów przed commitem
- Refactoring testów wraz z kodem

**Deliverables:**

- Unit tests dla każdej nowej funkcji
- Integration tests dla API endpoints
- Test fixtures i mock data

#### QA Engineer

**Odpowiedzialności:**

- Projektowanie test cases i test scenarios
- Pisanie testów E2E (Playwright)
- Wykonywanie testów manualnych (exploratory testing)
- Raportowanie i śledzenie bugów
- Weryfikacja poprawek (regression testing)
- UAT z użytkownikami testowymi
- Utrzymanie środowiska testowego
- Analiza wyników testów z CI/CD

**Deliverables:**

- Test plan (ten dokument)
- Test cases dla wszystkich user stories
- E2E test suite
- Bug reports
- Test summary reports

#### Tech Lead / Architect

**Odpowiedzialności:**

- Review strategii testowej
- Zapewnienie testowalności architektury
- Nadzór nad jakością kodu i testów
- Decyzje o akceptacji ryzyka
- Wsparcie w trudnych przypadkach testowych

**Deliverables:**

- Approval test planu
- Guidelines dotyczące testowania
- Code review z perspektywy jakości

#### DevOps Engineer

**Odpowiedzialności:**

- Konfiguracja CI/CD pipeline (GitHub Actions)
- Setup środowisk testowych (staging)
- Monitoring testów w CI/CD
- Optymalizacja czasu wykonania testów
- Setup coverage reporting

**Deliverables:**

- CI/CD workflow
- Test environment infrastructure
- Automated deployment scripts

#### Product Owner

**Odpowiedzialności:**

- Definiowanie acceptance criteria
- Priorytetyzacja testów (P0, P1, P2)
- Uczestnictwo w UAT
- Akceptacja wyników testów
- Go/No-go decision dla release

**Deliverables:**

- Acceptance criteria (w user stories)
- UAT sign-off
- Release approval

### 9.2 Matryca RACI

| Zadanie               | Dev | QA  | Tech Lead | DevOps | PO  |
| --------------------- | --- | --- | --------- | ------ | --- |
| **Test Plan**         | C   | R   | A         | I      | I   |
| **Unit Tests**        | R/A | C   | R         | I      | I   |
| **Integration Tests** | R/A | C   | R         | I      | I   |
| **Component Tests**   | R/A | C   | R         | I      | I   |
| **E2E Tests**         | C   | R/A | R         | C      | I   |
| **UAT**               | I   | R   | I         | I      | A   |
| **Bug Fixing**        | R/A | C   | R         | I      | I   |
| **CI/CD Setup**       | C   | C   | R         | R/A    | I   |
| **Test Environment**  | I   | C   | R         | R/A    | I   |
| **Coverage Analysis** | R   | R   | A         | C      | I   |
| **Release Decision**  | I   | C   | C         | I      | R/A |

**Legenda:**

- **R** (Responsible) - Wykonuje zadanie
- **A** (Accountable) - Ostatecznie odpowiedzialny
- **C** (Consulted) - Konsultowany
- **I** (Informed) - Informowany

### 9.3 Komunikacja i Raportowanie

#### Daily Standup (zespół deweloperski)

- Status testów (ile przechodzi/failuje)
- Blokery w testach
- Nowe bugi wykryte

#### Tygodniowy Test Status Report

**Format:**

```markdown
# Test Status Report - Tydzień X

## Podsumowanie

- Testy wykonane: X / Y
- Testy passed: X (XX%)
- Testy failed: X (XX%)
- Coverage: XX%

## Wykonane

- [x] Task 1
- [x] Task 2

## W trakcie

- [ ] Task 3

## Blokery

- Bloker 1 (owner: John, ETA: 2 dni)

## Bugi

- 5 Critical (0 open, 5 fixed)
- 8 High (2 open, 6 fixed)
- 12 Medium (5 open, 7 fixed)

## Ryzyka

- Ryzyko 1: Delay w testach E2E ze względu na brak środowiska staging
```

#### Pre-release Test Summary

- Raport ze wszystkich typów testów
- Coverage metrics
- Performance benchmarks
- Security audit results
- UAT feedback
- Rekomendacja: Go / No-go

## 10. Procedury Raportowania Błędów

### 10.1 Szablon Raportu Błędu

```markdown
## [BUG-XXX] Krótki tytuł błędu

### Priorytet

- [ ] Critical (P0) - Blokuje release, crash, data loss, security
- [ ] High (P1) - Główna funkcjonalność nie działa
- [ ] Medium (P2) - Funkcjonalność działa, ale z ograniczeniami
- [ ] Low (P3) - Kosmetyczne, edge cases

### Typ

- [ ] Functional
- [ ] UI/UX
- [ ] Performance
- [ ] Security
- [ ] Data Integrity

### Środowisko

- **OS:** macOS / Windows / Linux
- **Browser:** Chrome 120 / Firefox 121 / Safari 17
- **Environment:** Local / Staging / Production
- **URL:** https://...

### Kroki do Reprodukcji

1. Przejdź do /login
2. Wprowadź email: test@example.com
3. Wprowadź hasło: Test123!
4. Kliknij "Zaloguj"

### Oczekiwany Rezultat

Użytkownik powinien zostać zalogowany i przekierowany na dashboard.

### Faktyczny Rezultat

Wyświetla się błąd "Invalid credentials" mimo poprawnych danych.

### Screenshoty/Logi
```

Error in console:
POST /api/auth/login 401 Unauthorized
{"error":{"code":"INVALID_CREDENTIALS","message":"..."}}

```
![Screenshot](link)

### Dodatkowe Informacje
- Błąd występuje tylko dla użytkowników z nowym hasłem
- Workaround: Reset hasła rozwiązuje problem
- Related to: BUG-045

### Środowisko Techniczne
- **User ID:** uuid-123
- **Request ID:** req-456
- **Timestamp:** 2025-10-15T14:30:00Z
```

### 10.2 Workflow Obsługi Błędów

```
1. OPEN (nowy bug)
   ↓
2. TRIAGED (QA weryfikuje i priorytetyzuje)
   ↓
3. ASSIGNED (przypisany do dewelopera)
   ↓
4. IN PROGRESS (deweloper pracuje)
   ↓
5. FIXED (fix w PR)
   ↓
6. READY FOR TEST (PR zmergeowany)
   ↓
7. VERIFIED (QA potwierdza fix)
   ↓
8. CLOSED
```

**Lub:**

```
2. TRIAGED → INVALID / DUPLICATE / WON'T FIX → CLOSED
```

### 10.3 Severity Levels i SLA

| Priorytet       | Opis                                                 | Response Time | Resolution Time |
| --------------- | ---------------------------------------------------- | ------------- | --------------- |
| **P0 Critical** | App crash, data loss, security breach, payment error | 1 godzina     | 24 godziny      |
| **P1 High**     | Główna funkcja nie działa (login, add transaction)   | 4 godziny     | 3 dni           |
| **P2 Medium**   | Funkcja działa z ograniczeniami, workaround istnieje | 1 dzień       | 1 tydzień       |
| **P3 Low**      | Kosmetyczne, edge cases, minor UX issues             | 3 dni         | 2 tygodnie      |

**Response Time:** Czas od zgłoszenia do rozpoczęcia pracy  
**Resolution Time:** Czas do dostarczenia fix na staging

### 10.4 Narzędzia do Zarządzania Błędami

**Opcje:**

1. **GitHub Issues** (zalecane dla małych zespołów)
   - Labels: bug, critical, high, medium, low
   - Milestones: MVP, v1.1, etc.
   - Projects: Bug tracking board

2. **Jira** (dla większych zespołów)
   - Issue type: Bug
   - Custom fields: Environment, Test Case ID
   - Workflow automation

3. **Linear** (nowoczesna alternatywa)
   - Fast issue creation
   - Integrations with GitHub

### 10.5 Bug Metrics

**Śledzone metryki:**

- **Open bugs by severity** (dashboard)
- **Bug discovery rate** (bugs/sprint)
- **Bug fix rate** (fixed bugs/sprint)
- **Bug age** (days open)
- **Bug escape rate** (prod bugs / total bugs)
- **Regression rate** (reopened bugs / total fixed)

**Alerty:**

- ⚠️ P0 bug open > 24h
- ⚠️ P1 bug open > 3 dni
- ⚠️ Open bugs > 20
- ⚠️ Bug escape rate > 5%

## 11. Podsumowanie i Wnioski

### 11.1 Kluczowe Punkty Planu Testów

1. **Kompleksowe Pokrycie:** Plan obejmuje wszystkie warstwy aplikacji - od testów jednostkowych, przez integracyjne, po E2E, zapewniając wysoką jakość MVP.

2. **Priorytetyzacja:** Testy są podzielone na P0 (krytyczne), P1 (wysokie), P2 (średnie) i P3 (niskie), co pozwala na efektywne zarządzanie czasem i zasobami.

3. **Automatyzacja:** Większość testów jest zautomatyzowana i uruchamiana w CI/CD, co minimalizuje ryzyko regresji i przyspiesza feedback loop.

4. **Bezpieczeństwo:** Szczególny nacisk na testy security (RLS policies, JWT tokens, input validation) ze względu na wrażliwe dane finansowe.

5. **Mobile-First:** Testy wydajności i responsywności koncentrują się na urządzeniach mobilnych, zgodnie z założeniami produktu.

6. **Realistyczne Scenariusze:** Test cases bazują na user stories z PRD, zapewniając zgodność z wymaganiami biznesowymi.

### 11.2 Ryzyka i Mitygacje

| Ryzyko                                    | Prawdopodobieństwo | Wpływ     | Mitygacja                                                    |
| ----------------------------------------- | ------------------ | --------- | ------------------------------------------------------------ |
| Opóźnienie w setupie środowiska testowego | Średnie            | Wysokie   | Wczesne rozpoczęcie konfiguracji, dokumentacja setup process |
| Flaky tests w E2E                         | Wysokie            | Średnie   | Retry mechanism, proper waits, isolated test data            |
| Niewystarczający coverage                 | Średnie            | Wysokie   | Code review z checkiem coverage, blocked merge < 60%         |
| Brak czasu na UAT                         | Średnie            | Średnie   | Early engagement użytkowników testowych, async UAT           |
| Bugfix delay blokuje release              | Średnie            | Wysokie   | Daily bug triage, clear SLA, fallback plan                   |
| Performance regression                    | Niskie             | Wysokie   | Automated Lighthouse checks w CI/CD, monitoring              |
| Security vulnerability                    | Niskie             | Krytyczne | SAST w CI/CD, regular dependency updates, security audit     |

### 11.3 Rekomendacje

1. **Start Early:** Rozpocząć pisanie testów równolegle z kodem, nie zostawiać na koniec.

2. **Test-Driven Development (TDD):** Rozważyć TDD dla krytycznych modułów (np. budget calculations, transaction handling).

3. **Continuous Testing:** Uruchamiać testy przy każdym commicie, nie czekać na PR.

4. **Test Data Management:** Zainwestować w dobre seed scripts i fixtures - zaoszczędzi to czas w długim okresie.

5. **Documentation:** Dokumentować nietypowe przypadki testowe i decyzje o coverage.

6. **Regular Review:** Co sprint reviewować plan testów i dostosowywać do zmian w produkcie.

7. **Learning:** Analizować bugi wykryte na produkcji i dodawać odpowiednie testy regresji.

### 11.4 Następne Kroki

#### Natychmiast (Tydzień 1)

- [ ] Approval tego planu testów przez zespół
- [ ] Setup Vitest i Playwright
- [ ] Konfiguracja GitHub Actions workflow
- [ ] Przygotowanie środowiska Supabase testowego

#### Krótkoterminowo (Tydzień 2-4)

- [ ] Napisanie pierwszych testów jednostkowych
- [ ] Setup seed data scripts
- [ ] Pierwsze testy integracyjne API
- [ ] Konfiguracja coverage reporting

#### Średnioterminowo (Tydzień 5-8)

- [ ] Kompletny test suite jednostkowy i integracyjny
- [ ] E2E tests dla wszystkich user stories
- [ ] Performance baseline i monitoring

#### Długoterminowo (Tydzień 9-10)

- [ ] UAT
- [ ] Security audit
- [ ] Finalizacja regression suite
- [ ] Release readiness review

### 11.5 Metryki Sukcesu Projektu Testowego

**MVP będzie uznany za sukces testowy, gdy:**

- ✅ > 80% code coverage dla logiki biznesowej
- ✅ Wszystkie user stories P0 i P1 mają testy E2E
- ✅ Regression test suite < 30 min execution time
- ✅ < 5% bug escape rate po release
- ✅ Lighthouse Performance > 85 (mobile)
- ✅ Zero critical security issues
- ✅ UAT signed off by Product Owner

### 11.6 Kontakt i Wsparcie

**W przypadku pytań dotyczących planu testów:**

- **QA Lead:** [qa-lead@email.com]
- **Tech Lead:** [tech-lead@email.com]
- **Slack Channel:** #project-testing

**Dokumenty powiązane:**

- PRD: `.ai/prd.md`
- API Plan: `.ai/api-plan.md`
- Tech Stack: `README.md`
- User Stories: `.ai/prd.md` (sekcja 5)

---

**Wersja dokumentu:** 1.0  
**Data utworzenia:** 8 grudnia 2025  
**Ostatnia aktualizacja:** 8 grudnia 2025  
**Status:** Draft → Ready for Review  
**Autor:** QA Team  
**Zatwierdzony przez:** [Pending]
