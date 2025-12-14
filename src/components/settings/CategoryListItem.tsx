import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CategoryVM } from "./types";

export interface CategoryListItemProps {
  readonly category: CategoryVM;
  readonly onEdit: (category: CategoryVM) => void;
  readonly onDelete: (category: CategoryVM) => void;
}

/**
 * Single category list item with edit and delete actions.
 */
export const CategoryListItem = ({ category, onEdit, onDelete }: CategoryListItemProps) => (
  <li className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/50">
    <span className="flex-1 font-medium">{category.name}</span>
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onEdit(category)}
        aria-label={`Edytuj kategorię ${category.name}`}
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(category)}
        aria-label={`Usuń kategorię ${category.name}`}
      >
        <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
      </Button>
    </div>
  </li>
);
