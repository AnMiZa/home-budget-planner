import type { supabaseClient } from "../../db/supabase.client";
import type {
  BudgetsListResponseDto,
  BudgetListItemDto,
  BudgetSummaryTotalsDto,
  PaginationMetaDto,
  CreateBudgetCommand,
  BudgetCreatedDto,
} from "../../types";

export type SupabaseClientType = typeof supabaseClient;

export interface ListBudgetsOptions {
  month?: string;
  status?: "current" | "past" | "upcoming" | "all";
  includeSummary?: boolean;
  page?: number;
  pageSize?: number;
  sort?: "month_desc" | "month_asc";
}

/**
 * Service for managing budgets operations.
 */
export class BudgetsService {
  constructor(private supabase: SupabaseClientType) {}

  /**
   * Lists budgets for the specified user with pagination, filtering, and sorting.
   *
   * @param userId - The ID of the user whose budgets to retrieve
   * @param options - Options for filtering, pagination, and sorting
   * @returns Promise resolving to paginated list of budgets
   * @throws Error if household not found or database error occurs
   */
  async listBudgets(userId: string, options: ListBudgetsOptions = {}): Promise<BudgetsListResponseDto> {
    const { month, status = "current", includeSummary = false, page = 1, pageSize = 12, sort = "month_desc" } = options;

    // First, get the household_id for the user
    const { data: householdData, error: householdError } = await this.supabase
      .from("households")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (householdError) {
      if (householdError.code === "PGRST116") {
        // No rows returned - household not found
        throw new Error("HOUSEHOLD_NOT_FOUND");
      }
      // Other database errors
      console.error("Database error while fetching household:", householdError);
      throw new Error("BUDGETS_LIST_FAILED");
    }

    if (!householdData) {
      throw new Error("HOUSEHOLD_NOT_FOUND");
    }

    const householdId = householdData.id;

    // Calculate offset for pagination
    const offset = (page - 1) * pageSize;

    // Build the query for budgets
    let query = this.supabase
      .from("budgets")
      .select("id, month, created_at, updated_at", { count: "exact" })
      .eq("household_id", householdId);

    // Apply month filter if provided
    if (month && month.trim().length > 0) {
      const normalizedMonth = this.normalizeMonthFilter(month.trim());
      query = query.eq("month", normalizedMonth);
    }

    // Apply status filter
    if (status !== "all") {
      const currentMonth = new Date().toISOString().slice(0, 7) + "-01";

      if (status === "current") {
        query = query.eq("month", currentMonth);
      } else if (status === "past") {
        query = query.lt("month", currentMonth);
      } else if (status === "upcoming") {
        query = query.gt("month", currentMonth);
      }
    }

    // Apply sorting
    if (sort === "month_desc") {
      query = query.order("month", { ascending: false });
    } else if (sort === "month_asc") {
      query = query.order("month", { ascending: true });
    }

    // Apply pagination
    query = query.range(offset, offset + pageSize - 1);

    // Execute the query
    const { data: budgetsData, error: budgetsError, count } = await query;

    if (budgetsError) {
      console.error("Database error while fetching budgets:", budgetsError);
      throw new Error("BUDGETS_LIST_FAILED");
    }

    // If no budgets found, return empty result
    if (!budgetsData || budgetsData.length === 0) {
      const meta: PaginationMetaDto = {
        page,
        pageSize,
        totalItems: count || 0,
        totalPages: 0,
      };

      return {
        data: [],
        meta,
      };
    }

    // Map database rows to DTOs
    let budgets: BudgetListItemDto[] = budgetsData.map((budget) => ({
      id: budget.id,
      month: budget.month,
      createdAt: budget.created_at,
      updatedAt: budget.updated_at,
      totalIncome: 0,
      totalPlanned: 0,
      totalSpent: 0,
      freeFunds: 0,
    }));

    // If summary is requested, fetch aggregated data
    if (includeSummary) {
      const budgetIds = budgetsData.map((b) => b.id);
      const summaries = await this.getBudgetsSummaries(budgetIds, householdId);

      // Merge summaries with budget data
      budgets = budgets.map((budget) => {
        const summary = summaries.get(budget.id);
        if (summary) {
          return {
            ...budget,
            ...summary,
            summary: {
              ...summary,
              progress: summary.totalIncome > 0 ? (summary.totalSpent / summary.totalIncome) * 100 : 0,
            },
          };
        }
        return budget;
      });
    }

    // Calculate pagination metadata
    const totalItems = count || 0;
    const totalPages = totalItems > 0 ? Math.ceil(totalItems / pageSize) : 0;

    const meta: PaginationMetaDto = {
      page,
      pageSize,
      totalItems,
      totalPages,
    };

    return {
      data: budgets,
      meta,
    };
  }

  /**
   * Creates a new budget for the specified user's household.
   * Optionally creates associated incomes and planned expenses in a single transaction.
   *
   * @param userId - The ID of the user creating the budget
   * @param command - The budget creation command
   * @returns Promise resolving to the created budget DTO
   * @throws Error if household not found, month conflict, invalid references, or database error occurs
   */
  async createBudget(userId: string, command: CreateBudgetCommand): Promise<BudgetCreatedDto> {
    const { month, incomes = [], plannedExpenses = [] } = command;

    // First, get the household_id for the user
    const { data: householdData, error: householdError } = await this.supabase
      .from("households")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (householdError) {
      if (householdError.code === "PGRST116") {
        throw new Error("HOUSEHOLD_NOT_FOUND");
      }
      console.error("Database error while fetching household:", householdError);
      throw new Error("BUDGET_CREATE_FAILED");
    }

    if (!householdData) {
      throw new Error("HOUSEHOLD_NOT_FOUND");
    }

    const householdId = householdData.id;
    const normalizedMonth = this.normalizeMonthFilter(month);

    // Validate references if incomes or planned expenses are provided
    if (incomes.length > 0) {
      await this.validateHouseholdMembers(
        householdId,
        incomes.map((i) => i.householdMemberId)
      );
    }

    if (plannedExpenses.length > 0) {
      await this.validateCategories(
        householdId,
        plannedExpenses.map((e) => e.categoryId)
      );
    }

    // Insert the new budget
    const { data: budgetData, error: insertError } = await this.supabase
      .from("budgets")
      .insert({
        household_id: householdId,
        month: normalizedMonth,
      })
      .select("id, month, created_at")
      .single();

    if (insertError) {
      // Check for unique constraint violation (PostgreSQL error code 23505)
      if (insertError.code === "23505") {
        throw new Error("BUDGET_ALREADY_EXISTS");
      }

      console.error("Database error while creating budget:", insertError);
      throw new Error("BUDGET_CREATE_FAILED");
    }

    if (!budgetData) {
      console.error("Budget creation succeeded but no data returned");
      throw new Error("BUDGET_CREATE_FAILED");
    }

    const budgetId = budgetData.id;

    try {
      // Create incomes if provided
      if (incomes.length > 0) {
        const incomesToInsert = incomes.map((income) => ({
          household_id: householdId,
          budget_id: budgetId,
          household_member_id: income.householdMemberId,
          amount: income.amount,
        }));

        const { error: incomesError } = await this.supabase.from("incomes").insert(incomesToInsert);

        if (incomesError) {
          console.error("Database error while creating incomes:", incomesError);
          // Attempt to rollback budget creation
          await this.rollbackBudget(budgetId);
          throw new Error("BUDGET_CREATE_FAILED");
        }
      }

      // Create planned expenses if provided
      if (plannedExpenses.length > 0) {
        const expensesToInsert = plannedExpenses.map((expense) => ({
          household_id: householdId,
          budget_id: budgetId,
          category_id: expense.categoryId,
          limit_amount: expense.limitAmount,
        }));

        const { error: expensesError } = await this.supabase.from("planned_expenses").insert(expensesToInsert);

        if (expensesError) {
          console.error("Database error while creating planned expenses:", expensesError);
          // Attempt to rollback budget creation and incomes
          await this.rollbackBudget(budgetId);
          throw new Error("BUDGET_CREATE_FAILED");
        }
      }

      return {
        id: budgetData.id,
        month: budgetData.month,
        createdAt: budgetData.created_at,
      };
    } catch (error) {
      // Ensure rollback on any error during related data creation
      await this.rollbackBudget(budgetId);
      throw error;
    }
  }

  /**
   * Fetches aggregated summaries for multiple budgets.
   *
   * @param budgetIds - Array of budget IDs to fetch summaries for
   * @param householdId - The household ID for security filtering
   * @returns Promise resolving to a Map of budget ID to summary data
   */
  private async getBudgetsSummaries(
    budgetIds: string[],
    householdId: string
  ): Promise<Map<string, BudgetSummaryTotalsDto>> {
    if (budgetIds.length === 0) {
      return new Map();
    }

    try {
      // Fetch incomes aggregation
      const { data: incomesData, error: incomesError } = await this.supabase
        .from("incomes")
        .select("budget_id, amount")
        .in("budget_id", budgetIds);

      if (incomesError) {
        console.error("Error fetching incomes aggregation:", incomesError);
        throw new Error("BUDGETS_LIST_FAILED");
      }

      // Fetch planned expenses aggregation
      const { data: plannedData, error: plannedError } = await this.supabase
        .from("planned_expenses")
        .select("budget_id, limit_amount")
        .in("budget_id", budgetIds);

      if (plannedError) {
        console.error("Error fetching planned expenses aggregation:", plannedError);
        throw new Error("BUDGETS_LIST_FAILED");
      }

      // Fetch transactions aggregation
      const { data: transactionsData, error: transactionsError } = await this.supabase
        .from("transactions")
        .select("budget_id, amount")
        .eq("household_id", householdId)
        .in("budget_id", budgetIds);

      if (transactionsError) {
        console.error("Error fetching transactions aggregation:", transactionsError);
        throw new Error("BUDGETS_LIST_FAILED");
      }

      // Aggregate data by budget_id
      const summariesMap = new Map<string, BudgetSummaryTotalsDto>();

      // Initialize all budgets with zero values
      budgetIds.forEach((budgetId) => {
        summariesMap.set(budgetId, {
          totalIncome: 0,
          totalPlanned: 0,
          totalSpent: 0,
          freeFunds: 0,
        });
      });

      // Aggregate incomes
      if (incomesData) {
        incomesData.forEach((income) => {
          const summary = summariesMap.get(income.budget_id);
          if (summary) {
            const updatedSummary = {
              ...summary,
              totalIncome: summary.totalIncome + (income.amount || 0),
            };
            summariesMap.set(income.budget_id, updatedSummary);
          }
        });
      }

      // Aggregate planned expenses
      if (plannedData) {
        plannedData.forEach((planned) => {
          const summary = summariesMap.get(planned.budget_id);
          if (summary) {
            const updatedSummary = {
              ...summary,
              totalPlanned: summary.totalPlanned + (planned.limit_amount || 0),
            };
            summariesMap.set(planned.budget_id, updatedSummary);
          }
        });
      }

      // Aggregate transactions
      if (transactionsData) {
        transactionsData.forEach((transaction) => {
          const summary = summariesMap.get(transaction.budget_id);
          if (summary) {
            const updatedSummary = {
              ...summary,
              totalSpent: summary.totalSpent + (transaction.amount || 0),
            };
            summariesMap.set(transaction.budget_id, updatedSummary);
          }
        });
      }

      // Calculate free funds for each budget
      summariesMap.forEach((summary, budgetId) => {
        const updatedSummary = {
          ...summary,
          freeFunds: summary.totalIncome - summary.totalPlanned,
        };
        summariesMap.set(budgetId, updatedSummary);
      });

      return summariesMap;
    } catch (error) {
      console.error("Error in getBudgetsSummaries:", error);
      throw new Error("BUDGETS_LIST_FAILED");
    }
  }

  /**
   * Validates that all provided household member IDs belong to the specified household and are active.
   *
   * @param householdId - The household ID to validate against
   * @param memberIds - Array of household member IDs to validate
   * @throws Error if any member ID is invalid or inactive
   */
  private async validateHouseholdMembers(householdId: string, memberIds: string[]): Promise<void> {
    if (memberIds.length === 0) return;

    const { data: members, error } = await this.supabase
      .from("household_members")
      .select("id, is_active")
      .eq("household_id", householdId)
      .in("id", memberIds);

    if (error) {
      console.error("Database error while validating household members:", error);
      throw new Error("BUDGET_CREATE_FAILED");
    }

    if (!members || members.length !== memberIds.length) {
      throw new Error("INVALID_MEMBER");
    }

    // Check if all members are active
    const inactiveMembers = members.filter((member) => !member.is_active);
    if (inactiveMembers.length > 0) {
      throw new Error("INVALID_MEMBER");
    }
  }

  /**
   * Validates that all provided category IDs belong to the specified household.
   *
   * @param householdId - The household ID to validate against
   * @param categoryIds - Array of category IDs to validate
   * @throws Error if any category ID is invalid
   */
  private async validateCategories(householdId: string, categoryIds: string[]): Promise<void> {
    if (categoryIds.length === 0) return;

    const { data: categories, error } = await this.supabase
      .from("categories")
      .select("id")
      .eq("household_id", householdId)
      .in("id", categoryIds);

    if (error) {
      console.error("Database error while validating categories:", error);
      throw new Error("BUDGET_CREATE_FAILED");
    }

    if (!categories || categories.length !== categoryIds.length) {
      throw new Error("INVALID_CATEGORY");
    }
  }

  /**
   * Attempts to rollback a budget creation by deleting the budget and all related data.
   * This is a best-effort cleanup operation that logs errors but doesn't throw.
   *
   * @param budgetId - The ID of the budget to rollback
   */
  private async rollbackBudget(budgetId: string): Promise<void> {
    try {
      // Delete in reverse order of creation to respect foreign key constraints

      // Delete planned expenses first
      const { error: expensesError } = await this.supabase.from("planned_expenses").delete().eq("budget_id", budgetId);

      if (expensesError) {
        console.error("Error during planned expenses rollback:", expensesError);
      }

      // Delete incomes
      const { error: incomesError } = await this.supabase.from("incomes").delete().eq("budget_id", budgetId);

      if (incomesError) {
        console.error("Error during incomes rollback:", incomesError);
      }

      // Delete the budget itself
      const { error: budgetError } = await this.supabase.from("budgets").delete().eq("id", budgetId);

      if (budgetError) {
        console.error("Error during budget rollback:", budgetError);
      }
    } catch (error) {
      console.error("Unexpected error during budget rollback:", error);
    }
  }

  /**
   * Normalizes month filter to first day of month format (YYYY-MM-DD).
   * Accepts YYYY-MM or full ISO date formats.
   *
   * @param month - The month string to normalize
   * @returns Normalized month string in YYYY-MM-DD format
   */
  private normalizeMonthFilter(month: string): string {
    // If it's already in YYYY-MM-DD format and looks like first day of month
    if (/^\d{4}-\d{2}-01$/.test(month)) {
      return month;
    }

    // If it's in YYYY-MM format
    if (/^\d{4}-\d{2}$/.test(month)) {
      return `${month}-01`;
    }

    // If it's a full ISO date, extract year-month and add -01
    if (/^\d{4}-\d{2}-\d{2}/.test(month)) {
      return `${month.slice(0, 7)}-01`;
    }

    // Fallback: try to parse as date and format
    try {
      const date = new Date(month);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const monthNum = String(date.getMonth() + 1).padStart(2, "0");
        return `${year}-${monthNum}-01`;
      }
    } catch {
      // Ignore parsing errors
    }

    // If all else fails, return as-is (will likely cause validation error later)
    return month;
  }
}

/**
 * Factory function to create a BudgetsService instance.
 *
 * @param supabase - Supabase client instance
 * @returns New BudgetsService instance
 */
export function createBudgetsService(supabase: SupabaseClientType): BudgetsService {
  return new BudgetsService(supabase);
}
