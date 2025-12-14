import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  ApiErrorDto,
  CategoryDto,
  DashboardSummaryDto,
  PaginationMetaDto,
  TransactionDto,
  TransactionsListResponseDto,
  UpdateTransactionCommand,
} from "@/types";

export interface TransactionVM extends TransactionDto {
  readonly categoryName: string;
}

interface TransactionsState {
  readonly transactions: readonly TransactionVM[];
  readonly meta: PaginationMetaDto | null;
  readonly isLoading: boolean;
  readonly isLoadingMore: boolean;
  readonly error: TransactionsError | null;
  readonly categories: readonly CategoryDto[];
  readonly operationResult: TransactionOperationResult | null;
  readonly loadMoreError: TransactionsError | null;
}

export interface TransactionsError {
  readonly status: number;
  readonly message: string;
  readonly payload?: ApiErrorDto;
}

export type TransactionOperationType = "update" | "delete";

export interface TransactionOperationResult {
  readonly type: TransactionOperationType;
  readonly status: "success" | "error";
  readonly message: string;
}

export interface UseTransactionsHistoryOptions {
  readonly pageSize?: number;
}

export interface UseTransactionsHistoryResult {
  readonly transactions: readonly TransactionVM[];
  readonly categories: readonly CategoryDto[];
  readonly meta: PaginationMetaDto | null;
  readonly isLoading: boolean;
  readonly isLoadingMore: boolean;
  readonly error: TransactionsError | null;
  readonly operationResult: TransactionOperationResult | null;
  readonly loadMoreError: TransactionsError | null;
  readonly loadPage: (page: number) => Promise<void>;
  readonly loadNextPage: () => Promise<void>;
  readonly refresh: () => Promise<void>;
  readonly updateTransaction: (transactionId: string, data: UpdateTransactionCommand) => Promise<void>;
  readonly deleteTransaction: (transactionId: string) => Promise<void>;
  readonly retry: () => Promise<void>;
  readonly clearOperationResult: () => void;
  readonly clearLoadMoreError: () => void;
}

const DASHBOARD_ENDPOINT = "/api/dashboard/current";
const CATEGORIES_ENDPOINT = "/api/categories";
const DEFAULT_PAGE_SIZE = 20;
const MAX_CATEGORIES_PER_PAGE = 100;

export const useTransactionsHistory = ({
  pageSize = DEFAULT_PAGE_SIZE,
}: UseTransactionsHistoryOptions = {}): UseTransactionsHistoryResult => {
  const [state, setState] = useState<TransactionsState>({
    transactions: [],
    meta: null,
    isLoading: true,
    isLoadingMore: false,
    error: null,
    categories: [],
    operationResult: null,
    loadMoreError: null,
  });

  const budgetIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const mapTransactionDtoToVM = useCallback(
    (transaction: TransactionDto, categoriesIndex: Map<string, string>): TransactionVM => ({
      ...transaction,
      categoryName: categoriesIndex.get(transaction.categoryId) ?? "Nieznana kategoria",
    }),
    []
  );

  const fetchCurrentBudgetId = useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch(DASHBOARD_ENDPOINT, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as DashboardSummaryDto;

      return payload.currentBudgetId ?? payload.summary?.budgetId ?? null;
    } catch (cause) {
      console.error("Failed to fetch current budget summary", cause);
      return null;
    }
  }, []);

  const parseErrorResponse = useCallback(async (response: Response): Promise<TransactionsError> => {
    const status = response.status;
    let payload: ApiErrorDto | undefined;

    try {
      const text = await response.text();
      payload = text ? (JSON.parse(text) as ApiErrorDto) : undefined;
    } catch (parseError) {
      console.warn("Unable to parse transactions API error", parseError);
    }

    return {
      status,
      message:
        payload?.error.message ??
        (status === 404
          ? "Nie znaleziono transakcji dla bieżącego budżetu."
          : status === 401
            ? "Twoja sesja wygasła. Zaloguj się ponownie."
            : "Nie udało się pobrać historii transakcji."),
      payload,
    };
  }, []);

  const parseCategoriesResponse = useCallback(
    async (response: Response) => {
      if (!response.ok) {
        throw await parseErrorResponse(response);
      }

      const payload = (await response.json()) as { data: CategoryDto[] };
      return payload.data;
    },
    [parseErrorResponse]
  );

  const fetchCategories = useCallback(async (): Promise<readonly CategoryDto[]> => {
    const url = new URL(CATEGORIES_ENDPOINT, window.location.origin);
    url.searchParams.set("page", "1");
    url.searchParams.set("pageSize", MAX_CATEGORIES_PER_PAGE.toString());

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (response.status === 404) {
      return [];
    }

    return await parseCategoriesResponse(response);
  }, [parseCategoriesResponse]);

  const buildTransactionsEndpoint = useCallback(
    (budgetId: string, page: number) => {
      const url = new URL(`/api/budgets/${budgetId}/transactions`, window.location.origin);
      url.searchParams.set("page", page.toString());
      url.searchParams.set("pageSize", pageSize.toString());
      url.searchParams.set("sort", "date_desc");
      return url;
    },
    [pageSize]
  );

  const fetchTransactionsPage = useCallback(
    async (budgetId: string, page: number, signal: AbortSignal): Promise<TransactionsListResponseDto> => {
      const url = buildTransactionsEndpoint(budgetId, page);

      const response = await fetch(url, {
        method: "GET",
        signal,
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw await parseErrorResponse(response);
      }

      return (await response.json()) as TransactionsListResponseDto;
    },
    [buildTransactionsEndpoint, parseErrorResponse]
  );

  const mergeTransactions = useCallback(
    (existing: readonly TransactionVM[], incoming: readonly TransactionDto[], categoriesIndex: Map<string, string>) => {
      const incomingVMs = incoming.map((transaction) => mapTransactionDtoToVM(transaction, categoriesIndex));
      const deduplicated = new Map<string, TransactionVM>();

      for (const transaction of existing) {
        deduplicated.set(transaction.id, transaction);
      }

      for (const transaction of incomingVMs) {
        deduplicated.set(transaction.id, transaction);
      }

      return Array.from(deduplicated.values()).sort((a, b) => (a.transactionDate < b.transactionDate ? 1 : -1));
    },
    [mapTransactionDtoToVM]
  );

  const loadInitialData = useCallback(async () => {
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setState((previous) => ({
      ...previous,
      isLoading: true,
      error: null,
      operationResult: previous.operationResult,
      loadMoreError: null,
    }));

    try {
      if (!budgetIdRef.current) {
        budgetIdRef.current = await fetchCurrentBudgetId();
      }

      if (!budgetIdRef.current) {
        setState((previous) => ({
          ...previous,
          transactions: [],
          meta: null,
          isLoading: false,
          error: {
            status: 404,
            message: "Nie znaleziono aktywnego budżetu. Utwórz budżet, aby przeglądać transakcje.",
          },
        }));
        return;
      }

      const [categoriesList, listResponse] = await Promise.all([
        state.categories.length > 0 ? Promise.resolve(state.categories) : fetchCategories(),
        fetchTransactionsPage(budgetIdRef.current, 1, abortController.signal),
      ]);

      const categoriesIndex = new Map(categoriesList.map((category) => [category.id, category.name]));

      setState({
        transactions: listResponse.data.map((transaction) => mapTransactionDtoToVM(transaction, categoriesIndex)),
        meta: listResponse.meta,
        isLoading: false,
        isLoadingMore: false,
        error: null,
        categories: categoriesList,
        operationResult: null,
        loadMoreError: null,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      const transactionsError =
        typeof error === "object" && error !== null && "status" in error
          ? (error as TransactionsError)
          : ({
              status: 0,
              message: "Wystąpił błąd połączenia. Spróbuj ponownie później.",
            } satisfies TransactionsError);

      setState((previous) => ({
        ...previous,
        isLoading: false,
        isLoadingMore: false,
        error: transactionsError,
        operationResult: previous.operationResult,
        loadMoreError: null,
      }));
    }
  }, [fetchCategories, fetchCurrentBudgetId, fetchTransactionsPage, mapTransactionDtoToVM, state.categories.length]);

  useEffect(() => {
    void loadInitialData();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [loadInitialData]);

  const loadPage = useCallback(
    async (page: number) => {
      if (!budgetIdRef.current) {
        await loadInitialData();
        return;
      }

      abortControllerRef.current?.abort();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setState((previous) => ({
        ...previous,
        isLoading: page === 1,
        isLoadingMore: page > 1,
        error: null,
        operationResult: previous.operationResult,
        loadMoreError: null,
      }));

      try {
        const categoriesList = state.categories.length > 0 ? state.categories : await fetchCategories();
        const response = await fetchTransactionsPage(budgetIdRef.current, page, abortController.signal);
        const categoriesIndex = new Map(categoriesList.map((category) => [category.id, category.name]));

        setState({
          transactions: response.data.map((transaction) => mapTransactionDtoToVM(transaction, categoriesIndex)),
          meta: response.meta,
          isLoading: false,
          isLoadingMore: false,
          error: null,
          categories: categoriesList,
          operationResult: null,
          loadMoreError: null,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        const transactionsError =
          typeof error === "object" && error !== null && "status" in error
            ? (error as TransactionsError)
            : ({
                status: 0,
                message: "Wystąpił błąd połączenia. Spróbuj ponownie później.",
              } satisfies TransactionsError);

        setState((previous) => ({
          ...previous,
          isLoading: false,
          isLoadingMore: false,
          error: transactionsError,
          operationResult: previous.operationResult,
          loadMoreError: null,
        }));
      }
    },
    [fetchCategories, fetchTransactionsPage, loadInitialData, mapTransactionDtoToVM, state.categories]
  );

  const loadNextPage = useCallback(async () => {
    const { meta } = state;

    if (!meta || meta.page >= meta.totalPages || state.isLoadingMore) {
      return;
    }

    if (!budgetIdRef.current) {
      await loadInitialData();
      return;
    }

    const nextPage = meta.page + 1;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setState((previous) => ({
      ...previous,
      isLoadingMore: true,
      error: null,
      operationResult: previous.operationResult,
      loadMoreError: null,
    }));

    try {
      const categoriesList = state.categories.length > 0 ? state.categories : await fetchCategories();
      const response = await fetchTransactionsPage(budgetIdRef.current, nextPage, abortController.signal);
      const categoriesIndex = new Map(categoriesList.map((category) => [category.id, category.name]));

      setState((previous) => ({
        transactions: mergeTransactions(previous.transactions, response.data, categoriesIndex),
        meta: response.meta,
        isLoading: false,
        isLoadingMore: false,
        error: null,
        categories: categoriesList,
        operationResult: previous.operationResult,
        loadMoreError: null,
      }));
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      const transactionsError =
        typeof error === "object" && error !== null && "status" in error
          ? (error as TransactionsError)
          : ({
              status: 0,
              message: "Wystąpił błąd połączenia. Spróbuj ponownie później.",
            } satisfies TransactionsError);

      setState((previous) => ({
        ...previous,
        isLoadingMore: false,
        error: transactionsError,
        operationResult: previous.operationResult,
        loadMoreError: transactionsError,
      }));
    }
  }, [fetchCategories, fetchTransactionsPage, loadInitialData, mergeTransactions, state]);

  const refresh = useCallback(async () => {
    setState((previous) => ({
      ...previous,
      operationResult: null,
      loadMoreError: null,
    }));
    await loadInitialData();
  }, [loadInitialData]);

  const retry = useCallback(async () => {
    setState((previous) => ({
      ...previous,
      operationResult: null,
      loadMoreError: null,
    }));
    await loadInitialData();
  }, [loadInitialData]);

  const updateTransaction = useCallback(
    async (transactionId: string, data: UpdateTransactionCommand) => {
      try {
        const response = await fetch(`/api/transactions/${transactionId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw await parseErrorResponse(response);
        }

        const updatedTransaction = (await response.json()) as TransactionDto;
        const categoriesIndex = new Map(state.categories.map((category) => [category.id, category.name]));

        setState((previous) => ({
          ...previous,
          transactions: previous.transactions.map((transaction) =>
            transaction.id === transactionId ? mapTransactionDtoToVM(updatedTransaction, categoriesIndex) : transaction
          ),
          operationResult: {
            type: "update",
            status: "success",
            message: "Transakcja została zaktualizowana.",
          },
          loadMoreError: null,
        }));
      } catch (error) {
        console.error("Failed to update transaction", error);
        const errorMessage =
          typeof error === "object" && error !== null && "message" in error
            ? String((error as { message?: unknown }).message) || "Nie udało się zaktualizować transakcji."
            : "Nie udało się zaktualizować transakcji.";

        setState((previous) => ({
          ...previous,
          operationResult: {
            type: "update",
            status: "error",
            message: errorMessage,
          },
        }));
        throw error;
      }
    },
    [mapTransactionDtoToVM, parseErrorResponse, state.categories]
  );

  const deleteTransaction = useCallback(
    async (transactionId: string) => {
      try {
        const response = await fetch(`/api/transactions/${transactionId}`, {
          method: "DELETE",
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok && response.status !== 204) {
          throw await parseErrorResponse(response);
        }

        setState((previous) => ({
          ...previous,
          transactions: previous.transactions.filter((transaction) => transaction.id !== transactionId),
          meta: previous.meta
            ? {
                ...previous.meta,
                totalItems: Math.max(previous.meta.totalItems - 1, 0),
              }
            : previous.meta,
          operationResult: {
            type: "delete",
            status: "success",
            message: "Transakcja została usunięta.",
          },
          loadMoreError: null,
        }));
      } catch (error) {
        console.error("Failed to delete transaction", error);
        const errorMessage =
          typeof error === "object" && error !== null && "message" in error
            ? String((error as { message?: unknown }).message) || "Nie udało się usunąć transakcji."
            : "Nie udało się usunąć transakcji.";

        setState((previous) => ({
          ...previous,
          operationResult: {
            type: "delete",
            status: "error",
            message: errorMessage,
          },
        }));
        throw error;
      }
    },
    [parseErrorResponse]
  );

  const categoriesIndex = useMemo(
    () => new Map(state.categories.map((category) => [category.id, category.name])),
    [state.categories]
  );

  const transactions = useMemo(
    () => state.transactions.map((transaction) => mapTransactionDtoToVM(transaction, categoriesIndex)),
    [categoriesIndex, mapTransactionDtoToVM, state.transactions]
  );

  // Redirect to login on 401 error
  useEffect(() => {
    if (state.error?.status === 401 || state.loadMoreError?.status === 401) {
      window.location.href = "/login";
    }
  }, [state.error, state.loadMoreError]);

  return {
    transactions,
    categories: state.categories,
    meta: state.meta,
    isLoading: state.isLoading,
    isLoadingMore: state.isLoadingMore,
    error: state.error,
    operationResult: state.operationResult,
    loadMoreError: state.loadMoreError,
    loadPage,
    loadNextPage,
    refresh,
    updateTransaction,
    deleteTransaction,
    retry,
    clearOperationResult: useCallback(
      () =>
        setState((previous) => ({
          ...previous,
          operationResult: null,
        })),
      []
    ),
    clearLoadMoreError: useCallback(
      () =>
        setState((previous) => ({
          ...previous,
          loadMoreError: null,
        })),
      []
    ),
  };
};
