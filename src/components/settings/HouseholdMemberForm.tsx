import { useCallback, useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type {
  HouseholdMemberVM,
  HouseholdMemberFormValues,
  CreateHouseholdMemberCommand,
  UpdateHouseholdMemberCommand,
} from "./types";

export interface HouseholdMemberFormProps {
  readonly member?: HouseholdMemberVM;
  readonly onSubmit: (data: CreateHouseholdMemberCommand | UpdateHouseholdMemberCommand) => Promise<void>;
  readonly onCancel: () => void;
  readonly formError?: string | null;
  readonly onClearError?: () => void;
}

const formSchema = z.object({
  fullName: z.string().trim().min(1, "Imię jest wymagane.").max(120, "Imię nie może przekraczać 120 znaków."),
});

/**
 * Form for creating and editing household members.
 * Uses react-hook-form with zod validation.
 */
export const HouseholdMemberForm = ({
  member,
  onSubmit,
  onCancel,
  formError,
  onClearError,
}: HouseholdMemberFormProps) => {
  const isEditMode = !!member;

  const form = useForm<HouseholdMemberFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: member?.fullName ?? "",
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
    async (values: HouseholdMemberFormValues) => {
      setLocalError(null);
      onClearError?.();

      const trimmedFullName = values.fullName.trim();

      // Check if there are any changes in edit mode
      if (isEditMode && trimmedFullName === member.fullName) {
        setLocalError("Wprowadź zmiany przed zapisaniem.");
        return;
      }

      try {
        if (isEditMode) {
          const payload: UpdateHouseholdMemberCommand = {
            fullName: trimmedFullName,
          };
          await onSubmit(payload);
        } else {
          const payload: CreateHouseholdMemberCommand = {
            fullName: trimmedFullName,
          };
          await onSubmit(payload);
        }

        form.reset(values);
      } catch (error) {
        console.error("Failed to submit household member form", error);
        // Error is handled by parent component
      }
    },
    [form, isEditMode, member, onClearError, onSubmit]
  );

  const displayError = formError || localError;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-4">
        <FormField
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Imię i nazwisko</FormLabel>
              <FormControl>
                <Input {...field} placeholder="np. Jan Kowalski" disabled={isSubmitting} autoComplete="name" />
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
              "Dodaj domownika"
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};
