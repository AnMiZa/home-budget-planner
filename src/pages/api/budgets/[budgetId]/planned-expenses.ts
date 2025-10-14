import type { APIRoute } from "astro";
import { z } from "zod";
import { createBudgetsService } from "../../../../lib/services/budgets.service";
import type { ApiErrorDto, PlannedExpensesListResponseDto, UpsertPlannedExpensesCommand } from "../../../../types";

export const prerender = false;

// Validation schema for path parameters
const paramsSchema = z.object({
  budgetId: z.string().uuid("Budget ID must be a valid UUID"),
});

// Validation schema for PUT request body
const upsertPlannedExpensesSchema = z.object({
  plannedExpenses: z
    .array(
      z.object({
        categoryId: z.string().uuid("Category ID must be a valid UUID"),
        limitAmount: z
          .number()
          .positive("Limit amount must be greater than 0")
          .max(9999999.99, "Limit amount cannot exceed 9,999,999.99")
          .refine(
            (val) => {
              // Check for maximum 2 decimal places
              const decimalPlaces = (val.toString().split('.')[1] || '').length;
              return decimalPlaces <= 2;
            },
            {
              message: "Limit amount can have at most 2 decimal places",
            }
          ),
      })
    )
    .refine(
      (expenses) => {
        // Check for duplicate category IDs
        const categoryIds = expenses.map((expense) => expense.categoryId);
        const uniqueCategoryIds = new Set(categoryIds);
        return categoryIds.length === uniqueCategoryIds.size;
      },
      {
        message: "Duplicate category IDs are not allowed",
      }
    ),
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
 * Creates a successful API response for budget planned expenses list.
 */
function createSuccessResponse(data: PlannedExpensesListResponseDto, resultCode = "PLANNED_EXPENSES_LISTED"): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Result-Code": resultCode,
    },
  });
}

/**
 * Parses and validates JSON request body.
 */
async function parseRequestBody(request: Request): Promise<UpsertPlannedExpensesCommand> {
  let body;
  try {
    body = await request.json();
  } catch (error) {
    throw new Error("INVALID_JSON");
  }

  const result = upsertPlannedExpensesSchema.safeParse(body);
  if (!result.success) {
    const firstError = result.error.errors[0];
    
    // Check for specific validation errors
    if (firstError?.message === "Duplicate category IDs are not allowed") {
      throw new Error("DUPLICATE_CATEGORY");
    }
    if (firstError?.message?.includes("Limit amount")) {
      throw new Error("INVALID_LIMIT");
    }
    
    throw new Error("INVALID_PAYLOAD");
  }

  return result.data;
}

/**
 * GET /api/budgets/{budgetId}/planned-expenses
 *
 * Retrieves the list of planned expenses associated with a specific budget for the currently authenticated user's household.
 * Returns planned expense data including category ID, limit amount, and timestamps.
 *
 * Path Parameters:
 * - budgetId (string, required): UUID of the budget to retrieve planned expenses for
 *
 * Responses:
 * - 200: Planned expenses list retrieved successfully with X-Result-Code: PLANNED_EXPENSES_LISTED
 * - 400: Invalid budget ID (INVALID_BUDGET_ID)
 * - 401: User not authenticated (UNAUTHENTICATED)
 * - 404: Budget not found for user's household (BUDGET_NOT_FOUND)
 * - 500: Internal server error (PLANNED_EXPENSES_LIST_FAILED)
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
      return createErrorResponse("PLANNED_EXPENSES_LIST_FAILED", "Database connection not available", 500);
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

    // Create budgets service and fetch budget planned expenses
    const budgetsService = createBudgetsService(supabase);

    try {
      const result = await budgetsService.listBudgetPlannedExpenses(user.id, budgetId);

      console.log(`Budget planned expenses fetched successfully for user ${user.id}: budget ${budgetId}`);
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

      if (errorMessage === "PLANNED_EXPENSES_LIST_FAILED") {
        console.error("Database error while fetching budget planned expenses:", serviceError);
        return createErrorResponse("PLANNED_EXPENSES_LIST_FAILED", "Failed to retrieve budget planned expenses", 500);
      }

      // Unexpected service error
      console.error("Unexpected service error:", serviceError);
      return createErrorResponse(
        "PLANNED_EXPENSES_LIST_FAILED",
        "An unexpected error occurred while fetching budget planned expenses",
        500
      );
    }
  } catch (error) {
    // Catch-all for unexpected errors
    console.error("Unexpected error in GET /api/budgets/[budgetId]/planned-expenses:", error);
    return createErrorResponse("PLANNED_EXPENSES_LIST_FAILED", "An internal server error occurred", 500);
  }
};

/**
 * PUT /api/budgets/{budgetId}/planned-expenses
 *
 * Replaces the complete set of planned expenses for a specific budget belonging to the authenticated user's household.
 * This endpoint performs a full replacement - removes existing planned expenses and inserts the provided ones.
 *
 * Path Parameters:
 * - budgetId (string, required): UUID of the budget to update planned expenses for
 *
 * Request Body:
 * - plannedExpenses (array, required): Array of planned expense objects
 *   - categoryId (string, required): UUID of the category
 *   - limitAmount (number, required): Positive amount with max 2 decimal places, max 9,999,999.99
 *
 * Responses:
 * - 200: Planned expenses updated successfully with X-Result-Code: PLANNED_EXPENSES_UPSERTED
 * - 400: Invalid request data (INVALID_PAYLOAD, INVALID_LIMIT, DUPLICATE_CATEGORY, INVALID_CATEGORY)
 * - 401: User not authenticated (UNAUTHENTICATED)
 * - 404: Budget or household not found (BUDGET_NOT_FOUND, HOUSEHOLD_NOT_FOUND)
 * - 500: Internal server error (PLANNED_EXPENSES_UPSERT_FAILED)
 */
export const PUT: APIRoute = async ({ params, request, locals }) => {
  try {
    // Validate path parameters
    const paramsResult = paramsSchema.safeParse(params);
    if (!paramsResult.success) {
      console.warn("Budget ID validation failed:", paramsResult.error);
      const firstError = paramsResult.error.errors[0];
      return createErrorResponse("INVALID_PAYLOAD", firstError?.message || "Invalid budget ID format", 400);
    }

    const { budgetId } = paramsResult.data;

    // Parse and validate request body
    let command: UpsertPlannedExpensesCommand;
    try {
      command = await parseRequestBody(request);
    } catch (parseError) {
      const errorMessage = parseError instanceof Error ? parseError.message : "Unknown error";
      
      if (errorMessage === "INVALID_JSON") {
        return createErrorResponse("INVALID_PAYLOAD", "Invalid JSON format in request body", 400);
      }
      if (errorMessage === "DUPLICATE_CATEGORY") {
        return createErrorResponse("DUPLICATE_CATEGORY", "Duplicate category IDs are not allowed", 400);
      }
      if (errorMessage === "INVALID_LIMIT") {
        return createErrorResponse("INVALID_LIMIT", "Invalid limit amount format or value", 400);
      }
      
      console.warn("Request body validation failed:", parseError);
      return createErrorResponse("INVALID_PAYLOAD", "Invalid request body format", 400);
    }

    // Get Supabase client from locals
    const supabase = locals.supabase;
    if (!supabase) {
      console.error("Supabase client not available in locals");
      return createErrorResponse("PLANNED_EXPENSES_UPSERT_FAILED", "Database connection not available", 500);
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

    // Create budgets service and replace planned expenses
    const budgetsService = createBudgetsService(supabase);

    try {
      const result = await budgetsService.replaceBudgetPlannedExpenses(user.id, budgetId, command);

      console.log(`Budget planned expenses replaced successfully for user ${user.id}: budget ${budgetId}, ${command.plannedExpenses.length} expenses`);
      return createSuccessResponse(result, "PLANNED_EXPENSES_UPSERTED");
    } catch (serviceError) {
      const errorMessage = serviceError instanceof Error ? serviceError.message : "Unknown error";

      // Map service errors to HTTP responses
      if (errorMessage === "HOUSEHOLD_NOT_FOUND") {
        return createErrorResponse("HOUSEHOLD_NOT_FOUND", "No household found for the authenticated user", 404);
      }

      if (errorMessage === "BUDGET_NOT_FOUND") {
        return createErrorResponse("BUDGET_NOT_FOUND", "Budget not found or not accessible", 404);
      }

      if (errorMessage === "INVALID_CATEGORY") {
        return createErrorResponse("INVALID_CATEGORY", "One or more category IDs are invalid or not accessible", 400);
      }

      if (errorMessage === "DUPLICATE_CATEGORY") {
        return createErrorResponse("DUPLICATE_CATEGORY", "Duplicate category detected in database operation", 400);
      }

      if (errorMessage === "INVALID_LIMIT") {
        return createErrorResponse("INVALID_LIMIT", "Invalid limit amount detected during database operation", 400);
      }

      if (errorMessage === "PLANNED_EXPENSES_UPSERT_FAILED") {
        console.error("Database error while replacing budget planned expenses:", serviceError);
        return createErrorResponse("PLANNED_EXPENSES_UPSERT_FAILED", "Failed to update budget planned expenses", 500);
      }

      // Unexpected service error
      console.error("Unexpected service error:", serviceError);
      return createErrorResponse(
        "PLANNED_EXPENSES_UPSERT_FAILED",
        "An unexpected error occurred while updating budget planned expenses",
        500
      );
    }
  } catch (error) {
    // Catch-all for unexpected errors
    console.error("Unexpected error in PUT /api/budgets/[budgetId]/planned-expenses:", error);
    return createErrorResponse("PLANNED_EXPENSES_UPSERT_FAILED", "An internal server error occurred", 500);
  }
};
