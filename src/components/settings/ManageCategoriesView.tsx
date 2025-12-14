import { useCallback, useState } from "react";
import { Plus, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsEmptyState } from "./SettingsEmptyState";
import { CategoryForm } from "./CategoryForm";
import { CategoriesList } from "./CategoriesList";
import { CategoryDeleteConfirmationDialog } from "./CategoryDeleteConfirmationDialog";
import { useCategories } from "./useCategories";
import type { CategoryVM, CreateCategoryCommand, UpdateCategoryCommand } from "./types";
import { cn } from "@/lib/utils";

/**
 * Main view for managing expense categories.
 * Handles CRUD operations with dialogs and displays operation results.
 * Supports cascading delete with force confirmation.
 */
export const ManageCategoriesView = () => {
  const {
    categories,
    meta,
    isLoading,
    isLoadingMore,
    error,
    operationResult,
    pendingDeleteRequiresForce,
    loadPage,
    loadNextPage,
    createCategory,
    updateCategory,
    deleteCategory,
    retry,
    clearOperationResult,
    clearPendingDeleteRequiresForce,
  } = useCategories();

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryVM | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const handleOpenCreateDialog = useCallback(() => {
    setSelectedCategory(null);
    setFormError(null);
    setIsFormDialogOpen(true);
  }, []);

  const handleOpenEditDialog = useCallback((category: CategoryVM) => {
    setSelectedCategory(category);
    setFormError(null);
    setIsFormDialogOpen(true);
  }, []);

  const handleOpenDeleteDialog = useCallback(
    (category: CategoryVM) => {
      setSelectedCategory(category);
      clearPendingDeleteRequiresForce();
      setIsDeleteDialogOpen(true);
    },
    [clearPendingDeleteRequiresForce]
  );

  const handleCloseFormDialog = useCallback(() => {
    setIsFormDialogOpen(false);
    setSelectedCategory(null);
    setFormError(null);
  }, []);

  const handleCloseDeleteDialog = useCallback(() => {
    setIsDeleteDialogOpen(false);
    setSelectedCategory(null);
    clearPendingDeleteRequiresForce();
  }, [clearPendingDeleteRequiresForce]);

  const handleFormSubmit = useCallback(
    async (data: CreateCategoryCommand | UpdateCategoryCommand) => {
      try {
        if (selectedCategory) {
          await updateCategory(selectedCategory.id, data as UpdateCategoryCommand);
        } else {
          await createCategory(data as CreateCategoryCommand);
        }
        handleCloseFormDialog();
      } catch (error) {
        // Error is already set in the hook's operationResult
        const errorMessage =
          typeof error === "object" && error !== null && "message" in error
            ? String((error as { message?: unknown }).message)
            : null;
        setFormError(errorMessage);
      }
    },
    [createCategory, handleCloseFormDialog, selectedCategory, updateCategory]
  );

  const handleDelete = useCallback(async () => {
    if (!selectedCategory) return;

    try {
      // If force is required, pass true, otherwise undefined
      await deleteCategory(selectedCategory.id, pendingDeleteRequiresForce);
      handleCloseDeleteDialog();
    } catch (error) {
      // If force confirmation is required, keep the dialog open
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "FORCE_CONFIRMATION_REQUIRED"
      ) {
        // Dialog stays open, pendingDeleteRequiresForce is now true
        return;
      }

      // For other errors, close dialog
      console.error("Failed to delete category", error);
    }
  }, [deleteCategory, handleCloseDeleteDialog, pendingDeleteRequiresForce, selectedCategory]);

  const handleRetry = useCallback(() => {
    void retry();
  }, [retry]);

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto max-w-2xl space-y-6 p-4 md:p-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-40" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto max-w-2xl p-4 md:p-6">
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Nie udało się załadować danych</h1>
            <p className="text-sm text-muted-foreground">{error.message}</p>
          </div>
          <Button variant="outline" onClick={handleRetry}>
            Spróbuj ponownie
          </Button>
        </div>
      </div>
    );
  }

  const isEmpty = categories.length === 0;

  return (
    <div className="container mx-auto max-w-2xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Kategorie</h1>
        <p className="text-muted-foreground">Zarządzaj kategoriami wydatków</p>
      </header>

      {/* Operation result banner */}
      {operationResult && (
        <div
          role={operationResult.status === "success" ? "status" : "alert"}
          aria-live={operationResult.status === "success" ? "polite" : "assertive"}
          className={cn(
            "flex items-center gap-3 rounded-md border px-4 py-3",
            operationResult.status === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-destructive bg-destructive/10 text-destructive"
          )}
        >
          {operationResult.status === "success" ? (
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
          )}
          <p className="flex-1 text-sm">{operationResult.message}</p>
          <button
            onClick={clearOperationResult}
            className="text-sm font-medium underline-offset-4 hover:underline"
            aria-label="Zamknij powiadomienie"
          >
            Zamknij
          </button>
        </div>
      )}

      {/* Add button */}
      <div>
        <Button onClick={handleOpenCreateDialog}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Dodaj kategorię
        </Button>
      </div>

      {/* Content */}
      {isEmpty ? (
        <SettingsEmptyState
          title="Brak kategorii"
          description="Dodaj pierwszą kategorię wydatków, aby móc planować budżet."
          actionLabel="Dodaj kategorię"
          onAction={handleOpenCreateDialog}
        />
      ) : (
        <CategoriesList
          categories={categories}
          meta={meta}
          isLoadingMore={isLoadingMore}
          onEdit={handleOpenEditDialog}
          onDelete={handleOpenDeleteDialog}
          onLoadMore={loadNextPage}
          onPageChange={loadPage}
        />
      )}

      {/* Form Dialog */}
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedCategory ? "Edytuj kategorię" : "Dodaj kategorię"}</DialogTitle>
            <DialogDescription>
              {selectedCategory ? "Wprowadź zmiany w nazwie kategorii." : "Dodaj nową kategorię wydatków."}
            </DialogDescription>
          </DialogHeader>
          <CategoryForm
            category={selectedCategory ?? undefined}
            onSubmit={handleFormSubmit}
            onCancel={handleCloseFormDialog}
            formError={formError}
            onClearError={() => setFormError(null)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <CategoryDeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        category={selectedCategory}
        onConfirm={handleDelete}
        requiresForce={pendingDeleteRequiresForce}
      />
    </div>
  );
};
