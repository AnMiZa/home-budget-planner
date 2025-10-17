import { Plus } from "lucide-react";

import { useUIContext } from "@/components/layout/UIContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AddExpenseButtonProps {
  readonly variant: "sidebar" | "tabbar";
}

export const AddExpenseButton = ({ variant }: AddExpenseButtonProps) => {
  const { openAddExpenseSheet } = useUIContext();

  if (variant === "tabbar") {
    return (
      <Button
        type="button"
        onClick={openAddExpenseSheet}
        className="-mt-6 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/50 transition-transform hover:scale-105 focus-visible:scale-105"
        aria-label="Dodaj wydatek"
      >
        <Plus className="size-6" aria-hidden />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      onClick={openAddExpenseSheet}
      className={cn(
        "mt-auto w-full justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
    >
      <Plus className="size-4" aria-hidden />
      Dodaj wydatek
    </Button>
  );
};
