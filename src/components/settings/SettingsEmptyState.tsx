import type { ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export interface SettingsEmptyStateProps {
  readonly title: string;
  readonly description: string;
  readonly actionLabel: string;
  readonly onAction: () => void;
  readonly icon?: ComponentType<{ className?: string }>;
}

/**
 * Empty state component for settings lists.
 * Displays when no items exist with a call-to-action button.
 */
export const SettingsEmptyState = ({
  title,
  description,
  actionLabel,
  onAction,
  icon: Icon = Plus,
}: SettingsEmptyStateProps) => (
  <div className="flex h-full w-full flex-col items-center justify-center gap-6 rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
    <div className="flex flex-col items-center gap-4">
      <div className="rounded-full bg-muted p-4">
        <Icon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
    <Button onClick={onAction}>
      <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
      {actionLabel}
    </Button>
  </div>
);

