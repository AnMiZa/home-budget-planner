import { useCallback, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AuthForm } from "@/components/auth/AuthForm";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const registerSchema = z
  .object({
    email: z.string({ required_error: "Adres e-mail jest wymagany." }).email("Podaj poprawny adres e-mail."),
    password: z
      .string({ required_error: "Hasło jest wymagane." })
      .min(8, "Hasło powinno zawierać co najmniej 8 znaków.")
      .regex(/[A-ZĄĆĘŁŃÓŚŹŻ]/, "Dodaj przynajmniej jedną wielką literę.")
      .regex(/[a-ząćęłńóśźż]/, "Dodaj przynajmniej jedną małą literę.")
      .regex(/\d/, "Dodaj przynajmniej jedną cyfrę."),
    confirmPassword: z.string({ required_error: "Potwierdź hasło." }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Hasła muszą być takie same.",
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const RegisterForm = () => {
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleSubmit = useCallback(
    async (values: RegisterFormValues) => {
      setGlobalError(null);
      setSuccessMessage(null);

      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: values.email,
            password: values.password,
            confirmPassword: values.confirmPassword,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setGlobalError(data.error || "Nie udało się utworzyć konta.");
          return;
        }

        // Successful registration - redirect to home page
        window.location.href = "/";
      } catch (error) {
        console.error("Registration error:", error);
        setGlobalError("Nie udało się połączyć z serwerem. Spróbuj ponownie.");
      }
    },
    []
  );

  return (
    <AuthForm<RegisterFormValues>
      title="Utwórz konto"
      description="Dołącz i miej pełną kontrolę nad budżetem domowym."
      form={form}
      onSubmit={handleSubmit}
      submitLabel="Zarejestruj się"
      globalError={globalError}
      successMessage={successMessage}
      footer={
        <p>
          Masz już konto?{" "}
          <a href="/login" className="font-medium text-primary hover:text-primary/80">
            Zaloguj się
          </a>
        </p>
      }
    >
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>E-mail</FormLabel>
            <FormControl>
              <Input
                {...field}
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="twoj.mail@example.com"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="password"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Hasło</FormLabel>
            <FormControl>
              <Input
                {...field}
                type="password"
                autoComplete="new-password"
                placeholder="********"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="confirmPassword"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Powtórz hasło</FormLabel>
            <FormControl>
              <Input
                {...field}
                type="password"
                autoComplete="new-password"
                placeholder="********"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </AuthForm>
  );
};

