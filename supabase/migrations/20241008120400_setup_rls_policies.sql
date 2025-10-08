-- Migration: Setup Row Level Security policies
-- Purpose: Create RLS policies to ensure users can only access their own household data
-- Affected: All tables - security policies for data isolation
-- Date: 2024-10-08 12:04:00 UTC

-- RLS Policies for households table
-- Users can select their own household record
create policy select_households 
  on households 
  for select 
  using (id = get_current_household_id());

-- Users can insert their own household record (when creating account)
create policy insert_households 
  on households 
  for insert 
  with check (user_id = auth.uid());

-- Users can update their own household record
create policy update_households 
  on households 
  for update 
  using (id = get_current_household_id()) 
  with check (id = get_current_household_id());

-- Users can delete their own household record
create policy delete_households 
  on households 
  for delete 
  using (id = get_current_household_id());

-- RLS Policies for household_members table
-- Users can select members from their own household
create policy select_household_members 
  on household_members 
  for select 
  using (household_id = get_current_household_id());

-- Users can insert members into their own household
create policy insert_household_members 
  on household_members 
  for insert 
  with check (household_id = get_current_household_id());

-- Users can update members in their own household
create policy update_household_members 
  on household_members 
  for update 
  using (household_id = get_current_household_id()) 
  with check (household_id = get_current_household_id());

-- Users can delete members from their own household
create policy delete_household_members 
  on household_members 
  for delete 
  using (household_id = get_current_household_id());

-- RLS Policies for categories table
-- Users can select categories from their own household
create policy select_categories 
  on categories 
  for select 
  using (household_id = get_current_household_id());

-- Users can insert categories into their own household
create policy insert_categories 
  on categories 
  for insert 
  with check (household_id = get_current_household_id());

-- Users can update categories in their own household
create policy update_categories 
  on categories 
  for update 
  using (household_id = get_current_household_id()) 
  with check (household_id = get_current_household_id());

-- Users can delete categories from their own household
create policy delete_categories 
  on categories 
  for delete 
  using (household_id = get_current_household_id());

-- RLS Policies for budgets table
-- Users can select budgets from their own household
create policy select_budgets 
  on budgets 
  for select 
  using (household_id = get_current_household_id());

-- Users can insert budgets into their own household
create policy insert_budgets 
  on budgets 
  for insert 
  with check (household_id = get_current_household_id());

-- Users can update budgets in their own household
create policy update_budgets 
  on budgets 
  for update 
  using (household_id = get_current_household_id()) 
  with check (household_id = get_current_household_id());

-- Users can delete budgets from their own household
create policy delete_budgets 
  on budgets 
  for delete 
  using (household_id = get_current_household_id());

-- RLS Policies for incomes table
-- Users can select incomes from their own household
create policy select_incomes 
  on incomes 
  for select 
  using (household_id = get_current_household_id());

-- Users can insert incomes into their own household
create policy insert_incomes 
  on incomes 
  for insert 
  with check (household_id = get_current_household_id());

-- Users can update incomes in their own household
create policy update_incomes 
  on incomes 
  for update 
  using (household_id = get_current_household_id()) 
  with check (household_id = get_current_household_id());

-- Users can delete incomes from their own household
create policy delete_incomes 
  on incomes 
  for delete 
  using (household_id = get_current_household_id());

-- RLS Policies for planned_expenses table
-- Users can select planned expenses from their own household
create policy select_planned_expenses 
  on planned_expenses 
  for select 
  using (household_id = get_current_household_id());

-- Users can insert planned expenses into their own household
create policy insert_planned_expenses 
  on planned_expenses 
  for insert 
  with check (household_id = get_current_household_id());

-- Users can update planned expenses in their own household
create policy update_planned_expenses 
  on planned_expenses 
  for update 
  using (household_id = get_current_household_id()) 
  with check (household_id = get_current_household_id());

-- Users can delete planned expenses from their own household
create policy delete_planned_expenses 
  on planned_expenses 
  for delete 
  using (household_id = get_current_household_id());

-- RLS Policies for transactions table
-- Users can select transactions from their own household
create policy select_transactions 
  on transactions 
  for select 
  using (household_id = get_current_household_id());

-- Users can insert transactions into their own household
create policy insert_transactions 
  on transactions 
  for insert 
  with check (household_id = get_current_household_id());

-- Users can update transactions in their own household
create policy update_transactions 
  on transactions 
  for update 
  using (household_id = get_current_household_id()) 
  with check (household_id = get_current_household_id());

-- Users can delete transactions from their own household
create policy delete_transactions 
  on transactions 
  for delete 
  using (household_id = get_current_household_id());

-- Grant bypass RLS to service roles
-- This allows Supabase service functions and admin operations to work properly
-- service_role is used for server-side operations that need full access
-- supabase_admin is used for administrative functions
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- Allow service_role to bypass RLS for administrative operations
alter user service_role set row_security = off;
