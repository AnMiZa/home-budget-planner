import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ApiErrorDto,
  HouseholdMemberDto,
  HouseholdMembersListResponseDto,
  CreateHouseholdMemberCommand,
  UpdateHouseholdMemberCommand,
  PaginationMetaDto,
} from "@/types";
import type { HouseholdMemberVM, OperationResult, SettingsError } from "./types";

interface HouseholdMembersState {
  readonly members: readonly HouseholdMemberVM[];
  readonly meta: PaginationMetaDto | null;
  readonly isLoading: boolean;
  readonly isLoadingMore: boolean;
  readonly error: SettingsError | null;
  readonly operationResult: OperationResult | null;
}

export interface UseHouseholdMembersResult {
  readonly members: readonly HouseholdMemberVM[];
  readonly meta: PaginationMetaDto | null;
  readonly isLoading: boolean;
  readonly isLoadingMore: boolean;
  readonly error: SettingsError | null;
  readonly operationResult: OperationResult | null;
  readonly loadPage: (page: number) => Promise<void>;
  readonly loadNextPage: () => Promise<void>;
  readonly refresh: () => Promise<void>;
  readonly createMember: (data: CreateHouseholdMemberCommand) => Promise<void>;
  readonly updateMember: (id: string, data: UpdateHouseholdMemberCommand) => Promise<void>;
  readonly deleteMember: (id: string) => Promise<void>;
  readonly retry: () => Promise<void>;
  readonly clearOperationResult: () => void;
}

const MEMBERS_ENDPOINT = "/api/household-members";
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_SORT = "fullName";

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: "Sesja wygasła. Zaloguj się ponownie.",
  INVALID_FULL_NAME: "Nieprawidłowe imię domownika.",
  MEMBER_NOT_FOUND: "Nie znaleziono domownika.",
  MEMBER_NAME_CONFLICT: "Domownik o tym imieniu już istnieje.",
  MEMBERS_LIST_FAILED: "Nie udało się pobrać listy domowników.",
  MEMBER_CREATE_FAILED: "Nie udało się dodać domownika.",
  MEMBER_UPDATE_FAILED: "Nie udało się zaktualizować domownika.",
  MEMBER_DEACTIVATE_FAILED: "Nie udało się usunąć domownika.",
};

/**
 * Custom hook for managing household members state.
 * Handles CRUD operations, pagination, and error states.
 */
export const useHouseholdMembers = (): UseHouseholdMembersResult => {
  const [state, setState] = useState<HouseholdMembersState>({
    members: [],
    meta: null,
    isLoading: true,
    isLoadingMore: false,
    error: null,
    operationResult: null,
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

  const buildMembersEndpoint = useCallback((page: number, includeInactive = false) => {
    const url = new URL(MEMBERS_ENDPOINT, window.location.origin);
    url.searchParams.set("page", page.toString());
    url.searchParams.set("pageSize", DEFAULT_PAGE_SIZE.toString());
    url.searchParams.set("sort", DEFAULT_SORT);
    url.searchParams.set("includeInactive", includeInactive.toString());
    return url;
  }, []);

  const fetchMembersPage = useCallback(
    async (page: number, signal: AbortSignal): Promise<HouseholdMembersListResponseDto> => {
      const url = buildMembersEndpoint(page, false);

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

      return (await response.json()) as HouseholdMembersListResponseDto;
    },
    [buildMembersEndpoint, parseErrorResponse]
  );

  const mapDtoToVM = useCallback((dto: HouseholdMemberDto): HouseholdMemberVM => dto, []);

  const mergeMembers = useCallback(
    (existing: readonly HouseholdMemberVM[], incoming: readonly HouseholdMemberDto[]) => {
      const incomingVMs = incoming.map(mapDtoToVM);
      const deduplicated = new Map<string, HouseholdMemberVM>();

      for (const member of existing) {
        deduplicated.set(member.id, member);
      }

      for (const member of incomingVMs) {
        deduplicated.set(member.id, member);
      }

      return Array.from(deduplicated.values()).sort((a, b) => a.fullName.localeCompare(b.fullName));
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
    }));

    try {
      const listResponse = await fetchMembersPage(1, abortController.signal);

      setState({
        members: listResponse.data.map(mapDtoToVM),
        meta: listResponse.meta,
        isLoading: false,
        isLoadingMore: false,
        error: null,
        operationResult: null,
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
      }));
    }
  }, [fetchMembersPage, mapDtoToVM]);

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
      }));

      try {
        const response = await fetchMembersPage(page, abortController.signal);

        setState({
          members: response.data.map(mapDtoToVM),
          meta: response.meta,
          isLoading: false,
          isLoadingMore: false,
          error: null,
          operationResult: null,
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
        }));
      }
    },
    [fetchMembersPage, mapDtoToVM]
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
    }));

    try {
      const response = await fetchMembersPage(nextPage, abortController.signal);

      setState((previous) => ({
        members: mergeMembers(previous.members, response.data),
        meta: response.meta,
        isLoading: false,
        isLoadingMore: false,
        error: null,
        operationResult: previous.operationResult,
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
      }));
    }
  }, [fetchMembersPage, mergeMembers, state]);

  const refresh = useCallback(async () => {
    setState((previous) => ({
      ...previous,
      operationResult: null,
    }));
    await loadInitialData();
  }, [loadInitialData]);

  const retry = useCallback(async () => {
    setState((previous) => ({
      ...previous,
      operationResult: null,
    }));
    await loadInitialData();
  }, [loadInitialData]);

  const createMember = useCallback(
    async (data: CreateHouseholdMemberCommand) => {
      try {
        const response = await fetch(MEMBERS_ENDPOINT, {
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

        const createdMember = (await response.json()) as HouseholdMemberDto;

        setState((previous) => ({
          ...previous,
          members: [...previous.members, mapDtoToVM(createdMember)].sort((a, b) =>
            a.fullName.localeCompare(b.fullName)
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
            message: "Domownik został dodany.",
          },
        }));
      } catch (error) {
        console.error("Failed to create household member", error);
        const errorMessage =
          typeof error === "object" && error !== null && "message" in error
            ? String((error as { message?: unknown }).message) || "Nie udało się dodać domownika."
            : "Nie udało się dodać domownika.";

        setState((previous) => ({
          ...previous,
          operationResult: {
            type: "create",
            status: "error",
            message: errorMessage,
          },
        }));
        throw error;
      }
    },
    [mapDtoToVM, parseErrorResponse]
  );

  const updateMember = useCallback(
    async (id: string, data: UpdateHouseholdMemberCommand) => {
      try {
        const response = await fetch(`${MEMBERS_ENDPOINT}/${id}`, {
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

        const updatedMember = (await response.json()) as HouseholdMemberDto;

        setState((previous) => ({
          ...previous,
          members: previous.members
            .map((member) => (member.id === id ? mapDtoToVM(updatedMember) : member))
            .sort((a, b) => a.fullName.localeCompare(b.fullName)),
          operationResult: {
            type: "update",
            status: "success",
            message: "Domownik został zaktualizowany.",
          },
        }));
      } catch (error) {
        console.error("Failed to update household member", error);
        const errorMessage =
          typeof error === "object" && error !== null && "message" in error
            ? String((error as { message?: unknown }).message) || "Nie udało się zaktualizować domownika."
            : "Nie udało się zaktualizować domownika.";

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
    [mapDtoToVM, parseErrorResponse]
  );

  const deleteMember = useCallback(
    async (id: string) => {
      try {
        const response = await fetch(`${MEMBERS_ENDPOINT}/${id}`, {
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
          members: previous.members.filter((member) => member.id !== id),
          meta: previous.meta
            ? {
                ...previous.meta,
                totalItems: Math.max(previous.meta.totalItems - 1, 0),
              }
            : previous.meta,
          operationResult: {
            type: "delete",
            status: "success",
            message: "Domownik został usunięty.",
          },
        }));
      } catch (error) {
        console.error("Failed to delete household member", error);
        const errorMessage =
          typeof error === "object" && error !== null && "message" in error
            ? String((error as { message?: unknown }).message) || "Nie udało się usunąć domownika."
            : "Nie udało się usunąć domownika.";

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

  // Redirect to login on 401 error
  useEffect(() => {
    if (state.error?.status === 401) {
      window.location.href = "/login";
    }
  }, [state.error]);

  return {
    members: state.members,
    meta: state.meta,
    isLoading: state.isLoading,
    isLoadingMore: state.isLoadingMore,
    error: state.error,
    operationResult: state.operationResult,
    loadPage,
    loadNextPage,
    refresh,
    createMember,
    updateMember,
    deleteMember,
    retry,
    clearOperationResult: useCallback(
      () =>
        setState((previous) => ({
          ...previous,
          operationResult: null,
        })),
      []
    ),
  };
};
