import { z } from "zod";
import type { CreateTransactionCommand, UpdateTransactionCommand } from "../../types";

/**
 * Validation schema for creating a new transaction.
 */
export const createTransactionSchema = z.object({
  categoryId: z.string().uuid("Category ID must be a valid UUID"),

  amount: z
    .number({
      required_error: "Amount is required",
      invalid_type_error: "Amount must be a number",
    })
    .positive("Amount must be greater than 0")
    .refine((val) => {
      // Check if the number has at most 2 decimal places
      const decimalPlaces = (val.toString().split(".")[1] || "").length;
      return decimalPlaces <= 2;
    }, "Amount cannot have more than 2 decimal places"),

  transactionDate: z
    .string({
      required_error: "Transaction date is required",
      invalid_type_error: "Transaction date must be a string",
    })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Transaction date must be in YYYY-MM-DD format")
    .refine((date) => !isNaN(Date.parse(date)), "Transaction date must be a valid date"),

  note: z.string().max(500, "Note cannot exceed 500 characters").optional(),
});

/**
 * Type for validated create transaction data.
 */
export type CreateTransactionData = z.infer<typeof createTransactionSchema>;

/**
 * Parses and validates create transaction request body.
 *
 * @param body - Request body to validate
 * @returns Validated CreateTransactionCommand
 * @throws Error with validation details if body is invalid
 */
export function parseCreateTransactionBody(body: unknown): CreateTransactionCommand {
  const result = createTransactionSchema.safeParse(body);

  if (!result.success) {
    const firstError = result.error.errors[0];

    // Map specific field errors to detailed error codes
    const fieldErrorMap: Record<string, string> = {
      categoryId: "INVALID_CATEGORY_ID",
      amount: "INVALID_AMOUNT",
      transactionDate: "INVALID_DATE",
      note: "INVALID_NOTE",
    };

    const errorCode = fieldErrorMap[firstError.path[0] as string] || "INVALID_BODY";
    throw new Error(`${errorCode}: ${firstError.message}`);
  }

  return result.data;
}

/**
 * Validation schema for updating an existing transaction.
 * All fields are optional, but at least one field must be provided.
 */
export const updateTransactionSchema = z
  .object({
    categoryId: z.string().uuid("Category ID must be a valid UUID").optional(),

    amount: z
      .number({
        invalid_type_error: "Amount must be a number",
      })
      .positive("Amount must be greater than 0")
      .refine((val) => {
        // Check if the number has at most 2 decimal places
        const decimalPlaces = (val.toString().split(".")[1] || "").length;
        return decimalPlaces <= 2;
      }, "Amount cannot have more than 2 decimal places")
      .optional(),

    transactionDate: z
      .string({
        invalid_type_error: "Transaction date must be a string",
      })
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Transaction date must be in YYYY-MM-DD format")
      .refine((date) => !isNaN(Date.parse(date)), "Transaction date must be a valid date")
      .optional(),

    note: z.union([z.string().max(500, "Note cannot exceed 500 characters"), z.null()]).optional(),
  })
  .refine(
    (data) => {
      // At least one field must be provided
      return Object.values(data).some((value) => value !== undefined);
    },
    {
      message: "At least one field must be provided for update",
      path: [],
    }
  );

/**
 * Type for validated update transaction data.
 */
export type UpdateTransactionData = z.infer<typeof updateTransactionSchema>;

/**
 * Parses and validates update transaction request body.
 *
 * @param body - Request body to validate
 * @returns Validated UpdateTransactionCommand
 * @throws Error with validation details if body is invalid
 */
export function parseUpdateTransactionBody(body: unknown): UpdateTransactionCommand {
  const result = updateTransactionSchema.safeParse(body);

  if (!result.success) {
    const firstError = result.error.errors[0];

    // Map specific field errors to detailed error codes
    const fieldErrorMap: Record<string, string> = {
      categoryId: "INVALID_CATEGORY_ID",
      amount: "INVALID_AMOUNT",
      transactionDate: "INVALID_DATE",
      note: "INVALID_NOTE",
    };

    const errorCode = fieldErrorMap[firstError.path[0] as string] || "INVALID_BODY";
    throw new Error(`${errorCode}: ${firstError.message}`);
  }

  return result.data;
}

/**
 * Validation schema for transactions list query parameters.
 */
export const transactionsQuerySchema = z
  .object({
    // Path parameters
    budgetId: z.string().uuid("Budget ID must be a valid UUID"),

    // Query parameters
    categoryId: z.string().uuid("Category ID must be a valid UUID").optional(),

    fromDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "From date must be in YYYY-MM-DD format")
      .refine((date) => !isNaN(Date.parse(date)), "From date must be a valid date")
      .optional(),

    toDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "To date must be in YYYY-MM-DD format")
      .refine((date) => !isNaN(Date.parse(date)), "To date must be a valid date")
      .optional(),

    searchNote: z.string().max(500, "Search note cannot exceed 500 characters").optional(),

    page: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().min(1, "Page must be at least 1"))
      .default("1"),

    pageSize: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().min(1, "Page size must be at least 1").max(100, "Page size cannot exceed 100"))
      .default("25"),

    sort: z
      .enum(["date_desc", "amount_desc", "amount_asc"], {
        errorMap: () => ({ message: "Sort must be one of: date_desc, amount_desc, amount_asc" }),
      })
      .default("date_desc"),
  })
  .refine(
    (data) => {
      // Validate that fromDate <= toDate if both are provided
      if (data.fromDate && data.toDate) {
        const from = new Date(data.fromDate);
        const to = new Date(data.toDate);
        return from <= to;
      }
      return true;
    },
    {
      message: "From date must be less than or equal to to date",
      path: ["fromDate"],
    }
  );

/**
 * Type for validated transactions query parameters.
 */
export type TransactionsQueryParams = z.infer<typeof transactionsQuerySchema>;

/**
 * Interface for transaction list filters used by the service layer.
 */
export interface ListTransactionsFilters {
  categoryId?: string;
  fromDate?: string;
  toDate?: string;
  searchNote?: string;
  page: number;
  pageSize: number;
  sort: "date_desc" | "amount_desc" | "amount_asc";
}

/**
 * Validation schema for transaction ID path parameter.
 */
export const transactionIdParamSchema = z.object({
  transactionId: z.string().uuid("Transaction ID must be a valid UUID"),
});

/**
 * Type for validated transaction ID parameter.
 */
export type TransactionIdParams = z.infer<typeof transactionIdParamSchema>;

/**
 * Parses and validates transaction ID from path parameters.
 *
 * @param params - Path parameters containing transactionId
 * @returns Validated transaction ID
 * @throws Error with validation details if transactionId is invalid
 */
export function parseTransactionIdParam(params: { transactionId: string }): string {
  const result = transactionIdParamSchema.safeParse(params);

  if (!result.success) {
    const firstError = result.error.errors[0];
    throw new Error(`INVALID_TRANSACTION_ID: ${firstError.message}`);
  }

  return result.data.transactionId;
}

/**
 * Parses and validates transactions query parameters from URL search params.
 *
 * @param params - Path parameters containing budgetId
 * @param searchParams - URL search parameters
 * @returns Validated query parameters
 * @throws Error with validation details if parameters are invalid
 */
export function parseTransactionsQuery(
  params: { budgetId: string },
  searchParams: URLSearchParams
): TransactionsQueryParams {
  const rawData = {
    budgetId: params.budgetId,
    categoryId: searchParams.get("categoryId") || undefined,
    fromDate: searchParams.get("fromDate") || undefined,
    toDate: searchParams.get("toDate") || undefined,
    searchNote: searchParams.get("searchNote") || undefined,
    page: searchParams.get("page") || "1",
    pageSize: searchParams.get("pageSize") || "25",
    sort: searchParams.get("sort") || "date_desc",
  };

  const result = transactionsQuerySchema.safeParse(rawData);

  if (!result.success) {
    const firstError = result.error.errors[0];
    throw new Error(`INVALID_QUERY_PARAMS: ${firstError.message}`);
  }

  return result.data;
}
