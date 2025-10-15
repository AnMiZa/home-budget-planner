import { Button } from "@/components/ui/button";

export interface EmptyStateProps {
  readonly onCreateBudget: () => void;
}

export const EmptyState = ({ onCreateBudget }: EmptyStateProps) => (
  <div className="flex h-full w-full flex-col items-center justify-center gap-6 rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
    <div className="space-y-2">
      <h2 className="text-2xl font-semibold">Nie masz jeszcze aktywnego budżetu</h2>
      <p className="text-sm text-muted-foreground">
        Utwórz pierwszy budżet, aby zacząć planować swoje wydatki i śledzić postępy.
      </p>
    </div>
    <Button onClick={onCreateBudget}>Stwórz budżet</Button>
  </div>
);
