import type { supabaseClient } from "../../db/supabase.client";
import type { CategoryDto, PaginationMetaDto, CategoriesListResponseDto } from "../../types";

export type SupabaseClientType = typeof supabaseClient;

export interface ListCategoriesOptions {
  search?: string;
  page?: number;
  pageSize?: number;
  sort?: "name" | "createdAt";
}

/**
 * Service for managing categories operations.
 */
export class CategoriesService {
  constructor(private supabase: SupabaseClientType) {}

  /**
   * Lists categories for the specified user with pagination, filtering, and sorting.
   *
   * @param userId - The ID of the user whose categories to retrieve
   * @param options - Options for filtering, pagination, and sorting
   * @returns Promise resolving to paginated list of categories
   * @throws Error if household not found or database error occurs
   */
  async listCategories(userId: string, options: ListCategoriesOptions = {}): Promise<CategoriesListResponseDto> {
    const { search, page = 1, pageSize = 20, sort = "name" } = options;

    // First, get the household_id for the user
    const { data: householdData, error: householdError } = await this.supabase
      .from("households")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (householdError) {
      if (householdError.code === "PGRST116") {
        // No rows returned - household not found
        throw new Error("HOUSEHOLD_NOT_FOUND");
      }
      // Other database errors
      console.error("Database error while fetching household:", householdError);
      throw new Error("CATEGORIES_LIST_FAILED");
    }

    if (!householdData) {
      throw new Error("HOUSEHOLD_NOT_FOUND");
    }

    const householdId = householdData.id;

    // Calculate offset for pagination
    const offset = (page - 1) * pageSize;

    // Build the query for categories
    // Note: Using count: 'exact' for accurate pagination metadata.
    // For very large datasets (>10k categories per household), consider using
    // count: 'estimated' or head: true for better performance.
    let query = this.supabase
      .from("categories")
      .select("id, name, created_at, updated_at", { count: "exact" })
      .eq("household_id", householdId);

    // Apply search filter if provided
    if (search && search.trim().length > 0) {
      // Sanitize search term by escaping % and _ characters
      const sanitizedSearch = this.sanitizeSearchTerm(search.trim());
      // Performance: This ILIKE query benefits from the functional index
      // idx_categories_name on categories(household_id, lower(name))
      query = query.ilike("name", `%${sanitizedSearch}%`);
    }

    // Apply sorting
    if (sort === "name") {
      query = query.order("name", { ascending: true });
    } else if (sort === "createdAt") {
      query = query.order("created_at", { ascending: true });
    }

    // Apply pagination
    query = query.range(offset, offset + pageSize - 1);

    // Execute the query
    const { data: categoriesData, error: categoriesError, count } = await query;

    if (categoriesError) {
      console.error("Database error while fetching categories:", categoriesError);
      throw new Error("CATEGORIES_LIST_FAILED");
    }

    // Map database rows to DTOs
    const categories: CategoryDto[] = (categoriesData || []).map((category) => ({
      id: category.id,
      name: category.name,
      createdAt: category.created_at,
      updatedAt: category.updated_at,
    }));

    // Calculate pagination metadata
    const totalItems = count || 0;
    const totalPages = totalItems > 0 ? Math.ceil(totalItems / pageSize) : 0;

    const meta: PaginationMetaDto = {
      page,
      pageSize,
      totalItems,
      totalPages,
    };

    return {
      data: categories,
      meta,
    };
  }

  /**
   * Sanitizes search term by escaping special characters used in ILIKE patterns.
   * Escapes % and _ characters to prevent them from being interpreted as wildcards.
   *
   * @param searchTerm - The search term to sanitize
   * @returns Sanitized search term safe for use in ILIKE queries
   */
  private sanitizeSearchTerm(searchTerm: string): string {
    return searchTerm.replace(/[%_]/g, "\\$&");
  }
}

/**
 * Factory function to create a CategoriesService instance.
 *
 * @param supabase - Supabase client instance
 * @returns New CategoriesService instance
 */
export function createCategoriesService(supabase: SupabaseClientType): CategoriesService {
  return new CategoriesService(supabase);
}
