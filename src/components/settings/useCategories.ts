import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ApiErrorDto,
  CategoryDto,
  CategoriesListResponseDto,
  CreateCategoryCommand,
  UpdateCategoryCommand,
  PaginationMetaDto,
} from "@/types";
import type { CategoryVM, OperationResult, SettingsError } from "./types";

interface CategoriesState {
  readonly categories: readonly CategoryVM[];
  readonly meta: PaginationMetaDto | null;
  readonly isLoading: boolean;
  readonly isLoadingMore: boolean;
  readonly error: SettingsError | null;
  readonly operationResult: OperationResult | null;
  readonly pendingDeleteRequiresForce: boolean;
}

export interface UseCategoriesResult {
  readonly categories: readonly CategoryVM[];
  readonly meta: PaginationMetaDto | null;
  readonly isLoading: boolean;
  readonly isLoadingMore: boolean;
  readonly error: SettingsError | null;
  readonly operationResult: OperationResult | null;
  readonly pendingDeleteRequiresForce: boolean;
  readonly loadPage: (page: number) => Promise<void>;
  readonly loadNextPage: () => Promise<void>;
  readonly refresh: () => Promise<void>;
  readonly createCategory: (data: CreateCategoryCommand) => Promise<void>;
  readonly updateCategory: (id: string, data: UpdateCategoryCommand) => Promise<void>;
  readonly deleteCategory: (id: string, force?: boolean) => Promise<void>;
  readonly retry: () => Promise<void>;
  readonly clearOperationResult: () => void;
  readonly clearPendingDeleteRequiresForce: () => void;
}

const CATEGORIES_ENDPOINT = "/api/categories";
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_SORT = "name";

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: "Sesja wygasła. Zaloguj się ponownie.",
  INVALID_NAME: "Nieprawidłowa nazwa kategorii.",
  CATEGORY_NOT_FOUND: "Nie znaleziono kategorii.",
  CATEGORY_NAME_CONFLICT: "Kategoria o tej nazwie już istnieje.",
  CATEGORIES_LIST_FAILED: "Nie udało się pobrać listy kategorii.",
  CATEGORY_CREATE_FAILED: "Nie udało się dodać kategorii.",
  CATEGORY_UPDATE_FAILED: "Nie udało się zaktualizować kategorii.",
  CATEGORY_DELETE_FAILED: "Nie udało się usunąć kategorii.",
  FORCE_CONFIRMATION_REQUIRED: "Kategoria ma powiązane transakcje. Potwierdź usunięcie.",
};

/**
 * Custom hook for managing categories state.
 * Handles CRUD operations, pagination, and cascading delete with force confirmation.
 */
export const useCategories = (): UseCategoriesResult => {
  const [state, setState] = useState<CategoriesState>({
    categories: [],
    meta: null,
    isLoading: true,
    isLoadingMore: false,
    error: null,
    operationResult: null,
    pendingDeleteRequiresForce: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const parseErrorResponse = useCallback(async (response: Response): Promise<SettingsError> => {
    const status = response.status;
    let payload: ApiErrorDto | undefined;

    try {
      const text = await response.text();
      payload = text ? (JSON.parse(text) as ApiErrorDto) : undefined;
    } catch (parseError) {
      console.warn("Unable to parse API error", parseError);
    }

    const code = payload?.error.code;
    const message = code && ERROR_MESSAGES[code] ? ERROR_MESSAGES[code] : (payload?.error.message ?? "Wystąpił błąd.");

    return {
      status,
      message,
      code,
    };
  }, []);

  const buildCategoriesEndpoint = useCallback((page: number, search?: string) => {
    const url = new URL(CATEGORIES_ENDPOINT, window.location.origin);
    url.searchParams.set("page", page.toString());
    url.searchParams.set("pageSize", DEFAULT_PAGE_SIZE.toString());
    url.searchParams.set("sort", DEFAULT_SORT);
    if (search) {
      url.searchParams.set("search", search);
    }
    return url;
  }, []);

  const fetchCategoriesPage = useCallback(
    async (page: number, signal: AbortSignal): Promise<CategoriesListResponseDto> => {
      const url = buildCategoriesEndpoint(page);

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

      return (await response.json()) as CategoriesListResponseDto;
    },
    [buildCategoriesEndpoint, parseErrorResponse]
  );

  const mapDtoToVM = useCallback((dto: CategoryDto): CategoryVM => dto, []);

  const mergeCategories = useCallback(
    (existing: readonly CategoryVM[], incoming: readonly CategoryDto[]) => {
      const incomingVMs = incoming.map(mapDtoToVM);
      const deduplicated = new Map<string, CategoryVM>();

      for (const category of existing) {
        deduplicated.set(category.id, category);
      }

      for (const category of incomingVMs) {
        deduplicated.set(category.id, category);
      }

      return Array.from(deduplicated.values()).sort((a, b) => a.name.localeCompare(b.name));
    },
    [mapDtoToVM]
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
      pendingDeleteRequiresForce: false,
    }));

    try {
      const listResponse = await fetchCategoriesPage(1, abortController.signal);

      setState({
        categories: listResponse.data.map(mapDtoToVM),
        meta: listResponse.meta,
        isLoading: false,
        isLoadingMore: false,
        error: null,
        operationResult: null,
        pendingDeleteRequiresForce: false,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      const settingsError =
        typeof error === "object" && error !== null && "status" in error
          ? (error as SettingsError)
          : ({
              status: 0,
              message: "Wystąpił błąd połączenia. Spróbuj ponownie później.",
            } satisfies SettingsError);

      setState((previous) => ({
        ...previous,
        isLoading: false,
        isLoadingMore: false,
        error: settingsError,
        operationResult: previous.operationResult,
        pendingDeleteRequiresForce: false,
      }));
    }
  }, [fetchCategoriesPage, mapDtoToVM]);

  useEffect(() => {
    void loadInitialData();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [loadInitialData]);

  const loadPage = useCallback(
    async (page: number) => {
      abortControllerRef.current?.abort();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setState((previous) => ({
        ...previous,
        isLoading: page === 1,
        isLoadingMore: page > 1,
        error: null,
        operationResult: previous.operationResult,
        pendingDeleteRequiresForce: false,
      }));

      try {
        const response = await fetchCategoriesPage(page, abortController.signal);

        setState({
          categories: response.data.map(mapDtoToVM),
          meta: response.meta,
          isLoading: false,
          isLoadingMore: false,
          error: null,
          operationResult: null,
          pendingDeleteRequiresForce: false,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        const settingsError =
          typeof error === "object" && error !== null && "status" in error
            ? (error as SettingsError)
            : ({
                status: 0,
                message: "Wystąpił błąd połączenia. Spróbuj ponownie później.",
              } satisfies SettingsError);

        setState((previous) => ({
          ...previous,
          isLoading: false,
          isLoadingMore: false,
          error: settingsError,
          operationResult: previous.operationResult,
          pendingDeleteRequiresForce: false,
        }));
      }
    },
    [fetchCategoriesPage, mapDtoToVM]
  );

  const loadNextPage = useCallback(async () => {
    const { meta } = state;

    if (!meta || meta.page >= meta.totalPages || state.isLoadingMore) {
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
      pendingDeleteRequiresForce: false,
    }));

    try {
      const response = await fetchCategoriesPage(nextPage, abortController.signal);

      setState((previous) => ({
        categories: mergeCategories(previous.categories, response.data),
        meta: response.meta,
        isLoading: false,
        isLoadingMore: false,
        error: null,
        operationResult: previous.operationResult,
        pendingDeleteRequiresForce: false,
      }));
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      const settingsError =
        typeof error === "object" && error !== null && "status" in error
          ? (error as SettingsError)
          : ({
              status: 0,
              message: "Wystąpił błąd połączenia. Spróbuj ponownie później.",
            } satisfies SettingsError);

      setState((previous) => ({
        ...previous,
        isLoadingMore: false,
        error: settingsError,
        pendingDeleteRequiresForce: false,
      }));
    }
  }, [fetchCategoriesPage, mergeCategories, state]);

  const refresh = useCallback(async () => {
    setState((previous) => ({
      ...previous,
      operationResult: null,
      pendingDeleteRequiresForce: false,
    }));
    await loadInitialData();
  }, [loadInitialData]);

  const retry = useCallback(async () => {
    setState((previous) => ({
      ...previous,
      operationResult: null,
      pendingDeleteRequiresForce: false,
    }));
    await loadInitialData();
  }, [loadInitialData]);

  const createCategory = useCallback(
    async (data: CreateCategoryCommand) => {
      try {
        const response = await fetch(CATEGORIES_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw await parseErrorResponse(response);
        }

        const createdCategory = (await response.json()) as CategoryDto;

        setState((previous) => ({
          ...previous,
          categories: [...previous.categories, mapDtoToVM(createdCategory)].sort((a, b) =>
            a.name.localeCompare(b.name)
          ),
          meta: previous.meta
            ? {
                ...previous.meta,
                totalItems: previous.meta.totalItems + 1,
              }
            : previous.meta,
          operationResult: {
            type: "create",
            status: "success",
            message: "Kategoria została dodana.",
          },
          pendingDeleteRequiresForce: false,
        }));
      } catch (error) {
        console.error("Failed to create category", error);
        const errorMessage =
          typeof error === "object" && error !== null && "message" in error
            ? String((error as { message?: unknown }).message) || "Nie udało się dodać kategorii."
            : "Nie udało się dodać kategorii.";

        setState((previous) => ({
          ...previous,
          operationResult: {
            type: "create",
            status: "error",
            message: errorMessage,
          },
          pendingDeleteRequiresForce: false,
        }));
        throw error;
      }
    },
    [mapDtoToVM, parseErrorResponse]
  );

  const updateCategory = useCallback(
    async (id: string, data: UpdateCategoryCommand) => {
      try {
        const response = await fetch(`${CATEGORIES_ENDPOINT}/${id}`, {
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

        const updatedCategory = (await response.json()) as CategoryDto;

        setState((previous) => ({
          ...previous,
          categories: previous.categories
            .map((category) => (category.id === id ? mapDtoToVM(updatedCategory) : category))
            .sort((a, b) => a.name.localeCompare(b.name)),
          operationResult: {
            type: "update",
            status: "success",
            message: "Kategoria została zaktualizowana.",
          },
          pendingDeleteRequiresForce: false,
        }));
      } catch (error) {
        console.error("Failed to update category", error);
        const errorMessage =
          typeof error === "object" && error !== null && "message" in error
            ? String((error as { message?: unknown }).message) || "Nie udało się zaktualizować kategorii."
            : "Nie udało się zaktualizować kategorii.";

        setState((previous) => ({
          ...previous,
          operationResult: {
            type: "update",
            status: "error",
            message: errorMessage,
          },
          pendingDeleteRequiresForce: false,
        }));
        throw error;
      }
    },
    [mapDtoToVM, parseErrorResponse]
  );

  const deleteCategory = useCallback(
    async (id: string, force = false) => {
      try {
        const url = new URL(`${CATEGORIES_ENDPOINT}/${id}`, window.location.origin);
        if (force) {
          url.searchParams.set("force", "true");
        }

        const response = await fetch(url, {
          method: "DELETE",
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok && response.status !== 204) {
          const error = await parseErrorResponse(response);

          // Check if force confirmation is required
          if (error.code === "FORCE_CONFIRMATION_REQUIRED") {
            setState((previous) => ({
              ...previous,
              pendingDeleteRequiresForce: true,
              operationResult: null,
            }));
            throw error;
          }

          throw error;
        }

        setState((previous) => ({
          ...previous,
          categories: previous.categories.filter((category) => category.id !== id),
          meta: previous.meta
            ? {
                ...previous.meta,
                totalItems: Math.max(previous.meta.totalItems - 1, 0),
              }
            : previous.meta,
          operationResult: {
            type: "delete",
            status: "success",
            message: "Kategoria została usunięta.",
          },
          pendingDeleteRequiresForce: false,
        }));
      } catch (error) {
        console.error("Failed to delete category", error);

        // If force confirmation is required, don't show error message
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "FORCE_CONFIRMATION_REQUIRED"
        ) {
          throw error;
        }

        const errorMessage =
          typeof error === "object" && error !== null && "message" in error
            ? String((error as { message?: unknown }).message) || "Nie udało się usunąć kategorii."
            : "Nie udało się usunąć kategorii.";

        setState((previous) => ({
          ...previous,
          operationResult: {
            type: "delete",
            status: "error",
            message: errorMessage,
          },
          pendingDeleteRequiresForce: false,
        }));
        throw error;
      }
    },
    [parseErrorResponse]
  );

  // Redirect to login on 401 error
  useEffect(() => {
    if (state.error?.status === 401) {
      window.location.href = "/login";
    }
  }, [state.error]);

  return {
    categories: state.categories,
    meta: state.meta,
    isLoading: state.isLoading,
    isLoadingMore: state.isLoadingMore,
    error: state.error,
    operationResult: state.operationResult,
    pendingDeleteRequiresForce: state.pendingDeleteRequiresForce,
    loadPage,
    loadNextPage,
    refresh,
    createCategory,
    updateCategory,
    deleteCategory,
    retry,
    clearOperationResult: useCallback(
      () =>
        setState((previous) => ({
          ...previous,
          operationResult: null,
        })),
      []
    ),
    clearPendingDeleteRequiresForce: useCallback(
      () =>
        setState((previous) => ({
          ...previous,
          pendingDeleteRequiresForce: false,
        })),
      []
    ),
  };
};

