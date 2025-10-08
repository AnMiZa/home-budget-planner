-- Migration: Create functions that depend on tables
-- Purpose: Create helper functions that require tables to exist first
-- Affected: Functions that reference households and categories tables
-- Date: 2024-10-08 12:01:50 UTC

-- Helper function to get current user's household ID
-- This function is used in Row Level Security policies to ensure users can only access their own household data
-- Returns the household ID for the currently authenticated user, or null if no household exists
create or replace function get_current_household_id()
returns uuid
language sql
stable
security definer
as $$
  select h.id 
  from households h 
  where h.user_id = auth.uid() 
  limit 1;
$$;

-- Trigger function to seed default categories for a new household
-- This function creates a set of predefined expense categories when a new household is created
-- This is a trigger function that automatically accesses the NEW record
create or replace function seed_default_categories()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Insert default expense categories for the household
  -- These categories cover common household expenses and can be customized by users later
  insert into categories (household_id, name) values
    (NEW.id, 'Żywność'),           -- Food
    (NEW.id, 'Transport'),         -- Transportation
    (NEW.id, 'Mieszkanie'),        -- Housing
    (NEW.id, 'Rachunki'),          -- Bills/Utilities
    (NEW.id, 'Zdrowie'),           -- Health
    (NEW.id, 'Rozrywka'),          -- Entertainment
    (NEW.id, 'Ubrania'),           -- Clothing
    (NEW.id, 'Edukacja'),          -- Education
    (NEW.id, 'Oszczędności'),      -- Savings
    (NEW.id, 'Kredyty'),           -- Loans
    (NEW.id, 'Inne');              -- Other/Miscellaneous
  
  return NEW;
end;
$$;
