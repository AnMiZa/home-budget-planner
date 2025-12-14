# CI/CD Guide - Home Budget Planner

## 🎯 Cel

Minimalny setup CI/CD zapewniający:

- ✅ Automatyczne uruchamianie testów po push do master
- ✅ Możliwość manualnego uruchomienia
- ✅ Weryfikację poprawności buildu produkcyjnego
- ✅ Raportowanie błędów i artefaktów

## 📋 Spis treści

1. [Szybki start](#szybki-start)
2. [Dostępne workflows](#dostępne-workflows)
3. [Jak uruchomić](#jak-uruchomić)
4. [Struktura pipeline](#struktura-pipeline)
5. [Monitoring i debugging](#monitoring-i-debugging)

## 🚀 Szybki start

### Krok 1: Skonfiguruj secrets

Przejdź do [SECRETS_SETUP.md](./SECRETS_SETUP.md) i skonfiguruj wymagane secrets w GitHub.

**Wymagane secrets (5):**

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `E2E_USERNAME`
- `E2E_PASSWORD`

### Krok 2: Uruchom pipeline

**Opcja A - Automatycznie:**

```bash
git add .
git commit -m "feat: add new feature"
git push origin master
```

**Opcja B - Manualnie:**

1. Otwórz GitHub → Actions
2. Wybierz "CI Pipeline"
3. Kliknij "Run workflow"

### Krok 3: Monitoruj wyniki

Przejdź do zakładki **Actions** i obserwuj postęp.

## 📦 Dostępne workflows

### 1. CI Pipeline (`master.yml`) - GŁÓWNY

**Kiedy uruchamiany:**

- ✅ Automatycznie po push do `master` lub `main`
- ✅ Manualnie przez Actions → Run workflow

**Co robi:**

```
Lint & Type Check
       ↓
   ┌───┴───┐
   │       │
Unit Tests E2E Tests
   │       │
   └───┬───┘
       ↓
Production Build
       ↓
   Summary
```

**Czas wykonania:** ~5-8 minut

**Kiedy używać:**

- Przed merge do master
- Po wprowadzeniu istotnych zmian
- Przed release

---

### 2. Quick Check (`quick-check.yml`) - OPCJONALNY

**Kiedy uruchamiany:**

- ✅ Tylko manualnie

**Co robi:**

- Lint + Type Check + Unit Tests + Build
- **Bez E2E testów** (szybsze)

**Czas wykonania:** ~2-3 minuty

**Kiedy używać:**

- Szybka weryfikacja zmian
- Podczas development
- Gdy E2E testy nie są konieczne

---

### 3. Test Example (`test.yml.example`) - SZABLON

**Status:** Nieaktywny (przykład)

**Jak aktywować:**

1. Zmień nazwę na `test.yml`
2. Dostosuj konfigurację
3. Commit i push

## 🎮 Jak uruchomić

### Automatyczne uruchomienie

Pipeline uruchamia się automatycznie po push do master:

```bash
# Wprowadź zmiany
git add .
git commit -m "feat: implement new feature"

# Push do master (uruchomi CI)
git push origin master
```

### Manualne uruchomienie

#### Przez GitHub UI

1. Otwórz repozytorium na GitHub
2. Kliknij zakładkę **Actions**
3. Z listy po lewej wybierz **CI Pipeline**
4. Kliknij przycisk **Run workflow** (prawy górny róg)
5. Wybierz branch (domyślnie: master)
6. Kliknij **Run workflow**

#### Przez GitHub CLI

```bash
# Uruchom CI Pipeline
gh workflow run master.yml

# Uruchom Quick Check
gh workflow run quick-check.yml

# Sprawdź status
gh run list --workflow=master.yml --limit 5

# Zobacz szczegóły ostatniego run
gh run view

# Zobacz logi
gh run view --log
```

### Lokalne uruchomienie (symulacja)

```bash
# Pełny pipeline lokalnie
npm run lint
npx tsc --noEmit
npm test
npm run test:coverage
npm run test:e2e
npm run build

# Lub użyj skryptu (jeśli dostępny)
npm run test:all
npm run build
```

## 🏗️ Struktura pipeline

### Etap 1: Lint & Type Check (równolegle)

**Czas:** ~30s

```yaml
- ESLint: npm run lint
- TypeScript: npx tsc --noEmit
```

**Fail jeśli:**

- Błędy ESLint
- Błędy typów TypeScript

---

### Etap 2: Unit Tests (po lint)

**Czas:** ~1-2 min

```yaml
- Vitest: npm test
- Coverage: npm run test:coverage
```

**Fail jeśli:**

- Jakikolwiek test failuje
- Coverage < 80% (opcjonalnie)

**Artefakty:**

- `coverage-report/` (30 dni)

---

### Etap 3: E2E Tests (po lint, równolegle z unit)

**Czas:** ~3-5 min

```yaml
- Playwright: npm run test:e2e
- Browsers: Chromium Desktop + Mobile
```

**Fail jeśli:**

- Jakikolwiek test E2E failuje
- Timeout podczas global-setup
- Błąd połączenia z Supabase

**Artefakty:**

- `playwright-report/` (30 dni)
- `test-results/` (30 dni)

---

### Etap 4: Production Build (po testach)

**Czas:** ~1-2 min

```yaml
- Astro build: npm run build
- Weryfikacja: du -sh dist/
```

**Fail jeśli:**

- Błąd podczas buildu
- Brakujące zmienne środowiskowe

**Artefakty:**

- `dist/` (7 dni)

---

### Etap 5: Summary (zawsze)

**Czas:** ~5s

```yaml
- Podsumowanie wszystkich etapów
- Exit 1 jeśli którykolwiek failował
```

## 🔍 Monitoring i debugging

### Sprawdzenie statusu

#### Przez UI

1. GitHub → Actions
2. Lista wszystkich runs
3. Kliknij na konkretny run aby zobaczyć szczegóły

**Status indicators:**

- 🟢 Zielony checkmark = Success
- 🔴 Czerwony X = Failure
- 🟡 Żółty kółko = In progress
- ⚪ Szary kółko = Queued

#### Przez CLI

```bash
# Lista ostatnich runs
gh run list --workflow=master.yml --limit 10

# Status konkretnego run
gh run view <run-id>

# Logi z konkretnego run
gh run view <run-id> --log

# Logi z konkretnego job
gh run view <run-id> --log --job=<job-id>

# Watch live (odświeżanie co 3s)
gh run watch <run-id>
```

### Pobieranie artefaktów

#### Przez UI

1. GitHub → Actions → wybierz run
2. Przewiń w dół do sekcji **Artifacts**
3. Kliknij na nazwę artefaktu (np. `playwright-report`)
4. Pobierze się jako ZIP

#### Przez CLI

```bash
# Lista artefaktów z ostatniego run
gh run view --log | grep -A 5 "Artifacts"

# Pobierz konkretny artefakt
gh run download <run-id> -n playwright-report

# Pobierz wszystkie artefakty
gh run download <run-id>
```

### Debugging failujących testów

#### 1. Sprawdź logi

```bash
# Zobacz logi z failującego job
gh run view <run-id> --log --job=<job-name>
```

Lub w UI: Actions → Run → Job → Rozwiń failujący step

#### 2. Pobierz artefakty

```bash
# Playwright report (jeśli E2E failowały)
gh run download <run-id> -n playwright-report

# Otwórz raport lokalnie
cd playwright-report
npx playwright show-report .
```

#### 3. Reprodukuj lokalnie

```bash
# Uruchom dokładnie ten sam test
npm run test:e2e -- <test-file>

# Z debuggerem
npm run test:e2e:debug -- <test-file>

# W trybie headed (z przeglądarką)
npm run test:e2e:headed -- <test-file>
```

#### 4. Sprawdź secrets

```bash
# Lista secrets (bez wartości)
gh secret list

# Sprawdź czy wszystkie są ustawione
# Powinno być 5 secrets
```

### Typowe problemy

#### ❌ "Missing environment variables"

**Przyczyna:** Brakujące secrets

**Rozwiązanie:**

```bash
# Sprawdź secrets
gh secret list

# Dodaj brakujące
gh secret set PUBLIC_SUPABASE_URL
gh secret set PUBLIC_SUPABASE_ANON_KEY
```

#### ❌ E2E timeout podczas global-setup

**Przyczyna:** Aplikacja nie startuje lub Supabase niedostępny

**Rozwiązanie:**

1. Sprawdź logi z kroku "Run E2E tests"
2. Zweryfikuj `SUPABASE_SERVICE_ROLE_KEY`
3. Sprawdź czy projekt Supabase jest aktywny

#### ❌ Unit tests failują tylko na CI

**Przyczyna:** Różnice w środowisku

**Rozwiązanie:**

```bash
# Lokalnie użyj dokładnie tych samych komend co CI
npm ci  # zamiast npm install
npm test

# Sprawdź wersję Node
node -v  # powinna być 20.x
```

#### ❌ Build failuje z błędem TypeScript

**Przyczyna:** Błędy typów nie wykryte lokalnie

**Rozwiązanie:**

```bash
# Uruchom type check lokalnie
npx tsc --noEmit

# Napraw błędy i commit
```

## 📊 Metryki i optymalizacja

### Średnie czasy wykonania

| Etap              | Czas        | % całości |
| ----------------- | ----------- | --------- |
| Lint & Type Check | 30s         | 8%        |
| Unit Tests        | 1-2 min     | 25%       |
| E2E Tests         | 3-5 min     | 60%       |
| Build             | 1-2 min     | 20%       |
| **TOTAL**         | **5-8 min** | **100%**  |

### Jak przyspieszyć pipeline

1. **Cache dependencies** (już włączone)

   ```yaml
   cache: "npm" # ✅ Aktywne
   ```

2. **Równoległe testy** (już włączone)

   ```yaml
   Unit i E2E równolegle # ✅ Aktywne
   ```

3. **Ograniczenie E2E** (już włączone)

   ```yaml
   workers: 1 na CI # ✅ Aktywne
   retries: 2 # ✅ Aktywne
   ```

4. **Selective testing** (do rozważenia)
   ```yaml
   # Uruchamiaj E2E tylko na master
   if: github.ref == 'refs/heads/master'
   ```

## 🔐 Bezpieczeństwo

### Best practices

✅ **DO:**

- Używaj secrets dla wszystkich wrażliwych danych
- Regularnie rotuj `SUPABASE_SERVICE_ROLE_KEY`
- Używaj dedykowanego projektu Supabase dla testów
- Monitoruj logi pod kątem wycieków danych

❌ **DON'T:**

- Nie loguj wartości secrets
- Nie commituj `.env` files
- Nie używaj produkcyjnej bazy do testów
- Nie udostępniaj service_role key publicznie

### Audyt bezpieczeństwa

```bash
# Sprawdź czy secrets nie wyciekły
git log -p | grep -i "supabase"
git log -p | grep -i "password"

# Sprawdź pliki .env w historii
git log --all --full-history -- "**/.env*"
```

## 📚 Dodatkowe zasoby

- [Workflows README](./workflows/README.md) - Szczegółowa dokumentacja
- [SECRETS_SETUP.md](./SECRETS_SETUP.md) - Konfiguracja secrets
- [E2E Tests README](/e2e/README.md) - Dokumentacja testów E2E
- [GitHub Actions Docs](https://docs.github.com/en/actions)

## 🆘 Pomoc

Jeśli pipeline nie działa:

1. ✅ Sprawdź [Troubleshooting w workflows/README.md](./workflows/README.md#troubleshooting)
2. ✅ Zobacz logi w Actions
3. ✅ Zweryfikuj secrets: `gh secret list`
4. ✅ Reprodukuj lokalnie: `npm run test:all && npm run build`
5. ✅ Sprawdź status Supabase: [status.supabase.com](https://status.supabase.com)

---

**Ostatnia aktualizacja:** 2024-12-14
**Wersja:** 1.0.0
