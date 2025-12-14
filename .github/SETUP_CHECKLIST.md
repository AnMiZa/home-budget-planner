# CI/CD Setup Checklist

Użyj tej checklisty aby upewnić się, że CI/CD jest poprawnie skonfigurowane.

## 📋 Pre-setup

- [ ] Masz dostęp do repozytorium GitHub (admin lub maintainer)
- [ ] Masz zainstalowane GitHub CLI (`gh`) lub dostęp do GitHub UI
- [ ] Masz konto Supabase i utworzony projekt
- [ ] Masz dostęp do Supabase Dashboard

## 🔑 Konfiguracja Secrets

### Krok 1: Zbierz dane z Supabase

- [ ] Zalogowałem się do [Supabase Dashboard](https://app.supabase.com)
- [ ] Wybrałem projekt (lub utworzyłem nowy dla testów)
- [ ] Przeszedłem do Settings → API
- [ ] Skopiowałem `Project URL`
- [ ] Skopiowałem `anon public` key
- [ ] Skopiowałem `service_role` key

### Krok 2: Przygotuj credentials testowe

- [ ] Wybrałem email dla użytkownika testowego (np. `test@example.com`)
- [ ] Wybrałem hasło (min. 8 znaków, np. `TestPass123!`)

### Krok 3: Dodaj secrets w GitHub

**Opcja A - Przez UI:**

- [ ] Otworzyłem repozytorium na GitHub
- [ ] Przeszedłem do Settings → Secrets and variables → Actions
- [ ] Dodałem secret: `PUBLIC_SUPABASE_URL`
- [ ] Dodałem secret: `PUBLIC_SUPABASE_ANON_KEY`
- [ ] Dodałem secret: `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Dodałem secret: `E2E_USERNAME`
- [ ] Dodałem secret: `E2E_PASSWORD`

**Opcja B - Przez CLI:**

```bash
gh secret set PUBLIC_SUPABASE_URL
gh secret set PUBLIC_SUPABASE_ANON_KEY
gh secret set SUPABASE_SERVICE_ROLE_KEY
gh secret set E2E_USERNAME
gh secret set E2E_PASSWORD
```

- [ ] Uruchomiłem komendy powyżej i podałem wartości

### Krok 4: Weryfikacja secrets

- [ ] Sprawdziłem listę secrets: `gh secret list` lub przez UI
- [ ] Widzę 5 secrets na liście
- [ ] Wszystkie secrets mają status "Updated" z dzisiejszą datą

## 🚀 Weryfikacja Pipeline

### Krok 5: Sprawdź pliki workflow

- [ ] Plik `.github/workflows/master.yml` istnieje
- [ ] Plik jest w branch `master` lub `main`
- [ ] Nie ma błędów składni YAML (sprawdź w edytorze)

### Krok 6: Włącz workflows

- [ ] Przeszedłem do GitHub → Actions
- [ ] Widzę workflow "CI Pipeline"
- [ ] Workflow jest włączony (nie ma komunikatu "This workflow is disabled")

### Krok 7: Testowe uruchomienie

**Manualne uruchomienie:**

- [ ] Przeszedłem do Actions → CI Pipeline
- [ ] Kliknąłem "Run workflow"
- [ ] Wybrałem branch (master/main)
- [ ] Kliknąłem "Run workflow"
- [ ] Workflow się uruchomił (widzę żółte kółko "In progress")

**Lub przez CLI:**

```bash
gh workflow run master.yml
gh run watch
```

- [ ] Uruchomiłem workflow przez CLI
- [ ] Obserwuję postęp

### Krok 8: Monitoruj wykonanie

- [ ] Job "Lint & Type Check" zakończył się sukcesem ✅
- [ ] Job "Unit Tests" zakończył się sukcesem ✅
- [ ] Job "E2E Tests" zakończył się sukcesem ✅
- [ ] Job "Production Build" zakończył się sukcesem ✅
- [ ] Job "Summary" pokazuje sukces ✅

**Jeśli którykolwiek job failował:**

- [ ] Sprawdziłem logi (Actions → Run → Job → Rozwiń failujący step)
- [ ] Przeczytałem sekcję Troubleshooting w dokumentacji
- [ ] Naprawiłem problem i uruchomiłem ponownie

## 📦 Weryfikacja Artefaktów

- [ ] W sekcji "Artifacts" widzę:
  - [ ] `coverage-report`
  - [ ] `playwright-report`
  - [ ] `test-results`
  - [ ] `dist`
- [ ] Pobrałem `playwright-report` i otworzyłem lokalnie
- [ ] Raport wyświetla się poprawnie

## 🔄 Test Automatycznego Uruchomienia

### Krok 9: Push do master

```bash
# Wprowadź małą zmianę (np. w README)
echo "\n<!-- CI/CD test -->" >> README.md
git add README.md
git commit -m "test: verify CI/CD auto-trigger"
git push origin master
```

- [ ] Wykonałem push do master
- [ ] Przeszedłem do Actions
- [ ] Widzę nowy run workflow (automatycznie uruchomiony)
- [ ] Workflow wykonał się pomyślnie ✅

## 📊 Weryfikacja Lokalna (opcjonalna)

Upewnij się, że wszystko działa lokalnie:

```bash
# Lint & Type Check
npm run lint
npx tsc --noEmit

# Unit Tests
npm test
npm run test:coverage

# E2E Tests (wymaga .env.test)
npm run test:e2e

# Build
npm run build
```

- [ ] Wszystkie komendy wykonały się bez błędów
- [ ] Coverage jest >80%
- [ ] Build został utworzony w `dist/`

## 📚 Dokumentacja

- [ ] Przeczytałem [SECRETS_SETUP.md](./SECRETS_SETUP.md)
- [ ] Przeczytałem [CICD_SUMMARY.md](./CICD_SUMMARY.md)
- [ ] Zapoznałem się z [CI_CD_GUIDE.md](./CI_CD_GUIDE.md)
- [ ] Wiem gdzie szukać pomocy w razie problemów

## 🎯 Finalne sprawdzenie

- [ ] ✅ Wszystkie secrets są skonfigurowane (5/5)
- [ ] ✅ Pipeline uruchamia się automatycznie po push do master
- [ ] ✅ Pipeline można uruchomić manualnie
- [ ] ✅ Wszystkie joby przechodzą pomyślnie
- [ ] ✅ Artefakty są generowane i dostępne
- [ ] ✅ Dokumentacja jest dostępna i zrozumiała

## 🎉 Gotowe!

Jeśli wszystkie checkboxy są zaznaczone, CI/CD jest w pełni skonfigurowane i gotowe do użycia!

---

## 🐛 Troubleshooting

### Problem: Nie widzę workflow w Actions

**Rozwiązanie:**

1. Upewnij się, że plik `master.yml` jest w branch `master` lub `main`
2. Sprawdź czy nie ma błędów składni YAML
3. Odśwież stronę Actions

### Problem: Secret not found

**Rozwiązanie:**

1. Sprawdź dokładną nazwę secret (case-sensitive!)
2. Upewnij się, że to "Repository secret", nie "Environment secret"
3. Sprawdź czy masz uprawnienia do dodawania secrets

### Problem: E2E testy failują

**Rozwiązanie:**

1. Sprawdź czy wszystkie 5 secrets są ustawione: `gh secret list`
2. Zweryfikuj wartości secrets (czy nie ma spacji na początku/końcu)
3. Sprawdź czy projekt Supabase jest aktywny
4. Zobacz szczegółowe logi w Actions

### Problem: Build failuje

**Rozwiązanie:**

1. Sprawdź czy `PUBLIC_SUPABASE_URL` i `PUBLIC_SUPABASE_ANON_KEY` są ustawione
2. Uruchom build lokalnie: `npm run build`
3. Sprawdź logi buildu w Actions

### Problem: Długi czas wykonania

**Rozwiązanie:**

1. To normalne przy pierwszym uruchomieniu (instalacja dependencies)
2. Kolejne uruchomienia będą szybsze dzięki cache
3. Średni czas: 5-8 minut

---

## 📞 Potrzebujesz pomocy?

1. 📖 [CI_CD_GUIDE.md - Troubleshooting](./CI_CD_GUIDE.md#monitoring-i-debugging)
2. 📖 [workflows/README.md - Troubleshooting](./workflows/README.md#troubleshooting)
3. 🔍 Sprawdź logi: `gh run view --log`
4. 🧪 Reprodukuj lokalnie: `npm run test:all && npm run build`

---

**Data utworzenia:** 2024-12-14  
**Wersja:** 1.0.0
