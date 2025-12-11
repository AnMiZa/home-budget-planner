import { useCallback } from "react";
import { Users, FolderOpen, UserCircle } from "lucide-react";
import { SettingsNavItem } from "./SettingsNavItem";
import { useToast, showToast } from "@/components/ui/toast";
import type { SettingsNavItemData } from "./types";

/**
 * Main settings view displaying navigation to subsections.
 * Provides access to household members, categories, and profile settings.
 */
export const SettingsView = () => {
  const { ToastPortal } = useToast();

  const handleProfileClick = useCallback(() => {
    showToast({
      title: "Ta funkcjonalność będzie dostępna wkrótce",
      variant: "default",
    });
  }, []);

  const navItems: readonly SettingsNavItemData[] = [
    {
      href: "/settings/members",
      label: "Domownicy",
      icon: Users,
      description: "Zarządzaj członkami gospodarstwa domowego",
    },
    {
      href: "/settings/categories",
      label: "Kategorie",
      icon: FolderOpen,
      description: "Zarządzaj kategoriami wydatków",
    },
    {
      label: "Profil",
      icon: UserCircle,
      description: "Ustawienia konta i preferencje (wkrótce)",
      onClick: handleProfileClick,
    },
  ];

  return (
    <>
      <div className="container mx-auto max-w-2xl space-y-6 p-4 md:p-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Ustawienia</h1>
          <p className="text-muted-foreground">Zarządzaj konfiguracją aplikacji i danymi gospodarstwa domowego</p>
        </header>

        <nav aria-label="Sekcje ustawień">
          <ul className="space-y-3">
            {navItems.map((item) => (
              <SettingsNavItem
                key={item.href || item.label}
                href={item.href}
                label={item.label}
                icon={item.icon}
                description={item.description}
                onClick={item.onClick}
              />
            ))}
          </ul>
        </nav>
      </div>
      <ToastPortal />
    </>
  );
};
