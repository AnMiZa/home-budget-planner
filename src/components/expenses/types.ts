import type { CategoryDto, TransactionDto } from "@/types";

/**
 * Wartości formularza dodawania wydatku.
 * Wszystkie pola są stringami dla kompatybilności z react-hook-form.
 */
export interface AddExpenseFormValues {
  readonly amount: string;
  readonly categoryId: string;
  readonly transactionDate: string;
  readonly note?: string;
}

/**
 * Stan hooka useAddExpense.
 */
export interface AddExpenseState {
  readonly categories: readonly CategoryDto[];
  readonly isLoadingCategories: boolean;
  readonly categoriesError: AddExpenseError | null;
  readonly isSubmitting: boolean;
  readonly submitError: string | null;
  readonly budgetId: string | null;
  readonly isLoadingBudget: boolean;
}

/**
 * Błąd operacji w hooku useAddExpense.
 */
export interface AddExpenseError {
  readonly status: number;
  readonly message: string;
  readonly code?: string;
}

/**
 * Rezultat operacji dodania wydatku.
 */
export interface AddExpenseResult {
  readonly success: boolean;
  readonly transaction?: TransactionDto;
  readonly error?: AddExpenseError;
}
