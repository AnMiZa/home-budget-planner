-- Add note column to budgets table
-- This column will store optional metadata/notes for budgets
-- Maximum length of 500 characters as per business requirements

alter table budgets 
add column note text check (note is null or char_length(note) <= 500);

-- Add comment for documentation
comment on column budgets.note is 'Optional note/description for the budget (max 500 characters)';
