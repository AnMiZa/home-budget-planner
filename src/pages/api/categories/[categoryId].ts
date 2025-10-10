import type { APIRoute } from "astro";
import { z } from "zod";
import { createCategoriesService } from "../../../lib/services/categories.service";
import type { ApiErrorDto, CategoryDto, UpdateCategoryCommand } from "../../../types";

export const prerender = false;

// Validation schema for categoryId parameter
const categoryIdSchema = z.string().uuid("Category ID must be a valid UUID");

// Validation schema for PATCH request body
const updateCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Category name cannot be empty")
    .max(100, "Category name must not exceed 100 characters"),
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
 * Creates a successful API response for category update.
 */
function createCategoryUpdatedResponse(data: CategoryDto): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Result-Code": "CATEGORY_UPDATED",
    },
  });
}

/**
 * PATCH /api/categories/{categoryId}
 *
 * Updates an existing expense category for the currently authenticated user's household.
 * Requires valid authentication and validates the category name for uniqueness within the household.
 *
 * Path Parameters:
 * - categoryId (string, required): UUID of the category to update
 *
 * Request Body:
 * - name (string, required): New category name, 1-100 characters after trimming
 *
 * Responses:
 * - 200: Category updated successfully with X-Result-Code: CATEGORY_UPDATED
 * - 400: Invalid request parameters or body (INVALID_CATEGORY_ID, INVALID_NAME)
 * - 401: User not authenticated (UNAUTHENTICATED)
 * - 404: Category not found or not accessible (CATEGORY_NOT_FOUND)
 * - 409: Category name already exists in household (CATEGORY_NAME_CONFLICT)
 * - 500: Internal server error (CATEGORY_UPDATE_FAILED)
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  try {
    // Validate categoryId parameter
    const categoryIdValidation = categoryIdSchema.safeParse(params.categoryId);
    if (!categoryIdValidation.success) {
      console.warn("Category ID validation failed:", categoryIdValidation.error);
      const firstError = categoryIdValidation.error.errors[0];
      return createErrorResponse("INVALID_CATEGORY_ID", firstError?.message || "Invalid category ID provided", 400);
    }

    const categoryId = categoryIdValidation.data;

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (parseError) {
      console.warn("Failed to parse request body:", parseError);
      return createErrorResponse("INVALID_NAME", "Invalid JSON in request body", 400);
    }

    const validationResult = updateCategorySchema.safeParse(requestBody);
    if (!validationResult.success) {
      console.warn("Request body validation failed:", validationResult.error);
      const firstError = validationResult.error.errors[0];
      return createErrorResponse("INVALID_NAME", firstError?.message || "Invalid category name provided", 400);
    }

    const { name } = validationResult.data;

    // Get Supabase client from locals
    const supabase = locals.supabase;
    if (!supabase) {
      console.error("Supabase client not available in locals");
      return createErrorResponse("CATEGORY_UPDATE_FAILED", "Database connection not available", 500);
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

    // Create categories service and update category
    const categoriesService = createCategoriesService(supabase);

    try {
      const updateCommand: UpdateCategoryCommand = { name };
      const result = await categoriesService.updateCategoryByUserId(user.id, categoryId, updateCommand);

      console.log(`Category updated successfully: ${result.name} (ID: ${result.id})`);
      return createCategoryUpdatedResponse(result);
    } catch (serviceError) {
      const errorMessage = serviceError instanceof Error ? serviceError.message : "Unknown error";

      if (errorMessage === "HOUSEHOLD_NOT_FOUND") {
        return createErrorResponse("HOUSEHOLD_NOT_FOUND", "No household found for the authenticated user", 404);
      }

      if (errorMessage === "CATEGORY_NOT_FOUND") {
        return createErrorResponse(
          "CATEGORY_NOT_FOUND",
          "Category not found or you don't have permission to modify it",
          404
        );
      }

      if (errorMessage === "CATEGORY_NAME_CONFLICT") {
        return createErrorResponse(
          "CATEGORY_NAME_CONFLICT",
          "A category with this name already exists in your household",
          409
        );
      }

      if (errorMessage === "CATEGORY_UPDATE_FAILED") {
        console.error("Database error while updating category:", serviceError);
        return createErrorResponse("CATEGORY_UPDATE_FAILED", "Failed to update category", 500);
      }

      // Unexpected service error
      console.error("Unexpected service error:", serviceError);
      return createErrorResponse(
        "CATEGORY_UPDATE_FAILED",
        "An unexpected error occurred while updating the category",
        500
      );
    }
  } catch (error) {
    // Catch-all for unexpected errors
    console.error("Unexpected error in PATCH /api/categories/{categoryId}:", error);
    return createErrorResponse("CATEGORY_UPDATE_FAILED", "An internal server error occurred", 500);
  }
};
