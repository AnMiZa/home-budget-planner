import type { APIRoute } from "astro";
import { z } from "zod";
import { createBudgetsService } from "../../lib/services/budgets.service";
import type { ApiErrorDto, BudgetsListResponseDto } from "../../types";

export const prerender = false;

// Validation schema for query parameters
const querySchema = z.object({
  month: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}(-\d{2})?$/, "Month must be in YYYY-MM or YYYY-MM-DD format")
    .optional(),
  status: z.enum(["current", "past", "upcoming", "all"]).default("current"),
  includeSummary: z
    .string()
    .optional()
    .default("false")
    .transform((val) => val === "true"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(12),
  sort: z.enum(["month_desc", "month_asc"]).default("month_desc"),
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
