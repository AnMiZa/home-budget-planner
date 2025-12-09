# Testy komponentów Auth

Ten katalog zawiera testy unit dla komponentów autoryzacji aplikacji Home Budget Planner.

## 📁 Struktura testów

```
tests/components/auth/
├── MessageBanner.test.tsx          # Testy komponentu MessageBanner (11 testów)
├── validation-schemas.test.ts      # Testy schematów walidacji Zod (35 testów)
├── AuthForm.test.tsx               # Testy głównego komponentu AuthForm (18 testów)
└── README.md                       # Ten plik
```

**Łącznie: 64 testy unit**

## 🎯 Pokrycie testowe

### 1. MessageBanner (11 testów)

Komponent wewnętrzny odpowiedzialny za wyświetlanie komunikatów (błędy, sukcesy, info).

**Testowane aspekty:**
- ✅ Renderowanie warunkowe (4 testy)
  - Nie renderuje się dla null/undefined/pustego stringa
  - Renderuje się dla niepustego komunikatu
- ✅ Zawartość i teksty (2 testy)
  - Wyświetla poprawną treść
  - Obsługuje polskie znaki
- ✅ Warianty stylowania (4 testy)
  - Poprawne klasy CSS dla error/success/info
  - Zawsze aplikuje bazowe klasy
- ✅ Accessibility (1 test)
  - Zawiera `role="alert"` dla screen readers

### 2. Schematy walidacji Zod (35 testów)

Testy dla wszystkich schematów walidacji używanych w formularzach auth.

#### LoginSchema (6 testów)
- ✅ Akceptuje poprawny email i hasło
- ✅ Waliduje format email
- ✅ Waliduje obecność hasła
- ✅ Obsługuje pole `rememberMe` (domyślnie false)

#### RegisterSchema (17 testów)
- ✅ Walidacja długości hasła (min. 8 znaków)
- ✅ Wymaga wielkiej litery (w tym polskie: Ą, Ć, Ę, Ł, Ń, Ó, Ś, Ź, Ż)
- ✅ Wymaga małej litery (w tym polskie: ą, ć, ę, ł, ń, ó, ś, ź, ż)
- ✅ Wymaga cyfry
- ✅ Waliduje dopasowanie haseł (password === confirmPassword)
- ✅ Waliduje format email

#### ResetPasswordSchema (5 testów)
- ✅ Waliduje format email
- ✅ Odrzuca nieprawidłowe formaty (brak @, brak domeny, etc.)

#### UpdatePasswordSchema (7 testów)
- ✅ Te same reguły co RegisterSchema dla hasła
- ✅ Waliduje dopasowanie haseł

### 3. AuthForm (18 testów)

Główny komponent generyczny używany przez wszystkie formularze auth.

**Testowane aspekty:**
- ✅ Renderowanie podstawowe (5 testów)
  - Tytuł, opis, children, submitLabel
- ✅ Renderowanie footer (3 testy)
  - Renderuje gdy przekazany
  - Nie renderuje gdy brak
  - Obsługuje złożone footery
- ✅ MessageBanner - błędy i komunikaty (4 testy)
  - Pokazuje globalError
  - Pokazuje successMessage
  - Obsługuje oba jednocześnie
- ✅ Stan submitting (2 testy)
  - Wyświetla Loader2 podczas wysyłania
  - Disabluje przycisk podczas wysyłania
- ✅ Funkcjonalność formularza (3 testy)
  - Wywołuje onSubmit z poprawnymi danymi
  - Nie wywołuje onSubmit dla nieprawidłowych danych
  - Obsługuje submit przez Enter
- ✅ Accessibility (1 test)
  - Ustawia `noValidate` (własna walidacja)

## 🚀 Uruchamianie testów

### Wszystkie testy auth
```bash
npm run test -- tests/components/auth
```

### Konkretny plik
```bash
npm run test -- tests/components/auth/MessageBanner.test.tsx
npm run test -- tests/components/auth/validation-schemas.test.ts
npm run test -- tests/components/auth/AuthForm.test.tsx
```

### Z coverage
```bash
npm run test -- tests/components/auth --coverage
```

### Watch mode (dla development)
```bash
npm run test -- tests/components/auth --watch
```

## 📊 Statystyki

| Komponent | Liczba testów | Status |
|-----------|---------------|--------|
| MessageBanner | 11 | ✅ 100% |
| Validation Schemas | 35 | ✅ 100% |
| AuthForm | 18 | ✅ 100% |
| **TOTAL** | **64** | **✅ 100%** |

## 🔧 Technologie

- **Vitest** - Framework testowy
- **React Testing Library** - Testowanie komponentów React
- **@testing-library/user-event** - Symulacja interakcji użytkownika
- **Zod** - Walidacja schematów

## 📝 Konwencje

### Struktura testów
```typescript
describe("ComponentName", () => {
  describe("Feature/Aspect", () => {
    it("should do something specific", () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

### Nazewnictwo
- Pliki testowe: `*.test.tsx` lub `*.test.ts`
- Describe blocks: Nazwa komponentu → Aspekt → Konkretny przypadek
- Test names: Opisowe, w języku polskim dla komunikatów użytkownika

### Best Practices
1. **Izolacja** - Każdy test jest niezależny
2. **Cleanup** - Automatyczny cleanup po każdym teście (setup.ts)
3. **Accessibility** - Używamy `getByRole`, `getByLabelText` gdzie możliwe
4. **User-centric** - Testujemy zachowanie, nie implementację
5. **Polish support** - Testy uwzględniają polskie znaki

## 🎓 Dlaczego te testy?

### Wysokopriorytetowe elementy
1. **MessageBanner** - Prosty, izolowany komponent prezentacyjny z logiką warunkową
2. **Schematy Zod** - Krytyczna logika biznesowa (bezpieczeństwo, walidacja)
3. **AuthForm** - Komponent wielokrotnego użytku (4 formularze go używają)

### Co NIE jest testowane?
- ❌ Komponenty z shadcn/ui (już przetestowane przez bibliotekę)
- ❌ Proste gettery/settery bez logiki
- ❌ Stylowanie (to dla testów wizualnych/E2E)

## 🔄 Aktualizacje

Przy modyfikacji komponentów auth, pamiętaj o aktualizacji testów:

1. **Zmiana walidacji** → Zaktualizuj `validation-schemas.test.ts`
2. **Nowe pole w formularzu** → Dodaj testy w `AuthForm.test.tsx`
3. **Zmiana MessageBanner** → Zaktualizuj `MessageBanner.test.tsx`

## 📚 Powiązane dokumenty

- [TESTING.md](../../../TESTING.md) - Ogólna strategia testowania
- [TESTING_SETUP.md](../../../TESTING_SETUP.md) - Konfiguracja środowiska testowego
- [tests/README.md](../../README.md) - Dokumentacja wszystkich testów

## ✅ Checklist dla nowych testów

Przy dodawaniu nowych testów auth:

- [ ] Test jest izolowany i nie zależy od innych testów
- [ ] Używa `renderWithProviders` dla komponentów React
- [ ] Testuje zachowanie, nie implementację
- [ ] Zawiera testy dla edge cases
- [ ] Obsługuje polskie znaki (jeśli dotyczy)
- [ ] Sprawdza accessibility (role, aria attributes)
- [ ] Ma opisową nazwę testu
- [ ] Przechodzi lokalnie przed commitem

