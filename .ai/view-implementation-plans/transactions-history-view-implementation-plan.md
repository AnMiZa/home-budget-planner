# Plan implementacji widoku TransactionHistoryView

## 1. Przegląd

Widok `TransactionHistoryView` ma na celu zapewnienie użytkownikowi dostępu do pełnej, chronologicznej listy wszystkich transakcji (wydatków) zarejestrowanych w bieżącym miesiącu budżetowym. Umożliwia on przeglądanie szczegółów każdej transakcji oraz inicjowanie akcji edycji i usuwania, co jest zgodne z historyjką użytkownika US-011.

## 2. Routing widoku

Widok będzie dostępny pod następującą ścieżką:

- **Ścieżka:** `/transactions`

Implementacja będzie polegać na stworzeniu pliku `src/pages/transactions.astro`, który zaimportuje i wyrenderuje główny komponent Reactowy `TransactionsHistoryView`.

## 3. Struktura komponentów

Hierarchia komponentów zostanie zorganizowana w sposób modułowy, aby oddzielić logikę od prezentacji.

```
/pages/transactions.astro
└── src/components/transactions/TransactionsHistoryView.tsx (Client Component)
    ├── src/components/transactions/TransactionListItem.tsx
    ├── src/components/transactions/TransactionForm.tsx (wewnątrz modala)
    ├── src/components/ui/ConfirmationModal.tsx (komponent generyczny)
    ├── src/components/ui/PaginationControl.tsx (dla widoku desktopowego)
    └── src/components/ui/InfiniteScroll.tsx (dla widoku mobilnego)
```

## 4. Szczegóły komponentów

### `TransactionsHistoryView.tsx`

- **Opis komponentu**: Główny komponent kontenerowy, który zarządza stanem całego widoku. Odpowiada za pobieranie danych (transakcji, kategorii, aktualnego budżetu), obsługę logiki paginacji i nieskończonego przewijania oraz renderowanie listy transakcji.
- **Główne elementy**:
  - Nagłówek widoku (`<h1>Historia transakcji</h1>`).
  - Kontener na listę transakcji.
  - Komponent `TransactionListItem` renderowany w pętli.
  - Warunkowo renderowany `PaginationControl` (desktop) lub `InfiniteScroll` (mobile).
  - Modale (dialogi) do edycji i potwierdzenia usunięcia, zbudowane przy użyciu `Dialog` i `AlertDialog` z `shadcn/ui`.
- **Obsługiwane interakcje**:
  - Inicjalizacja pobierania danych przy pierwszym renderowaniu.
  - Obsługa zmiany strony z `PaginationControl`.
  - Obsługa żądania o więcej danych z `InfiniteScroll`.
  - Otwieranie modala edycji po kliknięciu przycisku "Edytuj".
  - Otwieranie modala potwierdzenia po kliknięciu przycisku "Usuń".
- **Obsługiwana walidacja**: Brak.
- **Typy**: `TransactionVM`, `PaginationMetaDto`, `ApiErrorDto`.
- **Propsy**: Brak.

### `TransactionListItem.tsx`

- **Opis komponentu**: Komponent prezentacyjny, który wyświetla pojedynczy wiersz na liście transakcji.
- **Główne elementy**:
  - Elementy `div` lub `Card` z `shadcn/ui` do struktury.
  - Pola tekstowe na datę, nazwę kategorii, kwotę i notatki.
  - `DropdownMenu` z `shadcn/ui` zawierające przyciski akcji "Edytuj" i "Usuń".
- **Obsługiwane interakcje**:
  - `onClick` na opcji "Edytuj", emitujący zdarzenie `onEdit`.
  - `onClick` na opcji "Usuń", emitujący zdarzenie `onDelete`.
- **Obsługiwana walidacja**: Brak.
- **Typy**: `TransactionVM`.
- **Propsy**:
  - `transaction: TransactionVM` - obiekt transakcji do wyświetlenia.
  - `onEdit: (id: string) => void` - funkcja zwrotna wywoływana po kliknięciu "Edytuj".
  - `onDelete: (id: string) => void` - funkcja zwrotna wywoływana po kliknięciu "Usuń".

### `TransactionForm.tsx`

- **Opis komponentu**: Formularz do edycji istniejącej transakcji, renderowany wewnątrz modala.
- **Główne elementy**:
  - `Input` dla kwoty (`type="number"`).
  - `Select` dla kategorii.
  - `DatePicker` (`Popover` + `Calendar` z `shadcn/ui`) dla daty transakcji.
  - `Textarea` dla notatek.
  - `Button` "Zapisz" i "Anuluj".
- **Obsługiwane interakcje**:
  - `onSubmit` na formularzu, emitujący `onSave`.
  - `onClick` na przycisku "Anuluj", emitujący `onCancel`.
- **Obsługiwana walidacja**:
  - **Kwota**: Musi być liczbą dodatnią, z maksymalnie dwoma miejscami po przecinku.
  - **Kategoria**: Pole wymagane.
  - **Data transakcji**: Pole wymagane.
  - **Notatki**: Pole opcjonalne, z ograniczeniem do 500 znaków.
- **Typy**: `TransactionVM`, `UpdateTransactionCommand`, `CategoryDto`.
- **Propsy**:
  - `transaction: TransactionVM` - dane transakcji do edycji.
  - `categories: CategoryDto[]` - lista dostępnych kategorii do wyświetlenia w `Select`.
  - `onSave: (id: string, data: UpdateTransactionCommand) => void` - funkcja zwrotna z zaktualizowanymi danymi.
  - `onCancel: () => void` - funkcja zwrotna do zamknięcia modala.

## 5. Typy

Do implementacji widoku, oprócz istniejących typów DTO, potrzebny będzie jeden nowy typ ViewModel.

- **`TransactionVM` (ViewModel)**
  - **Cel**: `TransactionDto` z API zawiera tylko `categoryId`. Do wyświetlenia pełnej nazwy kategorii potrzebny jest typ, który połączy dane transakcji z nazwą kategorii.
  - **Struktura**:

    ```typescript
    import type { TransactionDto } from "~/types";

    export interface TransactionVM extends TransactionDto {
      readonly categoryName: string;
    }
    ```

## 6. Zarządzanie stanem

Cała logika stanu zostanie zamknięta w customowym hooku `useTransactionsHistory`, aby utrzymać komponent `TransactionsHistoryView` czystym i skoncentrowanym na renderowaniu.

- **`useTransactionsHistory()`**
  - **Przeznaczenie**: Zarządzanie cyklem życia danych w widoku: pobieranie, aktualizowanie, usuwanie, a także obsługa stanu ładowania, błędów i paginacji.
  - **Zarządzany stan**:
    - `transactions: TransactionVM[]`: Lista transakcji do wyświetlenia.
    - `categories: Map<string, string>`: Mapa ID kategorii na ich nazwy dla szybkiego dostępu.
    - `paginationMeta: PaginationMetaDto | null`: Metadane paginacji z API.
    - `isLoading: boolean`: Flaga informująca o stanie ładowania danych.
    - `error: ApiErrorDto | null`: Obiekt błędu w przypadku niepowodzenia operacji API.
  - **Udostępniane funkcje**:
    - `loadNextPage()`: Funkcja do ładowania kolejnej strony (dla paginacji i infinite scroll).
    - `updateTransaction(id: string, data: UpdateTransactionCommand)`: Wysyła żądanie `PATCH` i aktualizuje stan lokalny.
    - `deleteTransaction(id: string)`: Wysyła żądanie `DELETE` i usuwa element ze stanu lokalnego.
    - `retry()`: Funkcja do ponowienia nieudanego zapytania.

## 7. Integracja API

Integracja będzie opierać się na trzech endpointach.

1. **Pobieranie listy transakcji**:
   - **Endpoint**: `GET /api/budgets/{budgetId}/transactions`
   - **Parametry zapytania**: `page`, `pageSize`, `sort=date_desc`.
   - **Typ odpowiedzi**: `TransactionsListResponseDto`.
   - **Użycie**: Pobieranie danych do wyświetlenia na liście. Wymaga wcześniejszego pozyskania `budgetId` (np. z `GET /api/dashboard/current`).

2. **Aktualizacja transakcji**:
   - **Endpoint**: `PATCH /api/transactions/{transactionId}`
   - **Typ body zapytania**: `UpdateTransactionCommand`.
   - **Typ odpowiedzi**: `TransactionDto`.
   - **Użycie**: Zapisywanie zmian z formularza edycji.

3. **Usuwanie transakcji**:
   - **Endpoint**: `DELETE /api/transactions/{transactionId}`
   - **Odpowiedź**: `204 No Content`.
   - **Użycie**: Usuwanie transakcji po potwierdzeniu przez użytkownika.

## 8. Interakcje użytkownika

- **Przeglądanie listy (Desktop)**: Użytkownik klika na przyciski w komponencie `PaginationControl`, co wywołuje funkcję `loadNextPage(newPage)` z hooka `useTransactionsHistory`. Stan `transactions` jest zastępowany nowymi danymi.
- **Przeglądanie listy (Mobile)**: Użytkownik przewija listę. Komponent `InfiniteScroll` po dotarciu do końca listy wywołuje funkcję `loadNextPage()`. Nowe dane są dołączane do istniejącej listy `transactions`.
- **Edycja transakcji**: Użytkownik klika "Edytuj". Otwiera się modal z komponentem `TransactionForm`. Po zapisaniu zmian wywoływana jest funkcja `updateTransaction`, która po sukcesie API aktualizuje element na liście i zamyka modal.
- **Usuwanie transakcji**: Użytkownik klika "Usuń". Otwiera się modal `ConfirmationModal`. Po potwierdzeniu wywoływana jest funkcja `deleteTransaction`, która po sukcesie API usuwa element z listy.

## 9. Warunki i walidacja

Walidacja danych wejściowych będzie realizowana głównie w komponencie `TransactionForm` przed wysłaniem żądania do API.

- **Stan przycisku "Zapisz"**: Będzie nieaktywny, jeśli formularz edycji jest niewypełniony poprawnie (np. pusta kwota, nieprawidłowa data).
- **Obsługa kwoty**: Pole `input` dla kwoty będzie miało atrybuty `min="0.01"` i `step="0.01"`, aby ułatwić wprowadzanie poprawnych danych.
- **Wiadomości o błędach**: Komunikaty walidacyjne będą wyświetlane pod odpowiednimi polami formularza w czasie rzeczywistym.

## 10. Obsługa błędów

- **Błąd pobierania danych**: Jeśli inicjalne pobranie danych (transakcji, kategorii, budżetu) nie powiedzie się, na całym ekranie zostanie wyświetlony komunikat o błędzie z przyciskiem "Spróbuj ponownie".
- **Błąd paginacji / infinite scroll**: Jeśli pobranie kolejnej strony się nie powiedzie, u dołu listy (lub obok kontrolek paginacji) pojawi się dyskretny komunikat o błędzie z opcją ponowienia.
- **Błąd aktualizacji / usunięcia**: W przypadku niepowodzenia operacji zapisu lub usunięcia, modal nie zostanie zamknięty, a w jego obrębie (lub jako globalny toast) pojawi się komunikat informujący o problemie (np. "Nie udało się zaktualizować transakcji.").

## 11. Kroki implementacji

1. Utworzenie struktury plików: `transactions.astro`, `TransactionsHistoryView.tsx`, `TransactionListItem.tsx`, `TransactionForm.tsx`.
2. Zaimplementowanie customowego hooka `useTransactionsHistory` z logiką pobierania `currentBudgetId` oraz `categories`.
3. Implementacja logiki pobierania pierwszej strony transakcji i wyświetlanie stanu ładowania.
4. Stworzenie komponentu `TransactionListItem` do wyświetlania pojedynczej transakcji.
5. Połączenie `useTransactionsHistory` z `TransactionsHistoryView`, aby wyświetlić listę transakcji.
6. Dodanie logiki responsywnej (np. za pomocą hooka `useMediaQuery`) do warunkowego renderowania `PaginationControl` lub `InfiniteScroll`.
7. Implementacja komponentów `PaginationControl` i `InfiniteScroll` oraz podpięcie ich do funkcji `loadNextPage` z hooka.
8. Implementacja modala edycji z komponentem `TransactionForm` oraz logiki aktualizacji w `useTransactionsHistory`.
9. Implementacja modala potwierdzenia usunięcia oraz logiki usuwania w `useTransactionsHistory`.
10. Finalizacja obsługi wszystkich stanów: ładowania, błędów i pustej listy (gdy brak transakcji).
11. Stylowanie wszystkich komponentów zgodnie z systemem designu (TailwindCSS, shadcn/ui).
