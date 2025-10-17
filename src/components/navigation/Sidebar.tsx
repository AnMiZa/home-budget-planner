import { LayoutDashboard, Settings, Waves } from "lucide-react";

import { AddExpenseButton } from "@/components/navigation/AddExpenseButton";
import { NavigationItem } from "@/components/navigation/NavigationItem";

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

export interface SidebarProps {
  readonly onNavigate?: () => void;
}

export const Sidebar = ({ onNavigate }: SidebarProps) => {
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
    </aside>
  );
};
