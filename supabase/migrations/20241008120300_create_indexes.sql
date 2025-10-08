-- Migration: Create performance indexes
-- Purpose: Create indexes to optimize query performance for common access patterns
-- Affected: All tables - performance optimization indexes
-- Date: 2024-10-08 12:03:00 UTC

-- Indexes for households table
-- Unique index on user_id for fast lookup of household by authenticated user
-- This is critical for RLS policies and user-specific data access
create unique index idx_households_user on households(user_id);

-- Indexes for household_members table
-- Index on household_id for fast lookup of members within a household
create index idx_household_members_household on household_members(household_id);

-- Unique index on household_id + lower(full_name) to enforce case-insensitive unique names
-- Prevents duplicate member names like "John Doe" and "john doe" in the same household
create unique index idx_household_members_name on household_members(household_id, lower(full_name));

-- Indexes for categories table
-- Index on household_id for fast lookup of categories within a household
create index idx_categories_household on categories(household_id);

-- Unique index on household_id + lower(name) to enforce case-insensitive unique category names
-- This index supports the unique constraint defined in the table schema
create unique index idx_categories_name on categories(household_id, lower(name));

-- Indexes for budgets table
-- Composite index on household_id + month for fast lookup of budgets by household and time period
-- Optimizes queries like "get all budgets for household X" and "get budget for household X in month Y"
create index idx_budgets_household_month on budgets(household_id, month);

-- Indexes for incomes table
-- Index on budget_id for fast lookup of all incomes within a specific budget
-- Optimizes budget summary calculations
create index idx_incomes_budget on incomes(budget_id);

-- Index on household_member_id for fast lookup of income history for a specific member
-- Optimizes member-specific income reports
create index idx_incomes_household_member on incomes(household_member_id);

-- Indexes for planned_expenses table
-- Index on budget_id for fast lookup of all planned expenses within a specific budget
-- Optimizes budget planning and summary views
create index idx_planned_expenses_budget on planned_expenses(budget_id);

-- Index on category_id for fast lookup of planned expenses by category
-- Optimizes category-specific budget analysis
create index idx_planned_expenses_category on planned_expenses(category_id);

-- Indexes for transactions table
-- Composite index on budget_id + category_id for fast lookup of transactions by budget and category
-- Optimizes expense tracking and category spending analysis
create index idx_transactions_budget_category on transactions(budget_id, category_id);

-- Composite index on household_id + transaction_date (descending) for fast lookup of recent transactions
-- Optimizes transaction history views and date-based filtering
-- Descending order on date shows most recent transactions first
create index idx_transactions_date on transactions(household_id, transaction_date desc);
