import { useUIContext } from "@/components/layout/UIContext";

export const AddExpenseSheet = () => {
  const { isAddExpenseSheetOpen } = useUIContext();

  if (!isAddExpenseSheetOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 text-background">
      <div className="rounded-lg bg-primary px-6 py-4 text-sm shadow-lg shadow-primary/40">
        Implementacja panelu dodawania wydatku zostanie dodana w kolejnych krokach.
      </div>
    </div>
  );
};
