-- Migration: Setup triggers for automated functionality
-- Purpose: Create triggers for automatic updated_at timestamps and default category seeding
-- Affected: All tables - automated timestamp updates and category seeding
-- Date: 2024-10-08 12:05:00 UTC

-- Trigger for households table to automatically update updated_at timestamp
-- This trigger fires before any UPDATE operation on the households table
-- It calls the set_updated_at() function to set the updated_at column to current timestamp
create trigger trigger_households_updated_at
  before update on households
  for each row
  execute function set_updated_at();

-- Trigger for household_members table to automatically update updated_at timestamp
create trigger trigger_household_members_updated_at
  before update on household_members
  for each row
  execute function set_updated_at();

-- Trigger for categories table to automatically update updated_at timestamp
create trigger trigger_categories_updated_at
  before update on categories
  for each row
  execute function set_updated_at();

-- Trigger for budgets table to automatically update updated_at timestamp
create trigger trigger_budgets_updated_at
  before update on budgets
  for each row
  execute function set_updated_at();

-- Trigger for incomes table to automatically update updated_at timestamp
create trigger trigger_incomes_updated_at
  before update on incomes
  for each row
  execute function set_updated_at();

-- Trigger for planned_expenses table to automatically update updated_at timestamp
create trigger trigger_planned_expenses_updated_at
  before update on planned_expenses
  for each row
  execute function set_updated_at();

-- Trigger for transactions table to automatically update updated_at timestamp
create trigger trigger_transactions_updated_at
  before update on transactions
  for each row
  execute function set_updated_at();

-- Trigger to automatically seed default categories when a new household is created
-- This trigger fires after a new household is inserted
-- It calls the seed_default_categories() function to create predefined expense categories
-- This ensures every new household starts with a useful set of categories
create trigger trigger_seed_default_categories
  after insert on households
  for each row
  execute function seed_default_categories();
