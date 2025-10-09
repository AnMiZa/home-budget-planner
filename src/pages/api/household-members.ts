import type { APIRoute } from "astro";
import { z } from "zod";
import { createHouseholdMembersService } from "../../lib/services/household-members.service";
import type { ApiErrorDto, HouseholdMembersListResponseDto } from "../../types";

export const prerender = false;

// Validation schema for query parameters
const querySchema = z.object({
  includeInactive: z.coerce.boolean().default(false),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["fullName", "createdAt"]).default("fullName"),
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
      "Content-Type": "application/json",
    },
  });
}

/**
 * Creates a successful API response for household members list.
 */
function createSuccessResponse(data: HouseholdMembersListResponseDto): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "X-Result-Code": "MEMBERS_LISTED",
    },
  });
}

/**
 * GET /api/household-members
 *
 * Retrieves a paginated list of household members for the currently authenticated user.
 * By default, only active members are returned unless includeInactive=true is specified.
 *
 * Query Parameters:
 * - includeInactive (boolean, optional): Whether to include inactive members (default: false)
 * - page (number, optional): Page number for pagination, starting from 1 (default: 1)
 * - pageSize (number, optional): Number of items per page, 1-100 (default: 20)
 * - sort (string, optional): Sort field - "fullName" or "createdAt" (default: "fullName")
 *
 * Responses:
 * - 200: Members list retrieved successfully with X-Result-Code: MEMBERS_LISTED
 * - 400: Invalid query parameters (INVALID_QUERY_PARAM)
 * - 401: User not authenticated (UNAUTHENTICATED)
 * - 404: Household not found for user (HOUSEHOLD_NOT_FOUND)
 * - 500: Internal server error (MEMBERS_LIST_FAILED)
 */
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);

    const validationResult = querySchema.safeParse(queryParams);
    if (!validationResult.success) {
      console.error("Query parameter validation failed:", validationResult.error);
      const firstError = validationResult.error.errors[0];
      return createErrorResponse(
        "INVALID_QUERY_PARAM",
        firstError?.message || "Invalid query parameters provided",
        400
      );
    }

    const { includeInactive, page, pageSize, sort } = validationResult.data;

    // Get Supabase client from locals
    const supabase = locals.supabase;
    if (!supabase) {
      console.error("Supabase client not available in locals");
      return createErrorResponse("MEMBERS_LIST_FAILED", "Database connection not available", 500);
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

    // Create household members service and fetch data
    const householdMembersService = createHouseholdMembersService(supabase);

    try {
      const result = await householdMembersService.listMembers(user.id, {
        includeInactive,
        page,
        pageSize,
        sort,
      });

      console.log(`Household members listed successfully for user ${user.id}: ${result.data.length} members found`);
      return createSuccessResponse(result);
    } catch (serviceError) {
      const errorMessage = serviceError instanceof Error ? serviceError.message : "Unknown error";

      if (errorMessage === "HOUSEHOLD_NOT_FOUND") {
        return createErrorResponse("HOUSEHOLD_NOT_FOUND", "No household found for the authenticated user", 404);
      }

      if (errorMessage === "MEMBERS_LIST_FAILED") {
        console.error("Database error while fetching household members:", serviceError);
        return createErrorResponse("MEMBERS_LIST_FAILED", "Failed to retrieve household members", 500);
      }

      // Unexpected service error
      console.error("Unexpected service error:", serviceError);
      return createErrorResponse(
        "MEMBERS_LIST_FAILED",
        "An unexpected error occurred while fetching household members",
        500
      );
    }
  } catch (error) {
    // Catch-all for unexpected errors
    console.error("Unexpected error in GET /api/household-members:", error);
    return createErrorResponse("MEMBERS_LIST_FAILED", "An internal server error occurred", 500);
  }
};
