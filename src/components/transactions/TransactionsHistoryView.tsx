import { useCallback, useEffect, useMemo, useState } from "react";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InfiniteScrollTrigger } from "@/components/ui/infinite-scroll-trigger";
import { PaginationControl } from "@/components/ui/pagination-control";
import {
  useTransactionsHistory,
  type TransactionOperationResult,
  type TransactionVM,
} from "@/components/transactions/useTransactionsHistory";
import { TransactionConfirmationDialog } from "@/components/transactions/TransactionConfirmationDialog";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { TransactionListItem } from "@/components/transactions/TransactionListItem";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";

export const TransactionsHistoryView = () => {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionVM | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteProcessing, setIsDeleteProcessing] = useState(false);
  const [transactionPendingDelete, setTransactionPendingDelete] = useState<TransactionVM | null>(null);
  const {
    transactions,
    categories,
    meta,
    isLoading,
    isLoadingMore,
    error,
    operationResult,
    loadMoreError,
    loadPage,
    loadNextPage,
    refresh,
    updateTransaction,
    deleteTransaction,
    retry,
    clearOperationResult,
    clearLoadMoreError,
  } = useTransactionsHistory();

  const handleRetry = useCallback(() => {
    void retry();
  }, [retry]);

  const handleRefresh = useCallback(() => {
    void refresh();
  }, [refresh]);

  const loadNext = useCallback(() => {
    void loadNextPage();
  }, [loadNextPage]);

  const handlePageChange = useCallback(
    (page: number) => {
      void loadPage(page);
    },
    [loadPage]
  );

  const handleEdit = useCallback((transaction: TransactionVM) => {
    setSelectedTransaction(transaction);
    setIsDialogOpen(true);
  }, []);

  const handleDelete = useCallback(async (transaction: TransactionVM) => {
    setTransactionPendingDelete(transaction);
  }, []);

  const hasMorePages = useMemo(() => (meta ? meta.page < meta.totalPages : false), [meta]);

  useEffect(() => {
    if (!operationResult || operationResult.status === "error") {
      return;
    }

    const timeout = window.setTimeout(() => {
      clearOperationResult();
    }, 4000);

    return () => window.clearTimeout(timeout);
  }, [clearOperationResult, operationResult]);

  const updateOperationError = useMemo(() => {
    if (!operationResult || operationResult.type !== "update" || operationResult.status !== "error") {
      return null;
    }
    return operationResult.message;
  }, [operationResult]);

  const renderOperationBanner = useCallback(
    (result: TransactionOperationResult | null) => {
      if (!result) {
        return null;
      }

      const isSuccess = result.status === "success";
      const Icon = isSuccess ? CheckCircle2 : AlertCircle;
      const colorClass = isSuccess ? "text-emerald-600 dark:text-emerald-400" : "text-destructive";
      const backgroundClass = isSuccess ? "bg-emerald-50 dark:bg-emerald-950/50" : "bg-destructive/10";

      return (
        <div
          role={isSuccess ? "status" : "alert"}
          aria-live={isSuccess ? "polite" : "assertive"}
          className={`flex items-start gap-3 rounded-md border border-border/60 ${backgroundClass} px-4 py-3 text-sm shadow-sm`}
        >
          <Icon className={`mt-0.5 size-4 ${colorClass}`} aria-hidden />
          <div className="flex-1">
            <p className="font-medium">{result.message}</p>
          </div>
          <button
            type="button"
            onClick={clearOperationResult}
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Zamknij
          </button>
        </div>
      );
    },
    [clearOperationResult]
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="size-10 animate-spin text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">Ładuję historię transakcji…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Nie udało się załadować transakcji</h1>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
        <Button variant="outline" onClick={handleRetry}>
          Spróbuj ponownie
        </Button>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Brak transakcji</h1>
          <p className="text-sm text-muted-foreground">
            Dodaj pierwszą transakcję, aby śledzić swoje wydatki w czasie rzeczywistym.
          </p>
        </div>
        <Button onClick={handleRefresh}>Odśwież</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Historia transakcji</h1>
        <p className="text-sm text-muted-foreground">
          Przeglądaj wydatki w bieżącym budżecie, edytuj je i usuwaj, gdy to konieczne.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        {transactions.map((transaction) => (
          <TransactionListItem
            key={transaction.id}
            transaction={transaction}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {renderOperationBanner(operationResult)}

      {isMobile ? (
        <InfiniteScrollTrigger
          hasMore={hasMorePages}
          isLoading={isLoadingMore}
          onLoadMore={loadNext}
          disabled={!!error}
          errorMessage={loadMoreError?.message ?? null}
          onRetry={() => {
            clearLoadMoreError();
            loadNext();
          }}
        />
      ) : meta ? (
        <PaginationControl
          meta={meta}
          onPageChange={handlePageChange}
          isBusy={isLoading || isLoadingMore}
          disabled={!!error}
        />
      ) : null}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          {selectedTransaction ? (
            <>
              <DialogHeader>
                <DialogTitle>Edytuj transakcję</DialogTitle>
              </DialogHeader>
              <TransactionForm
                transaction={selectedTransaction}
                categories={categories}
                onCancel={() => setIsDialogOpen(false)}
                onSubmit={async (transactionId, data) => {
                  await updateTransaction(transactionId, data);
                  setIsDialogOpen(false);
                }}
                formError={updateOperationError}
                onClearError={operationResult?.type === "update" ? clearOperationResult : undefined}
              />
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <TransactionConfirmationDialog
        open={transactionPendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setTransactionPendingDelete(null);
          }
        }}
        title="Usuń transakcję"
        description="Czy na pewno chcesz usunąć tę transakcję? Tej operacji nie można cofnąć."
        confirmLabel="Usuń"
        cancelLabel="Anuluj"
        isProcessing={isDeleteProcessing}
        onConfirm={async () => {
          if (!transactionPendingDelete) {
            return;
          }
          setIsDeleteProcessing(true);
          try {
            await deleteTransaction(transactionPendingDelete.id);
          } finally {
            setIsDeleteProcessing(false);
            setTransactionPendingDelete(null);
          }
        }}
      />
    </div>
  );
};
