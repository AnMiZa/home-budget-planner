import { useEffect, useRef } from "react";

import { AlertCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface InfiniteScrollTriggerProps {
  readonly hasMore: boolean;
  readonly isLoading?: boolean;
  readonly onLoadMore: () => void | Promise<void>;
  readonly className?: string;
  readonly disabled?: boolean;
  readonly sentinelMargin?: string;
  readonly errorMessage?: string | null;
  readonly onRetry?: () => void | Promise<void>;
}

export const InfiniteScrollTrigger = ({
  hasMore,
  isLoading = false,
  onLoadMore,
  className,
  disabled = false,
  sentinelMargin = "0px 0px 200px 0px",
  errorMessage = null,
  onRetry,
}: InfiniteScrollTriggerProps) => {
  const intersectionRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!hasMore || disabled) {
      return () => observerRef.current?.disconnect();
    }

    const element = intersectionRef.current;

    if (!element) {
      return;
    }

    observerRef.current?.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !isLoading) {
            void onLoadMore();
          }
        }
      },
      { root: null, rootMargin: sentinelMargin }
    );

    observerRef.current.observe(element);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [disabled, hasMore, isLoading, onLoadMore, sentinelMargin]);

  if (!hasMore) {
    return null;
  }

  return (
    <div ref={intersectionRef} className={cn("flex flex-col items-center gap-2 py-4", className)}>
      {errorMessage ? (
        <div className="flex w-full flex-col items-center justify-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4" aria-hidden />
            <span>{errorMessage}</span>
          </div>
          {onRetry ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRetry()}
              className="border-destructive/60 text-destructive"
            >
              Spróbuj ponownie
            </Button>
          ) : null}
        </div>
      ) : null}
      <Button variant="outline" onClick={() => onLoadMore()} disabled={isLoading || disabled} className="min-w-[160px]">
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            <span>Ładowanie…</span>
          </span>
        ) : (
          "Załaduj więcej"
        )}
      </Button>
      <p className="text-xs text-muted-foreground">Przewiń niżej, aby pobrać kolejne transakcje.</p>
    </div>
  );
};
