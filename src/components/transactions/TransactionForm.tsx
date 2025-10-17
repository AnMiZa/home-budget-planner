import { useCallback, useMemo, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { TransactionVM } from "@/components/transactions/useTransactionsHistory";
import type { CategoryDto, UpdateTransactionCommand } from "@/types";

export interface TransactionFormValues {
  readonly categoryId: string;
  readonly amount: string;
  readonly transactionDate: string;
  readonly note?: string | null;
}

export interface TransactionFormProps {
  readonly transaction: TransactionVM;
  readonly categories: readonly CategoryDto[];
  readonly onSubmit: (id: string, data: UpdateTransactionCommand) => Promise<void>;
  readonly onCancel: () => void;
  readonly formError?: string | null;
  readonly onClearError?: () => void;
}

const AMOUNT_REGEX = /^\d+(?:\.\d{1,2})?$/;

const formSchema = z.object({
  categoryId: z.string().uuid({ message: "Wybierz poprawną kategorię." }),
  amount: z
    .string()
    .min(1, "Kwota jest wymagana.")
    .refine((value) => AMOUNT_REGEX.test(value), "Kwota może mieć maksymalnie dwa miejsca po przecinku.")
    .refine((value) => Number(value) > 0, "Kwota musi być większa od zera."),
  transactionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((value) => !Number.isNaN(new Date(value).getTime()), "Podaj poprawną datę."),
  note: z.string().max(500, "Notatka nie może przekraczać 500 znaków.").optional().nullable(),
});

export const TransactionForm = ({
  transaction,
  categories,
  onSubmit,
  onCancel,
  formError,
  onClearError,
}: TransactionFormProps) => {
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      categoryId: transaction.categoryId,
      amount: transaction.amount.toFixed(2),
      transactionDate: transaction.transactionDate,
      note: transaction.note ?? "",
    },
  });

  const isSubmitting = form.formState.isSubmitting;
  const [localError, setLocalError] = useState<string | null>(null);
  const amountHintId = "transaction-amount-hint";
  const transactionDateValue = form.watch("transactionDate");
  const [isTransactionDateOpen, setIsTransactionDateOpen] = useState(false);

  const handleTransactionDateSelect = useCallback(
    (date: Date | undefined) => {
      if (!date) {
        return;
      }

      const isoDate = format(date, "yyyy-MM-dd");
      form.setValue("transactionDate", isoDate, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      setIsTransactionDateOpen(false);
    },
    [form]
  );

  const onFormSubmit = useCallback(
    async (values: TransactionFormValues) => {
      const payload: UpdateTransactionCommand = {};

      setLocalError(null);
      onClearError?.();

      if (values.categoryId && values.categoryId !== transaction.categoryId) {
        payload.categoryId = values.categoryId;
      }

      const amountNumber = Number(values.amount);
      if (!Number.isNaN(amountNumber) && amountNumber !== transaction.amount) {
        payload.amount = Number(amountNumber.toFixed(2));
      }

      if (values.transactionDate && values.transactionDate !== transaction.transactionDate) {
        payload.transactionDate = values.transactionDate;
      }

      const sanitizedNote = values.note?.trim() ?? "";
      if (sanitizedNote !== (transaction.note ?? "")) {
        payload.note = sanitizedNote.length === 0 ? null : sanitizedNote;
      }

      if (Object.keys(payload).length === 0) {
        setLocalError("Wprowadź zmiany przed zapisaniem.");
        return;
      }

      try {
        await onSubmit(transaction.id, payload);
        form.reset(values);
      } catch (error) {
        console.error("Failed to submit transaction form", error);
        setLocalError("Nie udało się zapisać zmian. Spróbuj ponownie.");
      }
    },
    [form, onSubmit, transaction]
  );

  const categoriesOptions = useMemo(() => {
    if (!categories.length) {
      return [
        <SelectItem key="no-category" value="" disabled>
          Brak kategorii
        </SelectItem>,
      ];
    }

    return categories.map((category) => (
      <SelectItem key={category.id} value={category.id}>
        {category.name}
      </SelectItem>
    ));
  }, [categories]);

  const transactionDateLabel = useMemo(() => {
    if (!transactionDateValue) {
      return "Wybierz datę";
    }

    return format(new Date(transactionDateValue), "PPP", { locale: pl });
  }, [transactionDateValue]);

  const currentAmountLabel = useMemo(() => formatCurrency(transaction.amount), [transaction.amount]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-6">
        <FormField
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kategoria</FormLabel>
              <FormControl>
                <Select disabled={isSubmitting} onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger aria-label="Kategoria">
                    <SelectValue placeholder="Wybierz kategorię" />
                  </SelectTrigger>
                  <SelectContent>{categoriesOptions}</SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kwota</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  inputMode="decimal"
                  type="number"
                  min="0.01"
                  step="0.01"
                  disabled={isSubmitting}
                  aria-describedby={amountHintId}
                />
              </FormControl>
              <FormMessage />
              <p className="text-xs text-muted-foreground" id={amountHintId}>
                Aktualnie: {currentAmountLabel}
              </p>
            </FormItem>
          )}
        />

        <FormField
          name="transactionDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data transakcji</FormLabel>
              <Popover open={isTransactionDateOpen} onOpenChange={setIsTransactionDateOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      type="button"
                      className={cn("justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                      disabled={isSubmitting}
                    >
                      {transactionDateLabel}
                      <CalendarIcon className="ml-auto size-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent align="start" className="p-0">
                  <Calendar
                    mode="single"
                    selected={transactionDateValue ? new Date(transactionDateValue) : undefined}
                    onSelect={(date) => {
                      if (!date) {
                        return;
                      }

                      const isoDate = format(date, "yyyy-MM-dd");
                      field.onChange(isoDate);
                      setIsTransactionDateOpen(false);
                    }}
                    locale={pl}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notatka</FormLabel>
              <FormControl>
                <Textarea {...field} rows={4} maxLength={500} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {localError ? <p className="text-sm font-medium text-destructive">{localError}</p> : null}
        {formError && !localError ? <p className="text-sm font-medium text-destructive">{formError}</p> : null}

        <DialogFooter className="gap-2 ">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Anuluj
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Zapisz
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};
