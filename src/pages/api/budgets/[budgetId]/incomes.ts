import type { APIRoute } from "astro";
import { z } from "zod";
import { createBudgetsService } from "../../../../lib/services/budgets.service";
import type { ApiErrorDto, BudgetIncomesListResponseDto } from "../../../../types";

export const prerender = false;

// Validation schema for path parameters
const paramsSchema = z.object({
  budgetId: z.string().uuid("Budget ID must be a valid UUID"),
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
 * Creates a successful API response for budget incomes list.
 */
function createSuccessResponse(data: BudgetIncomesListResponseDto): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Result-Code": "INCOMES_LISTED",
    },
  });
}

/**
 * GET /api/budgets/{budgetId}/incomes
 *
 * Retrieves the list of incomes associated with a specific budget for the currently authenticated user's household.
 * Returns income data including household member ID, amount, and timestamps.
 *
 * Path Parameters:
 * - budgetId (string, required): UUID of the budget to retrieve incomes for
 *
 * Responses:
 * - 200: Incomes list retrieved successfully with X-Result-Code: INCOMES_LISTED
 * - 400: Invalid budget ID (INVALID_BUDGET_ID)
 * - 401: User not authenticated (UNAUTHENTICATED)
 * - 404: Budget not found for user's household (BUDGET_NOT_FOUND)
 * - 500: Internal server error (INCOMES_LIST_FAILED)
 */
export const GET: APIRoute = async ({ params, locals }) => {
  try {
    // Validate path parameters
    const paramsResult = paramsSchema.safeParse(params);
    if (!paramsResult.success) {
      console.warn("Budget ID validation failed:", paramsResult.error);
      const firstError = paramsResult.error.errors[0];
      return createErrorResponse("INVALID_BUDGET_ID", firstError?.message || "Invalid budget ID format", 400);
    }

    const { budgetId } = paramsResult.data;

    // Get Supabase client from locals
    const supabase = locals.supabase;
    if (!supabase) {
      console.error("Supabase client not available in locals");
      return createErrorResponse("INCOMES_LIST_FAILED", "Database connection not available", 500);
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

    // Create budgets service and fetch budget incomes
    const budgetsService = createBudgetsService(supabase);

    try {
      const result = await budgetsService.listBudgetIncomes(user.id, budgetId);

      console.log(`Budget incomes fetched successfully for user ${user.id}: budget ${budgetId}`);
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

      if (errorMessage === "INCOMES_LIST_FAILED") {
        console.error("Database error while fetching budget incomes:", serviceError);
        return createErrorResponse("INCOMES_LIST_FAILED", "Failed to retrieve budget incomes", 500);
      }

      // Unexpected service error
      console.error("Unexpected service error:", serviceError);
      return createErrorResponse(
        "INCOMES_LIST_FAILED",
        "An unexpected error occurred while fetching budget incomes",
        500
      );
    }
  } catch (error) {
    // Catch-all for unexpected errors
    console.error("Unexpected error in GET /api/budgets/[budgetId]/incomes:", error);
    return createErrorResponse("INCOMES_LIST_FAILED", "An internal server error occurred", 500);
  }
};
