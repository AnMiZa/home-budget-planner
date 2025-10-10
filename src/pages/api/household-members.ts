import type { APIRoute } from "astro";
import { z } from "zod";
import { createHouseholdMembersService } from "../../lib/services/household-members.service";
import type {
  ApiErrorDto,
  HouseholdMembersListResponseDto,
  CreateHouseholdMemberCommand,
  HouseholdMemberDto,
} from "../../types";

export const prerender = false;

// Validation schema for query parameters
const querySchema = z.object({
  includeInactive: z.coerce.boolean().default(false),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["fullName", "createdAt"]).default("fullName"),
});

// Validation schema for POST request body
const bodySchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(120, "Full name must not exceed 120 characters"),
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
 * Creates a successful API response for created household member.
 */
function createMemberSuccessResponse(data: HouseholdMemberDto): Response {
  return new Response(JSON.stringify(data), {
    status: 201,
    headers: {
      "Content-Type": "application/json",
      "X-Result-Code": "MEMBER_CREATED",
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

/**
 * POST /api/household-members
 *
 * Creates a new household member for the currently authenticated user's household.
 * The member is created with is_active = true by default.
 *
 * Request Body:
 * - fullName (string, required): Full name of the household member (1-120 characters, trimmed)
 *
 * Responses:
 * - 201: Member created successfully with X-Result-Code: MEMBER_CREATED
 * - 400: Invalid request body (INVALID_FULL_NAME)
 * - 401: User not authenticated (UNAUTHENTICATED)
 * - 404: Household not found for user (HOUSEHOLD_NOT_FOUND)
 * - 409: Member name already exists in household (MEMBER_NAME_CONFLICT)
 * - 500: Internal server error (MEMBER_CREATE_FAILED)
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (parseError) {
      console.error("Failed to parse request body as JSON:", parseError);
      return createErrorResponse("INVALID_FULL_NAME", "Invalid JSON in request body", 400);
    }

    const validationResult = bodySchema.safeParse(requestBody);
    if (!validationResult.success) {
      console.error("Request body validation failed:", validationResult.error);
      const firstError = validationResult.error.errors[0];
      return createErrorResponse("INVALID_FULL_NAME", firstError?.message || "Invalid full name provided", 400);
    }

    const { fullName } = validationResult.data;

    // Get Supabase client from locals
    const supabase = locals.supabase;
    if (!supabase) {
      console.error("Supabase client not available in locals");
      return createErrorResponse("MEMBER_CREATE_FAILED", "Database connection not available", 500);
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

    // Create household members service and create member
    const householdMembersService = createHouseholdMembersService(supabase);

    try {
      const command: CreateHouseholdMemberCommand = { fullName };
      const createdMember = await householdMembersService.createMember(user.id, command);

      console.log(
        `Household member created successfully for user ${user.id}: ${createdMember.fullName} (ID: ${createdMember.id})`
      );
      return createMemberSuccessResponse(createdMember);
    } catch (serviceError) {
      const errorMessage = serviceError instanceof Error ? serviceError.message : "Unknown error";

      if (errorMessage === "HOUSEHOLD_NOT_FOUND") {
        console.error(`Household not found for user ${user.id}`);
        return createErrorResponse("HOUSEHOLD_NOT_FOUND", "No household found for the authenticated user", 404);
      }

      if (errorMessage === "MEMBER_NAME_CONFLICT") {
        console.error(`Member name conflict for user ${user.id}: ${fullName}`);
        return createErrorResponse(
          "MEMBER_NAME_CONFLICT",
          "A member with this name already exists in your household",
          409
        );
      }

      if (errorMessage === "MEMBER_CREATE_FAILED") {
        console.error(`Database error while creating household member for user ${user.id}:`, serviceError);
        return createErrorResponse("MEMBER_CREATE_FAILED", "Failed to create household member", 500);
      }

      // Unexpected service error
      console.error(`Unexpected service error while creating member for user ${user.id}:`, serviceError);
      return createErrorResponse(
        "MEMBER_CREATE_FAILED",
        "An unexpected error occurred while creating household member",
        500
      );
    }
  } catch (error) {
    // Catch-all for unexpected errors
    console.error("Unexpected error in POST /api/household-members:", error);
    return createErrorResponse("MEMBER_CREATE_FAILED", "An internal server error occurred", 500);
  }
};
