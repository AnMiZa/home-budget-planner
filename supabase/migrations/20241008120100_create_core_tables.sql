-- Migration: Create core tables for home budget planner
-- Purpose: Create the foundational tables for households, household members, and expense categories
-- Affected: households, household_members, categories tables
-- Date: 2024-10-08 12:01:00 UTC

-- Create households table
-- This table stores information about each household/family unit
-- Each household is owned by a single authenticated user
create table households (
  -- Primary key using UUID for better security and distribution
  id uuid primary key default gen_random_uuid(),
  
  -- Foreign key to Supabase auth.users table
  -- Each user can have only one household (enforced by unique constraint)
  -- Cascade delete ensures household is removed when user is deleted
  user_id uuid not null unique references auth.users(id) on delete cascade,
  
  -- Household name with length validation (1-120 characters)
  name text not null check (char_length(name) between 1 and 120),
  
  -- Audit timestamps for tracking creation and modification
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security for households table
-- This ensures users can only access their own household data
alter table households enable row level security;

-- Create household_members table
-- This table stores information about people living in each household
-- Supports soft deletion through is_active flag
create table household_members (
  -- Primary key using UUID
  id uuid primary key default gen_random_uuid(),
  
  -- Foreign key to households table with cascade delete
  -- When household is deleted, all members are also deleted
  household_id uuid not null references households(id) on delete cascade,
  
  -- Full name of the household member with length validation (1-120 characters)
  full_name text not null check (char_length(full_name) between 1 and 120),
  
  -- Soft delete flag - allows deactivating members without losing historical data
  -- Default true means new members are active by default
  is_active boolean not null default true,
  
  -- Audit timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security for household_members table
alter table household_members enable row level security;

-- Create categories table
-- This table stores expense categories that can be used for budgeting and transaction tracking
-- Categories are scoped to individual households for customization
create table categories (
  -- Primary key using UUID
  id uuid primary key default gen_random_uuid(),
  
  -- Foreign key to households table with cascade delete
  -- When household is deleted, all categories are also deleted
  household_id uuid not null references households(id) on delete cascade,
  
  -- Category name with length validation (1-100 characters)
  name text not null check (char_length(name) between 1 and 100),
  
  -- Audit timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Composite unique constraint to support foreign key references in child tables
  -- This allows child tables to reference both category_id and household_id for data integrity
  unique (id, household_id)
);

-- Enable Row Level Security for categories table
alter table categories enable row level security;

-- Create unique index for case-insensitive category names within each household
-- This ensures category names are unique within each household (case-insensitive)
-- Prevents duplicate categories like "Food" and "food" in the same household
create unique index categories_household_name_unique_idx 
on categories (household_id, lower(name));
