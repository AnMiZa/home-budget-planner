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

export interface TabBarProps {
  readonly onNavigate?: () => void;
}

export const TabBar = ({ onNavigate }: TabBarProps) => {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-sidebar-border bg-sidebar/90 px-6 pb-4 pt-6 shadow-lg shadow-black/10 backdrop-blur supports-[backdrop-filter]:bg-sidebar/70 lg:hidden">
      <nav aria-label="Dolna nawigacja" className="mx-auto flex max-w-md items-end justify-between">
        {NAVIGATION_LINKS.slice(0, 1).map((link) => (
          <NavigationItem key={link.href} {...link} orientation="horizontal" onNavigate={onNavigate} />
        ))}

        <AddExpenseButton variant="tabbar" />

        {NAVIGATION_LINKS.slice(1).map((link) => (
          <NavigationItem key={link.href} {...link} orientation="horizontal" onNavigate={onNavigate} />
        ))}
      </nav>
    </footer>
  );
};
