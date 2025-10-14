import type { APIRoute } from "astro";
import { createTransactionsService } from "../../../lib/services/transactions.service";
import { parseTransactionIdParam, parseUpdateTransactionBody } from "../../../lib/validation/transactions";
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
 * Creates a successful API response for transaction update.
 */
function createUpdateSuccessResponse(data: TransactionDto): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Result-Code": "TRANSACTION_UPDATED",
    },
  });
}

/**
 * Creates a successful API response for transaction deletion.
 */
function createDeleteSuccessResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "X-Result-Code": "TRANSACTION_DELETED",
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

/**
 * PATCH /api/transactions/{transactionId}
 *
 * Updates a single transaction by ID for the authenticated user's household.
 *
 * Path Parameters:
 * - transactionId: UUID of the transaction to update
 *
 * Request Body:
 * - categoryId?: string (UUID of the category)
 * - amount?: number (positive number with max 2 decimal places)
 * - transactionDate?: string (YYYY-MM-DD format)
 * - note?: string | null (max 500 characters, null to clear)
 *
 * At least one field must be provided for update.
 *
 * Responses:
 * - 200: Transaction updated successfully
 * - 400: Invalid request body or transaction ID format
 * - 401: User not authenticated
 * - 404: Transaction not found or doesn't belong to user's household
 * - 500: Internal server error
 */
export const PATCH: APIRoute = async ({ locals, params, request }) => {
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

    // Parse and validate request body
    let updateCommand;
    try {
      const body = await request.json();
      updateCommand = parseUpdateTransactionBody(body);
    } catch (error) {
      if (error instanceof SyntaxError) {
        return createErrorResponse("INVALID_BODY", "Invalid JSON in request body", 400);
      }

      const errorMessage = error instanceof Error ? error.message : "Invalid request body";
      const [code, message] = errorMessage.includes(":") ? errorMessage.split(": ", 2) : ["INVALID_BODY", errorMessage];
      return createErrorResponse(code, message, 400);
    }

    // Create service and update transaction
    const transactionsService = createTransactionsService(locals.supabase);

    try {
      const updatedTransaction = await transactionsService.updateTransaction(
        authData.user.id,
        transactionId,
        updateCommand
      );
      return createUpdateSuccessResponse(updatedTransaction);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      switch (errorMessage) {
        case "TRANSACTION_NOT_FOUND":
          return createErrorResponse("TRANSACTION_NOT_FOUND", "Transaction not found or access denied", 404);
        case "INVALID_CATEGORY_ID":
          return createErrorResponse("INVALID_CATEGORY_ID", "Category not found or access denied", 400);
        case "TRANSACTION_UPDATE_FAILED":
          return createErrorResponse("TRANSACTION_UPDATE_FAILED", "Failed to update transaction", 500);
        default:
          console.error("Unexpected error in PATCH /api/transactions/[transactionId]:", error);
          return createErrorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred", 500);
      }
    }
  } catch (error) {
    console.error("Unhandled error in PATCH /api/transactions/[transactionId]:", error);
    return createErrorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred", 500);
  }
};

/**
 * DELETE /api/transactions/{transactionId}
 *
 * Deletes a single transaction by ID for the authenticated user's household.
 *
 * Path Parameters:
 * - transactionId: UUID of the transaction to delete
 *
 * Responses:
 * - 204: Transaction deleted successfully
 * - 400: Invalid transaction ID format
 * - 401: User not authenticated
 * - 404: Transaction not found or doesn't belong to user's household
 * - 500: Internal server error
 */
export const DELETE: APIRoute = async ({ locals, params }) => {
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

    // Create service and delete transaction
    const transactionsService = createTransactionsService(locals.supabase);

    try {
      await transactionsService.deleteTransaction(authData.user.id, transactionId);
      return createDeleteSuccessResponse();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      switch (errorMessage) {
        case "TRANSACTION_NOT_FOUND":
          return createErrorResponse("TRANSACTION_NOT_FOUND", "Transaction not found or access denied", 404);
        case "TRANSACTION_DELETE_FAILED":
          return createErrorResponse("TRANSACTION_DELETE_FAILED", "Failed to delete transaction", 500);
        default:
          console.error("Unexpected error in DELETE /api/transactions/[transactionId]:", error);
          return createErrorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred", 500);
      }
    }
  } catch (error) {
    console.error("Unhandled error in DELETE /api/transactions/[transactionId]:", error);
    return createErrorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred", 500);
  }
};
