import * as React from "react";
import {
  FormProvider,
  useController,
  useFormContext,
  type ControllerFieldState,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import { cn } from "@/lib/utils";

const Form = FormProvider;

interface FormFieldContextValue<TName extends string = string> {
  readonly name: TName;
}

const FormFieldContext = React.createContext<FormFieldContextValue<string> | undefined>(undefined);

const FormField = <TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>({
  name,
  render,
}: {
  readonly name: TName;
  readonly render: (props: {
    field: ControllerRenderProps<TFieldValues, TName>;
    fieldState: ControllerFieldState;
  }) => React.ReactNode;
}) => {
  const formContext = useFormContext<TFieldValues>();
  const fieldContext = React.useMemo(() => ({ name }), [name]);

  const { field, fieldState } = useController<TFieldValues, TName>({
    name,
    control: formContext.control,
  });

  return (
    <FormFieldContext.Provider value={fieldContext}>
      {render({
        field,
        fieldState,
      })}
    </FormFieldContext.Provider>
  );
};

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>");
  }

  const fieldState = getFieldState(fieldContext.name, formState);

  return {
    id: itemContext.id,
    name: fieldContext.name,
    formItemId: `${itemContext.id}-form-item`,
    formDescriptionId: `${itemContext.id}-form-description`,
    formMessageId: `${itemContext.id}-form-message`,
    ...fieldState,
  };
};

const FormItemContext = React.createContext<{ id: string }>({ id: "" });

const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const id = React.useId();

    return (
      <FormItemContext.Provider value={{ id }}>
        <div ref={ref} className={cn("space-y-2", className)} {...props} />
      </FormItemContext.Provider>
    );
  }
);
FormItem.displayName = "FormItem";

const FormLabel = React.forwardRef<React.ElementRef<"label">, React.ComponentPropsWithoutRef<"label">>(
  ({ className, ...props }, ref) => {
    const { error, formItemId } = useFormField();

    return (
      <label
        ref={ref}
        className={cn(
          "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
          className
        )}
        htmlFor={formItemId}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${formItemId}-form-message` : undefined}
        {...props}
      />
    );
  }
);
FormLabel.displayName = "FormLabel";

const FormControl = React.forwardRef<React.ElementRef<"div">, React.ComponentPropsWithoutRef<"div">>(
  ({ className, ...props }, ref) => {
    const { error, formItemId, formDescriptionId, formMessageId } = useFormField();

    return (
      <div
        ref={ref}
        className={cn("flex w-full flex-col gap-1", className)}
        id={formItemId}
        aria-describedby={error ? `${formDescriptionId} ${formMessageId}` : formDescriptionId}
        aria-invalid={!!error || undefined}
        {...props}
      />
    );
  }
);
FormControl.displayName = "FormControl";

const FormDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    const { formDescriptionId } = useFormField();
    return <p ref={ref} id={formDescriptionId} className={cn("text-xs text-muted-foreground", className)} {...props} />;
  }
);
FormDescription.displayName = "FormDescription";

const FormMessage = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => {
    const { error, formMessageId } = useFormField();
    const body = error ? error.message : children;

    if (!body) {
      return null;
    }

    return (
      <p ref={ref} id={formMessageId} className={cn("text-xs font-medium text-destructive", className)} {...props}>
        {body}
      </p>
    );
  }
);
FormMessage.displayName = "FormMessage";

export { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, useFormField };
