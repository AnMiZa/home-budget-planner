import { z } from "zod";

/**
 * Validation schema for budget ID path parameter.
 */
export const getBudgetSummaryParamsSchema = z.object({
  budgetId: z.string().uuid("Budget ID must be a valid UUID"),
});

/**
 * Validation schema for budget summary query parameters.
 */
export const getBudgetSummaryQuerySchema = z.object({
  includeCategories: z
    .union([z.string(), z.boolean()])
    .optional()
    .default(true)
    .transform((val) => {
      if (typeof val === "boolean") return val;
      if (typeof val === "string") {
        const normalized = val.toLowerCase();
        if (normalized === "true" || normalized === "1") return true;
        if (normalized === "false" || normalized === "0") return false;
        throw new Error("includeCategories must be true/false or 1/0");
      }
      return true;
    }),
});

/**
 * Type for validated budget summary path parameters.
 */
export type GetBudgetSummaryParams = z.infer<typeof getBudgetSummaryParamsSchema>;

/**
 * Type for validated budget summary query parameters.
 */
export type GetBudgetSummaryQuery = z.infer<typeof getBudgetSummaryQuerySchema>;

/**
 * Validation schema for creating a single planned expense.
 */
export const createPlannedExpenseSchema = z.object({
  categoryId: z.string().uuid("Category ID must be a valid UUID"),
  limitAmount: z
    .number()
    .positive("Limit amount must be greater than 0")
    .max(9999999.99, "Limit amount cannot exceed 9,999,999.99")
    .refine(
      (val) => {
        // Check for maximum 2 decimal places
        const decimalPlaces = (val.toString().split(".")[1] || "").length;
        return decimalPlaces <= 2;
      },
      {
        message: "Limit amount can have at most 2 decimal places",
      }
    ),
});

/**
 * Type for validated create planned expense command (alias to existing type).
 */
export type CreatePlannedExpenseCommand = z.infer<typeof createPlannedExpenseSchema>;

/**
 * Parses and validates budget summary path parameters.
 *
 * @param params - Path parameters to validate
 * @returns Validated GetBudgetSummaryParams
 * @throws Error with validation details if params are invalid
 */
export function parseGetBudgetSummaryParams(params: unknown): GetBudgetSummaryParams {
  const result = getBudgetSummaryParamsSchema.safeParse(params);

  if (!result.success) {
    const firstError = result.error.errors[0];
    throw new Error(`INVALID_REQUEST: ${firstError.message}`);
  }

  return result.data;
}

/**
 * Parses and validates budget summary query parameters.
 *
 * @param query - Query parameters to validate
 * @returns Validated GetBudgetSummaryQuery
 * @throws Error with validation details if query is invalid
 */
export function parseGetBudgetSummaryQuery(query: unknown): GetBudgetSummaryQuery {
  const result = getBudgetSummaryQuerySchema.safeParse(query);

  if (!result.success) {
    const firstError = result.error.errors[0];
    throw new Error(`INVALID_REQUEST: ${firstError.message}`);
  }

  return result.data;
}

/**
 * Parses and validates create planned expense request body.
 *
 * @param body - Request body to validate
 * @returns Validated CreatePlannedExpenseCommand
 * @throws Error with validation details if body is invalid
 */
export function parseCreatePlannedExpenseBody(body: unknown): CreatePlannedExpenseCommand {
  const result = createPlannedExpenseSchema.safeParse(body);

  if (!result.success) {
    const firstError = result.error.errors[0];

    // Map specific validation errors to appropriate error codes
    if (firstError?.message?.includes("Limit amount")) {
      throw new Error("INVALID_LIMIT");
    }
    if (firstError?.message?.includes("Category ID")) {
      throw new Error("INVALID_PAYLOAD");
    }

    throw new Error("INVALID_PAYLOAD");
  }

  return result.data;
}
