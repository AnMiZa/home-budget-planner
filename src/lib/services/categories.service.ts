import type { supabaseClient } from "../../db/supabase.client";
import type {
  CategoryDto,
  PaginationMetaDto,
  CategoriesListResponseDto,
  CreateCategoryCommand,
  UpdateCategoryCommand,
  DeleteCategoryCommand,
} from "../../types";

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
   * Creates a new category for the specified user's household.
   *
   * @param userId - The ID of the user creating the category
   * @param command - The category creation command containing the name
   * @returns Promise resolving to the created category DTO
   * @throws Error if household not found, name conflict, or database error occurs
   */
  async createCategory(userId: string, command: CreateCategoryCommand): Promise<CategoryDto> {
    const { name } = command;

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
      throw new Error("CATEGORY_CREATE_FAILED");
    }

    if (!householdData) {
      throw new Error("HOUSEHOLD_NOT_FOUND");
    }

    const householdId = householdData.id;

    // Insert the new category
    const { data: categoryData, error: insertError } = await this.supabase
      .from("categories")
      .insert({
        household_id: householdId,
        name: name.trim(),
      })
      .select("id, name, created_at, updated_at")
      .single();

    if (insertError) {
      // Check for unique constraint violation (PostgreSQL error code 23505)
      if (insertError.code === "23505") {
        // This indicates a violation of the unique constraint on (household_id, lower(name))
        throw new Error("CATEGORY_NAME_CONFLICT");
      }

      // Other database errors
      console.error("Database error while creating category:", insertError);
      throw new Error("CATEGORY_CREATE_FAILED");
    }

    if (!categoryData) {
      console.error("Category creation succeeded but no data returned");
      throw new Error("CATEGORY_CREATE_FAILED");
    }

    // Map database row to DTO
    const categoryDto: CategoryDto = {
      id: categoryData.id,
      name: categoryData.name,
      createdAt: categoryData.created_at,
      updatedAt: categoryData.updated_at,
    };

    return categoryDto;
  }

  /**
   * Updates an existing category for the specified user's household.
   *
   * @param userId - The ID of the user updating the category
   * @param categoryId - The ID of the category to update
   * @param command - The category update command containing the new name
   * @returns Promise resolving to the updated category DTO
   * @throws Error if household not found, category not found, name conflict, or database error occurs
   */
  async updateCategoryByUserId(
    userId: string,
    categoryId: string,
    command: UpdateCategoryCommand
  ): Promise<CategoryDto> {
    const { name } = command;

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
      throw new Error("CATEGORY_UPDATE_FAILED");
    }

    if (!householdData) {
      throw new Error("HOUSEHOLD_NOT_FOUND");
    }

    const householdId = householdData.id;

    // Update the category
    const { data: categoryData, error: updateError } = await this.supabase
      .from("categories")
      .update({
        name: name.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", categoryId)
      .eq("household_id", householdId)
      .select("id, name, created_at, updated_at")
      .single();

    if (updateError) {
      // Check for unique constraint violation (PostgreSQL error code 23505)
      if (updateError.code === "23505") {
        // This indicates a violation of the unique constraint on (household_id, lower(name))
        throw new Error("CATEGORY_NAME_CONFLICT");
      }

      // Other database errors
      console.error("Database error while updating category:", updateError);
      throw new Error("CATEGORY_UPDATE_FAILED");
    }

    if (!categoryData) {
      // No rows were updated - category not found or user doesn't have access
      throw new Error("CATEGORY_NOT_FOUND");
    }

    // Map database row to DTO
    const categoryDto: CategoryDto = {
      id: categoryData.id,
      name: categoryData.name,
      createdAt: categoryData.created_at,
      updatedAt: categoryData.updated_at,
    };

    return categoryDto;
  }

  /**
   * Deletes a category for the specified user's household.
   * Checks for dependencies in planned_expenses and transactions tables.
   * Requires force=true confirmation if dependencies exist.
   *
   * @param userId - The ID of the user deleting the category
   * @param categoryId - The ID of the category to delete
   * @param command - The delete command containing force flag
   * @returns Promise resolving when category is deleted
   * @throws Error if household not found, category not found, dependencies exist without force, or database error occurs
   */
  async deleteCategoryByUserId(userId: string, categoryId: string, command: DeleteCategoryCommand): Promise<void> {
    const { force } = command;

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
      throw new Error("CATEGORY_DELETE_FAILED");
    }

    if (!householdData) {
      throw new Error("HOUSEHOLD_NOT_FOUND");
    }

    const householdId = householdData.id;

    // Verify category exists and belongs to the household
    const { data: categoryData, error: categoryError } = await this.supabase
      .from("categories")
      .select("id, name")
      .eq("id", categoryId)
      .eq("household_id", householdId)
      .single();

    if (categoryError) {
      if (categoryError.code === "PGRST116") {
        // No rows returned - category not found or doesn't belong to household
        throw new Error("CATEGORY_NOT_FOUND");
      }
      // Other database errors
      console.error("Database error while fetching category:", categoryError);
      throw new Error("CATEGORY_DELETE_FAILED");
    }

    if (!categoryData) {
      throw new Error("CATEGORY_NOT_FOUND");
    }

    // Check for dependencies in planned_expenses and transactions
    const dependencyCounts = await this.getCategoryDependenciesCounts(categoryId, householdId);
    const totalDependencies = dependencyCounts.plannedExpenses + dependencyCounts.transactions;

    if (totalDependencies > 0 && force !== true) {
      throw new Error("CATEGORY_DEPENDENCIES_EXIST");
    }

    // Delete the category (ON DELETE CASCADE will handle dependent records)
    const { error: deleteError } = await this.supabase
      .from("categories")
      .delete()
      .eq("id", categoryId)
      .eq("household_id", householdId);

    if (deleteError) {
      console.error("Database error while deleting category:", deleteError);
      throw new Error("CATEGORY_DELETE_FAILED");
    }
  }

  /**
   * Counts dependencies for a category in planned_expenses and transactions tables.
   *
   * @param categoryId - The ID of the category to check
   * @param householdId - The ID of the household (for security filtering)
   * @returns Promise resolving to counts of dependencies
   */
  private async getCategoryDependenciesCounts(
    categoryId: string,
    householdId: string
  ): Promise<{ plannedExpenses: number; transactions: number }> {
    // Count planned_expenses dependencies
    const { count: plannedExpensesCount, error: plannedError } = await this.supabase
      .from("planned_expenses")
      .select("*", { count: "exact", head: true })
      .eq("category_id", categoryId);

    if (plannedError) {
      console.error("Database error while counting planned expenses:", plannedError);
      throw new Error("CATEGORY_DELETE_FAILED");
    }

    // Count transactions dependencies
    const { count: transactionsCount, error: transactionsError } = await this.supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("category_id", categoryId)
      .eq("household_id", householdId);

    if (transactionsError) {
      console.error("Database error while counting transactions:", transactionsError);
      throw new Error("CATEGORY_DELETE_FAILED");
    }

    return {
      plannedExpenses: plannedExpensesCount || 0,
      transactions: transactionsCount || 0,
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
