import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

interface UIContextValue {
  readonly isAddExpenseSheetOpen: boolean;
  readonly openAddExpenseSheet: () => void;
  readonly closeAddExpenseSheet: () => void;
  readonly toggleAddExpenseSheet: () => void;
}

const UIContext = createContext<UIContextValue | undefined>(undefined);

export interface UIContextProviderProps {
  readonly children: React.ReactNode;
}

export const UIContextProvider = ({ children }: UIContextProviderProps) => {
  const [isAddExpenseSheetOpen, setIsAddExpenseSheetOpen] = useState(false);

  const openAddExpenseSheet = useCallback(() => {
    setIsAddExpenseSheetOpen(true);
  }, []);

  const closeAddExpenseSheet = useCallback(() => {
    setIsAddExpenseSheetOpen(false);
  }, []);

  const toggleAddExpenseSheet = useCallback(() => {
    setIsAddExpenseSheetOpen((previous) => !previous);
  }, []);

  const value = useMemo<UIContextValue>(
    () => ({ isAddExpenseSheetOpen, openAddExpenseSheet, closeAddExpenseSheet, toggleAddExpenseSheet }),
    [closeAddExpenseSheet, isAddExpenseSheetOpen, openAddExpenseSheet, toggleAddExpenseSheet]
  );

  // Add marker to DOM when context is ready (for E2E tests)
  useEffect(() => {
    document.body.setAttribute("data-ui-context-ready", "true");
    return () => {
      document.body.removeAttribute("data-ui-context-ready");
    };
  }, []);

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUIContext = (): UIContextValue => {
  const context = useContext(UIContext);

  if (context === undefined) {
    throw new Error("useUIContext must be used within a UIContextProvider");
  }

  return context;
};

export type { UIContextValue };
