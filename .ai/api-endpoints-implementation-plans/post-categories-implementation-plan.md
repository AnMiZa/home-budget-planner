# API Endpoint Implementation Plan: POST /api/categories

## 1. Przegląd punktu końcowego

Punkt końcowy tworzy nową kategorię wydatków przypisaną do gospodarstwa domowego zalogowanego użytkownika. Wymaga poprawnego uwierzytelnienia, waliduje nazwę kategorii i zwraca pełny obiekt `CategoryDto` utworzonego rekordu.

## 2. Szczegóły żądania

- **Metoda HTTP:** POST
- **Struktura URL:** `/api/categories`
- **Parametry:**
  - **Wymagane:** `name` (string)
  - **Opcjonalne:** brak
- **Request Body:**
  - JSON spełniający schemat `{ "name": "Transport" }`
  - Zasady walidacji: trim, długość 1-100 znaków, brak pustego ciągu po trim, obsługa wielkości liter zgodnie z polityką unikalności (case-insensitive).

## 3. Szczegóły odpowiedzi

- **201 Created**
  - Body: obiekt `CategoryDto`
  - Nagłówek: `X-Result-Code: CATEGORY_CREATED`
- **400 Bad Request** (`INVALID_NAME`)
  - Niepoprawna nazwa (walidacja Zod lub naruszenie constraint po stronie serwisu)
- **401 Unauthorized** (`UNAUTHENTICATED`)
  - Brak zalogowanego użytkownika lub błąd uwierzytelnienia Supabase
- **404 Not Found** (`HOUSEHOLD_NOT_FOUND`)
  - Brak gospodarstwa powiązanego z użytkownikiem
- **409 Conflict** (`CATEGORY_NAME_CONFLICT`)
  - Naruszenie unikalności `household_id, lower(name)`
- **500 Internal Server Error** (`CATEGORY_CREATE_FAILED`)
  - Inne błędy Supabase/bazy danych

**Wykorzystywane typy:** `CreateCategoryCommand` (input serwisu), `CategoryDto` (body sukcesu), `ApiErrorDto` (payload błędów).

## 4. Przepływ danych

1. Handler `POST /api/categories` pobiera klienta Supabase z `locals` i próbuje odczytać zalogowanego użytkownika.
2. Waliduje body żądania przy użyciu schematu Zod (trim + ograniczenia długości).
3. Tworzy instancję `CategoriesService` przez `createCategoriesService(supabase)`.
4. Serwis:
   - Odczytuje `household_id` użytkownika (z tabeli `households` jak w metodzie listującej).
   - Wstawia rekord do tabeli `categories` z `household_id` i `name` (trimowane).
   - Mapuje odpowiedź na `CategoryDto` (uwzględnia `created_at`, `updated_at`).
5. Handler zwraca `201` z `CategoryDto` i ustawia nagłówek `X-Result-Code`.
6. Błędy serwisu lub walidacji są przekonwertowane na odpowiednie kody/statusy.

## 5. Względy bezpieczeństwa

- Uwierzytelnienie za pomocą `supabase.auth.getUser()`; brak użytkownika → `401`.
- Autoryzacja implicit: kategorie powiązane są z `household_id` znalezionym dla bieżącego użytkownika; brak możliwości wstrzyknięcia innego `household_id` w payloadzie.
- Zależność od RLS Supabase na tabelach (`categories` z wymuszeniem właściciela) jako dodatkowa ochrona.
- Zapobieganie SQL Injection dzięki Supabase Query Builder i walidacji Zod.
- Logowanie błędów (bez wrażliwych danych) przy użyciu `console.error`/`console.warn` zgodnie z istniejącą konwencją.

## 6. Obsługa błędów

- **Walidacja wejścia:** Zod zwraca `400 INVALID_NAME` (pierwsza wiadomość błędu); log `console.warn`.
- **Brak supabase w locals:** `500 CATEGORY_CREATE_FAILED` z logiem serwera.
- **Błędy uwierzytelnienia:** `401 UNAUTHENTICATED`.
- **Brak gospodarstwa:** serwis zwraca `HOUSEHOLD_NOT_FOUND` → handler `404`.
- **Naruszenie unikalności (kod PG `23505`):** mapowane na `409 CATEGORY_NAME_CONFLICT`.
- **Inne błędy bazy/serwisu:** `500 CATEGORY_CREATE_FAILED`, log szczegółowy.
- Brak dedykowanej tabeli błędów – pozostajemy przy rejestrowaniu w logach; gdy pojawi się tabela, można rozszerzyć serwis o utility do zapisu.

## 7. Rozważania dotyczące wydajności

- Operacja insertu jest lekka; jedyny dodatkowy query to pobranie `household_id` (można cache’ować w pamięci serwisu jeśli będzie powtarzalne, ale w MVP pojedynczy SELECT wystarczy).
- Utrzymywać indeks funkcjonalny `idx_categories_name` dla walidacji duplikatów (już istnieje).
- Minimalizować payload odpowiedzi do niezbędnych pól `CategoryDto`.

## 8. Kroki implementacji

1. **Walidacja Zod:** Utwórz schemat dla body (trim, min/max) w `src/pages/api/categories.ts` (sekcja POST).
2. **Supabase & auth:** Powiel logikę pozyskania użytkownika z istniejącego `GET` handlera (refaktoryzacja helpera opcjonalna).
3. **Rozszerzenie serwisu:** Dodaj metodę `createCategory(userId: string, command: CreateCategoryCommand)` w `CategoriesService`, z obsługą `HOUSEHOLD_NOT_FOUND`, `CATEGORY_NAME_CONFLICT`, `CATEGORY_CREATE_FAILED` (mapowanie błędów Supabase).
4. **Handler POST:** Zaimplementuj nowy handler korzystający z serwisu, walidacji i mapowania błędów na kody statusu + nagłówek `X-Result-Code`.
