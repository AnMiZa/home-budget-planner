import { useCallback, useState } from "react";
import { Plus, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmationDialog } from "./ConfirmationDialog";
import { SettingsEmptyState } from "./SettingsEmptyState";
import { HouseholdMemberForm } from "./HouseholdMemberForm";
import { HouseholdMembersList } from "./HouseholdMembersList";
import { useHouseholdMembers } from "./useHouseholdMembers";
import type { HouseholdMemberVM, CreateHouseholdMemberCommand, UpdateHouseholdMemberCommand } from "./types";
import { cn } from "@/lib/utils";

/**
 * Main view for managing household members.
 * Handles CRUD operations with dialogs and displays operation results.
 */
export const ManageHouseholdMembersView = () => {
  const {
    members,
    meta,
    isLoading,
    isLoadingMore,
    error,
    operationResult,
    loadPage,
    loadNextPage,
    createMember,
    updateMember,
    deleteMember,
    retry,
    clearOperationResult,
  } = useHouseholdMembers();

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<HouseholdMemberVM | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const handleOpenCreateDialog = useCallback(() => {
    setSelectedMember(null);
    setFormError(null);
    setIsFormDialogOpen(true);
  }, []);

  const handleOpenEditDialog = useCallback((member: HouseholdMemberVM) => {
    setSelectedMember(member);
    setFormError(null);
    setIsFormDialogOpen(true);
  }, []);

  const handleOpenDeleteDialog = useCallback((member: HouseholdMemberVM) => {
    setSelectedMember(member);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleCloseFormDialog = useCallback(() => {
    setIsFormDialogOpen(false);
    setSelectedMember(null);
    setFormError(null);
  }, []);

  const handleCloseDeleteDialog = useCallback(() => {
    setIsDeleteDialogOpen(false);
    setSelectedMember(null);
  }, []);

  const handleFormSubmit = useCallback(
    async (data: CreateHouseholdMemberCommand | UpdateHouseholdMemberCommand) => {
      try {
        if (selectedMember) {
          await updateMember(selectedMember.id, data as UpdateHouseholdMemberCommand);
        } else {
          await createMember(data as CreateHouseholdMemberCommand);
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
    [createMember, handleCloseFormDialog, selectedMember, updateMember]
  );

  const handleDelete = useCallback(async () => {
    if (!selectedMember) return;

    try {
      await deleteMember(selectedMember.id);
      handleCloseDeleteDialog();
    } catch (error) {
      // Error is already set in the hook's operationResult
      console.error("Failed to delete member", error);
    }
  }, [deleteMember, handleCloseDeleteDialog, selectedMember]);

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

  const isEmpty = members.length === 0;

  return (
    <div className="container mx-auto max-w-2xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Domownicy</h1>
        <p className="text-muted-foreground">Zarządzaj członkami gospodarstwa domowego</p>
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
          Dodaj domownika
        </Button>
      </div>

      {/* Content */}
      {isEmpty ? (
        <SettingsEmptyState
          title="Brak domowników"
          description="Dodaj pierwszego członka gospodarstwa domowego, aby móc planować przychody."
          actionLabel="Dodaj domownika"
          onAction={handleOpenCreateDialog}
        />
      ) : (
        <HouseholdMembersList
          members={members}
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
            <DialogTitle>{selectedMember ? "Edytuj domownika" : "Dodaj domownika"}</DialogTitle>
            <DialogDescription>
              {selectedMember ? "Wprowadź zmiany w danych domownika." : "Dodaj nowego członka gospodarstwa domowego."}
            </DialogDescription>
          </DialogHeader>
          <HouseholdMemberForm
            member={selectedMember ?? undefined}
            onSubmit={handleFormSubmit}
            onCancel={handleCloseFormDialog}
            formError={formError}
            onClearError={() => setFormError(null)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Usuń domownika"
        description={`Czy na pewno chcesz usunąć domownika "${selectedMember?.fullName}"? Ta operacja jest nieodwracalna.`}
        confirmLabel="Usuń"
        cancelLabel="Anuluj"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
};
