import type { supabaseClient } from "../../db/supabase.client";
import type { TransactionDto, UpdateTransactionCommand } from "../../types";

export type SupabaseClientType = typeof supabaseClient;

/**
 * Service for managing transactions operations.
 */
export class TransactionsService {
  constructor(private supabase: SupabaseClientType) {}

  /**
   * Retrieves a single transaction by ID for the authenticated user's household.
   *
   * @param userId - The authenticated user's ID
   * @param transactionId - The transaction ID to retrieve
   * @returns Promise resolving to TransactionDto
   * @throws Error with specific error codes for different failure scenarios
   */
  async getTransactionById(userId: string, transactionId: string): Promise<TransactionDto> {
    // First, get the household_id for the user
    const { data: householdData, error: householdError } = await this.supabase
      .from("households")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (householdError) {
      console.error("Error fetching household for user:", householdError);
      throw new Error("TRANSACTION_FETCH_FAILED");
    }

    if (!householdData) {
      // User has no household - treat as transaction not found to avoid revealing data structure
      throw new Error("TRANSACTION_NOT_FOUND");
    }

    // Fetch the transaction, ensuring it belongs to the user's household
    const { data: transactionData, error: transactionError } = await this.supabase
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .eq("household_id", householdData.id)
      .single();

    if (transactionError) {
      if (transactionError.code === "PGRST116") {
        // No rows returned - transaction not found or doesn't belong to user's household
        throw new Error("TRANSACTION_NOT_FOUND");
      }
      console.error("Error fetching transaction:", transactionError);
      throw new Error("TRANSACTION_FETCH_FAILED");
    }

    if (!transactionData) {
      throw new Error("TRANSACTION_NOT_FOUND");
    }

    return this.mapTransactionToDto(transactionData);
  }

  /**
   * Updates a transaction for the authenticated user's household.
   *
   * @param userId - The authenticated user's ID
   * @param transactionId - The transaction ID to update
   * @param command - The update command containing fields to update
   * @returns Promise resolving to updated TransactionDto
   * @throws Error with specific error codes for different failure scenarios
   */
  async updateTransaction(
    userId: string,
    transactionId: string,
    command: UpdateTransactionCommand
  ): Promise<TransactionDto> {
    // First, get the household_id for the user
    const { data: householdData, error: householdError } = await this.supabase
      .from("households")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (householdError) {
      console.error("Error fetching household for user:", householdError);
      throw new Error("TRANSACTION_UPDATE_FAILED");
    }

    if (!householdData) {
      // User has no household - treat as transaction not found to avoid revealing data structure
      throw new Error("TRANSACTION_NOT_FOUND");
    }

    // First, verify the transaction exists and belongs to the user's household
    const { data: existingTransaction, error: fetchError } = await this.supabase
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .eq("household_id", householdData.id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        // No rows returned - transaction not found or doesn't belong to user's household
        throw new Error("TRANSACTION_NOT_FOUND");
      }
      console.error("Error fetching transaction for update:", fetchError);
      throw new Error("TRANSACTION_UPDATE_FAILED");
    }

    if (!existingTransaction) {
      throw new Error("TRANSACTION_NOT_FOUND");
    }

    // If categoryId is provided, verify it belongs to the same household
    if (command.categoryId) {
      const { data: categoryData, error: categoryError } = await this.supabase
        .from("categories")
        .select("id")
        .eq("id", command.categoryId)
        .eq("household_id", householdData.id)
        .single();

      if (categoryError) {
        if (categoryError.code === "PGRST116") {
          // Category not found or doesn't belong to household
          throw new Error("INVALID_CATEGORY_ID");
        }
        console.error("Error validating category:", categoryError);
        throw new Error("TRANSACTION_UPDATE_FAILED");
      }

      if (!categoryData) {
        throw new Error("INVALID_CATEGORY_ID");
      }
    }

    // Prepare update object with only provided fields
    const updateData: Record<string, any> = {};

    if (command.categoryId !== undefined) {
      updateData.category_id = command.categoryId;
    }
    if (command.amount !== undefined) {
      updateData.amount = command.amount;
    }
    if (command.transactionDate !== undefined) {
      updateData.transaction_date = command.transactionDate;
    }
    if (command.note !== undefined) {
      updateData.note = command.note;
    }

    // Perform the update
    const { data: updatedTransaction, error: updateError } = await this.supabase
      .from("transactions")
      .update(updateData)
      .eq("id", transactionId)
      .eq("household_id", householdData.id)
      .select("*")
      .single();

    if (updateError) {
      console.error("Error updating transaction:", updateError);

      // Handle specific database constraint violations
      if (updateError.code === "23503") {
        // Foreign key constraint violation
        throw new Error("INVALID_CATEGORY_ID");
      }
      if (updateError.code === "23514") {
        // Check constraint violation
        throw new Error("TRANSACTION_UPDATE_FAILED");
      }

      throw new Error("TRANSACTION_UPDATE_FAILED");
    }

    if (!updatedTransaction) {
      throw new Error("TRANSACTION_UPDATE_FAILED");
    }

    return this.mapTransactionToDto(updatedTransaction);
  }

  /**
   * Maps a database transaction record to TransactionDto.
   *
   * This method is duplicated from BudgetsService to maintain service independence.
   * If this pattern becomes common, consider extracting to a shared utility.
   *
   * @param transaction - The transaction record from the database
   * @returns Mapped TransactionDto
   */
  private mapTransactionToDto(transaction: any): TransactionDto {
    return {
      id: transaction.id,
      householdId: transaction.household_id,
      budgetId: transaction.budget_id,
      categoryId: transaction.category_id,
      amount: Number(transaction.amount),
      transactionDate: transaction.transaction_date,
      note: transaction.note,
      createdAt: transaction.created_at,
      updatedAt: transaction.updated_at,
    };
  }
}

/**
 * Factory function to create a TransactionsService instance.
 *
 * @param supabase - Supabase client instance
 * @returns TransactionsService instance
 */
export function createTransactionsService(supabase: SupabaseClientType): TransactionsService {
  return new TransactionsService(supabase);
}
