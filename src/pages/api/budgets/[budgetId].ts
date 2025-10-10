import type { APIRoute } from "astro";
import { z } from "zod";
import { createBudgetsService } from "../../../lib/services/budgets.service";
import type { ApiErrorDto, BudgetDetailDto } from "../../../types";

export const prerender = false;

// Validation schema for path parameters
const paramsSchema = z.object({
  budgetId: z.string().uuid("Budget ID must be a valid UUID"),
});

// Validation schema for query parameters
const querySchema = z.object({
  includeTransactions: z
    .string()
    .optional()
    .default("false")
    .transform((val) => val === "true"),
  includeInactiveMembers: z
    .string()
    .optional()
    .default("false")
    .transform((val) => val === "true"),
});

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
 * Creates a successful API response for budget detail.
 */
function createSuccessResponse(data: BudgetDetailDto): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Result-Code": "BUDGET_FETCHED",
    },
  });
}

/**
 * GET /api/budgets/{budgetId}
 *
 * Retrieves detailed information about a specific budget for the currently authenticated user's household.
 * Returns budget data including incomes, planned expenses, and financial summary with optional transaction aggregation.
 *
 * Path Parameters:
 * - budgetId (string, required): UUID of the budget to retrieve
 *
 * Query Parameters:
 * - includeTransactions (boolean, optional): Include transaction-based spending summaries per category (default: false)
 * - includeInactiveMembers (boolean, optional): Include incomes from inactive household members (default: false)
 *
 * Responses:
 * - 200: Budget detail retrieved successfully with X-Result-Code: BUDGET_FETCHED
 * - 400: Invalid budget ID or query parameters (INVALID_BUDGET_ID, INVALID_QUERY_PARAMS)
 * - 401: User not authenticated (UNAUTHENTICATED)
 * - 404: Budget not found for user's household (BUDGET_NOT_FOUND)
 * - 500: Internal server error (BUDGET_FETCH_FAILED)
 */
export const GET: APIRoute = async ({ params, request, locals }) => {
  try {
    // Validate path parameters
    const paramsResult = paramsSchema.safeParse(params);
    if (!paramsResult.success) {
      console.warn("Budget ID validation failed:", paramsResult.error);
      const firstError = paramsResult.error.errors[0];
      return createErrorResponse(
        "INVALID_BUDGET_ID",
        firstError?.message || "Invalid budget ID format",
        400
      );
    }

    const { budgetId } = paramsResult.data;

    // Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);

    const queryResult = querySchema.safeParse(queryParams);
    if (!queryResult.success) {
      console.warn("Query parameter validation failed:", queryResult.error);
      const firstError = queryResult.error.errors[0];
      return createErrorResponse(
        "INVALID_QUERY_PARAMS",
        firstError?.message || "Invalid query parameters provided",
        400
      );
    }

    const { includeTransactions, includeInactiveMembers } = queryResult.data;

    // Get Supabase client from locals
    const supabase = locals.supabase;
    if (!supabase) {
      console.error("Supabase client not available in locals");
      return createErrorResponse("BUDGET_FETCH_FAILED", "Database connection not available", 500);
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

    // Create budgets service and fetch budget detail
    const budgetsService = createBudgetsService(supabase);

    try {
      const result = await budgetsService.getBudgetDetail(user.id, budgetId, {
        includeTransactions,
        includeInactiveMembers,
      });

      console.log(`Budget detail fetched successfully for user ${user.id}: budget ${budgetId}`);
      return createSuccessResponse(result);
    } catch (serviceError) {
      const errorMessage = serviceError instanceof Error ? serviceError.message : "Unknown error";

      // Map service errors to HTTP responses
      if (errorMessage === "HOUSEHOLD_NOT_FOUND") {
        return createErrorResponse("BUDGET_NOT_FOUND", "No household found for the authenticated user", 404);
      }

      if (errorMessage === "BUDGET_NOT_FOUND") {
        return createErrorResponse("BUDGET_NOT_FOUND", "Budget not found or not accessible", 404);
      }

      if (errorMessage === "BUDGET_FETCH_FAILED") {
        console.error("Database error while fetching budget detail:", serviceError);
        return createErrorResponse("BUDGET_FETCH_FAILED", "Failed to retrieve budget detail", 500);
      }

      // Unexpected service error
      console.error("Unexpected service error:", serviceError);
      return createErrorResponse("BUDGET_FETCH_FAILED", "An unexpected error occurred while fetching budget detail", 500);
    }
  } catch (error) {
    // Catch-all for unexpected errors
    console.error("Unexpected error in GET /api/budgets/[budgetId]:", error);
    return createErrorResponse("BUDGET_FETCH_FAILED", "An internal server error occurred", 500);
  }
};
