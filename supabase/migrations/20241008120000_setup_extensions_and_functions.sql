-- Migration: Setup extensions and helper functions
-- Purpose: Enable required PostgreSQL extensions and create helper functions for the home budget planner
-- Affected: Extensions, helper functions for RLS and triggers
-- Date: 2024-10-08 12:00:00 UTC

-- Enable required extensions
-- pgcrypto is needed for gen_random_uuid() function used in table primary keys
create extension if not exists pgcrypto;

-- Helper function to update the updated_at timestamp
-- This function is used in triggers to automatically update the updated_at column when a row is modified
-- Returns the modified row with updated_at set to the current timestamp
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  -- Set the updated_at column to the current timestamp
  new.updated_at = now();
  return new;
end;
$$;
