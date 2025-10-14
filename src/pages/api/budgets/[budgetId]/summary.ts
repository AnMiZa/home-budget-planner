import type { APIRoute } from "astro";
import type { BudgetSummaryResponseDto, ApiErrorDto } from "../../../../types";
import { createBudgetsService } from "../../../../lib/services/budgets.service";
import { parseGetBudgetSummaryParams, parseGetBudgetSummaryQuery } from "../../../../lib/validation/budgets";

export const prerender = false;

/**
 * Creates a successful response for budget summary.
 *
 * @param data - Budget summary response data
 * @returns Response with budget summary and success headers
 */
function createSuccessResponse(data: BudgetSummaryResponseDto): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Result-Code": "BUDGET_SUMMARY",
    },
  });
}

/**
 * Creates an error response with standardized format.
 *
 * @param code - Error code for the response
 * @param message - Human-readable error message
 * @param status - HTTP status code
 * @returns Response with error details
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
 * GET /api/budgets/{budgetId}/summary
 *
 * Retrieves historical summary for a specific budget belonging to the authenticated user's household.
 * Provides financial overview and optionally category breakdown compatible with dashboard current endpoint.
 *
 * Path Parameters:
 * - budgetId: UUID of the budget to retrieve summary for
 *
 * Query Parameters:
 * - includeCategories: boolean (default: true) - Whether to include per-category breakdown
 *   Accepts: true/false, 1/0
 *
 * Responses:
 * - 200: Budget summary retrieved successfully with X-Result-Code: BUDGET_SUMMARY
 * - 400: Invalid request parameters (INVALID_REQUEST)
 * - 401: User not authenticated (UNAUTHENTICATED)
 * - 404: Budget not found or doesn't belong to user's household (BUDGET_NOT_FOUND)
 * - 500: Internal server error (SUPABASE_CLIENT_UNAVAILABLE, BUDGET_SUMMARY_FETCH_FAILED, INTERNAL_SERVER_ERROR)
 */
export const GET: APIRoute = async ({ params, url, locals }) => {
  try {
    // Get Supabase client from locals
    const supabase = locals.supabase;
    if (!supabase) {
      console.error("Supabase client not available in locals");
      return createErrorResponse("SUPABASE_CLIENT_UNAVAILABLE", "Database connection not available", 500);
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

    // Validate path parameters
    let validatedParams;
    try {
      validatedParams = parseGetBudgetSummaryParams(params);
    } catch (validationError) {
      const errorMessage = validationError instanceof Error ? validationError.message : "Invalid parameters";
      console.log(`Invalid path parameters for user ${user.id}: ${errorMessage}`);
      return createErrorResponse("INVALID_REQUEST", errorMessage.replace("INVALID_REQUEST: ", ""), 400);
    }

    // Validate query parameters
    let validatedQuery;
    try {
      const queryParams = Object.fromEntries(url.searchParams.entries());
      validatedQuery = parseGetBudgetSummaryQuery(queryParams);
    } catch (validationError) {
      const errorMessage = validationError instanceof Error ? validationError.message : "Invalid query parameters";
      console.log(`Invalid query parameters for user ${user.id}: ${errorMessage}`);
      return createErrorResponse("INVALID_REQUEST", errorMessage.replace("INVALID_REQUEST: ", ""), 400);
    }

    // Create budgets service and fetch budget summary
    const budgetsService = createBudgetsService(supabase);

    try {
      const budgetSummary = await budgetsService.getBudgetSummary(user.id, validatedParams.budgetId, {
        includeCategories: validatedQuery.includeCategories,
      });

      console.log(
        `Budget summary retrieved successfully for user ${user.id}: budget ${budgetSummary.budgetId} (${budgetSummary.month}), includeCategories: ${validatedQuery.includeCategories}`
      );
      return createSuccessResponse(budgetSummary);
    } catch (serviceError) {
      const errorMessage = serviceError instanceof Error ? serviceError.message : "Unknown error";

      // Map service errors to appropriate HTTP responses
      switch (errorMessage) {
        case "BUDGET_NOT_FOUND":
          console.log(`Budget not found for user ${user.id}, budgetId: ${validatedParams.budgetId}`);
          return createErrorResponse("BUDGET_NOT_FOUND", "Budget not found or access denied", 404);

        case "BUDGET_SUMMARY_FETCH_FAILED":
          console.error(
            `Budget summary fetch failed for user ${user.id}, budgetId: ${validatedParams.budgetId}:`,
            serviceError
          );
          return createErrorResponse("BUDGET_SUMMARY_FETCH_FAILED", "Failed to retrieve budget summary", 500);

        default:
          console.error(
            `Unexpected error during budget summary retrieval for user ${user.id}, budgetId: ${validatedParams.budgetId}:`,
            serviceError
          );
          return createErrorResponse("INTERNAL_SERVER_ERROR", "An internal server error occurred", 500);
      }
    }
  } catch (error) {
    console.error("Unexpected error in budget summary endpoint:", error);
    return createErrorResponse("INTERNAL_SERVER_ERROR", "An internal server error occurred", 500);
  }
};
