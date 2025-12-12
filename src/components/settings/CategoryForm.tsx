import { useCallback, useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { CategoryVM, CategoryFormValues, CreateCategoryCommand, UpdateCategoryCommand } from "./types";

export interface CategoryFormProps {
  readonly category?: CategoryVM;
  readonly onSubmit: (data: CreateCategoryCommand | UpdateCategoryCommand) => Promise<void>;
  readonly onCancel: () => void;
  readonly formError?: string | null;
  readonly onClearError?: () => void;
}

const formSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nazwa kategorii jest wymagana.")
    .max(100, "Nazwa kategorii nie może przekraczać 100 znaków."),
});

/**
 * Form for creating and editing categories.
 * Uses react-hook-form with zod validation.
 */
export const CategoryForm = ({ category, onSubmit, onCancel, formError, onClearError }: CategoryFormProps) => {
  const isEditMode = !!category;

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: category?.name ?? "",
    },
  });

  const isSubmitting = form.formState.isSubmitting;
  const [localError, setLocalError] = useState<string | null>(null);

  // Clear errors when form values change
  useEffect(() => {
    const subscription = form.watch(() => {
      setLocalError(null);
      onClearError?.();
    });
    return () => subscription.unsubscribe();
  }, [form, onClearError]);

  const onFormSubmit = useCallback(
    async (values: CategoryFormValues) => {
      setLocalError(null);
      onClearError?.();

      const trimmedName = values.name.trim();

      // Check if there are any changes in edit mode
      if (isEditMode && trimmedName === category.name) {
        setLocalError("Wprowadź zmiany przed zapisaniem.");
        return;
      }

      try {
        if (isEditMode) {
          const payload: UpdateCategoryCommand = {
            name: trimmedName,
          };
          await onSubmit(payload);
        } else {
          const payload: CreateCategoryCommand = {
            name: trimmedName,
          };
          await onSubmit(payload);
        }

        form.reset(values);
      } catch (error) {
        console.error("Failed to submit category form", error);
        // Error is handled by parent component
      }
    },
    [category, form, isEditMode, onClearError, onSubmit]
  );

  const displayError = formError || localError;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nazwa kategorii</FormLabel>
              <FormControl>
                <Input {...field} placeholder="np. Żywność" disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {displayError && (
          <div
            role="alert"
            className="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {displayError}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Anuluj
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Zapisywanie...
              </>
            ) : isEditMode ? (
              "Zapisz zmiany"
            ) : (
              "Dodaj kategorię"
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

