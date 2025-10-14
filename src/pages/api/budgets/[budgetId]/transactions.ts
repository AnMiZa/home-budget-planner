import type { APIRoute } from "astro";
import { createBudgetsService } from "../../../../lib/services/budgets.service";
import { parseTransactionsQuery, parseCreateTransactionBody } from "../../../../lib/validation/transactions";
import type { ApiErrorDto, TransactionsListResponseDto, TransactionDto } from "../../../../types";

export const prerender = false;

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
 * Creates a successful API response for transactions list.
 */
function createSuccessResponse(data: TransactionsListResponseDto): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Result-Code": "TRANSACTIONS_LISTED",
    },
  });
}

/**
 * Creates a successful API response for transaction creation.
 */
function createTransactionCreatedResponse(data: TransactionDto): Response {
  return new Response(JSON.stringify(data), {
    status: 201,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Result-Code": "TRANSACTION_CREATED",
    },
  });
}

/**
 * GET /api/budgets/{budgetId}/transactions
 *
 * Lists transactions for a specific budget with filtering, pagination, and sorting.
 * Supports filtering by category, date range, and note search.
 */
export const GET: APIRoute = async ({ params, request, locals }) => {
  try {
    // Get Supabase client from locals
    const supabase = locals.supabase;
    if (!supabase) {
      return createErrorResponse("SUPABASE_CLIENT_UNAVAILABLE", "Database client not available", 500);
    }

    // Verify user authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return createErrorResponse("UNAUTHENTICATED", "Authentication required", 401);
    }

    // Parse and validate query parameters
    let queryParams;
    try {
      const url = new URL(request.url);
      queryParams = parseTransactionsQuery(params as { budgetId: string }, url.searchParams);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Invalid query parameters";

      if (errorMessage.startsWith("INVALID_QUERY_PARAMS:")) {
        const message = errorMessage.replace("INVALID_QUERY_PARAMS: ", "");
        return createErrorResponse("INVALID_QUERY_PARAMS", message, 400);
      }

      return createErrorResponse("INVALID_QUERY_PARAMS", "Invalid query parameters", 400);
    }

    // Create service and fetch transactions
    const budgetsService = createBudgetsService(supabase);

    const filters = {
      categoryId: queryParams.categoryId,
      fromDate: queryParams.fromDate,
      toDate: queryParams.toDate,
      searchNote: queryParams.searchNote,
      page: queryParams.page,
      pageSize: queryParams.pageSize,
      sort: queryParams.sort,
    };

    const result = await budgetsService.listBudgetTransactions(user.id, queryParams.budgetId, filters);

    return createSuccessResponse(result);
  } catch (error) {
    console.error("Error in GET /api/budgets/[budgetId]/transactions:", error);

    if (error instanceof Error) {
      switch (error.message) {
        case "HOUSEHOLD_NOT_FOUND":
          return createErrorResponse("HOUSEHOLD_NOT_FOUND", "Household not found for the authenticated user", 404);

        case "BUDGET_NOT_FOUND":
          return createErrorResponse("BUDGET_NOT_FOUND", "Budget not found or access denied", 404);

        case "TRANSACTIONS_LIST_FAILED":
          return createErrorResponse("TRANSACTIONS_LIST_FAILED", "Failed to retrieve transactions", 500);

        default:
          return createErrorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred", 500);
      }
    }

    return createErrorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred", 500);
  }
};

/**
 * POST /api/budgets/{budgetId}/transactions
 *
 * Creates a new transaction for a specific budget.
 * Validates the budget exists, category belongs to the household, and creates the transaction.
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    // Get Supabase client from locals
    const supabase = locals.supabase;
    if (!supabase) {
      return createErrorResponse("SUPABASE_CLIENT_UNAVAILABLE", "Database client not available", 500);
    }

    // Verify user authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return createErrorResponse("UNAUTHENTICATED", "Authentication required", 401);
    }

    // Validate budgetId parameter
    const budgetId = params?.budgetId;
    if (!budgetId || typeof budgetId !== "string") {
      return createErrorResponse("INVALID_BUDGET_ID", "Budget ID is required and must be a valid UUID", 400);
    }

    // Validate budgetId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(budgetId)) {
      return createErrorResponse("INVALID_BUDGET_ID", "Budget ID must be a valid UUID", 400);
    }

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch {
      return createErrorResponse("INVALID_BODY", "Request body must be valid JSON", 400);
    }

    let command;
    try {
      command = parseCreateTransactionBody(requestBody);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Invalid request body";

      // Extract error code and message from validation error
      if (errorMessage.includes(":")) {
        const [code, message] = errorMessage.split(": ", 2);
        return createErrorResponse(code, message, 400);
      }

      return createErrorResponse("INVALID_BODY", errorMessage, 400);
    }

    // Create service and create transaction
    const budgetsService = createBudgetsService(supabase);
    const result = await budgetsService.createBudgetTransaction(user.id, budgetId, command);

    return createTransactionCreatedResponse(result);
  } catch (error) {
    console.error("Error in POST /api/budgets/[budgetId]/transactions:", error);

    if (error instanceof Error) {
      switch (error.message) {
        case "HOUSEHOLD_NOT_FOUND":
          return createErrorResponse("HOUSEHOLD_NOT_FOUND", "Household not found for the authenticated user", 404);

        case "BUDGET_NOT_FOUND":
          return createErrorResponse("BUDGET_NOT_FOUND", "Budget not found or access denied", 404);

        case "CATEGORY_MISMATCH":
          return createErrorResponse("CATEGORY_MISMATCH", "Category does not belong to the user's household", 409);

        case "TRANSACTION_CREATE_FAILED":
          return createErrorResponse("TRANSACTION_CREATE_FAILED", "Failed to create transaction", 500);

        default:
          return createErrorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred", 500);
      }
    }

    return createErrorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred", 500);
  }
};
