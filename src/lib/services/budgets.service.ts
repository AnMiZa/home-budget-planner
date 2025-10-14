import type { supabaseClient } from "../../db/supabase.client";
import type {
  BudgetsListResponseDto,
  BudgetListItemDto,
  BudgetSummaryTotalsDto,
  PaginationMetaDto,
  CreateBudgetCommand,
  BudgetCreatedDto,
  BudgetDetailDto,
  BudgetIncomeDto,
  BudgetPlannedExpenseDto,
  BudgetSummaryDto,
  BudgetCategorySummaryDto,
  BudgetCategorySummaryStatus,
  UpdateBudgetCommand,
  BudgetIncomesListResponseDto,
  UpdateBudgetIncomeCommand,
  UpsertBudgetIncomesCommand,
  PlannedExpensesListResponseDto,
  UpsertPlannedExpensesCommand,
  UpdatePlannedExpenseCommand,
  TransactionDto,
  TransactionsListResponseDto,
} from "../../types";
import type { ListTransactionsFilters } from "../validation/transactions";
import { createPartialMatchPattern } from "../sql";

export type SupabaseClientType = typeof supabaseClient;

export interface ListBudgetsOptions {
  month?: string;
  status?: "current" | "past" | "upcoming" | "all";
  includeSummary?: boolean;
  page?: number;
  pageSize?: number;
  sort?: "month_desc" | "month_asc";
}

export interface GetBudgetDetailOptions {
  includeTransactions?: boolean;
  includeInactiveMembers?: boolean;
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
      .select("id, month, note, created_at, updated_at", { count: "exact" })
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
      note: budget.note,
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
    const { month, note, incomes = [], plannedExpenses = [] } = command;

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

    // Normalize note field
    let normalizedNote: string | null | undefined = note;
    if (normalizedNote !== null && normalizedNote !== undefined) {
      normalizedNote = normalizedNote.trim();
      if (normalizedNote === "") {
        normalizedNote = null;
      }
      // Additional length check (should be caught by validation, but defensive programming)
      if (normalizedNote && normalizedNote.length > 500) {
        normalizedNote = normalizedNote.substring(0, 500);
      }
    }

    // Insert the new budget
    const { data: budgetData, error: insertError } = await this.supabase
      .from("budgets")
      .insert({
        household_id: householdId,
        month: normalizedMonth,
        note: normalizedNote,
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
   * Retrieves detailed information about a specific budget for the specified user's household.
   * Includes incomes, planned expenses, and financial summary with optional transaction aggregation.
   *
   * @param userId - The ID of the user whose budget to retrieve
   * @param budgetId - The ID of the budget to retrieve
   * @param options - Options for including transactions and inactive members
   * @returns Promise resolving to detailed budget information
   * @throws Error if household not found, budget not found, or database error occurs
   */
  async getBudgetDetail(
    userId: string,
    budgetId: string,
    options: GetBudgetDetailOptions = {}
  ): Promise<BudgetDetailDto> {
    const { includeTransactions = false, includeInactiveMembers = false } = options;

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
      throw new Error("BUDGET_FETCH_FAILED");
    }

    if (!householdData) {
      throw new Error("HOUSEHOLD_NOT_FOUND");
    }

    const householdId = householdData.id;

    // Fetch the budget and verify it belongs to the user's household
    const { data: budgetData, error: budgetError } = await this.supabase
      .from("budgets")
      .select("id, month, note, created_at, updated_at")
      .eq("id", budgetId)
      .eq("household_id", householdId)
      .single();

    if (budgetError) {
      if (budgetError.code === "PGRST116") {
        throw new Error("BUDGET_NOT_FOUND");
      }
      console.error("Database error while fetching budget:", budgetError);
      throw new Error("BUDGET_FETCH_FAILED");
    }

    if (!budgetData) {
      throw new Error("BUDGET_NOT_FOUND");
    }

    try {
      // Fetch all related data in parallel
      const [incomesData, plannedExpensesData, transactionsData] = await Promise.all([
        this.getBudgetIncomes(budgetId, householdId, includeInactiveMembers),
        this.getBudgetPlannedExpenses(budgetId, householdId),
        includeTransactions ? this.getBudgetTransactions(budgetId, householdId) : Promise.resolve([]),
      ]);

      // Calculate summary totals
      const totalIncome = incomesData.reduce((sum, income) => sum + income.amount, 0);
      const totalPlanned = plannedExpensesData.reduce((sum, expense) => sum + expense.limitAmount, 0);
      const totalSpent = transactionsData.reduce((sum, transaction) => sum + transaction.amount, 0);
      const freeFunds = totalIncome - totalPlanned;
      const progress = totalIncome > 0 ? (totalSpent / totalIncome) * 100 : 0;

      // Build summary object
      let summary: BudgetSummaryDto = {
        totalIncome,
        totalPlanned,
        totalSpent,
        freeFunds,
        progress,
      };

      // Add per-category summary if transactions are included
      if (includeTransactions) {
        const perCategory = await this.calculateCategorySummaries(plannedExpensesData, transactionsData, householdId);
        summary = {
          ...summary,
          perCategory,
        };
      }

      return {
        id: budgetData.id,
        month: budgetData.month,
        note: budgetData.note,
        createdAt: budgetData.created_at,
        updatedAt: budgetData.updated_at,
        incomes: incomesData,
        plannedExpenses: plannedExpensesData,
        summary,
      };
    } catch (error) {
      console.error("Error fetching budget detail data:", error);
      throw new Error("BUDGET_FETCH_FAILED");
    }
  }

  /**
   * Fetches incomes for a specific budget with optional filtering by member activity.
   *
   * @param budgetId - The budget ID to fetch incomes for
   * @param householdId - The household ID for security filtering
   * @param includeInactiveMembers - Whether to include incomes from inactive members
   * @returns Promise resolving to array of budget income DTOs
   */
  private async getBudgetIncomes(
    budgetId: string,
    householdId: string,
    includeInactiveMembers: boolean
  ): Promise<BudgetIncomeDto[]> {
    let query = this.supabase
      .from("incomes")
      .select(
        `
        id,
        household_member_id,
        amount,
        created_at,
        updated_at,
        household_members!inner(is_active)
      `
      )
      .eq("budget_id", budgetId)
      .eq("household_id", householdId);

    // Filter by member activity if requested
    if (!includeInactiveMembers) {
      query = query.eq("household_members.is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Database error while fetching budget incomes:", error);
      throw new Error("BUDGET_FETCH_FAILED");
    }

    return (data || []).map((income) => ({
      id: income.id,
      householdMemberId: income.household_member_id,
      amount: income.amount,
      createdAt: income.created_at,
      updatedAt: income.updated_at,
    }));
  }

  /**
   * Fetches planned expenses for a specific budget.
   *
   * @param budgetId - The budget ID to fetch planned expenses for
   * @param householdId - The household ID for security filtering
   * @returns Promise resolving to array of budget planned expense DTOs
   */
  private async getBudgetPlannedExpenses(budgetId: string, householdId: string): Promise<BudgetPlannedExpenseDto[]> {
    const { data, error } = await this.supabase
      .from("planned_expenses")
      .select("id, category_id, limit_amount, created_at, updated_at")
      .eq("budget_id", budgetId)
      .eq("household_id", householdId);

    if (error) {
      console.error("Database error while fetching planned expenses:", error);
      throw new Error("BUDGET_FETCH_FAILED");
    }

    return (data || []).map((expense) => ({
      id: expense.id,
      categoryId: expense.category_id,
      limitAmount: expense.limit_amount,
      createdAt: expense.created_at,
      updatedAt: expense.updated_at,
    }));
  }

  /**
   * Fetches transactions for a specific budget.
   *
   * @param budgetId - The budget ID to fetch transactions for
   * @param householdId - The household ID for security filtering
   * @returns Promise resolving to array of transaction data
   */
  private async getBudgetTransactions(
    budgetId: string,
    householdId: string
  ): Promise<{ categoryId: string; amount: number }[]> {
    const { data, error } = await this.supabase
      .from("transactions")
      .select("category_id, amount")
      .eq("budget_id", budgetId)
      .eq("household_id", householdId);

    if (error) {
      console.error("Database error while fetching budget transactions:", error);
      throw new Error("BUDGET_FETCH_FAILED");
    }

    return (data || []).map((transaction) => ({
      categoryId: transaction.category_id,
      amount: transaction.amount,
    }));
  }

  /**
   * Calculates per-category summaries by combining planned expenses with transaction data.
   *
   * @param plannedExpenses - Array of planned expenses
   * @param transactions - Array of transactions
   * @param householdId - The household ID for fetching category names
   * @returns Promise resolving to array of category summary DTOs
   */
  private async calculateCategorySummaries(
    plannedExpenses: BudgetPlannedExpenseDto[],
    transactions: { categoryId: string; amount: number }[],
    householdId: string
  ): Promise<BudgetCategorySummaryDto[]> {
    if (plannedExpenses.length === 0) {
      return [];
    }

    // Get category names
    const categoryIds = plannedExpenses.map((expense) => expense.categoryId);
    const { data: categoriesData, error: categoriesError } = await this.supabase
      .from("categories")
      .select("id, name")
      .eq("household_id", householdId)
      .in("id", categoryIds);

    if (categoriesError) {
      console.error("Database error while fetching category names:", categoriesError);
      throw new Error("BUDGET_FETCH_FAILED");
    }

    const categoriesMap = new Map((categoriesData || []).map((category) => [category.id, category.name]));

    // Aggregate transactions by category
    const transactionsByCategory = new Map<string, number>();
    transactions.forEach((transaction) => {
      const currentAmount = transactionsByCategory.get(transaction.categoryId) || 0;
      transactionsByCategory.set(transaction.categoryId, currentAmount + transaction.amount);
    });

    // Build category summaries
    return plannedExpenses.map((expense) => {
      const spent = transactionsByCategory.get(expense.categoryId) || 0;
      const progress = expense.limitAmount > 0 ? (spent / expense.limitAmount) * 100 : 0;

      let status: BudgetCategorySummaryStatus = "ok";
      if (progress >= 100) {
        status = "over";
      } else if (progress >= 80) {
        status = "warning";
      }

      return {
        categoryId: expense.categoryId,
        name: categoriesMap.get(expense.categoryId) || "Unknown Category",
        spent,
        limitAmount: expense.limitAmount,
        progress,
        status,
      };
    });
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

  /**
   * Lists incomes for a specific budget that belongs to the authenticated user's household.
   *
   * @param userId - The ID of the user whose budget incomes to retrieve
   * @param budgetId - The ID of the budget to retrieve incomes for
   * @returns Promise resolving to list of budget incomes
   * @throws Error if household not found, budget not found, or database error occurs
   */
  async listBudgetIncomes(userId: string, budgetId: string): Promise<BudgetIncomesListResponseDto> {
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
      throw new Error("INCOMES_LIST_FAILED");
    }

    if (!householdData) {
      throw new Error("HOUSEHOLD_NOT_FOUND");
    }

    const householdId = householdData.id;

    // Verify that the budget exists and belongs to the user's household
    const { data: budgetData, error: budgetError } = await this.supabase
      .from("budgets")
      .select("id")
      .eq("id", budgetId)
      .eq("household_id", householdId)
      .single();

    if (budgetError) {
      if (budgetError.code === "PGRST116") {
        throw new Error("BUDGET_NOT_FOUND");
      }
      console.error("Database error while fetching budget:", budgetError);
      throw new Error("INCOMES_LIST_FAILED");
    }

    if (!budgetData) {
      throw new Error("BUDGET_NOT_FOUND");
    }

    try {
      // Fetch incomes using existing private method (include only active members)
      const incomes = await this.getBudgetIncomes(budgetId, householdId, false);

      return {
        data: incomes,
      };
    } catch (error) {
      console.error("Error fetching budget incomes:", error);
      throw new Error("INCOMES_LIST_FAILED");
    }
  }

  /**
   * Lists planned expenses for a specific budget that belongs to the authenticated user's household.
   *
   * @param userId - The ID of the user whose budget planned expenses to retrieve
   * @param budgetId - The ID of the budget to retrieve planned expenses for
   * @returns Promise resolving to list of budget planned expenses
   * @throws Error if household not found, budget not found, or database error occurs
   */
  async listBudgetPlannedExpenses(userId: string, budgetId: string): Promise<PlannedExpensesListResponseDto> {
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
      throw new Error("PLANNED_EXPENSES_LIST_FAILED");
    }

    if (!householdData) {
      throw new Error("HOUSEHOLD_NOT_FOUND");
    }

    const householdId = householdData.id;

    // Verify that the budget exists and belongs to the user's household
    const { data: budgetData, error: budgetError } = await this.supabase
      .from("budgets")
      .select("id")
      .eq("id", budgetId)
      .eq("household_id", householdId)
      .single();

    if (budgetError) {
      if (budgetError.code === "PGRST116") {
        throw new Error("BUDGET_NOT_FOUND");
      }
      console.error("Database error while fetching budget:", budgetError);
      throw new Error("PLANNED_EXPENSES_LIST_FAILED");
    }

    if (!budgetData) {
      throw new Error("BUDGET_NOT_FOUND");
    }

    try {
      // Fetch planned expenses using existing private method
      const plannedExpenses = await this.getBudgetPlannedExpenses(budgetId, householdId);

      return {
        data: plannedExpenses,
      };
    } catch (error) {
      console.error("Error fetching budget planned expenses:", error);
      throw new Error("PLANNED_EXPENSES_LIST_FAILED");
    }
  }

  /**
   * Updates mutable metadata of a budget that belongs to the authenticated user's household.
   * Currently supports updating the 'note' field.
   *
   * @param userId - The ID of the user whose budget to update
   * @param budgetId - The ID of the budget to update
   * @param command - The update command containing the fields to update
   * @returns Promise resolving to updated budget detail
   * @throws Error if household not found, budget not found, invalid state transition, or database error occurs
   */
  async updateBudgetMetadata(userId: string, budgetId: string, command: UpdateBudgetCommand): Promise<BudgetDetailDto> {
    // First, get the household_id for the user
    const { data: household, error: householdError } = await this.supabase
      .from("households")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (householdError) {
      console.error("Database error while fetching household:", householdError);
      throw new Error("BUDGET_UPDATE_FAILED");
    }

    if (!household) {
      throw new Error("HOUSEHOLD_NOT_FOUND");
    }

    const householdId = household.id;

    // Ensure budget exists for the household and get current state
    const { data: existingBudget, error: budgetCheckError } = await this.supabase
      .from("budgets")
      .select("id")
      .eq("id", budgetId)
      .eq("household_id", householdId)
      .maybeSingle();

    if (budgetCheckError) {
      console.error("Database error while checking budget existence:", budgetCheckError);
      throw new Error("BUDGET_UPDATE_FAILED");
    }

    if (!existingBudget) {
      throw new Error("BUDGET_NOT_FOUND");
    }

    // TODO: Add state validation when budget status is implemented
    // For now, we allow all updates (placeholder check)
    // if (existingBudget.status === 'finalized' || existingBudget.status === 'locked') {
    //   throw new Error("INVALID_STATE_TRANSITION");
    // }

    // Normalize note field
    let normalizedNote: string | null | undefined = command.note;
    if (normalizedNote !== null && normalizedNote !== undefined) {
      normalizedNote = normalizedNote.trim();
      if (normalizedNote === "") {
        normalizedNote = null;
      }
      // Additional length check (should be caught by validation, but defensive programming)
      if (normalizedNote && normalizedNote.length > 500) {
        normalizedNote = normalizedNote.substring(0, 500);
      }
    }

    // Update the budget and fetch updated data in one query
    const { data: updateResult, error: updateError } = await this.supabase
      .from("budgets")
      .update({
        note: normalizedNote,
        updated_at: new Date().toISOString(),
      })
      .eq("id", budgetId)
      .eq("household_id", householdId)
      .select("id, month, note, created_at, updated_at");

    if (updateError) {
      console.error("Database error while updating budget:", updateError);

      // Check for constraint violations (e.g., note length)
      if (updateError.code === "23514") {
        // CHECK constraint violation
        throw new Error("INVALID_PAYLOAD");
      }

      throw new Error("BUDGET_UPDATE_FAILED");
    }

    if (!updateResult || updateResult.length === 0) {
      // This shouldn't happen if our checks above passed, but defensive programming
      throw new Error("BUDGET_NOT_FOUND");
    }

    const updatedBudget = updateResult[0];

    // Fetch all related data in parallel (optimized - avoid extra household lookup)
    try {
      const [incomesData, plannedExpensesData] = await Promise.all([
        this.getBudgetIncomes(budgetId, householdId, false), // includeInactiveMembers = false for PATCH
        this.getBudgetPlannedExpenses(budgetId, householdId),
      ]);

      // Calculate summary totals (no transactions for PATCH response)
      const totalIncome = incomesData.reduce((sum, income) => sum + income.amount, 0);
      const totalPlanned = plannedExpensesData.reduce((sum, expense) => sum + expense.limitAmount, 0);
      const totalSpent = 0; // No transactions included in PATCH response
      const freeFunds = totalIncome - totalPlanned;
      const progress = totalIncome > 0 ? (totalSpent / totalIncome) * 100 : 0;

      // Build summary object (simplified for PATCH - no per-category data)
      const summary: BudgetSummaryDto = {
        totalIncome,
        totalPlanned,
        totalSpent,
        freeFunds,
        progress,
      };

      return {
        id: updatedBudget.id,
        month: updatedBudget.month,
        note: updatedBudget.note,
        createdAt: updatedBudget.created_at,
        updatedAt: updatedBudget.updated_at,
        incomes: incomesData,
        plannedExpenses: plannedExpensesData,
        summary,
      };
    } catch (detailError) {
      console.error("Error fetching updated budget detail data:", detailError);
      throw new Error("BUDGET_UPDATE_FAILED");
    }
  }

  /**
   * Updates the amount of a specific income in a budget.
   *
   * @param userId - The ID of the user making the request
   * @param budgetId - The ID of the budget containing the income
   * @param incomeId - The ID of the income to update
   * @param command - The update command containing the new amount
   * @returns Promise resolving to the updated income DTO
   * @throws Error if household, budget, or income not found, or if update fails
   */
  async updateBudgetIncome(
    userId: string,
    budgetId: string,
    incomeId: string,
    command: UpdateBudgetIncomeCommand
  ): Promise<BudgetIncomeDto> {
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
      throw new Error("INCOME_UPDATE_FAILED");
    }

    if (!householdData) {
      throw new Error("HOUSEHOLD_NOT_FOUND");
    }

    const householdId = householdData.id;

    // Verify that the budget exists and belongs to the user's household
    const { data: budgetData, error: budgetError } = await this.supabase
      .from("budgets")
      .select("id")
      .eq("id", budgetId)
      .eq("household_id", householdId)
      .single();

    if (budgetError) {
      if (budgetError.code === "PGRST116") {
        throw new Error("BUDGET_NOT_FOUND");
      }
      console.error("Database error while fetching budget:", budgetError);
      throw new Error("INCOME_UPDATE_FAILED");
    }

    if (!budgetData) {
      throw new Error("BUDGET_NOT_FOUND");
    }

    // Update the income record
    const { data: updatedIncome, error: updateError } = await this.supabase
      .from("incomes")
      .update({
        amount: command.amount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", incomeId)
      .eq("budget_id", budgetId)
      .eq("household_id", householdId)
      .select("id, household_member_id, amount, created_at, updated_at")
      .single();

    if (updateError) {
      if (updateError.code === "PGRST116") {
        throw new Error("INCOME_NOT_FOUND");
      }

      // Handle constraint violations (e.g., CHECK constraints)
      if (updateError.code === "23514" || updateError.message?.includes("CHECK")) {
        throw new Error("INVALID_AMOUNT");
      }

      console.error("Database error while updating income:", updateError);
      throw new Error("INCOME_UPDATE_FAILED");
    }

    if (!updatedIncome) {
      throw new Error("INCOME_NOT_FOUND");
    }

    // Map the database result to DTO
    return this.mapIncomeToDto(updatedIncome);
  }

  /**
   * Replaces the complete set of incomes for a specific budget.
   * This method performs a full replacement - removes existing incomes not in the provided list
   * and inserts/updates the provided incomes.
   *
   * @param userId - The ID of the user whose budget to update
   * @param budgetId - The ID of the budget to update incomes for
   * @param command - Command containing the new set of incomes
   * @returns Promise resolving to the updated list of budget incomes
   * @throws Error if household not found, budget not found, invalid members, or database error occurs
   */
  async replaceBudgetIncomes(
    userId: string,
    budgetId: string,
    command: UpsertBudgetIncomesCommand
  ): Promise<BudgetIncomesListResponseDto> {
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
      throw new Error("INCOMES_UPSERT_FAILED");
    }

    if (!householdData) {
      throw new Error("HOUSEHOLD_NOT_FOUND");
    }

    const householdId = householdData.id;

    // Verify that the budget belongs to the user's household
    const { data: budgetData, error: budgetError } = await this.supabase
      .from("budgets")
      .select("id")
      .eq("id", budgetId)
      .eq("household_id", householdId)
      .single();

    if (budgetError) {
      if (budgetError.code === "PGRST116") {
        throw new Error("BUDGET_NOT_FOUND");
      }
      console.error("Database error while fetching budget:", budgetError);
      throw new Error("INCOMES_UPSERT_FAILED");
    }

    if (!budgetData) {
      throw new Error("BUDGET_NOT_FOUND");
    }

    // Validate household members if incomes are provided
    if (command.incomes.length > 0) {
      const memberIds = command.incomes.map((income) => income.householdMemberId);
      await this.validateHouseholdMembers(householdId, memberIds);
    }

    try {
      // Delete existing incomes for this budget
      const { error: deleteError } = await this.supabase.from("incomes").delete().eq("budget_id", budgetId);

      if (deleteError) {
        console.error("Database error while deleting existing incomes:", deleteError);
        throw new Error("INCOMES_UPSERT_FAILED");
      }

      // Insert new incomes if provided
      if (command.incomes.length > 0) {
        const incomesToInsert = command.incomes.map((income) => ({
          household_id: householdId,
          budget_id: budgetId,
          household_member_id: income.householdMemberId,
          amount: income.amount,
        }));

        const { error: insertError } = await this.supabase.from("incomes").insert(incomesToInsert);

        if (insertError) {
          console.error("Database error while inserting new incomes:", insertError);

          // Handle specific database constraint violations
          if (insertError.code === "23505") {
            // Unique constraint violation
            throw new Error("DUPLICATE_MEMBER");
          }
          if (insertError.code === "23514" || insertError.code === "22001") {
            // Check constraint or data too long
            throw new Error("INVALID_AMOUNT");
          }

          throw new Error("INCOMES_UPSERT_FAILED");
        }
      }

      // Return the updated list of incomes
      return await this.listBudgetIncomes(userId, budgetId);
    } catch (error) {
      // Re-throw known errors
      if (
        error instanceof Error &&
        ["DUPLICATE_MEMBER", "INVALID_AMOUNT", "INCOMES_UPSERT_FAILED"].includes(error.message)
      ) {
        throw error;
      }

      console.error("Unexpected error during income replacement:", error);
      throw new Error("INCOMES_UPSERT_FAILED");
    }
  }

  /**
   * Deletes a specific income from a budget that belongs to the authenticated user's household.
   *
   * @param userId - The ID of the user making the request
   * @param budgetId - The ID of the budget containing the income
   * @param incomeId - The ID of the income to delete
   * @returns Promise resolving when the income is successfully deleted
   * @throws Error if household, budget, or income not found, or if deletion fails
   */
  async deleteBudgetIncome(userId: string, budgetId: string, incomeId: string): Promise<void> {
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
      throw new Error("INCOME_DELETE_FAILED");
    }

    if (!householdData) {
      throw new Error("HOUSEHOLD_NOT_FOUND");
    }

    const householdId = householdData.id;

    // Verify that the budget exists and belongs to the user's household
    const { data: budgetData, error: budgetError } = await this.supabase
      .from("budgets")
      .select("id")
      .eq("id", budgetId)
      .eq("household_id", householdId)
      .single();

    if (budgetError) {
      if (budgetError.code === "PGRST116") {
        throw new Error("BUDGET_NOT_FOUND");
      }
      console.error("Database error while fetching budget:", budgetError);
      throw new Error("INCOME_DELETE_FAILED");
    }

    if (!budgetData) {
      throw new Error("BUDGET_NOT_FOUND");
    }

    // Verify that the income exists and belongs to the budget and household
    const { data: incomeData, error: incomeCheckError } = await this.supabase
      .from("incomes")
      .select("id")
      .eq("id", incomeId)
      .eq("budget_id", budgetId)
      .eq("household_id", householdId)
      .single();

    if (incomeCheckError) {
      if (incomeCheckError.code === "PGRST116") {
        throw new Error("INCOME_NOT_FOUND");
      }
      console.error("Database error while checking income existence:", incomeCheckError);
      throw new Error("INCOME_DELETE_FAILED");
    }

    if (!incomeData) {
      throw new Error("INCOME_NOT_FOUND");
    }

    // Delete the income record
    const { error: deleteError } = await this.supabase
      .from("incomes")
      .delete()
      .eq("id", incomeId)
      .eq("budget_id", budgetId)
      .eq("household_id", householdId);

    if (deleteError) {
      console.error("Database error while deleting income:", deleteError);
      throw new Error("INCOME_DELETE_FAILED");
    }
  }

  /**
   * Replaces the complete set of planned expenses for a specific budget.
   * This method performs a full replacement - removes existing planned expenses
   * and inserts the provided planned expenses.
   *
   * @param userId - The ID of the user whose budget to update
   * @param budgetId - The ID of the budget to update planned expenses for
   * @param command - Command containing the new set of planned expenses
   * @returns Promise resolving to the updated list of budget planned expenses
   * @throws Error if household not found, budget not found, invalid categories, or database error occurs
   */
  async replaceBudgetPlannedExpenses(
    userId: string,
    budgetId: string,
    command: UpsertPlannedExpensesCommand
  ): Promise<PlannedExpensesListResponseDto> {
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
      throw new Error("PLANNED_EXPENSES_UPSERT_FAILED");
    }

    if (!householdData) {
      throw new Error("HOUSEHOLD_NOT_FOUND");
    }

    const householdId = householdData.id;

    // Verify that the budget belongs to the user's household
    const { data: budgetData, error: budgetError } = await this.supabase
      .from("budgets")
      .select("id")
      .eq("id", budgetId)
      .eq("household_id", householdId)
      .single();

    if (budgetError) {
      if (budgetError.code === "PGRST116") {
        throw new Error("BUDGET_NOT_FOUND");
      }
      console.error("Database error while fetching budget:", budgetError);
      throw new Error("PLANNED_EXPENSES_UPSERT_FAILED");
    }

    if (!budgetData) {
      throw new Error("BUDGET_NOT_FOUND");
    }

    // Validate categories if planned expenses are provided
    if (command.plannedExpenses.length > 0) {
      const categoryIds = command.plannedExpenses.map((expense) => expense.categoryId);
      await this.validateCategories(householdId, categoryIds);
    }

    try {
      // Delete existing planned expenses for this budget
      const { error: deleteError } = await this.supabase.from("planned_expenses").delete().eq("budget_id", budgetId);

      if (deleteError) {
        console.error("Database error while deleting existing planned expenses:", deleteError);
        throw new Error("PLANNED_EXPENSES_UPSERT_FAILED");
      }

      // Insert new planned expenses if provided
      if (command.plannedExpenses.length > 0) {
        const expensesToInsert = command.plannedExpenses.map((expense) => ({
          household_id: householdId,
          budget_id: budgetId,
          category_id: expense.categoryId,
          limit_amount: expense.limitAmount,
        }));

        const { error: insertError } = await this.supabase.from("planned_expenses").insert(expensesToInsert);

        if (insertError) {
          console.error("Database error while inserting new planned expenses:", insertError);

          // Handle specific database constraint violations
          if (insertError.code === "23505") {
            // Unique constraint violation (duplicate category in same budget)
            throw new Error("DUPLICATE_CATEGORY");
          }
          if (insertError.code === "23514") {
            // Check constraint violation (invalid limit amount)
            throw new Error("INVALID_LIMIT");
          }
          if (insertError.code === "23503") {
            // Foreign key constraint violation (invalid category)
            throw new Error("INVALID_CATEGORY");
          }

          throw new Error("PLANNED_EXPENSES_UPSERT_FAILED");
        }
      }

      // Return the updated list of planned expenses
      return await this.listBudgetPlannedExpenses(userId, budgetId);
    } catch (error) {
      // Re-throw known errors
      if (
        error instanceof Error &&
        ["DUPLICATE_CATEGORY", "INVALID_LIMIT", "INVALID_CATEGORY", "PLANNED_EXPENSES_UPSERT_FAILED"].includes(
          error.message
        )
      ) {
        throw error;
      }

      console.error("Unexpected error during planned expenses replacement:", error);
      throw new Error("PLANNED_EXPENSES_UPSERT_FAILED");
    }
  }

  /**
   * Updates the limit amount of a specific planned expense in a budget.
   *
   * @param userId - The ID of the user making the request
   * @param budgetId - The ID of the budget containing the planned expense
   * @param plannedExpenseId - The ID of the planned expense to update
   * @param command - The update command containing the new limit amount
   * @returns Promise resolving to the updated planned expense DTO
   * @throws Error if household, budget, or planned expense not found, or if update fails
   */
  async updateBudgetPlannedExpense(
    userId: string,
    budgetId: string,
    plannedExpenseId: string,
    command: UpdatePlannedExpenseCommand
  ): Promise<BudgetPlannedExpenseDto> {
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
      throw new Error("PLANNED_EXPENSE_UPDATE_FAILED");
    }

    if (!householdData) {
      throw new Error("HOUSEHOLD_NOT_FOUND");
    }

    const householdId = householdData.id;

    // Verify that the budget exists and belongs to the user's household
    const { data: budgetData, error: budgetError } = await this.supabase
      .from("budgets")
      .select("id")
      .eq("id", budgetId)
      .eq("household_id", householdId)
      .single();

    if (budgetError) {
      if (budgetError.code === "PGRST116") {
        throw new Error("BUDGET_NOT_FOUND");
      }
      console.error("Database error while fetching budget:", budgetError);
      throw new Error("PLANNED_EXPENSE_UPDATE_FAILED");
    }

    if (!budgetData) {
      throw new Error("BUDGET_NOT_FOUND");
    }

    // Update the planned expense record
    const { data: updatedPlannedExpense, error: updateError } = await this.supabase
      .from("planned_expenses")
      .update({
        limit_amount: command.limitAmount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", plannedExpenseId)
      .eq("budget_id", budgetId)
      .eq("household_id", householdId)
      .select("id, category_id, limit_amount, created_at, updated_at")
      .single();

    if (updateError) {
      if (updateError.code === "PGRST116") {
        throw new Error("PLANNED_EXPENSE_NOT_FOUND");
      }

      // Handle constraint violations (e.g., CHECK constraints)
      if (updateError.code === "23514" || updateError.message?.includes("CHECK")) {
        throw new Error("INVALID_PAYLOAD");
      }

      console.error("Database error while updating planned expense:", updateError);
      throw new Error("PLANNED_EXPENSE_UPDATE_FAILED");
    }

    if (!updatedPlannedExpense) {
      throw new Error("PLANNED_EXPENSE_NOT_FOUND");
    }

    // Map the database result to DTO
    return this.mapPlannedExpenseToDto(updatedPlannedExpense);
  }

  /**
   * Deletes a planned expense from a budget belonging to the user's household.
   * This operation frees up the allocated funds from the budget.
   *
   * @param userId - The ID of the user who owns the household
   * @param budgetId - The ID of the budget containing the planned expense
   * @param plannedExpenseId - The ID of the planned expense to delete
   * @throws {Error} HOUSEHOLD_NOT_FOUND - If no household exists for the user
   * @throws {Error} BUDGET_NOT_FOUND - If the budget doesn't exist or doesn't belong to the user's household
   * @throws {Error} PLANNED_EXPENSE_NOT_FOUND - If the planned expense doesn't exist or doesn't belong to the budget
   * @throws {Error} PLANNED_EXPENSE_DELETE_FAILED - If the database operation fails
   */
  async deleteBudgetPlannedExpense(userId: string, budgetId: string, plannedExpenseId: string): Promise<void> {
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
      throw new Error("PLANNED_EXPENSE_DELETE_FAILED");
    }

    if (!householdData) {
      throw new Error("HOUSEHOLD_NOT_FOUND");
    }

    const householdId = householdData.id;

    // Verify that the budget exists and belongs to the user's household
    const { data: budgetData, error: budgetError } = await this.supabase
      .from("budgets")
      .select("id")
      .eq("id", budgetId)
      .eq("household_id", householdId)
      .single();

    if (budgetError) {
      if (budgetError.code === "PGRST116") {
        throw new Error("BUDGET_NOT_FOUND");
      }
      console.error("Database error while fetching budget:", budgetError);
      throw new Error("PLANNED_EXPENSE_DELETE_FAILED");
    }

    if (!budgetData) {
      throw new Error("BUDGET_NOT_FOUND");
    }

    // First check if the planned expense exists before attempting to delete
    const { data: existingExpense, error: checkError } = await this.supabase
      .from("planned_expenses")
      .select("id")
      .eq("id", plannedExpenseId)
      .eq("budget_id", budgetId)
      .eq("household_id", householdId)
      .single();

    if (checkError) {
      if (checkError.code === "PGRST116") {
        throw new Error("PLANNED_EXPENSE_NOT_FOUND");
      }
      console.error("Database error while checking planned expense existence:", checkError);
      throw new Error("PLANNED_EXPENSE_DELETE_FAILED");
    }

    if (!existingExpense) {
      throw new Error("PLANNED_EXPENSE_NOT_FOUND");
    }

    // Delete the planned expense record
    const { error: deleteError } = await this.supabase
      .from("planned_expenses")
      .delete()
      .eq("id", plannedExpenseId)
      .eq("budget_id", budgetId)
      .eq("household_id", householdId);

    if (deleteError) {
      console.error("Database error while deleting planned expense:", deleteError);
      throw new Error("PLANNED_EXPENSE_DELETE_FAILED");
    }
  }

  /**
   * Lists transactions for a specific budget that belongs to the authenticated user's household.
   * Supports filtering by category, date range, note search, pagination, and sorting.
   *
   * @param userId - The ID of the user whose budget transactions to retrieve
   * @param budgetId - The ID of the budget to retrieve transactions for
   * @param filters - Filters for pagination, sorting, and data filtering
   * @returns Promise resolving to paginated list of transactions
   * @throws Error if household not found, budget not found, or database error occurs
   */
  async listBudgetTransactions(
    userId: string,
    budgetId: string,
    filters: ListTransactionsFilters
  ): Promise<TransactionsListResponseDto> {
    // First, get the household_id for the user
    const { data: householdData, error: householdError } = await this.supabase
      .from("households")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (householdError || !householdData) {
      console.error("Error fetching household for user:", householdError);
      throw new Error("HOUSEHOLD_NOT_FOUND");
    }

    const householdId = householdData.id;

    // Verify that the budget exists and belongs to the user's household
    const { data: budgetData, error: budgetError } = await this.supabase
      .from("budgets")
      .select("id")
      .eq("id", budgetId)
      .eq("household_id", householdId)
      .single();

    if (budgetError || !budgetData) {
      console.error("Error fetching budget:", budgetError);
      throw new Error("BUDGET_NOT_FOUND");
    }

    // Build the query with filters
    let query = this.supabase
      .from("transactions")
      .select("id, category_id, amount, transaction_date, note, created_at, updated_at", { count: "exact" })
      .eq("household_id", householdId)
      .eq("budget_id", budgetId);

    // Apply filters
    if (filters.categoryId) {
      query = query.eq("category_id", filters.categoryId);
    }

    if (filters.fromDate) {
      query = query.gte("transaction_date", filters.fromDate);
    }

    if (filters.toDate) {
      query = query.lte("transaction_date", filters.toDate);
    }

    if (filters.searchNote) {
      const searchPattern = createPartialMatchPattern(filters.searchNote);
      query = query.ilike("note", searchPattern);
    }

    // Apply sorting
    switch (filters.sort) {
      case "date_desc":
        query = query.order("transaction_date", { ascending: false });
        break;
      case "amount_desc":
        query = query.order("amount", { ascending: false });
        break;
      case "amount_asc":
        query = query.order("amount", { ascending: true });
        break;
    }

    // Apply pagination
    const offset = (filters.page - 1) * filters.pageSize;
    query = query.range(offset, offset + filters.pageSize - 1);

    // Execute the query
    const { data: transactions, error: transactionsError, count } = await query;

    if (transactionsError) {
      console.error("Error fetching transactions:", transactionsError);
      throw new Error("TRANSACTIONS_LIST_FAILED");
    }

    // Map transactions to DTOs
    const transactionDtos: TransactionDto[] = (transactions || []).map(this.mapTransactionToDto);

    // Calculate pagination metadata
    const totalItems = count || 0;
    const totalPages = Math.ceil(totalItems / filters.pageSize);

    return {
      data: transactionDtos,
      meta: {
        page: filters.page,
        pageSize: filters.pageSize,
        totalItems,
        totalPages,
      },
    };
  }

  /**
   * Maps a database income record to BudgetIncomeDto.
   *
   * @param income - The income record from the database
   * @returns Mapped BudgetIncomeDto
   */
  private mapIncomeToDto(income: any): BudgetIncomeDto {
    return {
      id: income.id,
      householdMemberId: income.household_member_id,
      amount: income.amount,
      createdAt: income.created_at,
      updatedAt: income.updated_at,
    };
  }

  /**
   * Maps a database planned expense record to BudgetPlannedExpenseDto.
   *
   * @param plannedExpense - The planned expense record from the database
   * @returns Mapped BudgetPlannedExpenseDto
   */
  private mapPlannedExpenseToDto(plannedExpense: any): BudgetPlannedExpenseDto {
    return {
      id: plannedExpense.id,
      categoryId: plannedExpense.category_id,
      limitAmount: plannedExpense.limit_amount,
      createdAt: plannedExpense.created_at,
      updatedAt: plannedExpense.updated_at,
    };
  }

  /**
   * Maps a database transaction record to TransactionDto.
   *
   * @param transaction - The transaction record from the database
   * @returns Mapped TransactionDto
   */
  private mapTransactionToDto(transaction: any): TransactionDto {
    return {
      id: transaction.id,
      householdId: transaction.household_id,
      budgetId: transaction.budget_id,
      categoryId: transaction.category_id,
      amount: Number(transaction.amount),
      transactionDate: transaction.transaction_date,
      note: transaction.note,
      createdAt: transaction.created_at,
      updatedAt: transaction.updated_at,
    };
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
