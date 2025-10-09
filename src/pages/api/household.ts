import type { APIRoute } from "astro";
import { z } from "zod";
import { createHouseholdService } from "../../lib/services/household.service";
import type { ApiErrorDto, HouseholdDto, DefaultCategoryDto } from "../../types";

export const prerender = false;

// Validation schema for query parameters
const querySchema = z.object({
  includeDefaults: z.coerce.boolean().default(false),
});

// Response type for successful household fetch
interface HouseholdResponseDto {
  readonly household: HouseholdDto;
  defaultCategories?: readonly DefaultCategoryDto[];
}

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
 * Creates a successful API response.
 */
function createSuccessResponse(data: HouseholdResponseDto): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/**
 * GET /api/household
 *
 * Retrieves the household profile for the currently authenticated user.
 * Optionally includes default categories if includeDefaults=true is provided.
 *
 * Query Parameters:
 * - includeDefaults (boolean, optional): Whether to include default categories in response
 *
 * Responses:
 * - 200: Household data retrieved successfully
 * - 400: Invalid query parameters
 * - 401: User not authenticated
 * - 404: Household not found for user
 * - 500: Internal server error
 */
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);

    const validationResult = querySchema.safeParse(queryParams);
    if (!validationResult.success) {
      console.error("Query parameter validation failed:", validationResult.error);
      return createErrorResponse("INVALID_QUERY_PARAM", "Invalid query parameters provided", 400);
    }

    const { includeDefaults } = validationResult.data;

    // Get Supabase client from locals
    const supabase = locals.supabase;
    if (!supabase) {
      console.error("Supabase client not available in locals");
      return createErrorResponse("INTERNAL_ERROR", "Database connection not available", 500);
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

    // Create household service and fetch data
    const householdService = createHouseholdService(supabase);

    try {
      const result = await householdService.getHouseholdProfile(user.id, {
        includeDefaults,
      });

      // Prepare response data
      const responseData: HouseholdResponseDto = {
        household: result.household,
      };

      // Add default categories if they were requested and retrieved
      if (includeDefaults && result.defaultCategories) {
        responseData.defaultCategories = result.defaultCategories;
      }

      console.log(`Household fetched successfully for user ${user.id}`);
      return createSuccessResponse(responseData);
    } catch (serviceError) {
      const errorMessage = serviceError instanceof Error ? serviceError.message : "Unknown error";

      if (errorMessage === "HOUSEHOLD_NOT_FOUND") {
        return createErrorResponse("HOUSEHOLD_NOT_FOUND", "No household found for the authenticated user", 404);
      }

      if (errorMessage === "HOUSEHOLD_FETCH_FAILED") {
        console.error("Database error while fetching household:", serviceError);
        return createErrorResponse("HOUSEHOLD_FETCH_FAILED", "Failed to retrieve household data", 500);
      }

      // Unexpected service error
      console.error("Unexpected service error:", serviceError);
      return createErrorResponse(
        "HOUSEHOLD_FETCH_FAILED",
        "An unexpected error occurred while fetching household data",
        500
      );
    }
  } catch (error) {
    // Catch-all for unexpected errors
    console.error("Unexpected error in GET /api/household:", error);
    return createErrorResponse("INTERNAL_ERROR", "An internal server error occurred", 500);
  }
};
