import { APIRequestContext } from "@playwright/test";

/**
 * API Testing Helpers
 *
 * Use these helpers to test backend endpoints directly
 * This is faster than UI testing for backend validation
 */

/**
 * Create a budget via API (for test setup)
 */
export async function createBudgetViaAPI(
  request: APIRequestContext,
  data: {
    name: string;
    period: string;
    note?: string;
  },
  authToken?: string
) {
  const response = await request.post("/api/budgets", {
    data,
    headers: authToken
      ? {
          Authorization: `Bearer ${authToken}`,
        }
      : {},
  });

  return response;
}

/**
 * Delete a budget via API (for test cleanup)
 */
export async function deleteBudgetViaAPI(request: APIRequestContext, budgetId: string, authToken?: string) {
  const response = await request.delete(`/api/budgets/${budgetId}`, {
    headers: authToken
      ? {
          Authorization: `Bearer ${authToken}`,
        }
      : {},
  });

  return response;
}

/**
 * Get current dashboard data via API
 */
export async function getDashboardViaAPI(request: APIRequestContext, authToken?: string) {
  const response = await request.get("/api/dashboard/current", {
    headers: authToken
      ? {
          Authorization: `Bearer ${authToken}`,
        }
      : {},
  });

  return response;
}
