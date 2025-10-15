import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, formatPercentage } from "@/lib/formatters";

export interface OverallSummaryViewModel {
  readonly totalSpent: number;
  readonly totalIncome: number;
  readonly freeFunds: number;
  readonly progressPercentage: number;
}

export interface OverallSummaryCardProps {
  readonly data: OverallSummaryViewModel;
}

export const OverallSummaryCard = ({ data }: OverallSummaryCardProps) => {
  const { totalSpent, totalIncome, freeFunds, progressPercentage } = data;

  console.log(data);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Podsumowanie budżetu</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>
            Wydano <span className="font-medium text-foreground">{formatCurrency(totalSpent)}</span> z
            <span className="font-medium text-foreground"> {formatCurrency(totalIncome)}</span> przychodów.
          </p>
          <p>
            Dostępne środki: <span className="font-semibold text-foreground">{formatCurrency(freeFunds)}</span>
          </p>
        </div>
        <div className="space-y-2">
          <Progress value={progressPercentage} aria-label="Postęp budżetu" />
          <p className="text-xs text-muted-foreground">
            {formatPercentage(progressPercentage)} budżetu zostało wykorzystane.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
