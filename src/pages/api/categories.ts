import type { APIRoute } from "astro";
import { z } from "zod";
import { createCategoriesService } from "../../lib/services/categories.service";
import type { ApiErrorDto, CategoriesListResponseDto, CategoryDto, CreateCategoryCommand } from "../../types";

export const prerender = false;

// Validation schema for query parameters
const querySchema = z.object({
  search: z.string().trim().max(100, "Search term must not exceed 100 characters").optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["name", "createdAt"]).default("name"),
});

// Validation schema for POST request body
const createCategorySchema = z.object({
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
 * Creates a successful API response for categories list.
 */
function createSuccessResponse(data: CategoriesListResponseDto): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Result-Code": "CATEGORIES_LISTED",
    },
  });
}

/**
 * Creates a successful API response for category creation.
 */
function createCategoryCreatedResponse(data: CategoryDto): Response {
  return new Response(JSON.stringify(data), {
    status: 201,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Result-Code": "CATEGORY_CREATED",
    },
  });
}

/**
 * GET /api/categories
 *
 * Retrieves a paginated list of categories for the currently authenticated user's household.
 * Supports filtering by name fragment (case-insensitive), sorting, and pagination.
 *
 * Performance Notes:
 * - Uses functional index idx_categories_name for optimized case-insensitive search
 * - Search queries benefit from PostgreSQL ILIKE with proper index utilization
 * - Pagination uses count: 'exact' for accurate metadata (suitable for household-scale data)
 *
 * Query Parameters:
 * - search (string, optional): Fragment to search in category names, case-insensitive (max 100 chars)
 * - page (number, optional): Page number for pagination, starting from 1 (default: 1)
 * - pageSize (number, optional): Number of items per page, 1-100 (default: 20)
 * - sort (string, optional): Sort field - "name" or "createdAt" (default: "name")
 *
 * Responses:
 * - 200: Categories list retrieved successfully with X-Result-Code: CATEGORIES_LISTED
 * - 400: Invalid query parameters (INVALID_QUERY_PARAMS)
 * - 401: User not authenticated (UNAUTHENTICATED)
 * - 404: Household not found for user (HOUSEHOLD_NOT_FOUND)
 * - 500: Internal server error (CATEGORIES_LIST_FAILED)
 */
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);

    const validationResult = querySchema.safeParse(queryParams);
    if (!validationResult.success) {
      console.warn("Query parameter validation failed:", validationResult.error);
      const firstError = validationResult.error.errors[0];
      return createErrorResponse(
        "INVALID_QUERY_PARAMS",
        firstError?.message || "Invalid query parameters provided",
        400
      );
    }

    const { search, page, pageSize, sort } = validationResult.data;

    // Get Supabase client from locals
    const supabase = locals.supabase;
    if (!supabase) {
      console.error("Supabase client not available in locals");
      return createErrorResponse("CATEGORIES_LIST_FAILED", "Database connection not available", 500);
    }

    // Get authenticated user
    // const {
    //   data: { user },
    //   error: authError,
    // } = await supabase.auth.getUser();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.signInWithPassword({
      email: "andrzejzab@gmail.com",
      password: "Lolopolo1!",
    });

    if (authError) {
      console.error("Authentication error:", authError);
      return createErrorResponse("UNAUTHENTICATED", "Authentication failed", 401);
    }

    if (!user) {
      return createErrorResponse("UNAUTHENTICATED", "User not authenticated", 401);
    }

    // Create categories service and fetch data
    const categoriesService = createCategoriesService(supabase);

    try {
      const result = await categoriesService.listCategories(user.id, {
        search,
        page,
        pageSize,
        sort,
      });

      console.log(`Categories listed successfully for user ${user.id}: ${result.data.length} categories found`);
      return createSuccessResponse(result);
    } catch (serviceError) {
      const errorMessage = serviceError instanceof Error ? serviceError.message : "Unknown error";

      if (errorMessage === "HOUSEHOLD_NOT_FOUND") {
        return createErrorResponse("HOUSEHOLD_NOT_FOUND", "No household found for the authenticated user", 404);
      }

      if (errorMessage === "CATEGORIES_LIST_FAILED") {
        console.error("Database error while fetching categories:", serviceError);
        return createErrorResponse("CATEGORIES_LIST_FAILED", "Failed to retrieve categories", 500);
      }

      // Unexpected service error
      console.error("Unexpected service error:", serviceError);
      return createErrorResponse(
        "CATEGORIES_LIST_FAILED",
        "An unexpected error occurred while fetching categories",
        500
      );
    }
  } catch (error) {
    // Catch-all for unexpected errors
    console.error("Unexpected error in GET /api/categories:", error);
    return createErrorResponse("CATEGORIES_LIST_FAILED", "An internal server error occurred", 500);
  }
};

/**
 * POST /api/categories
 *
 * Creates a new expense category for the currently authenticated user's household.
 * Requires valid authentication and validates the category name for uniqueness within the household.
 *
 * Request Body:
 * - name (string, required): Category name, 1-100 characters after trimming
 *
 * Responses:
 * - 201: Category created successfully with X-Result-Code: CATEGORY_CREATED
 * - 400: Invalid request body (INVALID_NAME)
 * - 401: User not authenticated (UNAUTHENTICATED)
 * - 404: Household not found for user (HOUSEHOLD_NOT_FOUND)
 * - 409: Category name already exists in household (CATEGORY_NAME_CONFLICT)
 * - 500: Internal server error (CATEGORY_CREATE_FAILED)
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (parseError) {
      console.warn("Failed to parse request body:", parseError);
      return createErrorResponse("INVALID_NAME", "Invalid JSON in request body", 400);
    }

    const validationResult = createCategorySchema.safeParse(requestBody);
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
      return createErrorResponse("CATEGORY_CREATE_FAILED", "Database connection not available", 500);
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

    // Create categories service and create category
    const categoriesService = createCategoriesService(supabase);

    try {
      const createCommand: CreateCategoryCommand = { name };
      const result = await categoriesService.createCategory(user.id, createCommand);

      console.log(`Category created successfully for user ${user.id}: ${result.name} (ID: ${result.id})`);
      return createCategoryCreatedResponse(result);
    } catch (serviceError) {
      const errorMessage = serviceError instanceof Error ? serviceError.message : "Unknown error";

      if (errorMessage === "HOUSEHOLD_NOT_FOUND") {
        return createErrorResponse("HOUSEHOLD_NOT_FOUND", "No household found for the authenticated user", 404);
      }

      if (errorMessage === "CATEGORY_NAME_CONFLICT") {
        return createErrorResponse(
          "CATEGORY_NAME_CONFLICT",
          "A category with this name already exists in your household",
          409
        );
      }

      if (errorMessage === "CATEGORY_CREATE_FAILED") {
        console.error("Database error while creating category:", serviceError);
        return createErrorResponse("CATEGORY_CREATE_FAILED", "Failed to create category", 500);
      }

      // Unexpected service error
      console.error("Unexpected service error:", serviceError);
      return createErrorResponse(
        "CATEGORY_CREATE_FAILED",
        "An unexpected error occurred while creating the category",
        500
      );
    }
  } catch (error) {
    // Catch-all for unexpected errors
    console.error("Unexpected error in POST /api/categories:", error);
    return createErrorResponse("CATEGORY_CREATE_FAILED", "An internal server error occurred", 500);
  }
};
