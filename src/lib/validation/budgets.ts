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
