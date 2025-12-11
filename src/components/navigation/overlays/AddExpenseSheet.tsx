import { useCallback, useEffect } from "react";

import { AddExpenseForm } from "@/components/expenses/AddExpenseForm";
import { useUIContext } from "@/components/layout/UIContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { showToast } from "@/components/ui/toast";
import { useAddExpense } from "@/lib/hooks/useAddExpense";
import type { CreateTransactionCommand } from "@/types";

/**
 * Modal overlay component for adding a new expense.
 * Opens via navigation button and integrates with UIContext for state management.
 */
export const AddExpenseSheet = () => {
  const { isAddExpenseSheetOpen, closeAddExpenseSheet } = useUIContext();
  const {
    categories,
    isLoadingCategories,
    categoriesError,
    budgetId,
    isLoadingBudget,
    isSubmitting,
    submitError,
    submitExpense,
    clearSubmitError,
    refetchCategories,
  } = useAddExpense();

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (data: CreateTransactionCommand) => {
      const result = await submitExpense(data);

      if (result.success) {
        // Show success toast
        showToast({
          title: "Wydatek dodany",
          description: "Transakcja została zapisana pomyślnie.",
          variant: "default",
        });

        // Close the sheet
        closeAddExpenseSheet();

        // Dispatch custom event to refresh dashboard
        window.dispatchEvent(new CustomEvent("homebudget:expense-added"));
      }
    },
    [submitExpense, closeAddExpenseSheet]
  );

  /**
   * Handle cancel action
   */
  const handleCancel = useCallback(() => {
    closeAddExpenseSheet();
  }, [closeAddExpenseSheet]);

  /**
   * Clear submit error when dialog closes
   */
  useEffect(() => {
    if (!isAddExpenseSheetOpen) {
      clearSubmitError();
    }
  }, [isAddExpenseSheetOpen, clearSubmitError]);

  /**
   * Render no active budget state
   */
  if (isAddExpenseSheetOpen && !isLoadingBudget && !budgetId) {
    return (
      <Dialog open={isAddExpenseSheetOpen} onOpenChange={closeAddExpenseSheet}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Dodaj wydatek</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Nie masz jeszcze budżetu na ten miesiąc. Utwórz budżet, aby móc dodawać wydatki.
            </p>
            <a
              href="/new-budget"
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Utwórz budżet
            </a>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  /**
   * Render categories error state
   */
  if (isAddExpenseSheetOpen && categoriesError && !isLoadingCategories) {
    return (
      <Dialog open={isAddExpenseSheetOpen} onOpenChange={closeAddExpenseSheet}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Dodaj wydatek</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-destructive">{categoriesError.message}</p>
            <button
              onClick={() => void refetchCategories()}
              className="inline-flex h-10 w-full items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Spróbuj ponownie
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  /**
   * Render main form
   */
  return (
    <Dialog open={isAddExpenseSheetOpen} onOpenChange={closeAddExpenseSheet}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Dodaj wydatek</DialogTitle>
        </DialogHeader>
        <AddExpenseForm
          categories={categories}
          isLoadingCategories={isLoadingCategories}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
          submitError={submitError}
          onClearError={clearSubmitError}
        />
      </DialogContent>
    </Dialog>
  );
};
