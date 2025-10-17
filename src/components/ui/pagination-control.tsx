import { useMemo } from "react";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from "lucide-react";

import type { PaginationMetaDto } from "@/types";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface PaginationControlProps {
  readonly meta: PaginationMetaDto;
  readonly onPageChange: (page: number) => void | Promise<void>;
  readonly className?: string;
  readonly isBusy?: boolean;
  readonly disabled?: boolean;
}

export const PaginationControl = ({
  meta,
  onPageChange,
  className,
  isBusy = false,
  disabled = false,
}: PaginationControlProps) => {
  const pageNumbers = useMemo(() => {
    return Array.from({ length: Math.max(meta.totalPages, 1) }, (_, index) => index + 1);
  }, [meta.totalPages]);

  const canGoBack = meta.page > 1;
  const canGoForward = meta.page < meta.totalPages;

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-3 rounded-md border border-border/60 bg-card px-4 py-3 text-sm shadow-sm md:flex-row md:items-center md:justify-between",
        className
      )}
      role="navigation"
      aria-label="Kontrola paginacji"
    >
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Strona</span>
        <Select
          value={meta.page.toString()}
          onValueChange={(value) => {
            const page = Number.parseInt(value, 10);
            if (Number.isNaN(page) || page === meta.page) {
              return;
            }

            void onPageChange(page);
          }}
          disabled={disabled || isBusy || pageNumbers.length <= 1}
        >
          <SelectTrigger className="w-24" aria-label="Wybierz stronę">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageNumbers.map((page) => (
              <SelectItem key={page} value={page.toString()}>
                {page}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-muted-foreground">z {meta.totalPages || 1}</span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(1)}
          disabled={disabled || isBusy || !canGoBack}
          aria-label="Pierwsza strona"
        >
          <ChevronsLeft className="size-4" aria-hidden />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(meta.page - 1)}
          disabled={disabled || isBusy || !canGoBack}
          aria-label="Poprzednia strona"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(meta.page + 1)}
          disabled={disabled || isBusy || !canGoForward}
          aria-label="Następna strona"
        >
          <ChevronRight className="size-4" aria-hidden />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(meta.totalPages)}
          disabled={disabled || isBusy || !canGoForward}
          aria-label="Ostatnia strona"
        >
          <ChevronsRight className="size-4" aria-hidden />
        </Button>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground md:text-sm">
        <span>
          Wyświetlonych {meta.totalItems} z {meta.pageSize < meta.totalItems ? meta.pageSize : meta.totalItems}{" "}
          elementów
        </span>
        {isBusy ? (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            <span>Ładowanie…</span>
          </span>
        ) : null}
      </div>
    </div>
  );
};
