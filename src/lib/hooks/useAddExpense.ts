import { useCallback, useEffect, useRef, useState } from "react";

import type { AddExpenseError, AddExpenseResult, AddExpenseState } from "@/components/expenses/types";
import type {
  ApiErrorDto,
  CategoriesListResponseDto,
  CategoryDto,
  CreateTransactionCommand,
  DashboardSummaryDto,
  TransactionDto,
} from "@/types";

const CATEGORIES_ENDPOINT = "/api/categories";
const DASHBOARD_ENDPOINT = "/api/dashboard/current";

/**
 * Custom hook for managing add expense form logic.
 * Handles fetching categories, getting current budget ID, and submitting expenses.
 */
export const useAddExpense = (): AddExpenseState & {
  readonly submitExpense: (data: CreateTransactionCommand) => Promise<AddExpenseResult>;
  readonly clearSubmitError: () => void;
  readonly refetchCategories: () => Promise<void>;
} => {
  const [categories, setCategories] = useState<readonly CategoryDto[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(true);
  const [categoriesError, setCategoriesError] = useState<AddExpenseError | null>(null);

  const [budgetId, setBudgetId] = useState<string | null>(null);
  const [isLoadingBudget, setIsLoadingBudget] = useState<boolean>(true);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Fetch categories from API
   */
  const fetchCategories = useCallback(async () => {
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoadingCategories(true);
    setCategoriesError(null);

    try {
      const response = await fetch(`${CATEGORIES_ENDPOINT}?page=1&pageSize=100`, {
        method: "GET",
        signal: abortController.signal,
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const status = response.status;
        const payload = await safeParseApiError(response);

        // Redirect to login on 401
        if (status === 401) {
          window.location.href = "/login";
          return;
        }

        setCategories([]);
        setCategoriesError({
          status,
          message: payload?.error.message ?? "Nie udało się pobrać kategorii",
          code: payload?.error.code,
        });
        return;
      }

      const payload = (await response.json()) as CategoriesListResponseDto;
      setCategories(payload.data);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") {
        return;
      }

      console.error("Failed to fetch categories", cause);
      setCategories([]);
      setCategoriesError({
        status: 0,
        message: "Wystąpił błąd połączenia. Spróbuj ponownie później.",
      });
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  /**
   * Fetch current budget ID from dashboard
   */
  const fetchBudgetId = useCallback(async () => {
    setIsLoadingBudget(true);

    try {
      const response = await fetch(DASHBOARD_ENDPOINT, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const status = response.status;

        // Redirect to login on 401
        if (status === 401) {
          window.location.href = "/login";
          return;
        }

        // No active budget (404) is a valid state
        if (status === 404) {
          setBudgetId(null);
          return;
        }

        console.error("Failed to fetch budget ID", status);
        setBudgetId(null);
        return;
      }

      const payload = (await response.json()) as DashboardSummaryDto;
      setBudgetId(payload.currentBudgetId);
    } catch (cause) {
      console.error("Failed to fetch budget ID", cause);
      setBudgetId(null);
    } finally {
      setIsLoadingBudget(false);
    }
  }, []);

  /**
   * Submit expense to API
   */
  const submitExpense = useCallback(
    async (data: CreateTransactionCommand): Promise<AddExpenseResult> => {
      if (!budgetId) {
        return {
          success: false,
          error: {
            status: 404,
            message: "Nie znaleziono aktywnego budżetu",
            code: "BUDGET_NOT_FOUND",
          },
        };
      }

      setIsSubmitting(true);
      setSubmitError(null);

      try {
        const response = await fetch(`/api/budgets/${budgetId}/transactions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const status = response.status;
          const payload = await safeParseApiError(response);

          // Redirect to login on 401
          if (status === 401) {
            window.location.href = "/login";
            return {
              success: false,
              error: {
                status,
                message: "Sesja wygasła. Zaloguj się ponownie.",
                code: "UNAUTHENTICATED",
              },
            };
          }

          const errorMessage = mapApiErrorToMessage(payload?.error.code);
          setSubmitError(errorMessage);

          return {
            success: false,
            error: {
              status,
              message: errorMessage,
              code: payload?.error.code,
            },
          };
        }

        const transaction = (await response.json()) as TransactionDto;
        return {
          success: true,
          transaction,
        };
      } catch (cause) {
        console.error("Failed to submit expense", cause);
        const errorMessage = "Wystąpił błąd. Spróbuj ponownie.";
        setSubmitError(errorMessage);

        return {
          success: false,
          error: {
            status: 0,
            message: errorMessage,
          },
        };
      } finally {
        setIsSubmitting(false);
      }
    },
    [budgetId]
  );

  /**
   * Clear submit error
   */
  const clearSubmitError = useCallback(() => {
    setSubmitError(null);
  }, []);

  /**
   * Initialize hook by fetching categories and budget ID
   */
  useEffect(() => {
    void fetchCategories();
    void fetchBudgetId();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchCategories, fetchBudgetId]);

  return {
    categories,
    isLoadingCategories,
    categoriesError,
    budgetId,
    isLoadingBudget,
    isSubmitting,
    submitError,
    submitExpense,
    clearSubmitError,
    refetchCategories: fetchCategories,
  };
};

/**
 * Safely parse API error response
 */
const safeParseApiError = async (response: Response): Promise<ApiErrorDto | undefined> => {
  try {
    const text = await response.text();
    if (!text) {
      return undefined;
    }

    return JSON.parse(text) as ApiErrorDto;
  } catch (cause) {
    console.warn("Could not parse API error response", cause);
    return undefined;
  }
};

/**
 * Map API error codes to user-friendly messages
 */
const mapApiErrorToMessage = (code?: string): string => {
  switch (code) {
    case "INVALID_AMOUNT":
      return "Wprowadź prawidłową kwotę";
    case "INVALID_DATE":
      return "Wprowadź prawidłową datę";
    case "INVALID_CATEGORY_ID":
      return "Wybierz prawidłową kategorię";
    case "CATEGORY_MISMATCH":
      return "Wybrana kategoria nie jest dostępna";
    case "BUDGET_NOT_FOUND":
      return "Nie znaleziono aktywnego budżetu";
    case "UNAUTHENTICATED":
      return "Sesja wygasła. Zaloguj się ponownie.";
    default:
      return "Wystąpił błąd. Spróbuj ponownie.";
  }
};
