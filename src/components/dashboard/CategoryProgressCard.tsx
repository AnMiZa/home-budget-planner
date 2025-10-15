import { AlertTriangle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, formatPercentage } from "@/lib/formatters";

export type CategoryStatus = "ok" | "warning" | "over";

export interface CategoryProgressViewModel {
  readonly id: string;
  readonly name: string;
  readonly spent: number;
  readonly limit: number;
  readonly progressPercentage: number;
  readonly status: CategoryStatus;
}

export interface CategoryProgressCardProps {
  readonly category: CategoryProgressViewModel;
}

export const CategoryProgressCard = ({ category }: CategoryProgressCardProps) => {
  const { name, spent, limit, progressPercentage, status } = category;

  return (
    <Card className="w-full">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-medium">
          <span className="flex items-center gap-2">
            {name}
            {status === "over" ? <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" /> : null}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <p>
            Wydano <span className="font-medium text-foreground">{formatCurrency(spent)}</span> z
            <span className="font-medium text-foreground"> {formatCurrency(limit)}</span>
          </p>
          <span className="font-medium text-foreground">{formatPercentage(progressPercentage)}</span>
        </div>
        <Progress
          value={progressPercentage}
          indicatorClassName={getIndicatorClassName(status)}
          className={getTrackClassName(status)}
          aria-label={`Postęp kategorii ${name}`}
        />
      </CardContent>
    </Card>
  );
};

const getIndicatorClassName = (status: CategoryStatus): string => {
  if (status === "over") {
    return "bg-destructive";
  }

  if (status === "warning") {
    return "bg-amber-500";
  }

  return "bg-primary";
};

const getTrackClassName = (status: CategoryStatus): string => {
  if (status === "over") {
    return "bg-destructive/20";
  }

  if (status === "warning") {
    return "bg-amber-500/20";
  }

  return "bg-muted";
};
