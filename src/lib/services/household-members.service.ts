import type { supabaseClient } from "../../db/supabase.client";
import type {
  HouseholdMemberDto,
  PaginationMetaDto,
  HouseholdMembersListResponseDto,
  CreateHouseholdMemberCommand,
  UpdateHouseholdMemberCommand,
} from "../../types";

export type SupabaseClientType = typeof supabaseClient;

export interface ListMembersOptions {
  includeInactive?: boolean;
  page?: number;
  pageSize?: number;
  sort?: "fullName" | "createdAt";
}

/**
 * Service for managing household members operations.
 */
export class HouseholdMembersService {
  constructor(private supabase: SupabaseClientType) {}

  /**
   * Lists household members for the specified user with pagination and filtering.
   *
   * @param userId - The ID of the user whose household members to retrieve
   * @param options - Options for filtering, pagination, and sorting
   * @returns Promise resolving to paginated list of household members
   * @throws Error if household not found or database error occurs
   */
  async listMembers(userId: string, options: ListMembersOptions = {}): Promise<HouseholdMembersListResponseDto> {
    const { includeInactive = false, page = 1, pageSize = 20, sort = "fullName" } = options;

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
      throw new Error("MEMBERS_LIST_FAILED");
    }

    if (!householdData) {
      throw new Error("HOUSEHOLD_NOT_FOUND");
    }

    const householdId = householdData.id;

    // Calculate offset for pagination
    const offset = (page - 1) * pageSize;

    // Build the query for household members
    let query = this.supabase
      .from("household_members")
      .select("id, full_name, is_active, created_at, updated_at", { count: "exact" })
      .eq("household_id", householdId);

    // Apply active/inactive filter
    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    // Apply sorting
    if (sort === "fullName") {
      query = query.order("full_name", { ascending: true });
    } else if (sort === "createdAt") {
      query = query.order("created_at", { ascending: true });
    }

    // Apply pagination
    query = query.range(offset, offset + pageSize - 1);

    // Execute the query
    const { data: membersData, error: membersError, count } = await query;

    if (membersError) {
      console.error("Database error while fetching household members:", membersError);
      throw new Error("MEMBERS_LIST_FAILED");
    }

    // Map database rows to DTOs
    const members: HouseholdMemberDto[] = (membersData || []).map((member) => ({
      id: member.id,
      fullName: member.full_name,
      isActive: member.is_active,
      createdAt: member.created_at,
      updatedAt: member.updated_at,
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
      data: members,
      meta,
    };
  }

  /**
   * Creates a new household member for the specified user's household.
   *
   * @param userId - The ID of the user whose household to add the member to
   * @param command - The command containing member data to create
   * @returns Promise resolving to the created household member DTO
   * @throws Error if household not found, name conflict, or database error occurs
   */
  async createMember(userId: string, command: CreateHouseholdMemberCommand): Promise<HouseholdMemberDto> {
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
      throw new Error("MEMBER_CREATE_FAILED");
    }

    if (!householdData) {
      throw new Error("HOUSEHOLD_NOT_FOUND");
    }

    const householdId = householdData.id;

    // Check for duplicate name (case-insensitive) within the household
    const { data: existingMember, error: duplicateCheckError } = await this.supabase
      .from("household_members")
      .select("id")
      .eq("household_id", householdId)
      .ilike("full_name", command.fullName)
      .limit(1)
      .single();

    if (duplicateCheckError && duplicateCheckError.code !== "PGRST116") {
      // Error other than "no rows returned"
      console.error("Database error while checking for duplicate member name:", duplicateCheckError);
      throw new Error("MEMBER_CREATE_FAILED");
    }

    if (existingMember) {
      // Member with this name already exists (case-insensitive)
      throw new Error("MEMBER_NAME_CONFLICT");
    }

    // Insert the new household member
    const { data: newMember, error: insertError } = await this.supabase
      .from("household_members")
      .insert({
        household_id: householdId,
        full_name: command.fullName,
        is_active: true,
      })
      .select("id, full_name, is_active, created_at, updated_at")
      .single();

    if (insertError) {
      console.error("Database error while creating household member:", insertError);
      throw new Error("MEMBER_CREATE_FAILED");
    }

    if (!newMember) {
      throw new Error("MEMBER_CREATE_FAILED");
    }

    // Map database row to DTO
    return {
      id: newMember.id,
      fullName: newMember.full_name,
      isActive: newMember.is_active,
      createdAt: newMember.created_at,
      updatedAt: newMember.updated_at,
    };
  }

  /**
   * Updates an existing household member for the specified user's household.
   *
   * @param userId - The ID of the user whose household member to update
   * @param memberId - The ID of the household member to update
   * @param command - The command containing updated member data
   * @returns Promise resolving to the updated household member DTO
   * @throws Error if household not found, member not found, name conflict, or database error occurs
   */
  async updateMember(
    userId: string,
    memberId: string,
    command: UpdateHouseholdMemberCommand
  ): Promise<HouseholdMemberDto> {
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
      throw new Error("MEMBER_UPDATE_FAILED");
    }

    if (!householdData) {
      throw new Error("HOUSEHOLD_NOT_FOUND");
    }

    const householdId = householdData.id;

    // Check if the member exists and belongs to the user's household
    const { data: existingMember, error: memberFetchError } = await this.supabase
      .from("household_members")
      .select("id, full_name, is_active")
      .eq("id", memberId)
      .eq("household_id", householdId)
      .single();

    if (memberFetchError) {
      if (memberFetchError.code === "PGRST116") {
        // No rows returned - member not found
        throw new Error("MEMBER_NOT_FOUND");
      }
      // Other database errors
      console.error("Database error while fetching household member:", memberFetchError);
      throw new Error("MEMBER_UPDATE_FAILED");
    }

    if (!existingMember) {
      throw new Error("MEMBER_NOT_FOUND");
    }

    // If fullName is being updated, check for duplicate name (case-insensitive) within the household
    if (command.fullName !== undefined) {
      const { data: duplicateMember, error: duplicateCheckError } = await this.supabase
        .from("household_members")
        .select("id")
        .eq("household_id", householdId)
        .ilike("full_name", command.fullName)
        .neq("id", memberId) // Exclude the current member
        .limit(1)
        .single();

      if (duplicateCheckError && duplicateCheckError.code !== "PGRST116") {
        // Error other than "no rows returned"
        console.error("Database error while checking for duplicate member name:", duplicateCheckError);
        throw new Error("MEMBER_UPDATE_FAILED");
      }

      if (duplicateMember) {
        // Member with this name already exists (case-insensitive)
        throw new Error("MEMBER_NAME_CONFLICT");
      }
    }

    // Prepare update data
    const updateData: Record<string, string | boolean> = {};
    if (command.fullName !== undefined) {
      updateData.full_name = command.fullName;
    }
    if (command.isActive !== undefined) {
      updateData.is_active = command.isActive;
    }

    // Update the household member
    const { data: updatedMember, error: updateError } = await this.supabase
      .from("household_members")
      .update(updateData)
      .eq("id", memberId)
      .eq("household_id", householdId) // Additional security check via RLS
      .select("id, full_name, is_active, created_at, updated_at")
      .single();

    if (updateError) {
      console.error("Database error while updating household member:", updateError);
      throw new Error("MEMBER_UPDATE_FAILED");
    }

    if (!updatedMember) {
      throw new Error("MEMBER_UPDATE_FAILED");
    }

    // Map database row to DTO
    return {
      id: updatedMember.id,
      fullName: updatedMember.full_name,
      isActive: updatedMember.is_active,
      createdAt: updatedMember.created_at,
      updatedAt: updatedMember.updated_at,
    };
  }

  /**
   * Deactivates (soft-deletes) an existing household member for the specified user's household.
   * Sets is_active to false while preserving historical data.
   *
   * @param userId - The ID of the user whose household member to deactivate
   * @param memberId - The ID of the household member to deactivate
   * @returns Promise resolving when the member is successfully deactivated
   * @throws Error if household not found, member not found, or database error occurs
   */
  async deactivateMember(userId: string, memberId: string): Promise<void> {
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
      throw new Error("MEMBER_DEACTIVATE_FAILED");
    }

    if (!householdData) {
      throw new Error("HOUSEHOLD_NOT_FOUND");
    }

    const householdId = householdData.id;

    // Check if the member exists and belongs to the user's household
    const { data: existingMember, error: memberFetchError } = await this.supabase
      .from("household_members")
      .select("id, is_active")
      .eq("id", memberId)
      .eq("household_id", householdId)
      .single();

    if (memberFetchError) {
      if (memberFetchError.code === "PGRST116") {
        // No rows returned - member not found
        throw new Error("MEMBER_NOT_FOUND");
      }
      // Other database errors
      console.error("Database error while fetching household member:", memberFetchError);
      throw new Error("MEMBER_DEACTIVATE_FAILED");
    }

    if (!existingMember) {
      throw new Error("MEMBER_NOT_FOUND");
    }

    // Deactivate the household member (idempotent operation)
    const { error: updateError } = await this.supabase
      .from("household_members")
      .update({ is_active: false })
      .eq("id", memberId)
      .eq("household_id", householdId); // Additional security check via RLS

    if (updateError) {
      console.error("Database error while deactivating household member:", updateError);
      throw new Error("MEMBER_DEACTIVATE_FAILED");
    }
  }
}

/**
 * Factory function to create a HouseholdMembersService instance.
 *
 * @param supabase - Supabase client instance
 * @returns New HouseholdMembersService instance
 */
export function createHouseholdMembersService(supabase: SupabaseClientType): HouseholdMembersService {
  return new HouseholdMembersService(supabase);
}
