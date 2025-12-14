import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { AddExpenseFormValues } from "@/components/expenses/types";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { CategoryDto, CreateTransactionCommand } from "@/types";

const AMOUNT_REGEX = /^\d+(?:\.\d{1,2})?$/;

/**
 * Zod schema for add expense form validation
 */
const addExpenseFormSchema = z.object({
  amount: z
    .string()
    .min(1, "Kwota jest wymagana")
    .refine((value) => AMOUNT_REGEX.test(value), "Kwota może mieć maksymalnie dwa miejsca po przecinku")
    .refine((value) => Number(value) > 0, "Kwota musi być większa od zera"),

  categoryId: z.string().min(1, "Wybierz kategorię").uuid("Wybierz poprawną kategorię"),

  transactionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Podaj datę w formacie RRRR-MM-DD")
    .refine((value) => !Number.isNaN(new Date(value).getTime()), "Podaj poprawną datę"),

  note: z.string().max(500, "Notatka nie może przekraczać 500 znaków").optional().default(""),
});

export interface AddExpenseFormProps {
  readonly categories: readonly CategoryDto[];
  readonly isLoadingCategories: boolean;
  readonly onSubmit: (data: CreateTransactionCommand) => Promise<void>;
  readonly onCancel: () => void;
  readonly isSubmitting: boolean;
  readonly submitError: string | null;
  readonly onClearError: () => void;
}

/**
 * Form component for adding a new expense
 */
export const AddExpenseForm = ({
  categories,
  isLoadingCategories,
  onSubmit,
  onCancel,
  isSubmitting,
  submitError,
  onClearError,
}: AddExpenseFormProps) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const form = useForm<AddExpenseFormValues>({
    resolver: zodResolver(addExpenseFormSchema),
    defaultValues: {
      amount: "",
      categoryId: "",
      transactionDate: getTodayDate(),
      note: "",
    },
  });

  const handleSubmit = async (values: AddExpenseFormValues) => {
    onClearError();

    const command: CreateTransactionCommand = {
      categoryId: values.categoryId,
      amount: Number(values.amount),
      transactionDate: values.transactionDate,
      note: values.note || undefined,
    };

    await onSubmit(command);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4" data-testid="add-expense-form">
        {/* Amount field */}
        <FormField
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kwota</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  disabled={isSubmitting}
                  data-testid="expense-amount-input"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Category field */}
        <FormField
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kategoria</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isSubmitting || isLoadingCategories}
              >
                <FormControl>
                  <SelectTrigger data-testid="expense-category-select">
                    <SelectValue placeholder="Wybierz kategorię" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent data-testid="expense-category-options">
                  {categories.length === 0 && !isLoadingCategories && (
                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">Brak dostępnych kategorii</div>
                  )}
                  {categories.map((category) => (
                    <SelectItem
                      key={category.id}
                      value={category.id}
                      data-testid={`expense-category-option-${category.id}`}
                    >
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Transaction Date field */}
        <FormField
          name="transactionDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data transakcji</FormLabel>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                      disabled={isSubmitting}
                      data-testid="expense-date-trigger"
                    >
                      {field.value ? formatDate(field.value) : <span>Wybierz datę</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" data-testid="expense-date-calendar">
                  <Calendar
                    mode="single"
                    selected={field.value ? new Date(field.value) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        field.onChange(formatDateToISO(date));
                        setIsCalendarOpen(false);
                      }
                    }}
                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Note field */}
        <FormField
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notatka (opcjonalnie)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Dodaj notatkę..."
                  className="resize-none"
                  rows={3}
                  disabled={isSubmitting}
                  data-testid="expense-note-input"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Error message */}
        {submitError && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" data-testid="form-error-message">
            {submitError}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1"
            data-testid="cancel-expense-button"
          >
            Anuluj
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || isLoadingCategories}
            className="flex-1"
            data-testid="submit-expense-button"
          >
            {isSubmitting ? "Zapisywanie..." : "Zapisz wydatek"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

/**
 * Get today's date in YYYY-MM-DD format
 */
const getTodayDate = (): string => {
  const today = new Date();
  return formatDateToISO(today);
};

/**
 * Format Date object to YYYY-MM-DD string
 */
const formatDateToISO = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Format YYYY-MM-DD string to readable date
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("pl-PL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};
