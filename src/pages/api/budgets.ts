import type { APIRoute } from "astro";
import { z } from "zod";
import { createBudgetsService } from "../../lib/services/budgets.service";
import type { ApiErrorDto, BudgetsListResponseDto, CreateBudgetCommand, BudgetCreatedDto } from "../../types";

export const prerender = false;

// Validation schema for query parameters (GET)
const querySchema = z.object({
  month: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}(-\d{2})?$/, "Month must be in YYYY-MM or YYYY-MM-DD format")
    .optional(),
  status: z.enum(["current", "past", "upcoming", "all"]).default("all"),
  includeSummary: z
    .string()
    .optional()
    .default("false")
    .transform((val) => val === "true"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(12),
  sort: z.enum(["month_desc", "month_asc"]).default("month_desc"),
});

// Validation schemas for POST request body
const incomeItemSchema = z.object({
  householdMemberId: z.string().uuid("Invalid household member ID format"),
  amount: z.number().positive("Income amount must be positive"),
});

const plannedExpenseItemSchema = z.object({
  categoryId: z.string().uuid("Invalid category ID format"),
  limitAmount: z.number().positive("Planned expense limit must be positive"),
});

const createBudgetSchema = z
  .object({
    month: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}(-\d{2})?$/, "Month must be in YYYY-MM or YYYY-MM-DD format"),
    incomes: z.array(incomeItemSchema).optional().default([]),
    plannedExpenses: z.array(plannedExpenseItemSchema).optional().default([]),
  })
  .refine(
    (data) => {
      // Check for duplicate household member IDs in incomes
      const memberIds = data.incomes?.map((income) => income.householdMemberId) || [];
      const uniqueMemberIds = new Set(memberIds);
      return memberIds.length === uniqueMemberIds.size;
    },
    {
      message: "Duplicate household member IDs are not allowed in incomes",
      path: ["incomes"],
    }
  )
  .refine(
    (data) => {
      // Check for duplicate category IDs in planned expenses
      const categoryIds = data.plannedExpenses?.map((expense) => expense.categoryId) || [];
      const uniqueCategoryIds = new Set(categoryIds);
      return categoryIds.length === uniqueCategoryIds.size;
    },
    {
      message: "Duplicate category IDs are not allowed in planned expenses",
      path: ["plannedExpenses"],
    }
  );

/**
 * Creates a standardized API error response.
 */
function createErrorResponse(code: string, message: string, status: number): Response {
  const errorResponse: ApiErrorDto = {
    error: {
      code,
      message,
    },
  };

  return new Response(JSON.stringify(errorResponse), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

/**
 * Creates a successful API response for budgets list.
 */
function createSuccessResponse(data: BudgetsListResponseDto): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Result-Code": "BUDGETS_LISTED",
    },
  });
}

/**
 * Creates a successful API response for budget creation.
 */
function createBudgetCreatedResponse(data: BudgetCreatedDto): Response {
  return new Response(JSON.stringify(data), {
    status: 201,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Result-Code": "BUDGET_CREATED",
    },
  });
}

/**
 * GET /api/budgets
 *
 * Retrieves a paginated list of budgets for the currently authenticated user's household.
 * Supports filtering by month and status, sorting, pagination, and optional summary aggregation.
 *
 * Performance Notes:
 * - Uses count: 'exact' for accurate pagination metadata (suitable for household-scale data)
 * - Summary aggregation performs parallel queries for incomes, planned expenses, and transactions
 * - Month filtering uses normalized date format (YYYY-MM-01) for consistent indexing
 *
 * Query Parameters:
 * - month (string, optional): Month filter in YYYY-MM or YYYY-MM-DD format
 * - status (string, optional): Filter by status - "current", "past", "upcoming", or "all" (default: "current")
 * - includeSummary (boolean, optional): Include financial summary aggregations (default: false)
 * - page (number, optional): Page number for pagination, starting from 1 (default: 1)
 * - pageSize (number, optional): Number of items per page, 1-100 (default: 12)
 * - sort (string, optional): Sort order - "month_desc" or "month_asc" (default: "month_desc")
 *
 * Responses:
 * - 200: Budgets list retrieved successfully with X-Result-Code: BUDGETS_LISTED
 * - 400: Invalid query parameters (INVALID_QUERY_PARAMS)
 * - 401: User not authenticated (UNAUTHENTICATED)
 * - 404: Household not found for user (HOUSEHOLD_NOT_FOUND)
 * - 500: Internal server error (BUDGETS_LIST_FAILED)
 */
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);

    const validationResult = querySchema.safeParse(queryParams);
    if (!validationResult.success) {
      console.warn("Query parameter validation failed:", validationResult.error);
      const firstError = validationResult.error.errors[0];
      return createErrorResponse(
        "INVALID_QUERY_PARAMS",
        firstError?.message || "Invalid query parameters provided",
        400
      );
    }

    const { month, status, includeSummary, page, pageSize, sort } = validationResult.data;

    // Get Supabase client from locals
    const supabase = locals.supabase;
    if (!supabase) {
      console.error("Supabase client not available in locals");
      return createErrorResponse("BUDGETS_LIST_FAILED", "Database connection not available", 500);
    }

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("Authentication error:", authError);
      return createErrorResponse("UNAUTHENTICATED", "Authentication failed", 401);
    }

    if (!user) {
      return createErrorResponse("UNAUTHENTICATED", "User not authenticated", 401);
    }

    // Create budgets service and fetch data
    const budgetsService = createBudgetsService(supabase);

    try {
      const result = await budgetsService.listBudgets(user.id, {
        month,
        status,
        includeSummary,
        page,
        pageSize,
        sort,
      });

      console.log(`Budgets listed successfully for user ${user.id}: ${result.data.length} budgets found`);
      return createSuccessResponse(result);
    } catch (serviceError) {
      const errorMessage = serviceError instanceof Error ? serviceError.message : "Unknown error";

      if (errorMessage === "HOUSEHOLD_NOT_FOUND") {
        return createErrorResponse("HOUSEHOLD_NOT_FOUND", "No household found for the authenticated user", 404);
      }

      if (errorMessage === "BUDGETS_LIST_FAILED") {
        console.error("Database error while fetching budgets:", serviceError);
        return createErrorResponse("BUDGETS_LIST_FAILED", "Failed to retrieve budgets", 500);
      }

      // Unexpected service error
      console.error("Unexpected service error:", serviceError);
      return createErrorResponse("BUDGETS_LIST_FAILED", "An unexpected error occurred while fetching budgets", 500);
    }
  } catch (error) {
    // Catch-all for unexpected errors
    console.error("Unexpected error in GET /api/budgets:", error);
    return createErrorResponse("BUDGETS_LIST_FAILED", "An internal server error occurred", 500);
  }
};

/**
 * POST /api/budgets
 *
 * Creates a new budget for the currently authenticated user's household.
 * Optionally initializes incomes and planned expenses in a single atomic operation.
 *
 * Request Body:
 * - month (string, required): Month in YYYY-MM or YYYY-MM-DD format
 * - incomes (array, optional): Array of income items with householdMemberId and amount
 * - plannedExpenses (array, optional): Array of planned expense items with categoryId and limitAmount
 *
 * Validation:
 * - No duplicate household member IDs in incomes
 * - No duplicate category IDs in planned expenses
 * - All amounts must be positive
 * - All referenced household members must belong to user's household and be active
 * - All referenced categories must belong to user's household
 *
 * Responses:
 * - 201: Budget created successfully with X-Result-Code: BUDGET_CREATED
 * - 400: Invalid request payload or validation errors
 * - 401: User not authenticated (UNAUTHENTICATED)
 * - 404: Household not found for user (HOUSEHOLD_NOT_FOUND)
 * - 409: Budget already exists for the specified month (BUDGET_ALREADY_EXISTS)
 * - 500: Internal server error (BUDGET_CREATE_FAILED)
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Parse request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (error) {
      console.warn("Failed to parse request body as JSON:", error);
      return createErrorResponse("INVALID_PAYLOAD", "Request body must be valid JSON", 400);
    }

    // Validate request body
    const validationResult = createBudgetSchema.safeParse(requestBody);
    if (!validationResult.success) {
      console.warn("Request body validation failed:", validationResult.error);
      const firstError = validationResult.error.errors[0];

      // Map specific validation errors to domain codes
      if (firstError?.path.includes("month")) {
        return createErrorResponse("INVALID_MONTH_FORMAT", firstError.message, 400);
      }

      if (firstError?.path.includes("incomes")) {
        return createErrorResponse("INVALID_PAYLOAD", firstError.message, 400);
      }

      if (firstError?.path.includes("plannedExpenses")) {
        return createErrorResponse("INVALID_PAYLOAD", firstError.message, 400);
      }

      return createErrorResponse("INVALID_PAYLOAD", firstError?.message || "Invalid request payload", 400);
    }

    const { month, incomes, plannedExpenses } = validationResult.data;

    // Get Supabase client from locals
    const supabase = locals.supabase;
    if (!supabase) {
      console.error("Supabase client not available in locals");
      return createErrorResponse("BUDGET_CREATE_FAILED", "Database connection not available", 500);
    }

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("Authentication error:", authError);
      return createErrorResponse("UNAUTHENTICATED", "Authentication failed", 401);
    }

    if (!user) {
      return createErrorResponse("UNAUTHENTICATED", "User not authenticated", 401);
    }

    // Create budgets service and create budget
    const budgetsService = createBudgetsService(supabase);

    try {
      const command: CreateBudgetCommand = {
        month,
        incomes,
        plannedExpenses,
      };

      const result = await budgetsService.createBudget(user.id, command);

      console.log(`Budget created successfully for user ${user.id}: ${result.id} for month ${result.month}`);
      return createBudgetCreatedResponse(result);
    } catch (serviceError) {
      const errorMessage = serviceError instanceof Error ? serviceError.message : "Unknown error";

      // Map service errors to HTTP responses
      if (errorMessage === "HOUSEHOLD_NOT_FOUND") {
        return createErrorResponse("HOUSEHOLD_NOT_FOUND", "No household found for the authenticated user", 404);
      }

      if (errorMessage === "BUDGET_ALREADY_EXISTS") {
        return createErrorResponse("BUDGET_ALREADY_EXISTS", "A budget for this month already exists", 409);
      }

      if (errorMessage === "INVALID_MEMBER") {
        return createErrorResponse("INVALID_MEMBER", "One or more household members are invalid or inactive", 400);
      }

      if (errorMessage === "INVALID_CATEGORY") {
        return createErrorResponse("INVALID_CATEGORY", "One or more categories are invalid for this household", 400);
      }

      if (errorMessage === "BUDGET_CREATE_FAILED") {
        console.error("Database error while creating budget:", serviceError);
        return createErrorResponse("BUDGET_CREATE_FAILED", "Failed to create budget", 500);
      }

      // Unexpected service error
      console.error("Unexpected service error:", serviceError);
      return createErrorResponse("BUDGET_CREATE_FAILED", "An unexpected error occurred while creating budget", 500);
    }
  } catch (error) {
    // Catch-all for unexpected errors
    console.error("Unexpected error in POST /api/budgets:", error);
    return createErrorResponse("BUDGET_CREATE_FAILED", "An internal server error occurred", 500);
  }
};
