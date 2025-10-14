import type { APIRoute } from "astro";
import type { DashboardSummaryDto, ApiErrorDto } from "../../../types";
import { createBudgetsService } from "../../../lib/services/budgets.service";

export const prerender = false;

/**
 * Creates a successful response for dashboard summary.
 *
 * @param data - Dashboard summary data
 * @returns Response with dashboard summary and success headers
 */
function createSuccessResponse(data: DashboardSummaryDto): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Result-Code": "DASHBOARD_SUMMARY",
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
 * GET /api/dashboard/current
 *
 * Retrieves the current dashboard summary for the authenticated user's household.
 * Returns financial overview and category breakdown for the active budget (current month or latest previous).
 *
 * Query Parameters: None
 *
 * Responses:
 * - 200: Dashboard summary retrieved successfully with X-Result-Code: DASHBOARD_SUMMARY
 * - 401: User not authenticated (UNAUTHENTICATED)
 * - 404: No household or budget found (BUDGET_NOT_FOUND)
 * - 500: Internal server error (SUPABASE_CLIENT_UNAVAILABLE, DASHBOARD_FETCH_FAILED, INTERNAL_SERVER_ERROR)
 */
export const GET: APIRoute = async ({ locals }) => {
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

    // Create budgets service and fetch dashboard summary
    const budgetsService = createBudgetsService(supabase);

    try {
      const dashboardSummary = await budgetsService.getCurrentDashboardSummary(user.id);

      console.log(
        `Dashboard summary retrieved successfully for user ${user.id}: budget ${dashboardSummary.currentBudgetId} (${dashboardSummary.month})`
      );
      return createSuccessResponse(dashboardSummary);
    } catch (serviceError) {
      const errorMessage = serviceError instanceof Error ? serviceError.message : "Unknown error";

      // Map service errors to appropriate HTTP responses
      switch (errorMessage) {
        case "BUDGET_NOT_FOUND":
          console.log(`No budget found for user ${user.id}`);
          return createErrorResponse("BUDGET_NOT_FOUND", "No budget available for the current period", 404);

        case "DASHBOARD_FETCH_FAILED":
          console.error(`Dashboard fetch failed for user ${user.id}:`, serviceError);
          return createErrorResponse("DASHBOARD_FETCH_FAILED", "Failed to retrieve dashboard data", 500);

        default:
          console.error(`Unexpected error during dashboard summary retrieval for user ${user.id}:`, serviceError);
          return createErrorResponse("INTERNAL_SERVER_ERROR", "An internal server error occurred", 500);
      }
    }
  } catch (error) {
    console.error("Unexpected error in dashboard current endpoint:", error);
    return createErrorResponse("INTERNAL_SERVER_ERROR", "An internal server error occurred", 500);
  }
};
