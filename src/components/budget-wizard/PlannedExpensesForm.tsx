import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import type { PlannedExpenseFormViewModel } from "./types";

const moneySchema = z
  .string()
  .transform((value) => value.trim())
  .refine((value) => value.length > 0, { message: "Limit jest wymagany" })
  .refine((value) => /^\d+(?:[.,]\d{0,2})?$/.test(value), {
    message: "Podaj liczbę z maks. dwoma miejscami po przecinku",
  })
  .transform((value) => value.replace(",", "."))
  .refine((value) => Number.parseFloat(value) >= 0, {
    message: "Limit musi być dodatni",
  })
  .refine((value) => Number.parseFloat(value) <= 9_999_999.99, {
    message: "Limit nie może przekraczać 9 999 999,99",
  });

const plannedExpensesFormSchema = z.object({
  plannedExpenses: z.array(
    z.object({
      categoryId: z.string(),
      name: z.string(),
      originalPlannedExpenseId: z.string().optional(),
      limitAmount: moneySchema,
    })
  ),
});

type PlannedExpensesFormSchema = z.infer<typeof plannedExpensesFormSchema>;

interface PlannedExpensesFormProps {
  readonly plannedExpenses: PlannedExpenseFormViewModel[];
  readonly onPlannedExpenseChange: (categoryId: string, amount: string) => void;
  readonly onValidityChange?: (isValid: boolean) => void;
  readonly isDisabled?: boolean;
}

export const PlannedExpensesForm = ({
  plannedExpenses,
  onPlannedExpenseChange,
  onValidityChange,
  isDisabled = false,
}: PlannedExpensesFormProps) => {
  const form = useForm<PlannedExpensesFormSchema>({
    defaultValues: { plannedExpenses },
    resolver: zodResolver(plannedExpensesFormSchema),
    mode: "onChange",
  });

  useEffect(() => {
    form.reset({ plannedExpenses });
    void form.trigger();
  }, [form, plannedExpenses]);

  useEffect(() => {
    onValidityChange?.(form.formState.isValid);
  }, [form.formState.isValid, onValidityChange]);

  return (
    <Form {...form}>
      <form className="space-y-4" noValidate>
        {(form.watch("plannedExpenses") ?? []).map((expense, index) => (
          <FormField
            key={plannedExpenses[index]?.categoryId ?? expense.categoryId}
            control={form.control}
            name={`plannedExpenses.${index}.limitAmount`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-baseline justify-between">
                  <span className="font-medium text-foreground">{plannedExpenses[index]?.name ?? expense.name}</span>
                  <span className="text-xs text-muted-foreground">Limit miesięczny</span>
                </FormLabel>
                <FormControl>
                  <Input
                    inputMode="decimal"
                    placeholder="Wpisz kwotę"
                    {...field}
                    onChange={(event) => {
                      const normalised = event.target.value.replace(/,/g, ".");
                      field.onChange(normalised);
                      onPlannedExpenseChange(plannedExpenses[index]?.categoryId ?? expense.categoryId, normalised);
                    }}
                    disabled={isDisabled}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
      </form>
    </Form>
  );
};
