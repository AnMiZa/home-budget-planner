import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/db/database.types";

/**
 * Database setup helper for E2E tests
 *
 * This module provides utilities to set up test data in the database
 * before running E2E tests. It ensures that the test user has all
 * required data (household, members, categories, budgets) to run tests.
 */

export interface TestHouseholdMember {
  fullName: string;
  income?: number;
}

export interface TestCategory {
  name: string;
}

export interface TestBudget {
  /** Month as full date (YYYY-MM-DD format, first day of month, e.g., "2025-12-01") */
  month: string;
  note?: string;
  incomes?: {
    householdMemberId: string;
    amount: number;
  }[];
  plannedExpenses?: {
    categoryId: string;
    limitAmount: number;
  }[];
}

export interface DatabaseSetupResult {
  householdId: string;
  members: { id: string; fullName: string }[];
  categories: { id: string; name: string }[];
  budgets: { id: string; month: string }[];
}

/**
 * Creates a Supabase admin client for test data setup
 */
export function createTestSupabaseClient() {
  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Missing Supabase credentials. Ensure PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.test"
    );
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: "public",
    },
    global: {
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
    },
  });
}

/**
 * Gets the household ID for a given user
 */
export async function getHouseholdId(
  supabase: ReturnType<typeof createTestSupabaseClient>,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase.from("households").select("id").eq("user_id", userId).single();

  if (error) {
    console.error("Error fetching household:", error);
    return null;
  }

  return data?.id || null;
}

/**
 * Creates household members for testing
 * Checks if members already exist and only creates new ones
 */
export async function createHouseholdMembers(
  supabase: ReturnType<typeof createTestSupabaseClient>,
  householdId: string,
  members: TestHouseholdMember[]
): Promise<{ id: string; fullName: string }[]> {
  if (members.length === 0) {
    return [];
  }

  // First, check which members already exist
  const { data: existingMembers } = await supabase
    .from("household_members")
    .select("id, full_name")
    .eq("household_id", householdId)
    .in(
      "full_name",
      members.map((m) => m.fullName)
    );

  const existingNames = new Set((existingMembers || []).map((m) => m.full_name));
  const result: { id: string; fullName: string }[] = (existingMembers || []).map((m) => ({
    id: m.id,
    fullName: m.full_name,
  }));

  // Filter out members that already exist
  const newMembers = members.filter((m) => !existingNames.has(m.fullName));

  if (newMembers.length === 0) {
    console.log(`ℹ️  All ${members.length} household members already exist`);
    return result;
  }

  // Create only new members
  const { data, error } = await supabase
    .from("household_members")
    .insert(
      newMembers.map((member) => ({
        household_id: householdId,
        full_name: member.fullName,
        is_active: true,
      }))
    )
    .select("id, full_name");

  if (error) {
    console.error("Error creating household members:", error);
    throw new Error(`Failed to create household members: ${error.message}`);
  }

  // Combine existing and newly created members
  const createdMembers = (data || []).map((member) => ({
    id: member.id,
    fullName: member.full_name,
  }));

  return [...result, ...createdMembers];
}

/**
 * Gets existing categories for a household
 */
export async function getCategories(
  supabase: ReturnType<typeof createTestSupabaseClient>,
  householdId: string
): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .eq("household_id", householdId)
    .order("name");

  if (error) {
    console.error("Error fetching categories:", error);
    throw new Error(`Failed to fetch categories: ${error.message}`);
  }

  return (data || []).map((category) => ({
    id: category.id,
    name: category.name,
  }));
}

/**
 * Creates additional categories if needed
 */
export async function createCategories(
  supabase: ReturnType<typeof createTestSupabaseClient>,
  householdId: string,
  categories: TestCategory[]
): Promise<{ id: string; name: string }[]> {
  if (categories.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("categories")
    .insert(
      categories.map((category) => ({
        household_id: householdId,
        name: category.name,
      }))
    )
    .select("id, name");

  if (error) {
    console.error("Error creating categories:", error);
    throw new Error(`Failed to create categories: ${error.message}`);
  }

  return (data || []).map((category) => ({
    id: category.id,
    name: category.name,
  }));
}

/**
 * Creates a budget with incomes and planned expenses
 * If a budget for the same month already exists, returns the existing one
 */
export async function createBudget(
  supabase: ReturnType<typeof createTestSupabaseClient>,
  householdId: string,
  budget: TestBudget
): Promise<{ id: string; month: string }> {
  // Check if budget for this month already exists
  const { data: existingBudget } = await supabase
    .from("budgets")
    .select("id, month")
    .eq("household_id", householdId)
    .eq("month", budget.month)
    .single();

  if (existingBudget) {
    console.log(`ℹ️  Budget for ${budget.month} already exists, skipping creation`);
    return {
      id: existingBudget.id,
      month: existingBudget.month,
    };
  }

  // Create the budget
  const { data: budgetData, error: budgetError } = await supabase
    .from("budgets")
    .insert({
      household_id: householdId,
      month: budget.month,
      note: budget.note || null,
    })
    .select("id, month")
    .single();

  if (budgetError) {
    console.error("Error creating budget:", budgetError);
    throw new Error(`Failed to create budget: ${budgetError.message}`);
  }

  const budgetId = budgetData.id;

  // Create incomes if provided
  if (budget.incomes && budget.incomes.length > 0) {
    const { error: incomesError } = await supabase.from("incomes").insert(
      budget.incomes.map((income) => ({
        budget_id: budgetId,
        household_id: householdId,
        household_member_id: income.householdMemberId,
        amount: income.amount,
      }))
    );

    if (incomesError) {
      console.error("Error creating incomes:", incomesError);
      throw new Error(`Failed to create incomes: ${incomesError.message}`);
    }
  }

  // Create planned expenses if provided
  if (budget.plannedExpenses && budget.plannedExpenses.length > 0) {
    const { error: plannedExpensesError } = await supabase.from("planned_expenses").insert(
      budget.plannedExpenses.map((expense) => ({
        budget_id: budgetId,
        household_id: householdId,
        category_id: expense.categoryId,
        limit_amount: expense.limitAmount,
      }))
    );

    if (plannedExpensesError) {
      console.error("Error creating planned expenses:", plannedExpensesError);
      throw new Error(`Failed to create planned expenses: ${plannedExpensesError.message}`);
    }
  }

  return {
    id: budgetId,
    month: budgetData.month,
  };
}

/**
 * Cleans up all test data for a user
 * This is useful for ensuring a clean state before running tests
 */
export async function cleanupTestData(
  supabase: ReturnType<typeof createTestSupabaseClient>,
  userId: string
): Promise<void> {
  const householdId = await getHouseholdId(supabase, userId);

  if (!householdId) {
    console.log("No household found for user, nothing to clean up");
    return;
  }

  // Delete in correct order due to foreign key constraints
  // 1. Delete transactions
  await supabase.from("transactions").delete().eq("household_id", householdId);

  // 2. Delete planned expenses and incomes (they reference budgets)
  const { data: budgets } = await supabase.from("budgets").select("id").eq("household_id", householdId);

  if (budgets && budgets.length > 0) {
    const budgetIds = budgets.map((b) => b.id);
    await supabase.from("planned_expenses").delete().in("budget_id", budgetIds);
    await supabase.from("incomes").delete().in("budget_id", budgetIds);
  }

  // 3. Delete budgets
  await supabase.from("budgets").delete().eq("household_id", householdId);

  // 4. Delete household members
  await supabase.from("household_members").delete().eq("household_id", householdId);

  // 5. Delete categories (except default ones if you want to keep them)
  await supabase.from("categories").delete().eq("household_id", householdId);

  console.log(`✅ Cleaned up test data for household ${householdId}`);
}

/**
 * Sets up complete test data for a user
 * This is the main function to call from global-setup.ts
 */
export async function setupTestData(
  email: string,
  password: string,
  options: {
    members?: TestHouseholdMember[];
    additionalCategories?: TestCategory[];
    budgets?: TestBudget[];
    cleanupFirst?: boolean;
  } = {}
): Promise<DatabaseSetupResult> {
  const supabase = createTestSupabaseClient();

  // Sign in as the test user to get their user ID
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    throw new Error(`Failed to authenticate test user: ${authError?.message || "Unknown error"}`);
  }

  const userId = authData.user.id;
  console.log(`📝 Setting up test data for user: ${email} (${userId})`);

  // Get household ID (should exist from auto-creation trigger)
  let householdId = await getHouseholdId(supabase, userId);

  // If household doesn't exist, create it manually
  if (!householdId) {
    console.log("⚠️  Household not found, creating one manually...");

    const { data: newHousehold, error: createError } = await supabase
      .from("households")
      .insert({
        user_id: userId,
        name: email,
      })
      .select("id")
      .single();

    if (createError || !newHousehold) {
      throw new Error(`Failed to create household: ${createError?.message || "Unknown error"}`);
    }

    householdId = newHousehold.id;
    console.log(`✅ Created household: ${householdId}`);
  } else {
    console.log(`🏠 Found existing household: ${householdId}`);
  }

  // Cleanup existing data if requested
  if (options.cleanupFirst) {
    console.log("🧹 Cleaning up existing test data...");
    await cleanupTestData(supabase, userId);
  }

  const result: DatabaseSetupResult = {
    householdId,
    members: [],
    categories: [],
    budgets: [],
  };

  // Create household members
  if (options.members && options.members.length > 0) {
    console.log(`👥 Creating ${options.members.length} household members...`);
    result.members = await createHouseholdMembers(supabase, householdId, options.members);
    console.log(`✅ Created ${result.members.length} household members`);
  }

  // Get existing categories (created by trigger)
  result.categories = await getCategories(supabase, householdId);
  console.log(`📋 Found ${result.categories.length} existing categories`);

  // If no categories exist, seed default ones
  if (result.categories.length === 0) {
    console.log("⚠️  No categories found, seeding default categories...");
    const defaultCategories = [
      { name: "Żywność" },
      { name: "Transport" },
      { name: "Mieszkanie" },
      { name: "Rachunki" },
      { name: "Zdrowie" },
      { name: "Rozrywka" },
      { name: "Ubrania" },
      { name: "Edukacja" },
      { name: "Oszczędności" },
      { name: "Kredyty" },
      { name: "Inne" },
    ];

    const newCategories = await createCategories(supabase, householdId, defaultCategories);
    result.categories = newCategories;
    console.log(`✅ Created ${newCategories.length} default categories`);
  }

  // Create additional categories if needed
  if (options.additionalCategories && options.additionalCategories.length > 0) {
    console.log(`📋 Creating ${options.additionalCategories.length} additional categories...`);
    const newCategories = await createCategories(supabase, householdId, options.additionalCategories);
    result.categories.push(...newCategories);
    console.log(`✅ Created ${newCategories.length} additional categories`);
  }

  // Create budgets
  if (options.budgets && options.budgets.length > 0) {
    console.log(`💰 Creating ${options.budgets.length} budgets...`);
    for (const budgetConfig of options.budgets) {
      const budget = await createBudget(supabase, householdId, budgetConfig);
      result.budgets.push(budget);
    }
    console.log(`✅ Created ${result.budgets.length} budgets`);
  }

  // Sign out
  await supabase.auth.signOut();

  console.log("✅ Test data setup complete");
  return result;
}
