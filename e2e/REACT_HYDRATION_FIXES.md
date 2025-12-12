# React Hydration Fixes for E2E Tests

## Problem

Testy E2E failowały, ponieważ próbowały kliknąć przyciski React zanim komponenty zostały w pełni zhydratowane po stronie klienta. W aplikacji Astro z React islands, komponenty są najpierw renderowane jako statyczny HTML, a następnie React "hydratuje" je, dodając interaktywność.

### Objawy problemu:

- `Error: expect(locator).toBeVisible() failed` dla dialogu
- Dialog nie otwierał się po kliknięciu przycisku
- Przycisk był widoczny w DOM, ale event handlery nie były podpięte

## Rozwiązanie

Dodano odpowiednie oczekiwania (waits) w kluczowych miejscach oraz **marker DOM** sygnalizujący gotowość React Context, aby zapewnić, że:

1. Strona jest w pełni załadowana (DOM + network)
2. React zdążył zhydratować komponenty
3. UIContext jest w pełni zainicjalizowany
4. Event handlery są podpięte i działają

### Kluczowe ulepszenie: Marker gotowości React Context

Dodano atrybut `data-ui-context-ready="true"` do `<body>`, który jest ustawiany gdy `UIContextProvider` jest zamontowany. Testy czekają na ten marker przed próbą interakcji z przyciskami.

## Wprowadzone zmiany

### 0. `UIContext.tsx` - Marker gotowości (KLUCZOWE!)

**Dodano `useEffect` ustawiający marker DOM:**

```typescript
useEffect(() => {
  document.body.setAttribute("data-ui-context-ready", "true");
  return () => {
    document.body.removeAttribute("data-ui-context-ready");
  };
}, []);
```

Ten marker sygnalizuje testom, że React Context jest w pełni zainicjalizowany i gotowy do użycia.

### 1. `navigation.component.ts`

**Nowa metoda `waitForUIContextReady()` - czeka na marker:**

```typescript
private async waitForUIContextReady() {
  await this.page.waitForSelector('[data-ui-context-ready="true"]', {
    state: "attached",
    timeout: 15000,
  });
}
```

**Metody `clickAddExpense*()` - dodano:**

- `waitForUIContextReady()` - czeka na gotowość React Context (NAJWAŻNIEJSZE!)
- `waitFor({ state: "visible", timeout: 10000 })` - czeka na widoczność przycisku
- `isDisabled()` check - weryfikuje, że przycisk jest aktywny
- `waitForTimeout(300)` - opóźnienie na aktualizację stanu React

```typescript
async clickAddExpenseSidebar() {
  await this.waitForUIContextReady();
  await this.addExpenseButtonSidebar.waitFor({ state: "visible", timeout: 10000 });

  const isDisabled = await this.addExpenseButtonSidebar.isDisabled();
  if (isDisabled) {
    throw new Error("Add Expense button is disabled");
  }

  await this.addExpenseButtonSidebar.click({ timeout: 5000 });
  await this.page.waitForTimeout(300);
}
```

### 2. `add-expense-dialog.component.ts`

**Metoda `waitForDialog()` - zwiększono timeout:**

- Z domyślnych 5000ms do 10000ms
- Uwzględnia czas potrzebny na hydratację React i aktualizację stanu

**Wszystkie metody interakcji - dodano `waitFor()`:**

- `fillAmount()` - czeka na widoczność inputa
- `selectCategory*()` - czeka na widoczność selecta i opcji
- `fillNote()` - czeka na widoczność textarea
- `submit()` / `cancel()` - czeka na widoczność przycisków

```typescript
async fillAmount(amount: string) {
  await this.amountInput.waitFor({ state: "visible" });
  await this.amountInput.fill(amount);
}
```

### 3. `dashboard.page.ts`

**Metoda `openAddExpenseDialog()` - dodano:**

- `waitForLoadState("networkidle")` przed kliknięciem przycisku
- Zapewnia, że wszystkie zasoby są załadowane i React jest gotowy

```typescript
async openAddExpenseDialog() {
  await this.page.waitForLoadState("networkidle");
  await this.navigation.clickAddExpense();
  await this.addExpenseDialog.waitForDialog();
}
```

**Metoda `addExpense()` - dodano:**

- `waitForLoadState("networkidle")` po zamknięciu dialogu
- Czeka na aktualizacje po dodaniu wydatku

### 4. `base.page.ts`

**Metoda `goto()` - ulepszona:**

- Automatycznie wywołuje `waitForLoad()` po nawigacji

**Metoda `waitForLoad()` - rozszerzona:**

- Czeka zarówno na `domcontentloaded` jak i `networkidle`
- Zapewnia pełną gotowość strony do interakcji

```typescript
async waitForLoad() {
  await this.page.waitForLoadState("domcontentloaded");
  await this.page.waitForLoadState("networkidle");
}
```

## Best Practices dla testów z React

### 0. Czekaj na gotowość React Context (NAJWAŻNIEJSZE!)

```typescript
// Dodaj marker w komponencie React
useEffect(() => {
  document.body.setAttribute("data-ui-context-ready", "true");
}, []);

// W teście czekaj na marker
await page.waitForSelector('[data-ui-context-ready="true"]', {
  state: "attached",
  timeout: 15000,
});
```

### 1. Zawsze czekaj na widoczność przed interakcją

```typescript
await element.waitFor({ state: "visible" });
await element.click();
```

### 2. Używaj odpowiednich timeoutów

- Standardowy timeout: 5000ms
- Dla komponentów React: 10000ms
- Dla animacji: dodatkowe 100-200ms

### 3. Czekaj na stan strony

```typescript
await page.waitForLoadState("domcontentloaded"); // React hydration
await page.waitForLoadState("networkidle"); // Wszystkie requesty
```

### 4. Unikaj race conditions

- Nie zakładaj, że element jest interaktywny tylko dlatego, że jest widoczny
- Zawsze używaj `waitFor()` przed akcją
- Dodaj małe opóźnienia po akcjach zmieniających stan

### 5. Zwiększ timeouty dla złożonych komponentów

```typescript
await dialog.waitFor({
  state: "visible",
  timeout: 10000, // Więcej czasu dla React
});
```

## Testowanie

Po wprowadzeniu zmian, testy powinny:

1. ✅ Czekać na pełne załadowanie strony
2. ✅ Czekać na hydratację React
3. ✅ Czekać na widoczność elementów przed interakcją
4. ✅ Mieć odpowiednie timeouty dla komponentów React
5. ✅ Być odporne na timing issues

## Uruchamianie testów

```bash
# Wszystkie testy
npm run test:e2e

# UI mode (zalecane do debugowania)
npm run test:e2e:ui

# Konkretny plik
npm run test:e2e -- e2e/specs/add-expense.spec.ts
```

## Debugowanie problemów z hydratacją

Jeśli nadal występują problemy:

1. **Sprawdź console w Playwright UI:**

   ```bash
   npm run test:e2e:ui
   ```

2. **Dodaj więcej logowania:**

   ```typescript
   console.log("Before click");
   await button.click();
   console.log("After click");
   ```

3. **Zwiększ timeouty tymczasowo:**

   ```typescript
   await element.waitFor({ state: "visible", timeout: 30000 });
   ```

4. **Użyj `page.pause()` do inspekcji:**
   ```typescript
   await page.pause(); // Zatrzymuje test
   ```

## Dodatkowe zasoby

- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Astro Islands](https://docs.astro.build/en/concepts/islands/)
- [React Hydration](https://react.dev/reference/react-dom/client/hydrateRoot)
