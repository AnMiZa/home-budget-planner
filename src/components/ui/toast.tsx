import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ToastState {
  readonly id: number;
  readonly title?: string;
  readonly description?: string;
  readonly variant?: "default" | "destructive";
}

interface ToastOptions {
  readonly title?: string;
  readonly description?: string;
  readonly variant?: "default" | "destructive";
  readonly duration?: number;
}

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const addListener = (event: CustomEvent<ToastState>) => {
      setToasts((prev) => [...prev, event.detail]);
    };

    const removeListener = (event: CustomEvent<number>) => {
      const toastId = event.detail;
      if (typeof toastId === "number") {
        setToasts((prev) => prev.filter((toast) => toast.id !== toastId));
      }
    };

    window.addEventListener("homebudget:toast", addListener as EventListener);
    window.addEventListener("homebudget:toast:close", removeListener as EventListener);
    return () => {
      window.removeEventListener("homebudget:toast", addListener as EventListener);
      window.removeEventListener("homebudget:toast:close", removeListener as EventListener);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || toasts.length === 0) {
      return;
    }

    const timers = toasts.map((toast) =>
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent<number>("homebudget:toast:close", { detail: toast.id }));
      }, 4000)
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [toasts]);

  const ToastPortal = useCallback(() => {
    if (typeof document === "undefined") {
      return null;
    }

    return createPortal(
      <div className="fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`w-full max-w-sm rounded-lg border p-4 shadow-lg transition ${
              toast.variant === "destructive"
                ? "border-destructive/80 bg-destructive/20"
                : "border-border bg-background"
            }`}
            role="status"
            aria-live="polite"
          >
            {toast.title ? (
              <p
                className={`text-sm font-semibold ${
                  toast.variant === "destructive" ? "text-destructive" : "text-foreground"
                }`}
              >
                {toast.title}
              </p>
            ) : null}
            {toast.description ? <p className="text-xs text-muted-foreground">{toast.description}</p> : null}
          </div>
        ))}
      </div>,
      document.body
    );
  }, [toasts]);

  return { ToastPortal };
};

export const showToast = ({ title, description, variant = "default", duration = 4000 }: ToastOptions) => {
  if (typeof window === "undefined") {
    return;
  }
  const id = Date.now();
  window.dispatchEvent(
    new CustomEvent<ToastState>("homebudget:toast", {
      detail: {
        id,
        title,
        description,
        variant,
      },
    })
  );

  if (duration > 0) {
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent<number>("homebudget:toast:close", { detail: id }));
    }, duration);
  }
};
