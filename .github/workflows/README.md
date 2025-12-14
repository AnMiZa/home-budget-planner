# CI/CD Configuration

## Przegląd

Projekt wykorzystuje **GitHub Actions** do automatyzacji testów i buildów. Pipeline CI/CD składa się z następujących etapów:

```
┌─────────────────────┐
│  Lint & Type Check  │
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     │           │
┌────▼────┐ ┌───▼────┐
│  Unit   │ │  E2E   │
│  Tests  │ │ Tests  │
└────┬────┘ └───┬────┘
     └─────┬────┘
           │
      ┌────▼────┐
      │  Build  │
      └─────────┘
```

## Workflows

### 1. CI Pipeline (`master.yml`)

**Uruchamiany:**
- Automatycznie po push do `master` lub `main`
- Manualnie przez zakładkę "Actions" w GitHub (workflow_dispatch)

**Etapy:**

1. **Lint & Type Check** (równolegle)
   - ESLint - sprawdzenie jakości kodu
   - TypeScript - walidacja typów

2. **Unit Tests** (po lint)
   - Vitest - testy jednostkowe i integracyjne
   - Coverage report (cel: >80%)

3. **E2E Tests** (po lint, równolegle z unit tests)
   - Playwright - testy end-to-end
   - Chromium Desktop + Mobile Chrome
   - Wymaga działającej instancji Supabase

4. **Production Build** (po testach)
   - Astro build
   - Weryfikacja poprawności buildu
   - Upload artefaktów

5. **CI Summary**
   - Podsumowanie wszystkich etapów
   - Fail jeśli którykolwiek etap się nie powiódł

## Wymagane GitHub Secrets

Aby pipeline działał poprawnie, należy skonfigurować następujące secrets w repozytorium GitHub:

### Konfiguracja Supabase

```
PUBLIC_SUPABASE_URL
PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

**Jak uzyskać:**
1. Zaloguj się do [Supabase Dashboard](https://app.supabase.com)
2. Wybierz projekt (lub stwórz dedykowany projekt testowy)
3. Przejdź do Settings → API
4. Skopiuj:
   - `URL` → `PUBLIC_SUPABASE_URL`
   - `anon public` → `PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

### Test User Credentials

```
E2E_USERNAME
E2E_PASSWORD
```

**Wartości:**
- `E2E_USERNAME`: Email użytkownika testowego (np. `test@example.com`)
- `E2E_PASSWORD`: Hasło użytkownika testowego (min. 8 znaków)

**Uwaga:** Użytkownik testowy zostanie automatycznie utworzony podczas pierwszego uruchomienia testów E2E (global-setup).

### Jak dodać secrets w GitHub

1. Przejdź do repozytorium na GitHub
2. Settings → Secrets and variables → Actions
3. Kliknij "New repository secret"
4. Dodaj każdy secret osobno:
   - Name: nazwa z listy powyżej
   - Secret: odpowiednia wartość
5. Kliknij "Add secret"

## Manualne uruchomienie

### Przez GitHub UI

1. Przejdź do zakładki **Actions** w repozytorium
2. Wybierz workflow **"CI Pipeline"**
3. Kliknij **"Run workflow"**
4. Wybierz branch (domyślnie: master/main)
5. Kliknij **"Run workflow"**

### Przez GitHub CLI

```bash
gh workflow run master.yml
```

Sprawdzenie statusu:

```bash
gh run list --workflow=master.yml
```

## Artefakty

Pipeline generuje następujące artefakty (dostępne przez 7-30 dni):

- **coverage-report** - raport pokrycia kodu testami (30 dni)
- **playwright-report** - raport z testów E2E (30 dni)
- **test-results** - wyniki testów w formacie JUnit XML (30 dni)
- **dist** - zbudowana aplikacja produkcyjna (7 dni)

### Jak pobrać artefakty

1. Przejdź do zakładki **Actions**
2. Wybierz konkretny run workflow
3. Przewiń w dół do sekcji **Artifacts**
4. Kliknij na nazwę artefaktu aby pobrać

## Troubleshooting

### E2E testy kończą się błędem "Cannot connect to database"

**Rozwiązanie:**
- Sprawdź czy secrets Supabase są poprawnie skonfigurowane
- Upewnij się, że `SUPABASE_SERVICE_ROLE_KEY` ma uprawnienia do tworzenia użytkowników

### Build kończy się błędem "Missing environment variables"

**Rozwiązanie:**
- Sprawdź czy `PUBLIC_SUPABASE_URL` i `PUBLIC_SUPABASE_ANON_KEY` są ustawione
- Upewnij się, że secrets nie zawierają spacji na początku/końcu

### Testy jednostkowe failują lokalnie ale przechodzą na CI

**Rozwiązanie:**
- Uruchom `npm ci` zamiast `npm install` (czyste środowisko)
- Sprawdź wersję Node.js: `node -v` (powinna być 20.x)

### Playwright timeout podczas global-setup

**Rozwiązanie:**
- Zwiększ timeout w `playwright.config.ts` dla `webServer`
- Sprawdź logi czy aplikacja startuje poprawnie
- Upewnij się, że port 4321 nie jest zablokowany

## Lokalne uruchomienie pipeline

Aby zasymulować pipeline lokalnie:

```bash
# 1. Lint & Type Check
npm run lint
npx tsc --noEmit

# 2. Unit Tests
npm test
npm run test:coverage

# 3. E2E Tests (wymaga .env.test)
npm run test:e2e

# 4. Production Build
npm run build
```

## Optymalizacje

### Przyspieszenie pipeline

Obecna konfiguracja:
- Unit i E2E testy uruchamiają się równolegle
- Cache npm dependencies
- Tylko Chromium dla E2E (szybsze niż multi-browser)

Średni czas wykonania: **~5-8 minut**

### Redukcja kosztów

- E2E testy: `workers: 1` na CI (mniej równoległości = mniej zasobów)
- Retry: `2` tylko na CI (lokalne testy bez retry)
- Artifacts: automatyczne usuwanie po 7-30 dniach

## Rozszerzenia

### Dodanie deployment

Aby dodać automatyczny deployment po udanym buildzie:

```yaml
deploy:
  name: Deploy to Production
  runs-on: ubuntu-latest
  needs: build
  if: github.ref == 'refs/heads/master'
  
  steps:
    - name: Download build artifacts
      uses: actions/download-artifact@v4
      with:
        name: dist
    
    - name: Deploy to DigitalOcean
      # ... deployment steps
```

### Dodanie notification

Aby otrzymywać powiadomienia o statusie pipeline:

```yaml
- name: Notify Slack
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
```

## Best Practices

✅ **DO:**
- Zawsze uruchamiaj pipeline przed merge do master
- Monitoruj czas wykonania i optymalizuj wolne joby
- Regularnie przeglądaj raporty coverage
- Utrzymuj secrets aktualne i bezpieczne

❌ **DON'T:**
- Nie commituj secrets do repozytorium
- Nie skipuj testów aby przyspieszyć pipeline
- Nie używaj `--force` przy push do master
- Nie ignoruj failujących testów

## Kontakt

W razie problemów z CI/CD:
1. Sprawdź logi w zakładce Actions
2. Przejrzyj sekcję Troubleshooting
3. Sprawdź dokumentację testów: `/e2e/README.md`

