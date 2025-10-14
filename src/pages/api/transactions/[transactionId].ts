import type { APIRoute } from "astro";
import { createTransactionsService } from "../../../lib/services/transactions.service";
import { parseTransactionIdParam } from "../../../lib/validation/transactions";
import type { ApiErrorDto, TransactionDto } from "../../../types";

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
      "X-Result-Code": code,
    },
  });
}

/**
 * Creates a successful API response for transaction retrieval.
 */
function createSuccessResponse(data: TransactionDto): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Result-Code": "TRANSACTION_FETCHED",
    },
  });
}

/**
 * GET /api/transactions/{transactionId}
 *
 * Retrieves a single transaction by ID for the authenticated user's household.
 *
 * Path Parameters:
 * - transactionId: UUID of the transaction to retrieve
 *
 * Responses:
 * - 200: Transaction retrieved successfully
 * - 400: Invalid transaction ID format
 * - 401: User not authenticated
 * - 404: Transaction not found or doesn't belong to user's household
 * - 500: Internal server error
 */
export const GET: APIRoute = async ({ locals, params }) => {
  try {
    // Check if Supabase client is available
    if (!locals.supabase) {
      console.error("Supabase client not available in locals");
      return createErrorResponse("INTERNAL_SERVER_ERROR", "Service temporarily unavailable", 500);
    }

    // Authenticate user
    const { data: authData, error: authError } = await locals.supabase.auth.getUser();

    if (authError) {
      console.error("Authentication error:", authError);
      return createErrorResponse("UNAUTHENTICATED", "Authentication required", 401);
    }

    if (!authData.user) {
      return createErrorResponse("UNAUTHENTICATED", "Authentication required", 401);
    }

    // Validate transaction ID parameter
    let transactionId: string;
    try {
      transactionId = parseTransactionIdParam(params as { transactionId: string });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Invalid transaction ID";
      const [code, message] = errorMessage.includes(":")
        ? errorMessage.split(": ", 2)
        : ["INVALID_TRANSACTION_ID", errorMessage];
      return createErrorResponse(code, message, 400);
    }

    // Create service and fetch transaction
    const transactionsService = createTransactionsService(locals.supabase);

    try {
      const transaction = await transactionsService.getTransactionById(authData.user.id, transactionId);
      return createSuccessResponse(transaction);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      switch (errorMessage) {
        case "TRANSACTION_NOT_FOUND":
          return createErrorResponse("TRANSACTION_NOT_FOUND", "Transaction not found or access denied", 404);
        case "TRANSACTION_FETCH_FAILED":
          return createErrorResponse("TRANSACTION_FETCH_FAILED", "Failed to retrieve transaction", 500);
        default:
          console.error("Unexpected error in GET /api/transactions/[transactionId]:", error);
          return createErrorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred", 500);
      }
    }
  } catch (error) {
    console.error("Unhandled error in GET /api/transactions/[transactionId]:", error);
    return createErrorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred", 500);
  }
};
