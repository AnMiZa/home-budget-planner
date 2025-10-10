import type { APIRoute } from "astro";
import { z } from "zod";
import { createHouseholdMembersService } from "../../../lib/services/household-members.service";
import type { ApiErrorDto, HouseholdMemberDto, UpdateHouseholdMemberCommand } from "../../../types";

export const prerender = false;

// Validation schema for member ID parameter
const memberIdSchema = z.string().uuid("Invalid member ID format");

// Validation schema for PATCH request body
const patchBodySchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, "Full name is required")
      .max(120, "Full name must not exceed 120 characters")
      .optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => data.fullName !== undefined || data.isActive !== undefined, {
    message: "At least one field (fullName or isActive) must be provided",
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
 * Creates a successful API response for updated household member.
 */
function createMemberUpdateSuccessResponse(data: HouseholdMemberDto): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "X-Result-Code": "MEMBER_UPDATED",
    },
  });
}

/**
 * Creates a successful API response for deactivated household member.
 */
function createMemberDeactivateSuccessResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "X-Result-Code": "MEMBER_DEACTIVATED",
    },
  });
}

/**
 * PATCH /api/household-members/{memberId}
 *
 * Updates an existing household member for the currently authenticated user's household.
 * Allows updating fullName and/or isActive status. At least one field must be provided.
 *
 * URL Parameters:
 * - memberId (string, required): UUID of the household member to update
 *
 * Request Body:
 * - fullName (string, optional): Updated full name (1-120 characters, trimmed)
 * - isActive (boolean, optional): Updated active status
 * - At least one of the above fields must be provided
 *
 * Responses:
 * - 200: Member updated successfully with X-Result-Code: MEMBER_UPDATED
 * - 400: Invalid member ID or request body (INVALID_MEMBER_ID, INVALID_FULL_NAME, INVALID_REQUEST_BODY)
 * - 401: User not authenticated (UNAUTHENTICATED)
 * - 404: Member not found in user's household (MEMBER_NOT_FOUND)
 * - 409: Member name already exists in household (MEMBER_NAME_CONFLICT)
 * - 500: Internal server error (MEMBER_UPDATE_FAILED)
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  try {
    // Extract memberId from URL parameters
    const { memberId } = params;

    // Validate memberId
    const memberIdValidation = memberIdSchema.safeParse(memberId);
    if (!memberIdValidation.success) {
      console.error("Member ID validation failed:", memberIdValidation.error);
      return createErrorResponse("INVALID_MEMBER_ID", "Invalid member ID format", 400);
    }

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (parseError) {
      console.error("Failed to parse request body as JSON:", parseError);
      return createErrorResponse("INVALID_REQUEST_BODY", "Invalid JSON in request body", 400);
    }

    const validationResult = patchBodySchema.safeParse(requestBody);
    if (!validationResult.success) {
      console.error("Request body validation failed:", validationResult.error);
      const firstError = validationResult.error.errors[0];
      const errorCode = firstError?.path?.includes("fullName") ? "INVALID_FULL_NAME" : "INVALID_REQUEST_BODY";
      return createErrorResponse(errorCode, firstError?.message || "Invalid request body", 400);
    }

    const updateCommand: UpdateHouseholdMemberCommand = validationResult.data;

    // Get Supabase client from locals
    const supabase = locals.supabase;
    if (!supabase) {
      console.error("Supabase client not available in locals");
      return createErrorResponse("MEMBER_UPDATE_FAILED", "Database connection not available", 500);
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

    // Create household members service and update member
    const householdMembersService = createHouseholdMembersService(supabase);

    try {
      const updatedMember = await householdMembersService.updateMember(user.id, memberIdValidation.data, updateCommand);

      console.log(
        `Household member updated successfully for user ${user.id}: ${updatedMember.fullName} (ID: ${updatedMember.id})`
      );
      return createMemberUpdateSuccessResponse(updatedMember);
    } catch (serviceError) {
      const errorMessage = serviceError instanceof Error ? serviceError.message : "Unknown error";

      if (errorMessage === "HOUSEHOLD_NOT_FOUND") {
        console.error(`Household not found for user ${user.id}`);
        return createErrorResponse("MEMBER_NOT_FOUND", "Member not found", 404);
      }

      if (errorMessage === "MEMBER_NOT_FOUND") {
        console.error(`Member not found for user ${user.id}, memberId: ${memberIdValidation.data}`);
        return createErrorResponse("MEMBER_NOT_FOUND", "Member not found", 404);
      }

      if (errorMessage === "MEMBER_NAME_CONFLICT") {
        console.error(`Member name conflict for user ${user.id}, memberId: ${memberIdValidation.data}`);
        return createErrorResponse(
          "MEMBER_NAME_CONFLICT",
          "A member with this name already exists in your household",
          409
        );
      }

      if (errorMessage === "MEMBER_UPDATE_FAILED") {
        console.error(`Database error while updating household member for user ${user.id}:`, serviceError);
        return createErrorResponse("MEMBER_UPDATE_FAILED", "Failed to update household member", 500);
      }

      // Unexpected service error
      console.error(`Unexpected service error while updating member for user ${user.id}:`, serviceError);
      return createErrorResponse(
        "MEMBER_UPDATE_FAILED",
        "An unexpected error occurred while updating household member",
        500
      );
    }
  } catch (error) {
    // Catch-all for unexpected errors
    console.error("Unexpected error in PATCH /api/household-members/{memberId}:", error);
    return createErrorResponse("MEMBER_UPDATE_FAILED", "An internal server error occurred", 500);
  }
};

/**
 * DELETE /api/household-members/{memberId}
 *
 * Deactivates (soft-deletes) an existing household member for the currently authenticated user's household.
 * Sets is_active to false while preserving historical data.
 *
 * URL Parameters:
 * - memberId (string, required): UUID of the household member to deactivate
 *
 * Request Body: None
 *
 * Responses:
 * - 204: Member deactivated successfully with X-Result-Code: MEMBER_DEACTIVATED
 * - 400: Invalid member ID (INVALID_MEMBER_ID)
 * - 401: User not authenticated (UNAUTHENTICATED)
 * - 404: Member not found in user's household (MEMBER_NOT_FOUND)
 * - 500: Internal server error (MEMBER_DEACTIVATE_FAILED)
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    // Extract memberId from URL parameters
    const { memberId } = params;

    // Validate memberId
    const memberIdValidation = memberIdSchema.safeParse(memberId);
    if (!memberIdValidation.success) {
      console.error("Member ID validation failed:", memberIdValidation.error);
      return createErrorResponse("INVALID_MEMBER_ID", "Invalid member ID format", 400);
    }

    // Get Supabase client from locals
    const supabase = locals.supabase;
    if (!supabase) {
      console.error("Supabase client not available in locals");
      return createErrorResponse("MEMBER_DEACTIVATE_FAILED", "Database connection not available", 500);
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

    // Create household members service and deactivate member
    const householdMembersService = createHouseholdMembersService(supabase);

    try {
      await householdMembersService.deactivateMember(user.id, memberIdValidation.data);

      console.log(
        `Household member deactivated successfully for user ${user.id}, memberId: ${memberIdValidation.data}`
      );
      return createMemberDeactivateSuccessResponse();
    } catch (serviceError) {
      const errorMessage = serviceError instanceof Error ? serviceError.message : "Unknown error";

      if (errorMessage === "HOUSEHOLD_NOT_FOUND") {
        console.error(`Household not found for user ${user.id}`);
        return createErrorResponse("MEMBER_NOT_FOUND", "Member not found", 404);
      }

      if (errorMessage === "MEMBER_NOT_FOUND") {
        console.error(`Member not found for user ${user.id}, memberId: ${memberIdValidation.data}`);
        return createErrorResponse("MEMBER_NOT_FOUND", "Member not found", 404);
      }

      if (errorMessage === "MEMBER_DEACTIVATE_FAILED") {
        console.error(`Database error while deactivating household member for user ${user.id}:`, serviceError);
        return createErrorResponse("MEMBER_DEACTIVATE_FAILED", "Failed to deactivate household member", 500);
      }

      // Unexpected service error
      console.error(`Unexpected service error while deactivating member for user ${user.id}:`, serviceError);
      return createErrorResponse(
        "MEMBER_DEACTIVATE_FAILED",
        "An unexpected error occurred while deactivating household member",
        500
      );
    }
  } catch (error) {
    // Catch-all for unexpected errors
    console.error("Unexpected error in DELETE /api/household-members/{memberId}:", error);
    return createErrorResponse("MEMBER_DEACTIVATE_FAILED", "An internal server error occurred", 500);
  }
};
