import type { ComponentType } from "react";
import { ChevronRight } from "lucide-react";

export interface SettingsNavItemProps {
  readonly href?: string;
  readonly label: string;
  readonly icon: ComponentType<{ className?: string }>;
  readonly description?: string;
  readonly onClick?: () => void;
  readonly disabled?: boolean;
}

/**
 * Navigation item for settings sections.
 * Renders as a card-style link with icon and chevron.
 * Can be disabled and handle custom onClick for unavailable features.
 */
export const SettingsNavItem = ({ href, label, icon: Icon, description, onClick, disabled }: SettingsNavItemProps) => {
  const content = (
    <>
      <div className="flex items-center gap-4">
        <div className="rounded-md bg-primary/10 p-2">
          <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-medium">{label}</span>
          {description && <span className="text-sm text-muted-foreground">{description}</span>}
        </div>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
    </>
  );

  const baseClassName =
    "flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  if (onClick || disabled) {
    return (
      <li>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={`${baseClassName} w-full text-left cursor-pointer`}
        >
          {content}
        </button>
      </li>
    );
  }

  return (
    <li>
      <a href={href} className={baseClassName}>
        {content}
      </a>
    </li>
  );
};
