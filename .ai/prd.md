# Dokument wymagań produktu (PRD) - Home Budget Planner

## 1. Przegląd produktu

Home Budget Planner to aplikacja webowa zaprojektowana w podejściu "mobile-first", której celem jest uproszczenie procesu planowania i śledzenia miesięcznych wydatków w gospodarstwie domowym. Aplikacja umożliwia użytkownikom sumowanie miesięcznych przychodów wszystkich domowników, tworzenie budżetu poprzez alokację środków na zdefiniowane przez siebie kategorie wydatków, a następnie bieżące monitorowanie realizacji tego planu. Kluczowe założenia produktu w wersji MVP (Minimum Viable Product) to prostota, intuicyjność interfejsu oraz koncentracja na podstawowych funkcjonalnościach, które realnie rozwiązują problem kontroli nad domowymi finansami.

## 2. Problem użytkownika

Wiele gospodarstw domowych boryka się z problemem braku kontroli nad swoimi finansami. Trudność w śledzeniu, na co i ile pieniędzy jest wydawane w cyklu miesięcznym, prowadzi do przekraczania budżetu, niemożności oszczędzania i ogólnego poczucia niepewności finansowej. Istniejące narzędzia są często zbyt skomplikowane lub nieprzystosowane do modelu wspólnego budżetu, gdzie kilka osób wnosi swoje przychody do jednej puli. Home Budget Planner adresuje tę potrzebę, dostarczając proste i scentralizowane narzędzie do zarządzania wspólnym budżetem, które w klarowny sposób pokazuje, ile środków pozostało do dyspozycji w danym miesiącu.

## 3. Wymagania funkcjonalne

### 3.1. Zarządzanie kontem i gospodarstwem domowym

- Rejestracja użytkownika za pomocą adresu e-mail i hasła.
- Logowanie do systemu z opcją "Zapamiętaj mnie" utrzymującą sesję przez 30 dni.
- Funkcjonalność resetowania zapomnianego hasła.
- Możliwość definiowania członków gospodarstwa domowego (dodawanie, edycja, usuwanie nazw). Operacje te nie wpływają na historyczne dane budżetowe.

### 3.2. Zarządzanie budżetem miesięcznym

- Każdy miesiąc kalendarzowy stanowi osobną, zamkniętą jednostkę budżetową.
- Możliwość wprowadzenia przychodów dla każdego zdefiniowanego domownika na początku miesiąca. Suma przychodów tworzy ogólną pulę środków na dany miesiąc.
- Możliwość tworzenia, edycji i usuwania własnych kategorii wydatków. Aplikacja dostarcza domyślny, w pełni modyfikowalny zestaw kategorii.
- Alokacja budżetu poprzez przypisanie planowanych limitów wydatków do poszczególnych kategorii.
- Automatyczne obliczanie i wyświetlanie kwoty "Środków wolnych" (różnica między sumą przychodów a sumą limitów w kategoriach).
- Plan budżetu jest domyślnie zablokowany. Modyfikacja limitów wymaga wejścia w dedykowany tryb "Edytuj plan".

### 3.3. Śledzenie wydatków

- Prosty formularz do dodawania wydatków zawierający pola: kwota (tylko wartości dodatnie), kategoria (lista rozwijana), data (domyślnie bieżąca) i opcjonalne notatki.
- Możliwość edycji i usuwania zarejestrowanych transakcji.
- Brak obsługi transakcji ujemnych (np. zwrotów) w wersji MVP.

### 3.4. Wizualizacja i raportowanie

- Główny pulpit (dashboard) prezentujący ogólny stan budżetu za pomocą paska postępu oraz sumarycznej kwoty pozostałej do wydania.
- Lista wszystkich kategorii na pulpicie, każda z własnym paskiem postępu i informacją tekstową w formacie "wydano X zł z Y zł".
- Wyraźna wizualna sygnalizacja (np. zmiana koloru paska postępu na czerwony) w przypadku przekroczenia budżetu w danej kategorii lub w całym budżecie.
- Dostęp do prostej, chronologicznej listy wszystkich transakcji w bieżącym miesiącu.
- Możliwość nawigacji i przeglądania archiwalnych budżetów z poprzednich miesięcy.

## 4. Granice produktu

Poniższe funkcjonalności nie wchodzą w zakres wersji MVP i będą rozważane w przyszłych iteracjach produktu:

- Brak możliwości dzielenia jednego budżetu na kilka kont użytkowników (model: jedno gospodarstwo = jedno konto).
- Brak obsługi multimediów, w tym importowania i przechowywania skanów lub zdjęć faktur i paragonów.
- Brak mechanizmów opartych na AI do analizy zaimportowanych plików.
- Brak integracji z kontem e-mail w celu automatycznego wyszukiwania i importowania rachunków.
- Brak zaawansowanego sortowania i filtrowania na liście historii transakcji.
- Brak dedykowanego samouczka (onboardingu) dla nowych użytkowników. Interfejs musi być w pełni intuicyjny.
- Brak możliwości dodawania transakcji ujemnych (zwrotów).

## 5. Historyjki użytkowników

### Zarządzanie Kontem

- ID: US-001
- Tytuł: Rejestracja nowego konta
- Opis: Jako nowy użytkownik, chcę móc założyć konto w aplikacji przy użyciu mojego adresu e-mail i hasła, aby uzyskać dostęp do jej funkcjonalności.
- Kryteria akceptacji:
  1. Formularz rejestracji zawiera pola: adres e-mail, hasło, powtórz hasło.
  2. System waliduje poprawność formatu adresu e-mail.
  3. System sprawdza, czy hasła w obu polach są identyczne.
  4. Po pomyślnej rejestracji użytkownik jest automatycznie zalogowany i przekierowany na pulpit główny.
  5. W przypadku, gdy e-mail jest już zajęty, wyświetlany jest stosowny komunikat.

- ID: US-002
- Tytuł: Logowanie do aplikacji
- Opis: Jako zarejestrowany użytkownik, chcę móc zalogować się na swoje konto, podając e-mail i hasło, aby kontynuować zarządzanie moim budżetem.
- Kryteria akceptacji:
  1. Formularz logowania zawiera pola: adres e-mail, hasło oraz checkbox "Zapamiętaj mnie".
  2. Po podaniu poprawnych danych użytkownik zostaje przekierowany na pulpit główny.
  3. W przypadku podania błędnych danych, wyświetlany jest komunikat o niepoprawnym loginie lub haśle.
  4. Jeśli zaznaczono "Zapamiętaj mnie", sesja użytkownika jest utrzymywana przez 30 dni.

- ID: US-003
- Tytuł: Resetowanie hasła
- Opis: Jako użytkownik, który zapomniał hasła, chcę mieć możliwość jego zresetowania poprzez e-mail, aby odzyskać dostęp do konta.
- Kryteria akceptacji:
  1. Na stronie logowania znajduje się link "Nie pamiętasz hasła?".
  2. Po kliknięciu linku i podaniu adresu e-mail, na podany adres wysyłana jest wiadomość z unikalnym linkiem do resetu hasła.
  3. Link prowadzi do formularza, gdzie użytkownik może ustawić nowe hasło.
  4. Po pomyślnej zmianie hasła użytkownik jest o tym informowany i może zalogować się przy użyciu nowych danych.

- ID: US-004
- Tytuł: Bezpieczny dostęp
- Opis: Jako użytkownik chcę mieć możliwość rejestracji i logowania się do systemu w sposób zapewniający bezpieczeństwo moich danych
- Kryteria akceptacji:
  1. Logowanie i rejestracja odbywają się na dedykowanych stronach.
  2. Logowanie wymaga podania adresu email i hasła.
  3. Rejestracja wymaga podania adresu email, hasła i potwierdzenia hasła.
  4. Użytkownik NIE MOŻE korzystać z żadnej funkcjonalności bez zalogowania.
  5. Użytkownik może się wylogować z systemu poprzez przycisk który będzie dostępny w nawigacji
  6. Nie korzystamy z zewnętrznych serwisów logowania (np. Google, GitHub).
  7. Odzyskiwanie hasła powinno być możliwe.

### Konfiguracja Budżetu

- ID: US-005
- Tytuł: Zarządzanie domownikami
- Opis: Jako użytkownik, chcę mieć możliwość dodawania, edycji i usuwania domowników w ustawieniach, aby prawidłowo przypisywać przychody.
- Kryteria akceptacji:
  1. W ustawieniach konta znajduje się sekcja "Domownicy".
  2. Możliwe jest dodanie nowego domownika poprzez podanie jego imienia.
  3. Możliwe jest edytowanie imienia istniejącego domownika.
  4. Możliwe jest usunięcie domownika z listy.
  5. Usunięcie domownika nie wpływa na historyczne dane budżetowe, w których ten domownik występował.

- ID: US-006
- Tytuł: Zarządzanie kategoriami wydatków
- Opis: Jako użytkownik, chcę mieć możliwość tworzenia własnych kategorii wydatków oraz edycji i usuwania istniejących, aby dostosować budżet do moich potrzeb.
- Kryteria akceptacji:
  1. System udostępnia domyślną listę kategorii (np. Żywność, Transport, Rachunki), którą można w pełni modyfikować.
  2. Użytkownik może dodać nową kategorię, podając jej nazwę.
  3. Użytkownik może zmienić nazwę istniejącej kategorii.
  4. Przy próbie usunięcia kategorii, do której przypisane są jakiekolwiek transakcje, wyświetlane jest jednoznaczne ostrzeżenie o trwałym usunięciu powiązanych wydatków.
  5. Po potwierdzeniu, kategoria i wszystkie powiązane z nią transakcje są usuwane, a środki zaplanowane dla tej kategorii wracają do puli "Środków wolnych".

- ID: US-007
- Tytuł: Inicjalizacja budżetu na nowy miesiąc
- Opis: Jako użytkownik, na początku miesiąca chcę wprowadzić przychody dla każdego domownika, aby ustalić całkowitą kwotę do dyspozycji.
- Kryteria akceptacji:
  1. System wyświetla przycisk do stworzenia nowego miesiąca i po jego naciśnięciu prezentuje widok inicjalizacji budżetu (jeśli jeszcze nie istnieje).
  2. Wyświetlana jest lista zdefiniowanych domowników z polami do wprowadzenia ich przychodów na dany miesiąc.
  3. System sumuje wprowadzone kwoty i wyświetla łączny przychód gospodarstwa domowego.
  4. Po zapisaniu przychodów użytkownik przechodzi do widoku planowania wydatków.

- ID: US-008
- Tytuł: Planowanie wydatków w kategoriach
- Opis: Jako użytkownik, po wprowadzeniu przychodów chcę rozdzielić dostępną kwotę na poszczególne kategorie, definiując dla nich limity, aby zaplanować swoje wydatki.
- Kryteria akceptacji:
  1. Wyświetlana jest lista wszystkich zdefiniowanych kategorii z polami do wpisania planowanej kwoty (limitu).
  2. Na bieżąco wyświetlana jest suma zaplanowanych limitów oraz kwota "Środków wolnych".
  3. Użytkownik może zapisać plan. Suma limitów w kategoriach nie musi być równa sumie przychodów.
  4. Po zapisaniu planu, widok przechodzi w tryb zablokowany (tylko do odczytu).

- ID: US-009
- Tytuł: Modyfikacja zaplanowanego budżetu
- Opis: Jako użytkownik, w trakcie miesiąca chcę mieć możliwość edycji zaplanowanych limitów w kategoriach, aby reagować na nieprzewidziane sytuacje.
- Kryteria akceptacji:
  1. W widoku budżetu znajduje się przycisk "Edytuj plan".
  2. Jego naciśnięcie odblokowuje pola z limitami w kategoriach, umożliwiając ich zmianę.
  3. Podczas edycji na bieżąco aktualizowana jest kwota "Środków wolnych".
  4. Użytkownik może zapisać zmiany lub je anulować. Zapisanie zmian ponownie blokuje plan.

### Codzienne Użytkowanie

- ID: US-010
- Tytuł: Dodawanie nowego wydatku
- Opis: Jako użytkownik, chcę w prosty sposób dodać nowy wydatek, przypisując go do kategorii, aby mój budżet był zawsze aktualny.
- Kryteria akceptacji:
  1. Formularz dodawania wydatku zawiera pola: kwota, kategoria (lista), data (domyślnie dziś), notatki (opcjonalnie).
  2. Pole kwoty akceptuje tylko dodatnie wartości liczbowe.
  3. Pola kwota i kategoria są wymagane.
  4. Po dodaniu wydatku, pulpit główny oraz widok danej kategorii są natychmiast aktualizowane.

- ID: US-011
- Tytuł: Przeglądanie pulpitu głównego
- Opis: Jako użytkownik, po wejściu do aplikacji chcę od razu zobaczyć na pulpicie głównym podsumowanie mojego budżetu, aby szybko ocenić stan finansów.
- Kryteria akceptacji:
  1. Pulpit wyświetla ogólny pasek postępu dla całego budżetu (wydano X z sumy przychodów).
  2. Wyświetlana jest łączna kwota pozostała do wydania w danym miesiącu.
  3. Poniżej znajduje się lista wszystkich kategorii, każda z własnym paskiem postępu i informacją "wydano X zł z Y zł".
  4. Jeśli suma wydatków w kategorii przekroczy jej limit, jej pasek postępu zmienia kolor na czerwony.

- ID: US-012
- Tytuł: Przeglądanie historii transakcji
- Opis: Jako użytkownik, chcę mieć dostęp do listy wszystkich transakcji w bieżącym miesiącu, aby móc je przeglądać i weryfikować.
- Kryteria akceptacji:
  1. Dostępny jest osobny widok "Historia transakcji".
  2. Transakcje są wyświetlane w prostej, chronologicznej liście (od najnowszej do najstarszej).
  3. Każdy wpis na liście zawiera co najmniej: datę, kwotę, kategorię i ewentualne notatki.
  4. Z poziomu tej listy możliwe jest przejście do edycji lub usunięcie transakcji.

- ID: US-013
- Tytuł: Nawigacja po historycznych budżetach
- Opis: Jako użytkownik, chcę mieć możliwość przeglądania swoich budżetów z poprzednich miesięcy, aby analizować swoje historyczne wydatki.
- Kryteria akceptacji:
  1. W interfejsie aplikacji znajduje się element nawigacyjny (np. strzałki, lista rozwijana) pozwalający na wybór poprzednich miesięcy.
  2. Wybranie archiwalnego miesiąca powoduje wyświetlenie jego pulpitu z pełnym podsumowaniem (przychody, wydatki, limity).
  3. Dane historyczne są prezentowane w trybie tylko do odczytu, ale z możliwością przejścia do trybu edycji w celu korekty danych.

## 6. Metryki sukcesu

Kluczowym wskaźnikiem sukcesu dla wersji MVP będzie zaangażowanie użytkowników, mierzone poprzez regularne korzystanie z podstawowej funkcji aplikacji.

- Główne kryterium sukcesu: 70% aktywnych użytkowników dodaje co najmniej 10 wydatków miesięcznie.
- Definicja "Aktywnego Użytkownika": Użytkownik, który po rejestracji pomyślnie skonfigurował swój pierwszy miesięczny budżet (tj. wprowadził przychód i zaplanował co najmniej jedną kategorię wydatków).
- Cel długoterminowy (poza MVP): 90% aktywnych użytkowników prowadzi systematycznie budżet domowy, uzupełniając dane w każdym kolejnym miesiącu.
