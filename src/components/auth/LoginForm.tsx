import { useCallback, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AuthForm } from "@/components/auth/AuthForm";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({
  email: z.string({ required_error: "Adres e-mail jest wymagany." }).email("Podaj poprawny adres e-mail."),
  password: z.string({ required_error: "Hasło jest wymagane." }).min(1, "Hasło jest wymagane."),
  rememberMe: z.boolean(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginForm = () => {
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const handleSubmit = useCallback(async (values: LoginFormValues) => {
    setGlobalError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setGlobalError(data.error || "Nieprawidłowy login lub hasło.");
        return;
      }

      // Successful login - redirect to home page
      window.location.href = "/";
    } catch (error) {
      console.error("Login error:", error);
      setGlobalError("Nie udało się połączyć z serwerem. Spróbuj ponownie.");
    }
  }, []);

  return (
    <AuthForm<LoginFormValues>
      title="Zaloguj się"
      description="Zaloguj się, aby kontynuować planowanie budżetu."
      form={form}
      onSubmit={handleSubmit}
      submitLabel="Zaloguj się"
      globalError={globalError}
      successMessage={successMessage}
      footer={
        <>
          <p>
            Nie masz konta?{" "}
            <a href="/register" className="font-medium text-primary hover:text-primary/80">
              Zarejestruj się
            </a>
          </p>
          {/* TODO: Add reset password link */}
          {/* <a href="/reset-password" className="font-medium text-primary hover:text-primary/80">
            Nie pamiętasz hasła?
          </a> */}
        </>
      }
    >
      <FormField
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
                placeholder="jan.kowalski@example.com"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="password"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Hasło</FormLabel>
            <FormControl>
              <Input {...field} type="password" autoComplete="current-password" placeholder="********" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="rememberMe"
        render={({ field }) => (
          <FormItem className="space-y-0">
            <FormControl>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={(event) => field.onChange(event.target.checked)}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  className="size-4 rounded border border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <span>Zapamiętaj mnie</span>
              </label>
            </FormControl>
          </FormItem>
        )}
      />
    </AuthForm>
  );
};
