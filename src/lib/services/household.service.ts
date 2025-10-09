import type { supabaseClient } from "../../db/supabase.client";
import type { HouseholdDto, DefaultCategoryDto } from "../../types";

export type SupabaseClientType = typeof supabaseClient;

export interface GetHouseholdProfileOptions {
  includeDefaults?: boolean;
}

export interface GetHouseholdProfileResult {
  household: HouseholdDto;
  defaultCategories?: DefaultCategoryDto[];
}

/**
 * Service for managing household-related operations.
 */
export class HouseholdService {
  constructor(private supabase: SupabaseClientType) {}

  /**
   * Retrieves the household profile for the specified user.
   *
   * @param userId - The ID of the user whose household to retrieve
   * @param options - Options for the query (e.g., include default categories)
   * @returns Promise resolving to household data with optional default categories
   * @throws Error if household not found or database error occurs
   */
  async getHouseholdProfile(
    userId: string,
    options: GetHouseholdProfileOptions = {}
  ): Promise<GetHouseholdProfileResult> {
    const { includeDefaults = false } = options;

    // Fetch household data for the user
    const { data: householdData, error: householdError } = await this.supabase
      .from("households")
      .select("id, name, created_at, updated_at")
      .eq("user_id", userId)
      .single();

    if (householdError) {
      if (householdError.code === "PGRST116") {
        // No rows returned - household not found
        throw new Error("HOUSEHOLD_NOT_FOUND");
      }
      // Other database errors
      throw new Error("HOUSEHOLD_FETCH_FAILED");
    }

    if (!householdData) {
      throw new Error("HOUSEHOLD_NOT_FOUND");
    }

    // Map database row to DTO
    const household: HouseholdDto = {
      id: householdData.id,
      name: householdData.name,
      createdAt: householdData.created_at,
      updatedAt: householdData.updated_at,
    };

    const result: GetHouseholdProfileResult = { household };

    // Optionally fetch default categories if requested
    if (includeDefaults) {
      try {
        const { data: categoriesData, error: categoriesError } = await this.supabase
          .from("categories")
          .select("id, name")
          .eq("household_id", householdData.id)
          .order("name");

        if (categoriesError) {
          // Log error but don't fail the entire request
          console.error("Failed to fetch default categories:", categoriesError);
        } else if (categoriesData) {
          result.defaultCategories = categoriesData.map((category) => ({
            id: category.id,
            name: category.name,
          }));
        }
      } catch (error) {
        // Log error but don't fail the entire request
        console.error("Error fetching default categories:", error);
      }
    }

    return result;
  }
}

/**
 * Factory function to create a HouseholdService instance.
 *
 * @param supabase - Supabase client instance
 * @returns New HouseholdService instance
 */
export function createHouseholdService(supabase: SupabaseClientType): HouseholdService {
  return new HouseholdService(supabase);
}
