import { useCallback, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AuthForm } from "@/components/auth/AuthForm";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const resetSchema = z.object({
  email: z.string({ required_error: "Adres e-mail jest wymagany." }).email("Podaj poprawny adres e-mail."),
});

export type ResetPasswordFormValues = z.infer<typeof resetSchema>;

export const ResetPasswordForm = () => {
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: "",
    },
  });

  const handleSubmit = useCallback(async () => {
    setGlobalError(null);
    setSuccessMessage(null);

    try {
      // TODO: Zastąpić atrapę wywołaniem endpointu /api/auth/reset-password po dodaniu backendu.
      await new Promise((resolve) => setTimeout(resolve, 600));
      setSuccessMessage("Jeśli podany e-mail istnieje, wkrótce otrzymasz wiadomość z instrukcją zmiany hasła.");
      form.reset();
    } catch (error: unknown) {
      setGlobalError("Nie udało się wysłać formularza. Spróbuj ponownie. " + error);
    }
  }, [form, setGlobalError, setSuccessMessage]);

  return (
    <AuthForm<ResetPasswordFormValues>
      title="Odzyskaj dostęp"
      description="Podaj adres e-mail powiązany z kontem. Wyślemy instrukcję resetu hasła."
      form={form}
      onSubmit={handleSubmit}
      submitLabel="Wyślij link resetujący"
      globalError={globalError}
      successMessage={successMessage}
      footer={
        <a href="/login" className="font-medium text-primary hover:text-primary/80">
          Wróć do logowania
        </a>
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
                placeholder="twoj.mail@example.com"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </AuthForm>
  );
};
