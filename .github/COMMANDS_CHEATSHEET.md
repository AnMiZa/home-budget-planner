# CI/CD Commands Cheatsheet

Szybki dostęp do najczęściej używanych komend.

## 🚀 Uruchamianie Pipeline

### Automatyczne uruchomienie

```bash
# Push do master uruchamia pipeline automatycznie
git add .
git commit -m "feat: new feature"
git push origin master
```

### Manualne uruchomienie

```bash
# Uruchom główny pipeline CI
gh workflow run master.yml

# Uruchom szybkie sprawdzenie (bez E2E)
gh workflow run quick-check.yml

# Uruchom z konkretnego brancha
gh workflow run master.yml --ref feature-branch
```

## 📊 Monitoring

### Status runs

```bash
# Lista ostatnich 5 runs
gh run list --workflow=master.yml --limit 5

# Lista wszystkich workflows
gh workflow list

# Status konkretnego workflow
gh workflow view master.yml

# Szczegóły ostatniego run
gh run view

# Szczegóły konkretnego run
gh run view <run-id>

# Live monitoring (odświeżanie co 3s)
gh run watch

# Watch konkretnego run
gh run watch <run-id>
```

### Logi

```bash
# Logi z ostatniego run
gh run view --log

# Logi z konkretnego run
gh run view <run-id> --log

# Logi z konkretnego job
gh run view <run-id> --log --job=<job-id>

# Logi tylko z failujących steps
gh run view <run-id> --log-failed
```

### Filtrowanie

```bash
# Tylko udane runs
gh run list --workflow=master.yml --status=success

# Tylko failujące runs
gh run list --workflow=master.yml --status=failure

# Runs z ostatnich 7 dni
gh run list --workflow=master.yml --created=">=2024-12-07"

# Runs z konkretnego brancha
gh run list --workflow=master.yml --branch=master
```

## 📦 Artefakty

### Lista artefaktów

```bash
# Artefakty z ostatniego run
gh run view --log | grep -A 5 "Artifacts"

# Artefakty z konkretnego run
gh api repos/:owner/:repo/actions/runs/<run-id>/artifacts
```

### Pobieranie

```bash
# Pobierz wszystkie artefakty z ostatniego run
gh run download

# Pobierz wszystkie artefakty z konkretnego run
gh run download <run-id>

# Pobierz konkretny artefakt
gh run download <run-id> -n playwright-report
gh run download <run-id> -n coverage-report
gh run download <run-id> -n test-results
gh run download <run-id> -n dist

# Pobierz do konkretnego katalogu
gh run download <run-id> -n playwright-report -D ./reports
```

### Otwieranie raportów

```bash
# Playwright report
cd playwright-report
npx playwright show-report .

# Coverage report
cd coverage
open index.html  # macOS
xdg-open index.html  # Linux
start index.html  # Windows
```

## 🔑 Secrets

### Lista i zarządzanie

```bash
# Lista wszystkich secrets
gh secret list

# Dodaj nowy secret (interaktywnie)
gh secret set SECRET_NAME

# Dodaj secret z wartością
echo "secret-value" | gh secret set SECRET_NAME

# Dodaj secret z pliku
gh secret set SECRET_NAME < secret.txt

# Usuń secret
gh secret delete SECRET_NAME

# Import secrets z pliku
gh secret set -f .secrets
```

### Bulk import secrets

```bash
# Stwórz plik .secrets
cat > .secrets << 'EOF'
PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
E2E_USERNAME=test@example.com
E2E_PASSWORD=TestPass123!
EOF

# Import
gh secret set -f .secrets

# Usuń plik (WAŻNE!)
rm .secrets
```

## 🔄 Ponowne uruchomienie

```bash
# Re-run ostatniego run
gh run rerun

# Re-run konkretnego run
gh run rerun <run-id>

# Re-run tylko failujących jobs
gh run rerun <run-id> --failed

# Re-run konkretnego job
gh run rerun <run-id> --job=<job-id>
```

## ❌ Anulowanie

```bash
# Anuluj ostatni run
gh run cancel

# Anuluj konkretny run
gh run cancel <run-id>

# Anuluj wszystkie running runs
gh run list --status=in_progress --json databaseId --jq '.[].databaseId' | \
  xargs -I {} gh run cancel {}
```

## 🧪 Lokalne testy (symulacja CI)

### Pełny pipeline

```bash
# Wszystkie etapy (jak w CI)
npm run lint && \
npx tsc --noEmit && \
npm test && \
npm run test:coverage && \
npm run test:e2e && \
npm run build

# Lub skrót
npm run test:all && npm run build
```

### Poszczególne etapy

```bash
# Lint & Type Check
npm run lint
npx tsc --noEmit

# Unit Tests
npm test
npm run test:watch  # watch mode
npm run test:ui  # UI mode

# Coverage
npm run test:coverage

# E2E Tests
npm run test:e2e
npm run test:e2e:headed  # z przeglądarką
npm run test:e2e:debug  # debug mode
npm run test:e2e:ui  # UI mode

# Build
npm run build
npm run preview  # preview buildu
```

## 🔍 Debugging

### Sprawdzenie konfiguracji

```bash
# Sprawdź workflow syntax
gh workflow view master.yml

# Sprawdź czy workflow jest włączony
gh workflow list

# Sprawdź permissions
gh api repos/:owner/:repo/actions/permissions

# Sprawdź secrets
gh secret list
```

### Analiza failów

```bash
# Znajdź ostatni failujący run
gh run list --workflow=master.yml --status=failure --limit 1

# Zobacz szczegóły
gh run view <run-id> --log-failed

# Pobierz artefakty (raporty błędów)
gh run download <run-id>

# Sprawdź annotations (błędy, warningi)
gh api repos/:owner/:repo/actions/runs/<run-id>/annotations
```

### Reprodukcja lokalnie

```bash
# Uruchom dokładnie ten sam test co failował
npm run test:e2e -- <test-file>

# Z debuggerem
npm run test:e2e:debug -- <test-file>

# Konkretny test case
npm run test:e2e -- -g "test name"
```

## 📈 Statystyki

### Success rate

```bash
# Ostatnie 20 runs
gh run list --workflow=master.yml --limit 20 --json conclusion | \
  jq '[.[] | .conclusion] | group_by(.) | map({key: .[0], count: length})'
```

### Średni czas wykonania

```bash
# Ostatnie 10 runs
gh run list --workflow=master.yml --limit 10 --json createdAt,updatedAt,conclusion | \
  jq '.[] | select(.conclusion == "success") |
    {duration: (((.updatedAt | fromdateiso8601) - (.createdAt | fromdateiso8601)) / 60)}'
```

### Najczęściej failujące joby

```bash
# Analiza failów
gh run list --workflow=master.yml --status=failure --limit 50 --json jobs | \
  jq '[.[].jobs[] | select(.conclusion == "failure") | .name] |
    group_by(.) | map({job: .[0], fails: length}) | sort_by(.fails) | reverse'
```

## 🔧 Zarządzanie Workflows

### Włącz/wyłącz workflow

```bash
# Wyłącz workflow
gh workflow disable master.yml

# Włącz workflow
gh workflow enable master.yml

# Status
gh workflow view master.yml
```

### Usuwanie starych runs

```bash
# Usuń runs starsze niż 30 dni
gh api repos/:owner/:repo/actions/runs \
  --jq '.workflow_runs[] | select(.created_at < (now - 2592000 | todate)) | .id' | \
  xargs -I {} gh api -X DELETE repos/:owner/:repo/actions/runs/{}

# Usuń wszystkie failujące runs
gh run list --status=failure --json databaseId --jq '.[].databaseId' | \
  xargs -I {} gh api -X DELETE repos/:owner/:repo/actions/runs/{}
```

## 🎯 Przydatne aliasy

Dodaj do `~/.bashrc` lub `~/.zshrc`:

```bash
# CI/CD aliases
alias gh-ci='gh workflow run master.yml'
alias gh-quick='gh workflow run quick-check.yml'
alias gh-runs='gh run list --workflow=master.yml --limit 10'
alias gh-watch='gh run watch'
alias gh-logs='gh run view --log'
alias gh-download='gh run download'
alias gh-secrets='gh secret list'
```

Po dodaniu:

```bash
source ~/.bashrc  # lub ~/.zshrc
```

Użycie:

```bash
gh-ci           # Uruchom CI
gh-runs         # Lista runs
gh-watch        # Watch ostatniego run
gh-logs         # Zobacz logi
gh-download     # Pobierz artefakty
```

## 📱 GitHub Mobile

Możesz też monitorować pipeline z telefonu:

1. Zainstaluj **GitHub Mobile** (iOS/Android)
2. Otwórz repozytorium
3. Przejdź do zakładki **Actions**
4. Zobacz status runs i otrzymuj powiadomienia

## 🆘 Pomoc

```bash
# Pomoc dla gh
gh help

# Pomoc dla konkretnej komendy
gh run --help
gh workflow --help
gh secret --help

# Dokumentacja online
gh browse --docs
```

## 🔗 Przydatne linki

- [GitHub CLI Manual](https://cli.github.com/manual/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Playwright CLI](https://playwright.dev/docs/test-cli)
- [Vitest CLI](https://vitest.dev/guide/cli.html)

---

**Tip:** Dodaj ten plik do zakładek dla szybkiego dostępu do komend!

**Ostatnia aktualizacja:** 2024-12-14
