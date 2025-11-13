# Specyfikacja Techniczna Modułu Autentykacji - Home Budget Planner

## 1. Architektura Interfejsu Użytkownika

### 1.1. Strony (Astro)

Wprowadzone zostaną nowe strony (routes) w katalogu `src/pages/` dedykowane procesom uwierzytelniania. Wszystkie strony aplikacji, poza poniższymi, będą wymagały zalogowania.

- `/login` - Strona logowania.
- `/register` - Strona rejestracji.
- `/reset-password` - Strona do inicjowania procesu resetowania hasła.
- `/update-password` - Strona, na którą użytkownik jest przekierowywany z maila w celu ustawienia nowego hasła (obsługuje token z Supabase).

### 1.2. Layouty

- **`src/layouts/AuthLayout.astro` (Nowy)**: Prosty layout dla stron `/login`, `/register`, `/reset-password`. Nie będzie zawierał nawigacji ani elementów interfejsu dostępnych po zalogowaniu. Jego celem jest wycentrowanie formularza na środku ekranu.

- **`src/layouts/Layout.astro` (Modyfikacja)**: Główny layout aplikacji zostanie rozszerzony o logikę warunkowego renderowania.
  - **Stan niezalogowany**: W przypadku braku aktywnej sesji, `Layout.astro` nie będzie renderował swojego contentu, a middleware (opisany w sekcji 2) przekieruje użytkownika na stronę `/login`.
  - **Stan zalogowany**: `Layout.astro` będzie renderował przekazane komponenty podrzędne (np. Dashboard). Zostanie on zintegrowany z komponentem `MainLayout.tsx`, który będzie zarządzał stanem UI po stronie klienta.

### 1.3. Komponenty (React)

Komponenty formularzy będą odpowiedzialne za interakcję z użytkownikiem, walidację po stronie klienta i komunikację z endpointami API Astro. Zostaną umieszczone w nowym katalogu `src/components/auth/`.

- **`AuthForm.tsx` (Nowy)**: Generyczny komponent-wrapper dla formularzy autentykacji, zawierający tytuł, pola na email i hasło oraz przycisk akcji. Będzie wykorzystywał `react-hook-form` do zarządzania stanem i walidacji.
- **`LoginForm.tsx` (Nowy)**: Komponent client-side osadzony na stronie `/login.astro`.
  - **Pola**: Email, Hasło, Checkbox "Zapamiętaj mnie".
  - **Akcje**: Przycisk "Zaloguj się", Link do `/register` ("Nie masz konta? Zarejestruj się"), Link do `/reset-password` ("Nie pamiętasz hasła?").
  - **Logika**: Po submicie, wysyła zapytanie `POST` do `/api/auth/login`. W przypadku sukcesu, nawigacja Astro przekieruje na stronę główną (`/`). W przypadku błędu, wyświetli komunikat (np. "Nieprawidłowy login lub hasło").
- **`RegisterForm.tsx` (Nowy)**: Komponent osadzony na stronie `/register.astro`.
  - **Pola**: Email, Hasło, Powtórz hasło.
  - **Akcje**: Przycisk "Zarejestruj się", Link do `/login` ("Masz już konto? Zaloguj się").
  - **Logika**: Po submicie, wysyła zapytanie `POST` do `/api/auth/register`. Po sukcesie, przekierowuje na stronę główną (`/`).
- **`ResetPasswordForm.tsx` (Nowy)**: Komponent osadzony na stronie `/reset-password.astro`.
  - **Pola**: Email.
  - **Akcje**: Przycisk "Zresetuj hasło", Link do `/login`.
  - **Logika**: Po submicie, wysyła `POST` do `/api/auth/reset-password`. Po sukcesie, wyświetla komunikat o wysłaniu linku na podany adres e-mail.
- **`UpdatePasswordForm.tsx` (Nowy)**: Komponent osadzony na `/update-password.astro`.
  - **Pola**: Nowe hasło, Powtórz nowe hasło.
  - **Akcje**: Przycisk "Ustaw nowe hasło".
  - **Logika**: Po submicie, wysyła `POST` do `/api/auth/update-password`.
- **`LogoutButton.tsx` (Nowy)**: Komponent umieszczony w nawigacji (`MainNavigation.tsx`). Po kliknięciu, wysyła zapytanie `POST` do `/api/auth/logout` i przekierowuje na `/login`.

### 1.4. Walidacja i Obsługa Błędów

- **Walidacja Client-Side**: Biblioteka `zod` zostanie użyta w połączeniu z `react-hook-form` do walidacji formatu e-maila, wymagań co do siły hasła i zgodności haseł. Komunikaty będą wyświetlane pod odpowiednimi polami formularza.
- **Komunikaty serwera**: Błędy zwrócone z API (np. "Użytkownik o tym emailu już istnieje", "Nieprawidłowe hasło") będą przechwytywane i wyświetlane w formie globalnego komunikatu błędu nad formularzem.

---

## 2. Logika Backendowa

### 2.1. Middleware (`src/middleware/index.ts`)

Middleware w Astro będzie centralnym punktem kontroli dostępu.

- **Logika**: Middleware będzie uruchamiane przy każdym żądaniu do serwera.
  1.  Sprawdzi obecność i ważność cookie sesji Supabase (`sb-access-token` i `sb-refresh-token`).
  2.  Jeśli sesja jest nieważna i użytkownik próbuje uzyskać dostęp do chronionej strony (każdej poza `/login`, `/register`, `/reset-password`, `/api/*`), nastąpi przekierowanie (HTTP 302) do `/login`.
  3.  Jeśli sesja jest ważna i użytkownik próbuje wejść na `/login` lub `/register`, zostanie przekierowany na stronę główną (`/`).
  4.  Sesja będzie przechowywana w `Astro.locals` w celu udostępnienia jej w ramach kontekstu żądania na stronach renderowanych po stronie serwera.

### 2.2. Endpointy API (`src/pages/api/auth/`)

Endpointy te będą obsługiwać logikę komunikacji z Supabase Auth. Będą to pliki `.ts` w strukturze folderów Astro.

- **`login.ts` (`POST`)**:
  - Pobiera `email` i `password` z ciała żądania.
  - Waliduje dane wejściowe (Zod).
  - Wywołuje `supabase.auth.signInWithPassword()`.
  - W przypadku sukcesu, Supabase automatycznie ustawi odpowiednie cookies. Endpoint zwróci status `200 OK`.
  - W przypadku błędu, zwróci status `401 Unauthorized` z komunikatem błędu.
- **`register.ts` (`POST`)**:
  - Pobiera `email`, `password` z ciała żądania.
  - Waliduje dane.
  - Wywołuje `supabase.auth.signUp()`.
  - W przypadku sukcesu (nowy użytkownik), Supabase ustawi cookies. Endpoint zwróci `201 Created`.
  - W przypadku błędu (np. email zajęty), zwróci `409 Conflict`.
- **`logout.ts` (`POST`)**:
  - Wywołuje `supabase.auth.signOut()`.
  - Supabase usunie cookies sesji.
  - Zwraca `200 OK`.
- **`reset-password.ts` (`POST`)**:
  - Pobiera `email`.
  - Wywołuje `supabase.auth.resetPasswordForEmail()`, podając URL do strony `/update-password` jako `redirectTo`.
  - Zawsze zwraca `200 OK`, aby nie ujawniać, czy dany email istnieje w bazie.
- **`callback.ts` (`GET`)**:
  - Endpoint wymagany przez Supabase do finalizacji procesu logowania po potwierdzeniu maila lub resecie hasła.
  - Wymienia kod autoryzacyjny na sesję.
  - Przekierowuje użytkownika na stronę główną.

### 2.3. Renderowanie Server-Side

Dzięki `output: "server"` i adapterowi `node` w `astro.config.mjs`, cała logika middleware i API będzie wykonywana po stronie serwera Node.js. Umożliwi to bezpieczne zarządzanie sesją i ochronę stron przed renderowaniem dla niezalogowanych użytkowników.

---

## 3. System Autentykacji (Supabase)

### 3.1. Konfiguracja Supabase

- **Klient Supabase**: Serwerowy klient Supabase zostanie zainicjowany w `src/db/supabase.client.ts` i będzie wykorzystywany w endpointach API oraz middleware. Należy go skonfigurować tak, aby poprawnie zarządzał cookies w kontekście żądania i odpowiedzi Astro.
- **Zmienne środowiskowe**: `SUPABASE_URL` i `SUPABASE_KEY` będą przechowywane w pliku `.env` i wykorzystywane do inicjalizacji klienta.

### 3.2. Procesy Autentykacji

- **Rejestracja (`signUp`)**: Supabase domyślnie wymaga potwierdzenia adresu e-mail. W ramach MVP można tę opcję wyłączyć w ustawieniach projektu Supabase, aby uprościć proces (zgodnie z `US-001`, użytkownik jest logowany od razu).
- **Logowanie (`signInWithPassword`)**: Standardowy przepływ. Czas trwania sesji (opcja "Zapamiętaj mnie") jest zarządzany przez Supabase na podstawie czasu życia JWT. Checkbox na froncie nie jest bezpośrednio potrzebny, ponieważ Supabase domyślnie ustawia długotrwałą sesję.
- **Reset Hasła (`resetPasswordForEmail`, `updateUser`)**:
  1.  Użytkownik podaje e-mail w `ResetPasswordForm`.
  2.  API `/api/auth/reset-password` woła `resetPasswordForEmail`.
  3.  Supabase wysyła e-mail z unikalnym linkiem zawierającym token. Link kieruje do `/update-password`.
  4.  Na stronie `/update-password`, frontendowy komponent `UpdatePasswordForm` pozwala ustawić nowe hasło.
  5.  Po otrzymaniu nowego hasła, Astro przechwytuje sesję z tokena (w middleware lub na stronie) i wywołuje `supabase.auth.updateUser({ password: newPassword })`.
  6.  Po pomyślnej zmianie, użytkownik jest przekierowywany do `/login`.
- **Wylogowanie (`signOut`)**: Usuwa sesję i powiązane z nią cookies.
- **Row Level Security (RLS)**: Po zaimplementowaniu autentykacji, kluczowe będzie włączenie i skonfigurowanie RLS dla wszystkich tabel w bazie danych. Reguły RLS zapewnią, że zalogowany użytkownik (`auth.uid()`) ma dostęp wyłącznie do danych powiązanych z jego `household_id`. Jest to krytyczny element bezpieczeństwa zgodny z ogólnymi założeniami projektu.
