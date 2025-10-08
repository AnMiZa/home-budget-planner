-- Migration: Auto-create household on user registration
-- Purpose: Automatically create a household when a new user signs up
-- Affected: auth.users table (trigger), households table (auto-insert)
-- Date: 2024-10-08 12:06:00 UTC

-- Function to automatically create a household for a new user
-- This function creates a default household with the user's email as the name
-- It's designed to be called by a trigger when a new user is created
create or replace function create_household_for_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  household_name text;
begin
  -- Use the user's email as the default household name
  -- If email is not available, use a generic name
  household_name := coalesce(NEW.email, 'My Household');
  
  -- Create a new household for the user
  -- The household will automatically get default categories via the existing trigger
  insert into public.households (user_id, name)
  values (NEW.id, household_name);
  
  return NEW;
exception
  when others then
    -- Log the error but don't prevent user creation
    -- This ensures that even if household creation fails, the user can still be created
    raise warning 'Failed to create household for user %: %', NEW.id, SQLERRM;
    return NEW;
end;
$$;

-- Create trigger to automatically create household when a new user is created
-- This trigger fires after a user is inserted into auth.users
-- It calls the create_household_for_new_user() function
create trigger trigger_create_household_for_new_user
  after insert on auth.users
  for each row
  execute function create_household_for_new_user();
