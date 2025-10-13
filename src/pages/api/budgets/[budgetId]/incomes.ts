import type { APIRoute } from "astro";
import { z } from "zod";
import { createBudgetsService } from "../../../../lib/services/budgets.service";
import type { ApiErrorDto, BudgetIncomesListResponseDto, UpsertBudgetIncomesCommand } from "../../../../types";

export const prerender = false;

// Validation schema for path parameters
const paramsSchema = z.object({
  budgetId: z.string().uuid("Budget ID must be a valid UUID"),
});

// Validation schema for PUT request body
const putBodySchema = z.object({
  incomes: z
    .array(
      z.object({
        householdMemberId: z.string().uuid("Household member ID must be a valid UUID"),
        amount: z
          .number()
          .positive("Amount must be greater than 0")
          .max(9_999_999.99, "Amount cannot exceed 9,999,999.99")
          .refine(
            (val) => {
              // Check for NaN and Infinity
              if (!Number.isFinite(val)) return false;
              // Check decimal places (max 2)
              const decimalPlaces = (val.toString().split(".")[1] || "").length;
              return decimalPlaces <= 2;
            },
            { message: "Amount must have at most 2 decimal places and be a valid number" }
          ),
      })
    )
    .max(100, "Cannot process more than 100 incomes at once")
    .refine(
      (incomes) => {
        // Check for duplicate householdMemberId values
        const memberIds = incomes.map((income) => income.householdMemberId);
        const uniqueMemberIds = new Set(memberIds);
        return memberIds.length === uniqueMemberIds.size;
      },
      { message: "Duplicate household member IDs are not allowed" }
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
 * Creates a successful API response for budget incomes list.
 */
function createSuccessResponse(data: BudgetIncomesListResponseDto, resultCode = "INCOMES_LISTED"): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Result-Code": resultCode,
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

/**
 * PUT /api/budgets/{budgetId}/incomes
 *
 * Replaces the complete set of incomes for a specific budget for the currently authenticated user's household.
 * This endpoint performs a full replacement - it removes existing incomes not in the provided list and
 * inserts/updates the provided incomes.
 *
 * Path Parameters:
 * - budgetId (string, required): UUID of the budget to update incomes for
 *
 * Request Body:
 * - incomes (array, required): Array of income objects with householdMemberId and amount
 *
 * Responses:
 * - 200: Incomes updated successfully with X-Result-Code: INCOMES_UPSERTED
 * - 400: Invalid budget ID, payload, or business rule violation
 * - 401: User not authenticated (UNAUTHENTICATED)
 * - 404: Budget not found for user's household (BUDGET_NOT_FOUND)
 * - 500: Internal server error (INCOMES_UPSERT_FAILED)
 */
export const PUT: APIRoute = async ({ params, request, locals }) => {
  try {
    // Validate path parameters
    const paramsResult = paramsSchema.safeParse(params);
    if (!paramsResult.success) {
      console.warn("Budget ID validation failed:", paramsResult.error);
      const firstError = paramsResult.error.errors[0];
      return createErrorResponse("INVALID_BUDGET_ID", firstError?.message || "Invalid budget ID format", 400);
    }

    const { budgetId } = paramsResult.data;

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (parseError) {
      console.warn("Failed to parse request body:", parseError);
      return createErrorResponse("INVALID_PAYLOAD", "Invalid JSON in request body", 400);
    }

    const bodyResult = putBodySchema.safeParse(requestBody);
    if (!bodyResult.success) {
      console.warn("Request body validation failed:", bodyResult.error);
      const firstError = bodyResult.error.errors[0];

      // Map specific validation errors to appropriate codes
      if (firstError?.message.includes("Duplicate household member IDs")) {
        return createErrorResponse("DUPLICATE_MEMBER", firstError.message, 400);
      }
      if (firstError?.message.includes("Amount")) {
        return createErrorResponse("INVALID_AMOUNT", firstError.message, 400);
      }

      return createErrorResponse("INVALID_PAYLOAD", firstError?.message || "Invalid request payload", 400);
    }

    const command: UpsertBudgetIncomesCommand = bodyResult.data;

    // Get Supabase client from locals
    const supabase = locals.supabase;
    if (!supabase) {
      console.error("Supabase client not available in locals");
      return createErrorResponse("INCOMES_UPSERT_FAILED", "Database connection not available", 500);
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

    // Create budgets service and replace budget incomes
    const budgetsService = createBudgetsService(supabase);

    try {
      const result = await budgetsService.replaceBudgetIncomes(user.id, budgetId, command);

      console.log(`Budget incomes replaced successfully for user ${user.id}: budget ${budgetId}`);
      return createSuccessResponse(result, "INCOMES_UPSERTED");
    } catch (serviceError) {
      const errorMessage = serviceError instanceof Error ? serviceError.message : "Unknown error";

      // Map service errors to HTTP responses
      if (errorMessage === "HOUSEHOLD_NOT_FOUND") {
        return createErrorResponse("BUDGET_NOT_FOUND", "No household found for the authenticated user", 404);
      }

      if (errorMessage === "BUDGET_NOT_FOUND") {
        return createErrorResponse("BUDGET_NOT_FOUND", "Budget not found or not accessible", 404);
      }

      if (errorMessage === "INVALID_MEMBER") {
        return createErrorResponse("INVALID_MEMBER", "One or more household members are invalid or inactive", 400);
      }

      if (errorMessage === "DUPLICATE_MEMBER") {
        return createErrorResponse("DUPLICATE_MEMBER", "Duplicate household member detected", 400);
      }

      if (errorMessage === "INCOMES_UPSERT_FAILED") {
        console.error("Database error while upserting budget incomes:", serviceError);
        return createErrorResponse("INCOMES_UPSERT_FAILED", "Failed to update budget incomes", 500);
      }

      // Unexpected service error
      console.error("Unexpected service error:", serviceError);
      return createErrorResponse(
        "INCOMES_UPSERT_FAILED",
        "An unexpected error occurred while updating budget incomes",
        500
      );
    }
  } catch (error) {
    // Catch-all for unexpected errors
    console.error("Unexpected error in PUT /api/budgets/[budgetId]/incomes:", error);
    return createErrorResponse("INCOMES_UPSERT_FAILED", "An internal server error occurred", 500);
  }
};
