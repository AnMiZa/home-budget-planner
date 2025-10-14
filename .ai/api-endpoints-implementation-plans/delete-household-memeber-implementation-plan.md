# API Endpoint Implementation Plan: DELETE /api/household-members/{memberId}

## 1. Przegląd punktu końcowego

- Soft-dezaktywuje wskazanego domownika ustawiając `is_active = false`, pozostawiając dane historyczne nietknięte.
- Dostęp wymaga uwierzytelnionego użytkownika powiązanego z gospodarstwem obejmującym domownika.
- Zwraca pustą odpowiedź z kodem 204 oraz nagłówkiem `X-Result-Code: MEMBER_DEACTIVATED`.

## 2. Szczegóły żądania

- Metoda HTTP: DELETE
- Struktura URL: `/api/household-members/{memberId}`
- Parametry:
  - Wymagane: `memberId` (UUID w ścieżce)
  - Opcjonalne: brak
- Request Body: brak
- Nagłówki klienckie: standardowe `Authorization` (Supabase), `Content-Type` nie jest wymagany.

## 3. Wykorzystywane typy

- `ApiErrorDto` (`src/types.ts`) – odpowiedzi błędów.
- `HouseholdMemberDto` (pośrednio w serwisie; endpoint nie zwraca payloadu, ale typ przydatny w testach).
- `UpdateHouseholdMemberCommand` – można wykorzystać do przekazania `isActive: false` w warstwie serwisu.
- Nowy typ (opcjonalnie): `DeactivateHouseholdMemberCommand` (jeśli chcemy uniezależnić od `UpdateHouseholdMemberCommand`).

## 4. Szczegóły odpowiedzi

- Sukces: `204 No Content`, nagłówek `X-Result-Code: MEMBER_DEACTIVATED`, brak body.
- Błędy:
  - `400 Bad Request` (`INVALID_MEMBER_ID`) – gdy `memberId` nie jest poprawnym UUID.
  - `401 Unauthorized` (`UNAUTHENTICATED`) – brak zalogowanego użytkownika.
  - `404 Not Found` (`MEMBER_NOT_FOUND`) – brak domownika w gospodarstwie użytkownika.
  - `500 Internal Server Error` (`MEMBER_DEACTIVATE_FAILED`) – błąd infrastrukturalny lub nieoczekiwany.

## 5. Przepływ danych

1. Klient wysyła `DELETE` z `memberId` w ścieżce.
2. Handler Astro:
   - Waliduje `memberId` przez `zod`.
   - Pozyskuje `supabase` z `locals` i uwierzytelnionego użytkownika.
3. Tworzy instancję `HouseholdMembersService` przez `createHouseholdMembersService`.
4. `HouseholdMembersService.deactivateMember`:
   - Pobiera `household_id` użytkownika.
   - Weryfikuje, że domownik istnieje i przynależy do `household_id`.
   - Aktualizuje `household_members` ustawiając `is_active = false`, odświeża `updated_at`.
5. Handler zwraca `204` bez body i nagłówek `X-Result-Code: MEMBER_DEACTIVATED`.

## 6. Względy bezpieczeństwa

- Uwierzytelnienie przez `supabase.auth.getUser()`; w razie błędu `401`.
- Autoryzacja oparta na RLS i dodatkowym sprawdzeniu `household_id` w serwisie.
- Walidacja UUID eliminuje możliwość SQL injection i błędów formatu.
- Brak body minimalizuje ryzyko masowych aktualizacji (mass assignment).
- Ukrywanie różnic między brakiem domownika a brakiem dostępu (zwracamy `404` bez dodatkowych szczegółów).
- Zabezpieczenie przed race condition: transakcja lub sekwencja zapytań powinna być idempotentna (ponowne wywołanie na już dezaktywowanym członku może zwracać `204`).

## 7. Obsługa błędów

- Walidacyjne: `memberIdSchema.safeParse`. Przy błędzie log `console.error` i `400 INVALID_MEMBER_ID`.
- Brak supabase lub błąd auth: log + `401 UNAUTHENTICATED` lub `500` przy braku klienta.
- Gospodarstwo lub domownik nie istnieje: serwis rzuca `HOUSEHOLD_NOT_FOUND` lub `MEMBER_NOT_FOUND`; mapujemy na `404` z kodem `MEMBER_NOT_FOUND`.
- Błędy bazodanowe/nieoczekiwane: log pełnych szczegółów i zwrot `500 MEMBER_DEACTIVATE_FAILED`.
- Logowanie: używamy `console.error` z kontekstem (userId, memberId, kod błędu); w przyszłości można zintegrować z centralnym logowaniem.

## 8. Rozważania dotyczące wydajności

- Zapytania ograniczone do pojedynczego gospodarstwa; indeks na `household_members.household_id` już wspiera filtrację.
- Brak potrzeby paginacji lub dodatkowych joinów – operacja O(1).
- Upewnić się, że serwis wykonuje minimalną liczbę zapytań (2 maks: household, member).

## 9. Etapy wdrożenia

1. Dodaj schema walidacji `memberId` i helpery odpowiedzi (można reuse z istniejącego pliku PATCH) w nowym handlerze `DELETE`.
2. Rozszerz `household-members.service.ts` o metodę `deactivateMember(userId, memberId)`; wykorzystaj analogiczną strukturę jak `updateMember`.
3. Zmodyfikuj `src/pages/api/household-members/[memberId].ts`:
   - Dodaj handler `DELETE` eksportowany obok `PATCH`.
   - Użyj wspólnych helperów do tworzenia odpowiedzi i kodów błędów.
   - Zadbaj o nagłówek `X-Result-Code` i status `204`.
