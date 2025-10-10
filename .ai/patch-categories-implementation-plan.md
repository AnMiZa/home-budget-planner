# API Endpoint Implementation Plan: `PATCH /api/categories/{categoryId}`

## 1. Przegląd punktu końcowego

Punkt końcowy `PATCH /api/categories/{categoryId}` służy do aktualizacji nazwy istniejącej kategorii wydatków w ramach gospodarstwa domowego użytkownika.

## 2. Szczegóły żądania

- **Metoda HTTP:** `PATCH`
- **Struktura URL:** `/api/categories/{categoryId}`
- **Parametry:**
  - **Wymagane:**
    - `categoryId` (w ścieżce URL): Identyfikator UUID kategorii do zaktualizowania.
- **Request Body:**
  - Struktura JSON:

    ```json
    {
      "name": "Nowa nazwa kategorii"
    }
    ```

  - Pola:
    - `name` (string, wymagane): Nowa nazwa kategorii, musi mieć od 1 do 100 znaków.

## 3. Wykorzystywane typy

- **Command Model:** `UpdateCategoryCommand`

  ```typescript
  // src/types.ts
  export interface UpdateCategoryCommand {
    readonly name: string;
  }
  ```

- **DTO:** `CategoryDto`, `ApiErrorDto`

## 4. Szczegóły odpowiedzi

- **Odpowiedź sukcesu (200 OK):**
  - Kod statusu: `200`
  - Ciało odpowiedzi: Obiekt `CategoryDto` zaktualizowanej kategorii.

    ```json
    {
      "id": "uuid-kategorii",
      "name": "Nowa nazwa kategorii",
      "createdAt": "2024-10-10T10:00:00.000Z",
      "updatedAt": "2024-10-10T12:30:00.000Z"
    }
    ```

- **Odpowiedzi błędów:**
  - **400 Bad Request:** Nieprawidłowe dane wejściowe.
    - `INVALID_NAME`: Nazwa nie spełnia kryteriów walidacji.
    - `INVALID_CATEGORY_ID`: `categoryId` nie jest poprawnym UUID.
  - **404 Not Found:**
    - `CATEGORY_NOT_FOUND`: Kategoria o podanym ID nie istnieje lub nie należy do gospodarstwa domowego użytkownika.
  - **409 Conflict:**
    - `CATEGORY_NAME_CONFLICT`: Kategoria o podanej nazwie już istnieje w danym gospodarstwie domowym.
  - **401 Unauthorized:** Użytkownik nie jest uwierzytelniony.

## 5. Przepływ danych

1. Żądanie `PATCH` trafia do endpointu Astro `/src/pages/api/categories/[categoryId].ts`.
2. Middleware (`src/middleware/index.ts`) weryfikuje sesję użytkownika. Jeśli użytkownik nie jest zalogowany, zwraca błąd 401. Wzbogaca `Astro.locals` o sesję i `householdId`.
3. Handler `PATCH` w pliku endpointu parsuje `categoryId` z parametrów ścieżki oraz `name` z ciała żądania.
4. Dane wejściowe są walidowane przy użyciu `zod`. Sprawdzane jest, czy `categoryId` to UUID i czy `name` jest stringiem o odpowiedniej długości. W razie błędu zwracany jest status 400.
5. Wywoływana jest funkcja `updateCategory` z serwisu `CategoriesService` (`src/lib/services/categories.service.ts`), przekazując `supabaseClient` (z `Astro.locals`), `householdId`, `categoryId` oraz dane z `UpdateCategoryCommand`.
6. `updateCategory` wykonuje zapytanie `UPDATE` do tabeli `categories` w Supabase, aktualizując pole `name` dla wiersza o podanym `id` i `household_id`.
7. Serwis analizuje wynik operacji:
   - Jeśli zapytanie nie zaktualizowało żadnego wiersza, oznacza to, że kategoria nie istnieje lub użytkownik nie ma do niej dostępu. Serwis rzuca błąd, który jest mapowany na odpowiedź 404.
   - Jeśli baza danych zwróci błąd naruszenia unikalności (`unique constraint violation`, kod `23505`), oznacza to konflikt nazw. Serwis rzuca błąd mapowany na odpowiedź 409.
   - W przypadku sukcesu, serwis zwraca zaktualizowany obiekt kategorii.
8. Endpoint Astro otrzymuje dane z serwisu i zwraca odpowiedź JSON z kodem 200.

## 6. Względy bezpieczeństwa

- **Uwierzytelnianie:** Dostęp do punktu końcowego jest chroniony przez middleware, które weryfikuje token JWT użytkownika.
- **Autoryzacja:** Logika biznesowa i zapytania do bazy danych muszą bezwzględnie używać `household_id` pobranego z sesji zalogowanego użytkownika. To, w połączeniu z politykami **Row Level Security (RLS)** na tabeli `categories`, zapewnia, że użytkownik może modyfikować tylko i wyłącznie kategorie należące do jego gospodarstwa domowego.
- **Walidacja danych wejściowych:** Użycie `zod` do walidacji `categoryId` i `name` chroni przed atakami typu SQL Injection oraz zapewnia integralność danych.

## 7. Rozważania dotyczące wydajności

- Operacja `UPDATE` na tabeli `categories` będzie wydajna, ponieważ `id` jest kluczem głównym, a `(household_id, lower(name))` posiada unikalny indeks, który przyspieszy sprawdzanie konfliktów.
- Obciążenie jest minimalne; operacja dotyczy pojedynczego rekordu. Nie przewiduje się problemów z wydajnością.

## 8. Etapy wdrożenia

1. **Aktualizacja serwisu (`src/lib/services/categories.service.ts`):**
   - Dodaj nową funkcję `updateCategory(client, householdId, categoryId, command)`.
   - Zaimplementuj logikę aktualizacji rekordu w tabeli `categories` przy użyciu `supabaseClient`.
   - Dodaj obsługę błędów: `CATEGORY_NOT_FOUND` (gdy `data` jest `null` lub `count` jest 0) i `CATEGORY_NAME_CONFLICT` (przechwytując błąd bazy danych o kodzie `23505`).
   - Funkcja powinna zwracać zaktualizowany obiekt `CategoryDto` w przypadku sukcesu.

2. **Utworzenie pliku endpointu (`src/pages/api/categories/[categoryId].ts`):**
   - Utwórz nowy plik o podanej ścieżce.
   - Zaimplementuj handler dla metody `PATCH`.
   - Dodaj `export const prerender = false;`
   - Pobierz `supabase` i `householdId` z `context.locals`.
   - Pobierz `categoryId` z `context.params`.
   - Pobierz `name` z `await context.request.json()`.
   - Zdefiniuj schemat walidacji `zod` dla `categoryId` (jako `z.string().uuid()`) i ciała żądania (`z.object({ name: z.string().min(1).max(100) })`).
   - Zwaliduj dane wejściowe. W przypadku błędu zwróć odpowiedź 400 z odpowiednim komunikatem.
   - Wywołaj serwis `categoriesService.updateCategory`.
   - Obsłuż błędy rzucane przez serwis i zmapuj je na odpowiednie odpowiedzi HTTP (404, 409).
   - W przypadku sukcesu, zwróć odpowiedź 200 z danymi zwróconymi przez serwis.
