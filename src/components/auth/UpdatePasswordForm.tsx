import { useCallback, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AuthForm } from "@/components/auth/AuthForm";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const updatePasswordSchema = z
  .object({
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

export type UpdatePasswordFormValues = z.infer<typeof updatePasswordSchema>;

export const UpdatePasswordForm = () => {
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<UpdatePasswordFormValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const handleSubmit = useCallback(
    async (values: UpdatePasswordFormValues) => {
      setGlobalError(null);
      setSuccessMessage(null);

      try {
        // TODO: Zastąpić atrapę wywołaniem endpointu /api/auth/update-password po dodaniu backendu.
        await new Promise((resolve) => setTimeout(resolve, 700));
        setSuccessMessage("Hasło zostanie zaktualizowane po połączeniu z backendem.");
        form.reset({ password: "", confirmPassword: "" });
      } catch (error) {
        setGlobalError("Nie udało się wysłać formularza. Spróbuj ponownie.");
      }
    },
    [form]
  );

  return (
    <AuthForm<UpdatePasswordFormValues>
      title="Ustaw nowe hasło"
      description="Wprowadź nowe hasło dla swojego konta. Po zapisaniu zalogujesz się ponownie."
      form={form}
      onSubmit={handleSubmit}
      submitLabel="Zapisz nowe hasło"
      globalError={globalError}
      successMessage={successMessage}
      footer={
        <a href="/login" className="font-medium text-primary hover:text-primary/80">
          Wróć do logowania
        </a>
      }
    >
      <FormField
        control={form.control}
        name="password"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nowe hasło</FormLabel>
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
            <FormLabel>Powtórz nowe hasło</FormLabel>
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

