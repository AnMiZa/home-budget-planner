# Quick Setup: GitHub Secrets

## Wymagane Secrets

Aby uruchomić CI/CD pipeline, musisz skonfigurować **5 secrets** w GitHub:

| Secret Name                 | Opis                        | Przykład                          |
| --------------------------- | --------------------------- | --------------------------------- |
| `PUBLIC_SUPABASE_URL`       | URL instancji Supabase      | `https://xxxxx.supabase.co`       |
| `PUBLIC_SUPABASE_ANON_KEY`  | Klucz publiczny (anon)      | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Klucz service role (admin)  | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` |
| `E2E_USERNAME`              | Email użytkownika testowego | `test@example.com`                |
| `E2E_PASSWORD`              | Hasło użytkownika testowego | `TestPass123!`                    |

## Krok po kroku

### 1. Uzyskaj dane z Supabase

1. Zaloguj się do [Supabase Dashboard](https://app.supabase.com)
2. Wybierz projekt (lub stwórz nowy dla testów)
3. Przejdź do **Settings** → **API**
4. Skopiuj wartości:

```
Project URL           → PUBLIC_SUPABASE_URL
Project API keys:
  - anon public       → PUBLIC_SUPABASE_ANON_KEY
  - service_role      → SUPABASE_SERVICE_ROLE_KEY
```

### 2. Przygotuj dane testowe

Wybierz credentials dla użytkownika testowego:

```
Email: test@example.com (lub inny)
Hasło: min. 8 znaków, np. TestPass123!
```

**Uwaga:** Użytkownik zostanie automatycznie utworzony podczas pierwszego uruchomienia testów E2E.

### 3. Dodaj secrets w GitHub

#### Opcja A: Przez UI

1. Otwórz repozytorium na GitHub
2. Kliknij **Settings** (zakładka w górnym menu)
3. W lewym menu wybierz **Secrets and variables** → **Actions**
4. Kliknij **New repository secret**
5. Dla każdego z 5 secrets:
   - **Name**: wpisz dokładną nazwę z tabeli powyżej
   - **Secret**: wklej odpowiednią wartość
   - Kliknij **Add secret**

#### Opcja B: Przez GitHub CLI

Jeśli masz zainstalowane [GitHub CLI](https://cli.github.com/):

```bash
# Przejdź do katalogu projektu
cd /path/to/home-budget-planner

# Dodaj secrets (zostaniesz poproszony o wartości)
gh secret set PUBLIC_SUPABASE_URL
gh secret set PUBLIC_SUPABASE_ANON_KEY
gh secret set SUPABASE_SERVICE_ROLE_KEY
gh secret set E2E_USERNAME
gh secret set E2E_PASSWORD
```

Lub wszystkie naraz:

```bash
# Stwórz plik .secrets (NIE COMMITUJ GO!)
cat > .secrets << 'EOF'
PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
E2E_USERNAME=test@example.com
E2E_PASSWORD=TestPass123!
EOF

# Import secrets
gh secret set -f .secrets

# Usuń plik (WAŻNE!)
rm .secrets
```

### 4. Weryfikacja

Sprawdź czy secrets zostały dodane:

#### Przez UI:

Settings → Secrets and variables → Actions → Repository secrets

Powinieneś zobaczyć 5 secrets (wartości są ukryte).

#### Przez CLI:

```bash
gh secret list
```

Oczekiwany output:

```
E2E_PASSWORD                 Updated YYYY-MM-DD
E2E_USERNAME                 Updated YYYY-MM-DD
PUBLIC_SUPABASE_ANON_KEY     Updated YYYY-MM-DD
PUBLIC_SUPABASE_URL          Updated YYYY-MM-DD
SUPABASE_SERVICE_ROLE_KEY    Updated YYYY-MM-DD
```

### 5. Test pipeline

Uruchom workflow manualnie:

1. Przejdź do zakładki **Actions**
2. Wybierz **CI Pipeline**
3. Kliknij **Run workflow**
4. Wybierz branch `master` lub `main`
5. Kliknij **Run workflow**

Jeśli wszystko jest poprawnie skonfigurowane, pipeline powinien przejść przez wszystkie etapy.

## Troubleshooting

### ❌ "Error: Secret not found"

**Przyczyna:** Secret nie został dodany lub ma błędną nazwę.

**Rozwiązanie:**

- Sprawdź dokładną nazwę (case-sensitive!)
- Upewnij się, że secret jest typu "Repository secret", nie "Environment secret"

### ❌ E2E testy failują z błędem połączenia

**Przyczyna:** Błędne dane Supabase lub brak uprawnień.

**Rozwiązanie:**

- Sprawdź czy `PUBLIC_SUPABASE_URL` kończy się na `.supabase.co`
- Sprawdź czy `SUPABASE_SERVICE_ROLE_KEY` to klucz "service_role", nie "anon"
- Upewnij się, że projekt Supabase ma włączone Auth

### ❌ Build failuje z "Missing environment variables"

**Przyczyna:** Brakujące secrets dla buildu.

**Rozwiązanie:**

- Upewnij się, że `PUBLIC_SUPABASE_URL` i `PUBLIC_SUPABASE_ANON_KEY` są ustawione
- Sprawdź czy wartości nie zawierają spacji na początku/końcu

### ❌ "Invalid credentials" podczas testów E2E

**Przyczyna:** Błędne credentials lub użytkownik nie istnieje.

**Rozwiązanie:**

- Sprawdź `E2E_USERNAME` i `E2E_PASSWORD`
- Upewnij się, że hasło ma min. 8 znaków
- Uruchom testy ponownie (użytkownik zostanie utworzony automatycznie)

## Bezpieczeństwo

⚠️ **NIGDY nie commituj secrets do repozytorium!**

✅ **Dobre praktyki:**

- Używaj różnych projektów Supabase dla dev/test/prod
- Regularnie rotuj `SUPABASE_SERVICE_ROLE_KEY`
- Nie udostępniaj secrets przez niezabezpieczone kanały
- Używaj dedykowanego użytkownika testowego (nie swojego konta)

❌ **Nie rób tego:**

- Nie dodawaj secrets do plików `.env` w repozytorium
- Nie loguj wartości secrets w pipeline
- Nie używaj produkcyjnej bazy do testów E2E
- Nie udostępniaj `service_role` key publicznie

## Dodatkowe zasoby

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Supabase API Settings](https://supabase.com/docs/guides/api#api-url-and-keys)
- [GitHub CLI Secrets](https://cli.github.com/manual/gh_secret)

## Potrzebujesz pomocy?

1. Sprawdź logi w zakładce Actions
2. Przeczytaj [workflows/README.md](./workflows/README.md)
3. Sprawdź dokumentację testów E2E: `/e2e/README.md`
