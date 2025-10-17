import type { ReactNode } from "react";
import { useMemo } from "react";

import { UIContextProvider } from "@/components/layout/UIContext";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { MainNavigation } from "../navigation/MainNavigation";
import { AddExpenseSheet } from "../navigation/overlays/AddExpenseSheet";

interface MainLayoutProps {
  readonly children: ReactNode;
}

const DESKTOP_BREAKPOINT = "(min-width: 1024px)";

export const MainLayout = ({ children }: MainLayoutProps) => {
  const isDesktop = useMediaQuery(DESKTOP_BREAKPOINT);

  const mainPaddingClasses = useMemo(() => {
    if (isDesktop) {
      return "pl-72";
    }

    return "pb-24";
  }, [isDesktop]);

  return (
    <UIContextProvider>
      <div className="flex min-h-dvh bg-background text-foreground">
        <MainNavigation />

        <main className={`flex-1 px-4 pb-10 pt-6 transition-all ${mainPaddingClasses}`}>
          <div className="mx-auto w-full max-w-5xl space-y-8">{children}</div>
        </main>
      </div>

      <AddExpenseSheet />
    </UIContextProvider>
  );
};
