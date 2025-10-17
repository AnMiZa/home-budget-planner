import { useMemo } from "react";

import { PenLine, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TransactionVM } from "@/components/transactions/useTransactionsHistory";
import { formatCurrency } from "@/lib/formatters";

export interface TransactionListItemProps {
  readonly transaction: TransactionVM;
  readonly onEdit: (transaction: TransactionVM) => void;
  readonly onDelete: (transaction: TransactionVM) => void;
}

export const TransactionListItem = ({ transaction, onEdit, onDelete }: TransactionListItemProps) => {
  const formattedAmount = useMemo(() => formatCurrency(transaction.amount), [transaction.amount]);
  const transactionDateLabel = useMemo(
    () => new Date(transaction.transactionDate).toLocaleDateString("pl-PL"),
    [transaction.transactionDate]
  );
  const createdAtLabel = useMemo(
    () => new Date(transaction.createdAt).toLocaleDateString("pl-PL"),
    [transaction.createdAt]
  );
  const updatedAtLabel = useMemo(
    () => new Date(transaction.updatedAt).toLocaleDateString("pl-PL"),
    [transaction.updatedAt]
  );

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base font-semibold">{transaction.categoryName}</CardTitle>
          <CardDescription>{transactionDateLabel}</CardDescription>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-haspopup="menu">
              <span className="sr-only">Pokaż działania</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-5"
                aria-hidden
              >
                <circle cx="12" cy="5" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="19" r="1.5" />
              </svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48" sideOffset={8}>
            <DropdownMenuItem onSelect={() => onEdit(transaction)}>
              <PenLine className="mr-2 size-4" aria-hidden />
              Edytuj
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => onDelete(transaction)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 size-4" aria-hidden />
              Usuń
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-end text-sm">
          <span className="text-muted-foreground pr-2">Kwota:</span>
          <span className="font-medium">{formattedAmount}</span>
        </div>
        {transaction.note ? (
          <p className="rounded-md bg-muted/60 p-3 text-sm text-muted-foreground">{transaction.note}</p>
        ) : null}
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
          <span>Dodano: {createdAtLabel}</span>
          <span>Zaktualizowano: {updatedAtLabel}</span>
        </div>
      </CardFooter>
    </Card>
  );
};
