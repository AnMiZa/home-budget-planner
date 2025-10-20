import type { ComponentType } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

type IconComponent = ComponentType<{ className?: string }>;

export interface NavigationItemProps {
  readonly href: string;
  readonly label: string;
  readonly icon: IconComponent;
  readonly onNavigate?: () => void;
  readonly orientation?: "vertical" | "horizontal";
}

const ASTRO_NAVIGATION_EVENT = "astro:page-load";

export const NavigationItem = ({
  href,
  label,
  icon: Icon,
  onNavigate,
  orientation = "vertical",
}: NavigationItemProps) => {
  const [isClient, setIsClient] = useState(false);
  const [pathname, setPathname] = useState<string>(href);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    setIsClient(true);
    const updatePathname = () => {
      setPathname(window.location.pathname);
    };

    document.addEventListener(ASTRO_NAVIGATION_EVENT, updatePathname as EventListener);
    window.addEventListener("popstate", updatePathname);

    return () => {
      document.removeEventListener(ASTRO_NAVIGATION_EVENT, updatePathname as EventListener);
      window.removeEventListener("popstate", updatePathname);
    };
  }, [isClient]);

  const isActive = useMemo(() => pathname === href, [pathname, href]);

  const handleClick = useCallback(() => {
    if (isClient && typeof window !== "undefined") {
      setPathname(window.location.pathname);
    }
    onNavigate?.();
  }, [isClient, onNavigate]);

  const baseClasses = useMemo(() => {
    const shared =
      "group flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

    if (orientation === "horizontal") {
      return cn(shared, "flex-col px-3 py-1.5 text-xs font-semibold");
    }

    return shared;
  }, [orientation]);

  return (
    <a
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        baseClasses,
        isActive
          ? "bg-primary text-primary-foreground shadow"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
      onClick={handleClick}
    >
      <Icon
        aria-hidden
        className={cn(
          "transition-transform",
          orientation === "horizontal" ? "size-5" : "size-4",
          isActive ? "scale-110" : "scale-100"
        )}
      />
      <span>{label}</span>
    </a>
  );
};
