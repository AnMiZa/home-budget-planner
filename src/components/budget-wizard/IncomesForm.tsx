import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import type { IncomeFormViewModel } from "./types";

const moneySchema = z
  .string()
  .transform((value) => value.trim())
  .refine((value) => value.length > 0, { message: "Kwota jest wymagana" })
  .refine((value) => /^\d+(?:[.,]\d{0,2})?$/.test(value), {
    message: "Podaj liczbę z maks. dwoma miejscami po przecinku",
  })
  .transform((value) => value.replace(",", "."))
  .refine((value) => Number.parseFloat(value) > 0, {
    message: "Kwota musi być dodatnia",
  })
  .refine((value) => Number.parseFloat(value) <= 9_999_999.99, {
    message: "Kwota nie może przekraczać 9 999 999,99",
  });

const incomesFormSchema = z.object({
  incomes: z.array(
    z.object({
      householdMemberId: z.string(),
      fullName: z.string(),
      originalIncomeId: z.string().optional(),
      amount: moneySchema,
    })
  ),
});

type IncomesFormSchema = z.infer<typeof incomesFormSchema>;

interface IncomesFormProps {
  readonly incomes: IncomeFormViewModel[];
  readonly onIncomeChange: (memberId: string, amount: string) => void;
  readonly onValidityChange?: (isValid: boolean) => void;
  readonly isDisabled?: boolean;
}

export const IncomesForm = ({ incomes, onIncomeChange, onValidityChange, isDisabled = false }: IncomesFormProps) => {
  const form = useForm<IncomesFormSchema>({
    defaultValues: { incomes },
    resolver: zodResolver(incomesFormSchema),
    mode: "onChange",
  });

  useEffect(() => {
    form.reset({ incomes });
    void form.trigger();
  }, [form, incomes]);

  useEffect(() => {
    onValidityChange?.(form.formState.isValid);
  }, [form.formState.isValid, onValidityChange]);

  return (
    <Form {...form}>
      <form className="space-y-4" noValidate>
        {(form.watch("incomes") ?? []).map((income, index) => (
          <FormField
            key={incomes[index]?.householdMemberId ?? income.householdMemberId}
            name={`incomes.${index}.amount`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-baseline justify-between">
                  <span className="font-medium text-foreground">{incomes[index]?.fullName ?? income.fullName}</span>
                  <span className="text-xs text-muted-foreground">PLN / mies.</span>
                </FormLabel>
                <FormControl>
                  <Input
                    inputMode="decimal"
                    placeholder="0,00"
                    {...field}
                    onChange={(event) => {
                      const normalised = event.target.value.replace(/,/g, ".");
                      field.onChange(normalised);
                      onIncomeChange(incomes[index]?.householdMemberId ?? income.householdMemberId, normalised);
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
