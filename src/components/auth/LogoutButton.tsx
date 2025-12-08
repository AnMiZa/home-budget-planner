import { useCallback, useState } from "react";

import { Loader2, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

export interface LogoutButtonProps {
  readonly className?: string;
  readonly onLoggedOut?: () => void;
}

export const LogoutButton = ({ className, onLoggedOut }: LogoutButtonProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogout = useCallback(async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        setErrorMessage(data.error || "Nie udało się wylogować. Spróbuj ponownie.");
        return;
      }

      // Call the callback if provided
      onLoggedOut?.();

      // Redirect to login page
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
      setErrorMessage("Nie udało się wylogować. Spróbuj ponownie.");
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, onLoggedOut]);

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="ghost"
        className={className}
        onClick={handleLogout}
        disabled={isSubmitting}
        title="Wyloguj się"
      >
        {isSubmitting ? (
          <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
        ) : (
          <LogOut className="mr-2 size-4" aria-hidden />
        )}
        <span>Wyloguj</span>
      </Button>
      {errorMessage ? <p className="text-xs font-medium text-destructive">{errorMessage}</p> : null}
    </div>
  );
};

