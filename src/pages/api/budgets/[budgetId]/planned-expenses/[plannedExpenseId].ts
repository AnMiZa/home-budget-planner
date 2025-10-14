import type { APIRoute } from "astro";
import { z } from "zod";
import { createBudgetsService } from "../../../../../lib/services/budgets.service";
import type { ApiErrorDto, BudgetPlannedExpenseDto, UpdatePlannedExpenseCommand } from "../../../../../types";

export const prerender = false;

// Validation schema for path parameters
const paramsSchema = z.object({
  budgetId: z.string().uuid("Budget ID must be a valid UUID"),
  plannedExpenseId: z.string().uuid("Planned expense ID must be a valid UUID"),
});

// Validation schema for PATCH request body
const updatePlannedExpenseSchema = z.object({
  limitAmount: z
    .number()
    .positive("Limit amount must be greater than 0")
    .max(9999999.99, "Limit amount cannot exceed 9,999,999.99")
    .refine(
      (val) => {
        // Check for maximum 2 decimal places
        const decimalPlaces = (val.toString().split(".")[1] || "").length;
        return decimalPlaces <= 2;
      },
      {
        message: "Limit amount can have at most 2 decimal places",
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
 * Creates a successful API response for updated planned expense.
 */
function createSuccessResponse(data: BudgetPlannedExpenseDto): Response {
  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Result-Code": "PLANNED_EXPENSE_UPDATED",
    },
  });
}

/**
 * Parses and validates JSON request body.
 */
async function parseRequestBody(request: Request): Promise<UpdatePlannedExpenseCommand> {
  let body;
  try {
    body = await request.json();
  } catch {
    throw new Error("INVALID_JSON");
  }

  const result = updatePlannedExpenseSchema.safeParse(body);
  if (!result.success) {
    const firstError = result.error.errors[0];
    console.warn("Request body validation failed:", firstError);

    // Check for specific validation errors
    if (firstError?.message?.includes("Limit amount")) {
      throw new Error("INVALID_PAYLOAD");
    }

    throw new Error("INVALID_PAYLOAD");
  }

  return result.data;
}

/**
 * PATCH /api/budgets/{budgetId}/planned-expenses/{plannedExpenseId}
 *
 * Updates a single planned expense limit amount for a specific budget belonging to the authenticated user's household.
 * Validates ownership of both the budget and planned expense before performing the update.
 *
 * Path Parameters:
 * - budgetId (string, required): UUID of the budget containing the planned expense
 * - plannedExpenseId (string, required): UUID of the planned expense to update
 *
 * Request Body:
 * - limitAmount (number, required): New limit amount (positive, max 2 decimal places, max 9,999,999.99)
 *
 * Responses:
 * - 200: Planned expense updated successfully with X-Result-Code: PLANNED_EXPENSE_UPDATED
 * - 400: Invalid request data (INVALID_BUDGET_ID, INVALID_PLANNED_EXPENSE_ID, INVALID_PAYLOAD)
 * - 401: User not authenticated (UNAUTHENTICATED)
 * - 404: Budget or planned expense not found (PLANNED_EXPENSE_NOT_FOUND)
 * - 500: Internal server error (PLANNED_EXPENSE_UPDATE_FAILED)
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  try {
    // Validate path parameters
    const paramsResult = paramsSchema.safeParse(params);
    if (!paramsResult.success) {
      const firstError = paramsResult.error.errors[0];
      console.warn("Path parameters validation failed:", firstError);

      // Determine which parameter failed
      if (firstError?.path?.[0] === "budgetId") {
        return createErrorResponse("INVALID_BUDGET_ID", firstError?.message || "Invalid budget ID format", 400);
      }
      if (firstError?.path?.[0] === "plannedExpenseId") {
        return createErrorResponse(
          "INVALID_PLANNED_EXPENSE_ID",
          firstError?.message || "Invalid planned expense ID format",
          400
        );
      }

      return createErrorResponse("INVALID_PAYLOAD", "Invalid path parameters", 400);
    }

    const { budgetId, plannedExpenseId } = paramsResult.data;

    // Parse and validate request body
    let command: UpdatePlannedExpenseCommand;
    try {
      command = await parseRequestBody(request);
    } catch (parseError) {
      const errorMessage = parseError instanceof Error ? parseError.message : "Unknown error";

      if (errorMessage === "INVALID_JSON") {
        return createErrorResponse("INVALID_PAYLOAD", "Invalid JSON format in request body", 400);
      }

      console.warn("Request body validation failed:", parseError);
      return createErrorResponse("INVALID_PAYLOAD", "Invalid request body format", 400);
    }

    // Get Supabase client from locals
    const supabase = locals.supabase;
    if (!supabase) {
      console.error("Supabase client not available in locals");
      return createErrorResponse("PLANNED_EXPENSE_UPDATE_FAILED", "Database connection not available", 500);
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

    // Create budgets service and update planned expense
    const budgetsService = createBudgetsService(supabase);

    try {
      const result = await budgetsService.updateBudgetPlannedExpense(user.id, budgetId, plannedExpenseId, command);

      console.log(
        `Planned expense updated successfully for user ${user.id}: budget ${budgetId}, expense ${plannedExpenseId}, new amount ${command.limitAmount}`
      );
      return createSuccessResponse(result);
    } catch (serviceError) {
      const errorMessage = serviceError instanceof Error ? serviceError.message : "Unknown error";

      // Map service errors to HTTP responses
      if (errorMessage === "HOUSEHOLD_NOT_FOUND") {
        return createErrorResponse("PLANNED_EXPENSE_NOT_FOUND", "No household found for the authenticated user", 404);
      }

      if (errorMessage === "BUDGET_NOT_FOUND") {
        return createErrorResponse("PLANNED_EXPENSE_NOT_FOUND", "Budget not found or not accessible", 404);
      }

      if (errorMessage === "PLANNED_EXPENSE_NOT_FOUND") {
        return createErrorResponse("PLANNED_EXPENSE_NOT_FOUND", "Planned expense not found or not accessible", 404);
      }

      if (errorMessage === "INVALID_PAYLOAD") {
        return createErrorResponse("INVALID_PAYLOAD", "Invalid limit amount detected during database operation", 400);
      }

      if (errorMessage === "PLANNED_EXPENSE_UPDATE_FAILED") {
        console.error("Database error while updating planned expense:", serviceError);
        return createErrorResponse("PLANNED_EXPENSE_UPDATE_FAILED", "Failed to update planned expense", 500);
      }

      // Unexpected service error
      console.error("Unexpected service error:", serviceError);
      return createErrorResponse(
        "PLANNED_EXPENSE_UPDATE_FAILED",
        "An unexpected error occurred while updating planned expense",
        500
      );
    }
  } catch (error) {
    // Catch-all for unexpected errors
    console.error("Unexpected error in PATCH /api/budgets/[budgetId]/planned-expenses/[plannedExpenseId]:", error);
    return createErrorResponse("PLANNED_EXPENSE_UPDATE_FAILED", "An internal server error occurred", 500);
  }
};
