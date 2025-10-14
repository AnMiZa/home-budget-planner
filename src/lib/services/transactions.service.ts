import type { supabaseClient } from "../../db/supabase.client";
import type { TransactionDto } from "../../types";

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
