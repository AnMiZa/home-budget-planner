import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { CategoryVM } from "./types";

export interface CategoryDeleteConfirmationDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly category: CategoryVM | null;
  readonly onConfirm: () => Promise<void>;
  readonly isProcessing?: boolean;
  readonly requiresForce?: boolean;
}

/**
 * Special confirmation dialog for category deletion.
 * Shows warning about cascading deletion of related transactions and planned expenses.
 */
export const CategoryDeleteConfirmationDialog = ({
  open,
  onOpenChange,
  category,
  onConfirm,
  isProcessing = false,
  requiresForce = false,
}: CategoryDeleteConfirmationDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (isSubmitting || isProcessing) return;

    setIsSubmitting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      // Error handling is delegated to parent component
      console.error("Delete confirmation action failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isSubmitting || isProcessing;

  if (!category) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-destructive/10 p-2">
              <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
            </div>
            <AlertDialogTitle>Usuń kategorię</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3 pt-2">
            <p>Czy na pewno chcesz usunąć kategorię &quot;{category.name}&quot;?</p>
            {requiresForce && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-medium">Uwaga!</p>
                <p className="mt-1">
                  Ta kategoria ma powiązane transakcje lub planowane wydatki. Usunięcie kategorii spowoduje również
                  usunięcie wszystkich powiązanych danych. Ta operacja jest nieodwracalna.
                </p>
              </div>
            )}
            {!requiresForce && <p className="text-sm">Ta operacja jest nieodwracalna.</p>}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" disabled={isLoading}>
              Anuluj
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button variant="destructive" onClick={handleConfirm} disabled={isLoading}>
              {isLoading ? "Usuwanie..." : "Usuń kategorię"}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

