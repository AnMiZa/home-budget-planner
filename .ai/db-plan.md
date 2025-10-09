1. Tables

- `auth.users` _(zarządzana przez Supabase)_
  This table is managed by Supabase Auth
  - `id UUID PRIMARY KEY`
  - Pozostałe kolumny pozostają zgodne z domyślnym schematem Supabase (e-mail, hasz hasła itd.).

- `households`
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE`
  - `name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120)`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

- `household_members`
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE`
  - `full_name TEXT NOT NULL CHECK (char_length(full_name) BETWEEN 1 AND 120)`
  - `is_active BOOLEAN NOT NULL DEFAULT TRUE`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

- `categories`
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE`
  - `name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100)`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  - `UNIQUE (id, household_id)`
  - `UNIQUE (household_id, lower(name))`

- `budgets`
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE`
  - `month DATE NOT NULL CHECK (date_trunc('month', month) = month)`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  - `UNIQUE (household_id, month)`
  - `UNIQUE (id, household_id)` _(pomocnicze dla kluczy złożonych w tabelach podrzędnych)_

- `incomes`
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE`
  - `budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE`
  - `household_member_id UUID NOT NULL REFERENCES household_members(id)`
  - `amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0)`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  - `UNIQUE (budget_id, household_member_id)`
  - `FOREIGN KEY (budget_id, household_id) REFERENCES budgets(id, household_id) ON DELETE CASCADE`

- `planned_expenses`
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE`
  - `budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE`
  - `category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE`
  - `limit_amount DECIMAL(10, 2) NOT NULL CHECK (limit_amount > 0)`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  - `UNIQUE (budget_id, category_id)`
  - `FOREIGN KEY (budget_id, household_id) REFERENCES budgets(id, household_id) ON DELETE CASCADE`
  - `FOREIGN KEY (category_id, household_id) REFERENCES categories(id, household_id) ON DELETE CASCADE`

- `transactions`
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE`
  - `budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE`
  - `category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE`
  - `amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0)`
  - `transaction_date DATE NOT NULL`
  - `note TEXT CHECK (note IS NULL OR char_length(note) <= 500)`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  - `FOREIGN KEY (budget_id, household_id) REFERENCES budgets(id, household_id) ON DELETE CASCADE`
  - `FOREIGN KEY (category_id, household_id) REFERENCES categories(id, household_id) ON DELETE CASCADE`

2. Relacje między tabelami

- `auth.users (1) — (1) households`: gospodarstwo przypisane do jednego użytkownika; usunięcie użytkownika usuwa jego gospodarstwo.
- `households (1) — (N) household_members`: każdy domownik należy do jednego gospodarstwa; "soft delete" poprzez `is_active`.
- `households (1) — (N) categories`: kategorie są definiowane w kontekście gospodarstwa.
- `households (1) — (N) budgets`: każdy budżet odpowiada jednemu miesiącowi gospodarstwa.
- `budgets (1) — (N) incomes`: przychody są wprowadzane na poziomie budżetu i powiązane z domownikami.
- `budgets (1) — (N) planned_expenses`: limity wydatków przypisane do kategorii w konkretnym budżecie.
- `categories (1) — (N) planned_expenses`: kategoria może występować w wielu planach.
- `budgets (1) — (N) transactions`: wydatki rejestrowane w ramach budżetu.
- `categories (1) — (N) transactions`: każda transakcja przypisana do jednej kategorii.
- `household_members (1) — (N) incomes`: każdy rekord przychodu przypisany do jednego domownika.

3. Indeksy

- `CREATE UNIQUE INDEX idx_households_user ON households(user_id);`
- `CREATE INDEX idx_household_members_household ON household_members(household_id);`
- `CREATE UNIQUE INDEX idx_household_members_name ON household_members(household_id, lower(full_name));`
- `CREATE INDEX idx_categories_household ON categories(household_id);`
- `CREATE UNIQUE INDEX idx_categories_name ON categories(household_id, lower(name));`
- `CREATE INDEX idx_budgets_household_month ON budgets(household_id, month);`
- `CREATE INDEX idx_incomes_budget ON incomes(budget_id);`
- `CREATE INDEX idx_incomes_household_member ON incomes(household_member_id);`
- `CREATE INDEX idx_planned_expenses_budget ON planned_expenses(budget_id);`
- `CREATE INDEX idx_planned_expenses_category ON planned_expenses(category_id);`
- `CREATE INDEX idx_transactions_budget_category ON transactions(budget_id, category_id);`
- `CREATE INDEX idx_transactions_date ON transactions(household_id, transaction_date DESC);`

4. Zasady PostgreSQL (RLS)

- Funkcja pomocnicza: `CREATE FUNCTION get_current_household_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT h.id FROM households h WHERE h.user_id = auth.uid() LIMIT 1; $$;`
- Funkcja triggerowa: `CREATE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;`
- Funkcja triggerowa do domyślnych kategorii: `CREATE FUNCTION seed_default_categories() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN INSERT INTO categories (household_id, name) VALUES ...; RETURN NEW; END; $$;`
- Na każdej tabeli użytkownika: `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;`
- Polityki bezpieczeństwa (dla każdej tabeli `household_members`, `categories`, `budgets`, `incomes`, `planned_expenses`, `transactions`):
  - `CREATE POLICY select_{table}` FOR SELECT USING (household_id = get_current_household_id());`
  - `CREATE POLICY insert_{table}` FOR INSERT WITH CHECK (household_id = get_current_household_id());`
  - `CREATE POLICY update_{table}` FOR UPDATE USING (household_id = get_current_household_id()) WITH CHECK (household_id = get_current_household_id());`
  - `CREATE POLICY delete_{table}` FOR DELETE USING (household_id = get_current_household_id());`
- Dla tabeli `households`:
  - `CREATE POLICY select_households` FOR SELECT USING (id = get_current_household_id());`
  - `CREATE POLICY insert_households` FOR INSERT WITH CHECK (user_id = auth.uid());`
  - `CREATE POLICY update_households` FOR UPDATE USING (id = get_current_household_id()) WITH CHECK (id = get_current_household_id());`
  - `CREATE POLICY delete_households` FOR DELETE USING (id = get_current_household_id());`
- Rola `service_role` otrzymuje pełne uprawnienia do schematu `public` oraz `ALTER USER service_role SET row_security = off;`.

5. Dodatkowe uwagi

- Wymagana jest rozszerzenie `pgcrypto` (`CREATE EXTENSION IF NOT EXISTS pgcrypto;`) dla `gen_random_uuid()`.
- `updated_at` aktualizowane przez trigger `set_updated_at()` (wspólny dla wszystkich tabel) wykonywany przed `UPDATE`.
- Automatyczne tworzenie domyślnych kategorii: funkcja `seed_default_categories(household_id)` oraz trigger `AFTER INSERT ON households` uruchamiający funkcję.
- Wszystkie tabele znajdują się w schemacie `public`, co upraszcza integrację z Supabase i jego politykami bezpieczeństwa.
- Wartości finansowe przechowywane jako `DECIMAL(10, 2)` spełniają wymaganie dokładności i zawsze są dodatnie dzięki ograniczeniom `CHECK`.
