import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { renderWithProviders } from "../../utils/test-helpers";
import { AuthForm, AuthFormProps } from "@/components/auth/AuthForm";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// Prosty schemat testowy
const testSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type TestFormValues = z.infer<typeof testSchema>;

// Helper component do testowania AuthForm
function TestAuthFormWrapper({
  onSubmit,
  globalError,
  successMessage,
  footer,
  description,
}: {
  onSubmit: (data: TestFormValues) => void;
  globalError?: string | null;
  successMessage?: string | null;
  footer?: React.ReactNode;
  description?: string;
}) {
  const form = useForm<TestFormValues>({
    resolver: zodResolver(testSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  return (
    <AuthForm
      title="Test Form"
      description={description}
      form={form}
      onSubmit={onSubmit}
      submitLabel="Submit"
      globalError={globalError}
      successMessage={successMessage}
      footer={footer}
    >
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" {...form.register("email")} type="email" />
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <input id="password" {...form.register("password")} type="password" />
      </div>
    </AuthForm>
  );
}

describe("AuthForm", () => {
  describe("Renderowanie podstawowe", () => {
    it("renderuje tytuł formularza", () => {
      const mockSubmit = vi.fn();
      renderWithProviders(<TestAuthFormWrapper onSubmit={mockSubmit} />);

      expect(screen.getByText("Test Form")).toBeInTheDocument();
    });

    it("renderuje opis gdy przekazany", () => {
      const mockSubmit = vi.fn();
      const description = "To jest opis testowego formularza";
      renderWithProviders(<TestAuthFormWrapper onSubmit={mockSubmit} description={description} />);

      expect(screen.getByText(description)).toBeInTheDocument();
    });

    it("nie renderuje opisu gdy nie przekazany", () => {
      const mockSubmit = vi.fn();
      renderWithProviders(<TestAuthFormWrapper onSubmit={mockSubmit} />);

      // Sprawdź, że jest tylko tytuł, bez dodatkowego tekstu
      const cardHeader = screen.getByText("Test Form").closest("div");
      expect(cardHeader).toBeInTheDocument();
      expect(cardHeader?.childNodes.length).toBeLessThanOrEqual(2); // Tytuł + ewentualnie wrapper
    });

    it("renderuje children (pola formularza)", () => {
      const mockSubmit = vi.fn();
      renderWithProviders(<TestAuthFormWrapper onSubmit={mockSubmit} />);

      expect(screen.getByLabelText("Email")).toBeInTheDocument();
      expect(screen.getByLabelText("Password")).toBeInTheDocument();
    });

    it("renderuje submitLabel na przycisku", () => {
      const mockSubmit = vi.fn();
      renderWithProviders(<TestAuthFormWrapper onSubmit={mockSubmit} />);

      expect(screen.getByRole("button", { name: /submit/i })).toBeInTheDocument();
    });
  });

  describe("Renderowanie footer", () => {
    it("renderuje footer gdy przekazany", () => {
      const mockSubmit = vi.fn();
      const footer = (
        <div>
          <a href="/register">Zarejestruj się</a>
        </div>
      );
      renderWithProviders(<TestAuthFormWrapper onSubmit={mockSubmit} footer={footer} />);

      expect(screen.getByText("Zarejestruj się")).toBeInTheDocument();
    });

    it("nie renderuje footer gdy nie przekazany", () => {
      const mockSubmit = vi.fn();
      const { container } = renderWithProviders(<TestAuthFormWrapper onSubmit={mockSubmit} />);

      // Footer nie powinien istnieć w DOM
      const cardFooter = container.querySelector('[class*="CardFooter"]');
      expect(cardFooter).not.toBeInTheDocument();
    });

    it("renderuje złożony footer z wieloma elementami", () => {
      const mockSubmit = vi.fn();
      const footer = (
        <>
          <p>Nie masz konta?</p>
          <a href="/register">Zarejestruj się</a>
          <a href="/reset">Zapomniałeś hasła?</a>
        </>
      );
      renderWithProviders(<TestAuthFormWrapper onSubmit={mockSubmit} footer={footer} />);

      expect(screen.getByText("Nie masz konta?")).toBeInTheDocument();
      expect(screen.getByText("Zarejestruj się")).toBeInTheDocument();
      expect(screen.getByText("Zapomniałeś hasła?")).toBeInTheDocument();
    });
  });

  describe("MessageBanner - błędy i komunikaty", () => {
    it("pokazuje MessageBanner dla globalError", () => {
      const mockSubmit = vi.fn();
      const errorMessage = "Nieprawidłowy login lub hasło";
      renderWithProviders(<TestAuthFormWrapper onSubmit={mockSubmit} globalError={errorMessage} />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it("pokazuje MessageBanner dla successMessage", () => {
      const mockSubmit = vi.fn();
      const successMessage = "Konto zostało utworzone pomyślnie";
      renderWithProviders(<TestAuthFormWrapper onSubmit={mockSubmit} successMessage={successMessage} />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(successMessage)).toBeInTheDocument();
    });

    it("nie pokazuje MessageBanner gdy brak błędów i komunikatów", () => {
      const mockSubmit = vi.fn();
      renderWithProviders(<TestAuthFormWrapper onSubmit={mockSubmit} />);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("pokazuje oba komunikaty jednocześnie (error i success)", () => {
      const mockSubmit = vi.fn();
      const errorMessage = "Błąd";
      const successMessage = "Sukces";
      renderWithProviders(
        <TestAuthFormWrapper onSubmit={mockSubmit} globalError={errorMessage} successMessage={successMessage} />
      );

      const alerts = screen.getAllByRole("alert");
      expect(alerts).toHaveLength(2);
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByText(successMessage)).toBeInTheDocument();
    });
  });

  describe("Stan submitting", () => {
    it("wyświetla Loader2 gdy formularz jest w trakcie wysyłania", async () => {
      const user = userEvent.setup();
      const mockSubmit = vi.fn(() => new Promise((resolve) => setTimeout(resolve, 1000)));

      renderWithProviders(<TestAuthFormWrapper onSubmit={mockSubmit} />);

      const emailInput = screen.getByLabelText("Email");
      const passwordInput = screen.getByLabelText("Password");
      const submitButton = screen.getByRole("button", { name: /submit/i });

      // Wypełnij formularz poprawnymi danymi
      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.click(submitButton);

      // Sprawdź czy loader się pojawił
      await waitFor(() => {
        const svg = submitButton.querySelector("svg");
        expect(svg).toBeInTheDocument();
        expect(svg).toHaveClass("animate-spin");
      });
    });

    it("disabluje przycisk gdy isSubmitting = true", async () => {
      const user = userEvent.setup();
      const mockSubmit = vi.fn(() => new Promise((resolve) => setTimeout(resolve, 1000)));

      renderWithProviders(<TestAuthFormWrapper onSubmit={mockSubmit} />);

      const emailInput = screen.getByLabelText("Email");
      const passwordInput = screen.getByLabelText("Password");
      const submitButton = screen.getByRole("button", { name: /submit/i });

      // Wypełnij formularz
      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");

      // Sprawdź że przycisk jest aktywny przed submitem
      expect(submitButton).not.toBeDisabled();

      // Wyślij formularz
      await user.click(submitButton);

      // Sprawdź że przycisk jest zdisablowany podczas submitu
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe("Funkcjonalność formularza", () => {
    it("wywołuje onSubmit przy submit formularza z poprawnymi danymi", async () => {
      const user = userEvent.setup();
      const mockSubmit = vi.fn();

      renderWithProviders(<TestAuthFormWrapper onSubmit={mockSubmit} />);

      const emailInput = screen.getByLabelText("Email");
      const passwordInput = screen.getByLabelText("Password");
      const submitButton = screen.getByRole("button", { name: /submit/i });

      // Wypełnij formularz
      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.click(submitButton);

      // Sprawdź czy funkcja została wywołana z poprawnymi danymi
      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledTimes(1);
        expect(mockSubmit).toHaveBeenCalledWith(
          {
            email: "test@example.com",
            password: "password123",
          },
          expect.anything() // event object
        );
      });
    });

    it("nie wywołuje onSubmit gdy dane są nieprawidłowe", async () => {
      const user = userEvent.setup();
      const mockSubmit = vi.fn();

      renderWithProviders(<TestAuthFormWrapper onSubmit={mockSubmit} />);

      const emailInput = screen.getByLabelText("Email");
      const passwordInput = screen.getByLabelText("Password");
      const submitButton = screen.getByRole("button", { name: /submit/i });

      // Wypełnij formularz nieprawidłowymi danymi
      await user.type(emailInput, "nieprawidlowy-email");
      await user.type(passwordInput, "123"); // za krótkie hasło
      await user.click(submitButton);

      // Sprawdź że funkcja NIE została wywołana
      await waitFor(() => {
        expect(mockSubmit).not.toHaveBeenCalled();
      });
    });

    it("obsługuje submit przez Enter w polu input", async () => {
      const user = userEvent.setup();
      const mockSubmit = vi.fn();

      renderWithProviders(<TestAuthFormWrapper onSubmit={mockSubmit} />);

      const emailInput = screen.getByLabelText("Email");
      const passwordInput = screen.getByLabelText("Password");

      // Wypełnij formularz
      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");

      // Wciśnij Enter w ostatnim polu
      await user.keyboard("{Enter}");

      // Sprawdź czy formularz został wysłany
      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("Accessibility", () => {
    it("ustawia noValidate na formularzu (własna walidacja)", () => {
      const mockSubmit = vi.fn();
      const { container } = renderWithProviders(<TestAuthFormWrapper onSubmit={mockSubmit} />);

      const form = container.querySelector("form");
      expect(form).toHaveAttribute("noValidate");
    });
  });
});
