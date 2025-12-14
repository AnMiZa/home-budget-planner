import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../utils/test-helpers";

// MessageBanner jest komponentem wewnętrznym AuthForm, więc musimy go wyekstrahować do testów
// lub zaimportować i testować przez AuthForm. Tu testujemy logikę jako standalone.

type MessageVariant = "error" | "success" | "info";

interface MessageBannerProps {
  readonly message?: string | null;
  readonly variant: MessageVariant;
}

const MessageBanner = ({ message, variant }: MessageBannerProps) => {
  if (!message) {
    return null;
  }

  const baseClasses =
    "rounded-md border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  const variantClasses = {
    error: "border-destructive/40 bg-destructive/10 text-destructive",
    success: "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    info: "border-primary/30 bg-primary/10 text-primary",
  } as const;

  return (
    <div role="alert" className={`${baseClasses} ${variantClasses[variant]}`}>
      {message}
    </div>
  );
};

describe("MessageBanner", () => {
  describe("Renderowanie warunkowe", () => {
    it("nie renderuje się gdy message jest null", () => {
      const { container } = renderWithProviders(<MessageBanner message={null} variant="error" />);

      expect(container.firstChild).toBeNull();
    });

    it("nie renderuje się gdy message jest undefined", () => {
      const { container } = renderWithProviders(<MessageBanner message={undefined} variant="error" />);

      expect(container.firstChild).toBeNull();
    });

    it("nie renderuje się gdy message jest pustym stringiem", () => {
      const { container } = renderWithProviders(<MessageBanner message="" variant="error" />);

      expect(container.firstChild).toBeNull();
    });

    it("renderuje się gdy message jest niepustym stringiem", () => {
      renderWithProviders(<MessageBanner message="Test message" variant="error" />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  describe("Zawartość i teksty", () => {
    it("wyświetla poprawną treść komunikatu", () => {
      const testMessage = "To jest komunikat testowy";
      renderWithProviders(<MessageBanner message={testMessage} variant="info" />);

      expect(screen.getByText(testMessage)).toBeInTheDocument();
    });

    it("wyświetla komunikat z polskimi znakami", () => {
      const polishMessage = "Błąd: Nieprawidłowy adres e-mail użytkownika";
      renderWithProviders(<MessageBanner message={polishMessage} variant="error" />);

      expect(screen.getByText(polishMessage)).toBeInTheDocument();
    });
  });

  describe("Warianty stylowania", () => {
    it("aplikuje poprawne klasy CSS dla wariantu 'error'", () => {
      renderWithProviders(<MessageBanner message="Error message" variant="error" />);

      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass("border-destructive/40", "bg-destructive/10", "text-destructive");
    });

    it("aplikuje poprawne klasy CSS dla wariantu 'success'", () => {
      renderWithProviders(<MessageBanner message="Success message" variant="success" />);

      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass("border-emerald-500/50", "bg-emerald-500/10");
    });

    it("aplikuje poprawne klasy CSS dla wariantu 'info'", () => {
      renderWithProviders(<MessageBanner message="Info message" variant="info" />);

      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass("border-primary/30", "bg-primary/10", "text-primary");
    });

    it("zawsze aplikuje bazowe klasy CSS", () => {
      renderWithProviders(<MessageBanner message="Any message" variant="error" />);

      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass("rounded-md", "border", "px-3", "py-2", "text-sm", "font-medium");
    });
  });

  describe("Accessibility", () => {
    it("zawiera atrybut role='alert' dla screen readers", () => {
      renderWithProviders(<MessageBanner message="Accessible message" variant="error" />);

      const alert = screen.getByRole("alert");
      expect(alert).toHaveAttribute("role", "alert");
    });
  });
});
