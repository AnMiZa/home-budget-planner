import { useCallback, useEffect, useRef, useState } from "react";

import type { ApiErrorDto, DashboardSummaryDto } from "@/types";

export interface DashboardState {
  readonly data: DashboardSummaryDto | null;
  readonly isLoading: boolean;
  readonly error: DashboardError | null;
  readonly refetch: () => Promise<void>;
}

export interface DashboardError {
  readonly status: number;
  readonly message: string;
  readonly payload?: ApiErrorDto;
}

const DASHBOARD_ENDPOINT = "/api/dashboard/current";

export const useDashboard = (): DashboardState => {
  const [data, setData] = useState<DashboardSummaryDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<DashboardError | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchDashboard = useCallback(async () => {
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(DASHBOARD_ENDPOINT, {
        method: "GET",
        signal: abortController.signal,
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const status = response.status;
        const payload = await safeParseApiError(response);

        setData(null);
        setError({
          status,
          message: payload?.error.message ?? getDefaultErrorMessage(status),
          payload,
        });
        return;
      }

      const payload = (await response.json()) as DashboardSummaryDto;
      setData(payload);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") {
        return;
      }

      console.error("Failed to fetch dashboard data", cause);
      setData(null);
      setError({
        status: 0,
        message: "Wystąpił błąd połączenia. Spróbuj ponownie później.",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboard();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchDashboard]);

  // Redirect to login on 401 error
  useEffect(() => {
    if (error?.status === 401) {
      window.location.href = "/login";
    }
  }, [error]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchDashboard,
  };
};

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

const getDefaultErrorMessage = (status: number): string => {
  if (status === 404) {
    return "Nie znaleziono aktywnego budżetu.";
  }

  if (status === 401) {
    return "Twoja sesja wygasła. Zaloguj się ponownie.";
  }

  return "Wystąpił problem po stronie serwera. Spróbuj ponownie później.";
};
