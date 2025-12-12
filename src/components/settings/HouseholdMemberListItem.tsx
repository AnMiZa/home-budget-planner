import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HouseholdMemberVM } from "./types";

export interface HouseholdMemberListItemProps {
  readonly member: HouseholdMemberVM;
  readonly onEdit: (member: HouseholdMemberVM) => void;
  readonly onDelete: (member: HouseholdMemberVM) => void;
}

/**
 * Single household member list item with edit and delete actions.
 */
export const HouseholdMemberListItem = ({ member, onEdit, onDelete }: HouseholdMemberListItemProps) => (
  <li className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/50">
    <span className="flex-1 font-medium">{member.fullName}</span>
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onEdit(member)}
        aria-label={`Edytuj domownika ${member.fullName}`}
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(member)}
        aria-label={`Usuń domownika ${member.fullName}`}
      >
        <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
      </Button>
    </div>
  </li>
);

