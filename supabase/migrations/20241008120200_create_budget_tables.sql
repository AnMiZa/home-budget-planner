-- Migration: Create budget-related tables
-- Purpose: Create tables for budgets, incomes, planned expenses, and transactions
-- Affected: budgets, incomes, planned_expenses, transactions tables
-- Date: 2024-10-08 12:02:00 UTC

-- Create budgets table
-- This table represents monthly budgets for each household
-- Each budget corresponds to a specific month and household combination
create table budgets (
  -- Primary key using UUID
  id uuid primary key default gen_random_uuid(),
  
  -- Foreign key to households table with cascade delete
  household_id uuid not null references households(id) on delete cascade,
  
  -- Month for this budget (stored as first day of month for consistency)
  -- Check constraint ensures only month boundaries are stored (no mid-month dates)
  month date not null check (date_trunc('month', month) = month),
  
  -- Audit timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Ensure only one budget per household per month
  unique (household_id, month),
  
  -- Composite unique constraint to support foreign key references in child tables
  -- This allows child tables to reference both budget_id and household_id for data integrity
  unique (id, household_id)
);

-- Enable Row Level Security for budgets table
alter table budgets enable row level security;

-- Create incomes table
-- This table stores income information for household members within specific budgets
-- Each household member can have only one income record per budget
create table incomes (
  -- Primary key using UUID
  id uuid primary key default gen_random_uuid(),
  
  -- Foreign key to households table with cascade delete
  household_id uuid not null references households(id) on delete cascade,
  
  -- Foreign key to budgets table with cascade delete
  budget_id uuid not null references budgets(id) on delete cascade,
  
  -- Foreign key to household_members table
  -- Note: No cascade delete here to preserve referential integrity
  -- If a member is soft-deleted (is_active = false), income records remain for historical purposes
  household_member_id uuid not null references household_members(id),
  
  -- Income amount with precision for currency (10 digits total, 2 decimal places)
  -- Must be positive value
  amount decimal(10, 2) not null check (amount > 0),
  
  -- Audit timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Ensure only one income record per household member per budget
  unique (budget_id, household_member_id),
  
  -- Composite foreign key constraint to ensure budget belongs to the same household
  -- This prevents cross-household data corruption
  foreign key (budget_id, household_id) references budgets(id, household_id) on delete cascade
);

-- Enable Row Level Security for incomes table
alter table incomes enable row level security;

-- Create planned_expenses table
-- This table stores planned expense limits for categories within specific budgets
-- Each category can have only one planned expense record per budget
create table planned_expenses (
  -- Primary key using UUID
  id uuid primary key default gen_random_uuid(),
  
  -- Foreign key to households table with cascade delete
  household_id uuid not null references households(id) on delete cascade,
  
  -- Foreign key to budgets table with cascade delete
  budget_id uuid not null references budgets(id) on delete cascade,
  
  -- Foreign key to categories table with cascade delete
  category_id uuid not null references categories(id) on delete cascade,
  
  -- Planned expense limit with precision for currency
  -- Must be positive value
  limit_amount decimal(10, 2) not null check (limit_amount > 0),
  
  -- Audit timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Ensure only one planned expense per category per budget
  unique (budget_id, category_id),
  
  -- Composite foreign key constraints to ensure data integrity across households
  foreign key (budget_id, household_id) references budgets(id, household_id) on delete cascade,
  foreign key (category_id, household_id) references categories(id, household_id) on delete cascade
);

-- Enable Row Level Security for planned_expenses table
alter table planned_expenses enable row level security;

-- Create transactions table
-- This table stores actual expense transactions recorded against budgets and categories
-- Represents the actual spending that occurred
create table transactions (
  -- Primary key using UUID
  id uuid primary key default gen_random_uuid(),
  
  -- Foreign key to households table with cascade delete
  household_id uuid not null references households(id) on delete cascade,
  
  -- Foreign key to budgets table with cascade delete
  budget_id uuid not null references budgets(id) on delete cascade,
  
  -- Foreign key to categories table with cascade delete
  category_id uuid not null references categories(id) on delete cascade,
  
  -- Transaction amount with precision for currency
  -- Must be positive value
  amount decimal(10, 2) not null check (amount > 0),
  
  -- Date when the transaction occurred (can be different from created_at)
  transaction_date date not null,
  
  -- Optional note/description for the transaction (max 500 characters)
  -- Can be null for transactions without additional details
  note text check (note is null or char_length(note) <= 500),
  
  -- Audit timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Composite foreign key constraints to ensure data integrity across households
  foreign key (budget_id, household_id) references budgets(id, household_id) on delete cascade,
  foreign key (category_id, household_id) references categories(id, household_id) on delete cascade
);

-- Enable Row Level Security for transactions table
alter table transactions enable row level security;
