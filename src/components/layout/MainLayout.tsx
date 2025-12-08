import type { ReactNode } from "react";
import { useMemo } from "react";

import { UIContextProvider } from "@/components/layout/UIContext";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { MainNavigation } from "../navigation/MainNavigation";
import { AddExpenseSheet } from "../navigation/overlays/AddExpenseSheet";

interface User {
  id: string;
  email: string;
  household_id: string;
}

interface MainLayoutProps {
  readonly children: ReactNode;
  readonly user?: User;
}

const DESKTOP_BREAKPOINT = "(min-width: 1024px)";

export const MainLayout = ({ children, user }: MainLayoutProps) => {
  const isDesktop = useMediaQuery(DESKTOP_BREAKPOINT);

  const mainPaddingClasses = useMemo(() => {
    if (isDesktop) {
      return "pl-72";
    }

    return "pb-24";
  }, [isDesktop]);

  return (
    <UIContextProvider>
      <div className="flex h-dvh overflow-hidden bg-background text-foreground">
        <MainNavigation user={user} />
        <main className={`flex-1 overflow-y-auto px-4 pb-10 pt-6 transition-all ${mainPaddingClasses}`}>
          <div className="mx-auto w-full max-w-5xl space-y-8">{children}</div>
        </main>
      </div>

      <AddExpenseSheet />
    </UIContextProvider>
  );
};
