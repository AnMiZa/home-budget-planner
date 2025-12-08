import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import type { FieldValues, SubmitHandler, UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { cn } from "@/lib/utils";

type MessageVariant = "error" | "success" | "info";

interface MessageBannerProps {
  readonly message?: string | null;
  readonly variant: MessageVariant;
}

const MessageBanner = ({ message, variant }: MessageBannerProps) => {
  if (!message) {
    return null;
  }

  const baseClasses =
    "rounded-md border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  const variantClasses = {
    error: "border-destructive/40 bg-destructive/10 text-destructive",
    success: "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    info: "border-primary/30 bg-primary/10 text-primary",
  } as const;

  return (
    <div role="alert" className={cn(baseClasses, variantClasses[variant])}>
      {message}
    </div>
  );
};

export interface AuthFormProps<TFieldValues extends FieldValues> {
  readonly title: string;
  readonly description?: string;
  readonly form: UseFormReturn<TFieldValues>;
  readonly onSubmit: SubmitHandler<TFieldValues>;
  readonly children: ReactNode;
  readonly submitLabel: string;
  readonly footer?: ReactNode;
  readonly globalError?: string | null;
  readonly successMessage?: string | null;
  readonly className?: string;
}

export const AuthForm = <TFieldValues extends FieldValues>({
  title,
  description,
  form,
  onSubmit,
  children,
  submitLabel,
  footer,
  globalError,
  successMessage,
  className,
}: AuthFormProps<TFieldValues>) => {
  const { handleSubmit, formState } = form;
  const isSubmitting = formState.isSubmitting;

  return (
    <Form {...form}>
      <Card className={cn("border-border/60 shadow-xl shadow-primary/5", className)}>
        <CardHeader className="space-y-3 text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight">{title}</CardTitle>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </CardHeader>
        <CardContent className="space-y-6">
          <MessageBanner message={globalError} variant="error" />
          <MessageBanner message={successMessage} variant="success" />
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            {children}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden /> : null}
              <span>{submitLabel}</span>
            </Button>
          </form>
        </CardContent>
        {footer ? (
          <CardFooter className="flex flex-col items-center gap-2 text-sm text-muted-foreground">{footer}</CardFooter>
        ) : null}
      </Card>
    </Form>
  );
};
