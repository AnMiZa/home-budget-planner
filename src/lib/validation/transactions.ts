import { z } from "zod";

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
