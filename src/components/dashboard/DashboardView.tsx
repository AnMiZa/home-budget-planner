import { useCallback, useEffect, useMemo } from "react";

import { CategoryProgressCard } from "@/components/dashboard/CategoryProgressCard";
import type { CategoryProgressViewModel } from "@/components/dashboard/CategoryProgressCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import type { OverallSummaryViewModel } from "@/components/dashboard/OverallSummaryCard";
import { OverallSummaryCard } from "@/components/dashboard/OverallSummaryCard";
import { UISkeletonLoader } from "@/components/dashboard/UISkeletonLoader";
import { Button } from "@/components/ui/button";
import { clampPercentage, formatMonth } from "@/lib/formatters";
import { useDashboard } from "@/lib/hooks/useDashboard";

export const DashboardView = () => {
  const { data, isLoading, error, refetch } = useDashboard();

  /**
   * Listen for expense-added event and refresh dashboard
   */
  useEffect(() => {
    const handleExpenseAdded = () => {
      void refetch();
    };

    window.addEventListener("homebudget:expense-added", handleExpenseAdded);

    return () => {
      window.removeEventListener("homebudget:expense-added", handleExpenseAdded);
    };
  }, [refetch]);

  const handleCreateBudget = useCallback(() => {
    window.location.href = "/new-budget";
  }, []);

  const handleEditBudget = useCallback(() => {
    window.location.href = `/budget/${data?.currentBudgetId}/edit`;
  }, [data]);

  const categories = useMemo<readonly CategoryProgressViewModel[]>(() => {
    if (!data) {
      return [];
    }

    return data.categories.map((category) => ({
      id: category.categoryId,
      name: category.name,
      spent: category.spent,
      limit: category.limitAmount,
      progressPercentage: clampPercentage(category.progress),
      status: category.status,
    }));
  }, [data]);

  const summary = useMemo<OverallSummaryViewModel | null>(() => {
    if (!data) {
      return null;
    }

    return {
      totalIncome: data.totalIncome,
      totalSpent: data.totalSpent,
      freeFunds: data.freeFunds,
      progressPercentage: clampPercentage(data.progress),
    };
  }, [data]);

  if (isLoading) {
    return <UISkeletonLoader />;
  }

  if (error?.status === 404) {
    return <EmptyState onCreateBudget={handleCreateBudget} />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 rounded-xl border border-destructive/50 bg-destructive/10 p-8 text-center">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-destructive">Wystąpił błąd</h2>
          <p className="text-sm text-destructive">
            {error.status === 401
              ? "Twoja sesja wygasła. Zaloguj się ponownie, aby kontynuować."
              : "Nie udało się pobrać danych pulpitu. Spróbuj ponownie później."}
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          Spróbuj ponownie
        </Button>
      </div>
    );
  }

  if (!data || !summary) {
    return null;
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="space-y-4">
        <header className="space-y-1 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Twój budżet</h1>
            <p className="text-sm text-muted-foreground">Podsumowanie miesiąca {formatMonth(data.month)}</p>
          </div>
          <Button variant="outline" onClick={handleEditBudget}>
            Edytuj budżet
          </Button>
        </header>
        <OverallSummaryCard data={summary} />
      </section>

      <section className="space-y-4">
        <header className="space-y-1">
          <h2 className="text-2xl font-semibold">Kategorie wydatków</h2>
          <p className="text-sm text-muted-foreground">
            Monitoruj postęp w każdej kategorii i reaguj, gdy zbliżasz się do limitu.
          </p>
        </header>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <CategoryProgressCard key={category.id} category={category} />
          ))}
        </div>
      </section>
    </div>
  );
};
