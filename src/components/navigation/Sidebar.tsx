import { LayoutDashboard, Settings, Waves } from "lucide-react";

import { AddExpenseButton } from "@/components/navigation/AddExpenseButton";
import { NavigationItem } from "@/components/navigation/NavigationItem";
import { LogoutButton } from "@/components/auth/LogoutButton";

const NAVIGATION_LINKS = [
  {
    href: "/",
    label: "Pulpit",
    icon: LayoutDashboard,
  },
  {
    href: "/transactions",
    label: "Transakcje",
    icon: Waves,
  },
  {
    href: "/settings",
    label: "Ustawienia",
    icon: Settings,
  },
];

interface User {
  id: string;
  email: string;
  household_id: string;
}

export interface SidebarProps {
  readonly onNavigate?: () => void;
  readonly user?: User;
}

export const Sidebar = ({ onNavigate, user }: SidebarProps) => {
  return (
    <aside className="hidden lg:flex lg:h-dvh lg:w-72 lg:flex-col lg:gap-6 lg:border-r lg:border-sidebar-border lg:bg-sidebar lg:px-6 lg:py-8 lg:text-sidebar-foreground">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
          HB
        </span>
        Home Budget
      </div>

      <nav aria-label="Główna nawigacja" className="flex flex-col gap-2">
        {NAVIGATION_LINKS.map((link) => (
          <NavigationItem key={link.href} {...link} onNavigate={onNavigate} />
        ))}
      </nav>

      <AddExpenseButton variant="sidebar" />

      {user ? (
        <div className="mt-auto space-y-3 border-t border-sidebar-border pt-6">
          <div className="text-sm text-sidebar-foreground/70">
            <p className="font-medium text-sidebar-foreground">{user.email}</p>
            <p className="text-xs">Zalogowany</p>
          </div>
          <LogoutButton className="w-full justify-start" />
        </div>
      ) : null}
    </aside>
  );
};
