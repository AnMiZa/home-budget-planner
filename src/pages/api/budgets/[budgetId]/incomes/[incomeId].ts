import type { APIRoute } from "astro";
import { z } from "zod";
import { createBudgetsService } from "../../../../../lib/services/budgets.service";
import type { ApiErrorDto, BudgetIncomeDto, UpdateBudgetIncomeCommand } from "../../../../../types";

export const prerender = false;

// Validation schema for path parameters
const paramsSchema = z.object({
  budgetId: z.string().uuid("Budget ID must be a valid UUID"),
  incomeId: z.string().uuid("Income ID must be a valid UUID"),
});

// Validation schema for request body
const updateIncomeBodySchema = z.object({
  amount: z
    .number()
    .positive("Amount must be a positive number")
    .max(9999999.99, "Amount cannot exceed 9,999,999.99")
    .refine(
      (val) => {
        // Check if the number has at most 2 decimal places
        const decimalPlaces = (val.toString().split('.')[1] || '').length;
        return decimalPlaces <= 2;
      },
      "Amount can have at most 2 decimal places"
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
 * Creates a successful API response for budget income update.
 */
function createSuccessResponse(data: BudgetIncomeDto): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Result-Code": "INCOME_UPDATED",
    },
  });
}

/**
 * PATCH /api/budgets/{budgetId}/incomes/{incomeId}
 *
 * Updates the amount of a single income associated with a budget in the authenticated user's household.
 * Provides resource ownership verification and data validation, returning the updated record on success.
 *
 * Path Parameters:
 * - budgetId (string, required): UUID of the budget containing the income
 * - incomeId (string, required): UUID of the income to update
 *
 * Request Body:
 * - amount (number, required): New income amount (positive number, max 2 decimal places, ≤ 9,999,999.99)
 *
 * Responses:
 * - 200: Income updated successfully with X-Result-Code: INCOME_UPDATED
 * - 400: Invalid budget ID, income ID, or payload (INVALID_BUDGET_ID, INVALID_INCOME_ID, INVALID_PAYLOAD)
 * - 401: User not authenticated (UNAUTHENTICATED)
 * - 404: Income not found (INCOME_NOT_FOUND)
 * - 500: Internal server error (INCOME_UPDATE_FAILED)
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  try {
    // Validate path parameters
    const paramsResult = paramsSchema.safeParse(params);
    if (!paramsResult.success) {
      console.warn("Path parameters validation failed:", paramsResult.error);
      const firstError = paramsResult.error.errors[0];
      
      if (firstError?.path.includes('budgetId')) {
        return createErrorResponse("INVALID_BUDGET_ID", firstError?.message || "Invalid budget ID format", 400);
      } else if (firstError?.path.includes('incomeId')) {
        return createErrorResponse("INVALID_INCOME_ID", firstError?.message || "Invalid income ID format", 400);
      }
      
      return createErrorResponse("INVALID_PAYLOAD", firstError?.message || "Invalid path parameters", 400);
    }

    const { budgetId, incomeId } = paramsResult.data;

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (error) {
      console.warn("Failed to parse request body:", error);
      return createErrorResponse("INVALID_PAYLOAD", "Invalid JSON in request body", 400);
    }

    const bodyResult = updateIncomeBodySchema.safeParse(requestBody);
    if (!bodyResult.success) {
      console.warn("Request body validation failed:", bodyResult.error);
      const firstError = bodyResult.error.errors[0];
      return createErrorResponse("INVALID_PAYLOAD", firstError?.message || "Invalid request payload", 400);
    }

    const { amount } = bodyResult.data;

    // Get Supabase client from locals
    const supabase = locals.supabase;
    if (!supabase) {
      console.error("Supabase client not available in locals");
      return createErrorResponse("INCOME_UPDATE_FAILED", "Database connection not available", 500);
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

    // Create budgets service and update budget income
    const budgetsService = createBudgetsService(supabase);

    try {
      const updateCommand: UpdateBudgetIncomeCommand = { amount };
      const result = await budgetsService.updateBudgetIncome(user.id, budgetId, incomeId, updateCommand);

      console.log(`Budget income updated successfully for user ${user.id}: budget ${budgetId}, income ${incomeId}`);
      return createSuccessResponse(result);
    } catch (serviceError) {
      const errorMessage = serviceError instanceof Error ? serviceError.message : "Unknown error";

      // Map service errors to HTTP responses
      if (errorMessage === "HOUSEHOLD_NOT_FOUND" || errorMessage === "BUDGET_NOT_FOUND" || errorMessage === "INCOME_NOT_FOUND") {
        return createErrorResponse("INCOME_NOT_FOUND", "Income not found or not accessible", 404);
      }

      if (errorMessage.includes("INVALID_") || errorMessage.includes("CHECK")) {
        return createErrorResponse("INVALID_PAYLOAD", "Invalid amount value", 400);
      }

      if (errorMessage === "INCOME_UPDATE_FAILED") {
        console.error("Database error while updating budget income:", serviceError);
        return createErrorResponse("INCOME_UPDATE_FAILED", "Failed to update budget income", 500);
      }

      // Unexpected service error
      console.error("Unexpected service error:", serviceError);
      return createErrorResponse(
        "INCOME_UPDATE_FAILED",
        "An unexpected error occurred while updating budget income",
        500
      );
    }
  } catch (error) {
    // Catch-all for unexpected errors
    console.error("Unexpected error in PATCH /api/budgets/[budgetId]/incomes/[incomeId]:", error);
    return createErrorResponse("INCOME_UPDATE_FAILED", "An internal server error occurred", 500);
  }
};
