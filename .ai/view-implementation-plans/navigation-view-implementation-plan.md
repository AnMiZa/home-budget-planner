# Plan implementacji widoku nawigacji głównej

## 1. Przegląd

Celem jest implementacja głównego komponentu nawigacyjnego aplikacji, który będzie responsywny i dostosuje swój wygląd do rozmiaru ekranu. Na urządzeniach mobilnych będzie on pełnił funkcję paska zakładek (`TabBar`) na dole ekranu, zapewniając łatwy dostęp kciukiem. Na urządzeniach desktopowych przyjmie formę paska bocznego (`Sidebar`) po lewej stronie, oferując bardziej tradycyjną nawigację. Komponent zapewni spójny dostęp do kluczowych sekcji aplikacji: pulpitu, historii transakcji i ustawień, a także będzie zawierał centralny przycisk akcji do dodawania nowego wydatku.

## 2. Struktura komponentów

Hierarchia komponentów zostanie zorganizowana w celu zapewnienia reużywalności i czystej logiki. Główny komponent `MainLayout` będzie zarządzał układem całej strony, w tym dostosowaniem marginesów treści w zależności od aktywnego wariantu nawigacji.

```
- MainLayout (React, komponent kliencki)
  - MainNavigation (React)
    - Sidebar (React, widok desktopowy)
      - Logo
      - NavigationItem (React, reużywalny)
      - NavigationItem
      - NavigationItem
      - AddExpenseButton (React, reużywalny)
    - TabBar (React, widok mobilny)
      - NavigationItem
      - NavigationItem
      - AddExpenseButton
      - NavigationItem
  - AddExpenseSheet (React, komponent globalny)
  - <slot /> (treść strony z Astro)
```

## 3. Szczegóły komponentów

### `MainLayout`

- **Opis komponentu:** Główny kontener layoutu aplikacji, renderowany jako interaktywny komponent React (`client:load`). Jego zadaniem jest dostarczenie globalnego kontekstu (np. `UIContext` do zarządzania widocznością modali), renderowanie nawigacji oraz dynamiczne dostosowywanie marginesów głównej treści (`<main>`) w zależności od tego, czy wyświetlany jest `Sidebar`, czy `TabBar`.
- **Główne elementy:** `div` jako kontener, komponent `MainNavigation`, element `<main>` owijający `children` (treść strony).
- **Obsługiwane zdarzenia:** Brak bezpośrednich interakcji; zarządza stanem i układem.
- **Propsy:** `children: React.ReactNode`

### `MainNavigation`

- **Opis komponentu:** Komponent logiczny, który nie renderuje własnego UI. Jego jedynym zadaniem jest użycie customowego hooka `useMediaQuery` do sprawdzenia szerokości ekranu i na tej podstawie warunkowe renderowanie komponentu `Sidebar` lub `TabBar`.
- **Główne elementy:** `Sidebar` lub `TabBar`.
- **Obsługiwane zdarzenia:** Brak.
- **Propsy:** Brak.

### `Sidebar`

- **Opis komponentu:** Widoczny tylko na desktopie, pionowy pasek nawigacyjny przy lewej krawędzi ekranu. Zawiera logo, listę linków nawigacyjnych (`NavigationItem`) oraz przycisk do dodawania wydatku.
- **Główne elementy:** `<aside>`, `<div>` na logo, `<nav>`, komponenty `NavigationItem` oraz `AddExpenseButton`.
- **Obsługiwane zdarzenia:** Kliknięcie w `AddExpenseButton`.
- **Propsy:** Brak.

### `TabBar`

- **Opis komponentu:** Widoczny tylko na mobile, poziomy pasek nawigacyjny przy dolnej krawędzi ekranu. Zawiera ikony linków nawigacyjnych (`NavigationItem`) oraz centralnie umieszczony, wyróżniony przycisk `AddExpenseButton`.
- **Główne elementy:** `<footer>`, `<nav>`, komponenty `NavigationItem` oraz `AddExpenseButton`.
- **Obsługiwane zdarzenia:** Kliknięcie w `AddExpenseButton`.
- **Propsy:** Brak.

### `NavigationItem`

- **Opis komponentu:** Reużywalny komponent reprezentujący pojedynczy link nawigacyjny. Składa się z ikony i etykiety. Automatycznie wykrywa, czy jego ścieżka (`href`) jest aktywna i stosuje odpowiednie style w celu wizualnego wyróżnienia.
- **Główne elementy:** `<a>` (lub komponent `Link` z biblioteki routingowej, jeśli dotyczy), komponent ikony, `<span>` dla etykiety.
- **Obsługiwane zdarzenia:** Nawigacja po kliknięciu.
- **Propsy:**

  ```typescript
  interface NavigationItemProps {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }
  ```

### `AddExpenseButton`

- **Opis komponentu:** Przycisk głównej akcji. Jego wygląd może się różnić w zależności od kontekstu (w `Sidebar` jako przycisk z tekstem, w `TabBar` jako pływająca, okrągła ikona). Jego kliknięcie wywołuje funkcję z globalnego kontekstu, otwierającą modal/arkusz dodawania wydatku.
- **Główne elementy:** `<button>`.
- **Obsługiwane zdarzenia:** `onClick`.
- **Propsy:**

  ```typescript
  interface AddExpenseButtonProps {
    variant: "sidebar" | "tabbar";
  }
  ```

## 4. Typy

Do implementacji widoku nawigacji nie są wymagane nowe, złożone typy danych z `types.ts`. Większość potrzebnych typów to interfejsy propsów dla poszczególnych komponentów.

```typescript
// Propsy dla NavigationItem
interface NavigationItemProps {
  href: string;
  label: string;
  // Przyjmuje komponent ikony, np. z 'lucide-react'
  icon: React.ComponentType<{ className?: string }>;
}

// Propsy dla AddExpenseButton w celu wariantowania stylów
interface AddExpenseButtonProps {
  variant: "sidebar" | "tabbar";
}

// Definicja stanu i akcji dla kontekstu UI
interface UIContextType {
  isAddExpenseSheetOpen: boolean;
  openAddExpenseSheet: () => void;
  closeAddExpenseSheet: () => void;
}
```

## 5. Zarządzanie stanem

Zarządzanie stanem będzie podzielone na dwa obszary:

1. **Stan responsywności (lokalny):**
   - Zostanie zaimplementowany customowy hook `useMediaQuery(query: string): boolean`.
   - Hook ten będzie nasłuchiwał na zmiany rozmiaru okna przeglądarki i zwracał `true` lub `false` w zależności od tego, czy podany `query` (np. `'(min-width: 768px)'`) jest spełniony.
   - Będzie on użyty w `MainNavigation` do przełączania między `Sidebar` a `TabBar`.
   - Hook musi być bezpieczny dla SSR, zwracając domyślną wartość (`false`) na serwerze i aktualizując stan po stronie klienta.

2. **Stan widoczności modala `AddExpenseSheet` (globalny):**
   - Zostanie utworzony `UIContext` za pomocą `React.Context`.
   - Dostawca kontekstu (`UIContextProvider`) będzie umieszczony na najwyższym poziomie layoutu (`MainLayout`), aby objąć zarówno komponent nawigacji, jak i komponent `AddExpenseSheet`.
   - Kontekst będzie przechowywał stan `isAddExpenseSheetOpen` oraz funkcje `openAddExpenseSheet` i `closeAddExpenseSheet`.
   - Komponent `AddExpenseButton` użyje hooka `useContext` do pobrania funkcji `openAddExpenseSheet` i wywołania jej po kliknięciu.
   - Komponent `AddExpenseSheet` użyje tego samego kontekstu do kontrolowania swojej widoczności.

## 6. Interakcje użytkownika

- **Nawigacja:** Kliknięcie elementu `NavigationItem` powoduje przejście do powiązanej z nim podstrony. Aktywny link jest wyraźnie oznaczony wizualnie.
- **Dodawanie wydatku:** Kliknięcie `AddExpenseButton` (w dowolnym wariancie) otwiera `AddExpenseSheet` (arkusz od dołu na mobile, modal na desktopie), który nakłada się na bieżącą treść strony.
- **Zmiana rozmiaru okna:** Przekroczenie progu responsywności (np. 768px) powoduje automatyczną i płynną zamianę `TabBar` na `Sidebar` (lub odwrotnie) bez przeładowania strony. Layout głównej treści jest dynamicznie dostosowywany, aby uniknąć przysłonięcia przez `Sidebar`.

## 7. Warunki i walidacja

- **Aktywny link:** Komponent `NavigationItem` będzie porównywał swój props `href` z aktualną ścieżką URL (`window.location.pathname`). Jeśli ścieżki są zgodne, komponent otrzyma specjalne klasy CSS (np. zmiana koloru tła, koloru ikony/tekstu). Stan będzie aktualizowany po każdej nawigacji po stronie klienta (nasłuchiwanie na event `astro:page-load`).
- **Renderowanie warunkowe:** Komponent `MainNavigation` na podstawie wartości logicznej z hooka `useMediaQuery` będzie renderował albo `Sidebar`, albo `TabBar`. Jest to jedyny warunek walidowany na tym poziomie.

## 8. Obsługa błędów

- **Brak `UIContext`:** Hook `useUIContext` powinien być zaimplementowany w taki sposób, aby rzucał błąd, jeśli jest używany poza `UIContextProvider`. To ułatwi debugowanie i zapewni, że komponenty są poprawnie umieszczone w drzewie.

  ```javascript
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error("useUIContext must be used within a UIContextProvider");
  }
  ```

- **Problem z `useMediaQuery` na serwerze (SSR):** Hook musi być zaprojektowany tak, aby nie odwoływał się do obiektu `window` podczas renderowania po stronie serwera. Logika powinna być umieszczona wewnątrz `useEffect`, a domyślną wartością zwracaną na serwerze będzie `false` (zgodnie z podejściem mobile-first).

## 9. Kroki implementacji

1. **Utworzenie `useMediaQuery` hook:** Zaimplementowanie reużywalnego, bezpiecznego dla SSR hooka do śledzenia breakpointów CSS.
2. **Utworzenie `UIContext`:** Zdefiniowanie nowego kontekstu React do zarządzania stanem globalnych komponentów UI, takich jak modale i panele boczne.
3. **Implementacja komponentów `NavigationItem` i `AddExpenseButton`:** Stworzenie podstawowych, reużywalnych bloków konstrukcyjnych nawigacji.
4. **Implementacja `TabBar` i `Sidebar`:** Złożenie statycznych wersji obu wariantów nawigacji z wcześniej przygotowanych komponentów.
5. **Implementacja `MainNavigation`:** Dodanie logiki responsywności przy użyciu `useMediaQuery` do dynamicznego renderowania `Sidebar` lub `TabBar`.
6. **Stworzenie `MainLayout`:** Zintegrowanie `MainNavigation` w głównym komponencie layoutu. Dodanie `UIContextProvider` i logiki dynamicznie dodającej `padding`/`margin` do elementu `<main>`, aby treść nie była przysłaniana przez nawigację.
7. **Integracja z Astro:** Umieszczenie komponentu `MainLayout` w głównym pliku `Layout.astro` i dodanie dyrektywy `client:load`, aby umożliwić jego interaktywność po stronie klienta.
8. **Podłączenie akcji:** Zintegrowanie przycisku `AddExpenseButton` z `UIContext`, aby jego kliknięcie poprawnie zarządzało stanem widoczności `AddExpenseSheet`.
9. **Stylowanie i dopracowanie:** Finalne dopracowanie stylów w Tailwind CSS, w tym stanów `hover`, `focus` oraz `active` dla `NavigationItem`, a także dodanie płynnych przejść (transitions) dla zmiany wyglądu.
10. **Testowanie:** Przetestowanie responsywności, działania nawigacji i otwierania modala na różnych urządzeniach i szerokościach ekranu.
