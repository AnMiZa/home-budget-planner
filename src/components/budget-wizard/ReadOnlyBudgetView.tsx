import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { BudgetDetailDto, CategoryDto, HouseholdMemberDto } from "@/types";

interface ReadOnlyBudgetViewProps {
  readonly budget: BudgetDetailDto;
  readonly onEditClick: () => void;
  readonly members?: readonly HouseholdMemberDto[];
  readonly categories?: readonly CategoryDto[];
}

export const ReadOnlyBudgetView = ({ budget, onEditClick, members = [], categories = [] }: ReadOnlyBudgetViewProps) => {
  const memberNames = new Map(members.map((member) => [member.id, member.fullName]));
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Podsumowanie budżetu</h2>
          <p className="text-sm text-muted-foreground">Miesiąc: {budget.month.slice(0, 7)}</p>
        </div>
        <Button onClick={onEditClick}>Edytuj plan</Button>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle>Przychody</CardTitle>
            <CardDescription>
              Łącznie: <span className="font-semibold text-foreground">{budget.summary.totalIncome.toFixed(2)} zł</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {budget.incomes.map((income) => (
                <li key={income.id} className="flex justify-between">
                  <span>{memberNames.get(income.householdMemberId) ?? income.householdMemberId}</span>
                  <span className="font-medium text-foreground">{income.amount.toFixed(2)} zł</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-muted/20">
          <CardHeader>
            <CardTitle>Planowane wydatki</CardTitle>
            <CardDescription>
              Łącznie:{" "}
              <span className="font-semibold text-foreground">{budget.summary.totalPlanned.toFixed(2)} zł</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {budget.plannedExpenses.map((expense) => (
                <li key={expense.id} className="flex justify-between">
                  <span>{categoryNames.get(expense.categoryId) ?? expense.categoryId}</span>
                  <span className="font-medium text-foreground">{expense.limitAmount.toFixed(2)} zł</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-muted/10">
          <CardHeader>
            <CardTitle>Saldo</CardTitle>
            <CardDescription>Aktualny status planu</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <div className="flex justify-between">
              <span>Wydatki zrealizowane</span>
              <span className="font-medium text-foreground">{budget.summary.totalSpent.toFixed(2)} zł</span>
            </div>
            <div className="flex justify-between">
              <span>Wolne środki</span>
              <span className="font-medium text-foreground">{budget.summary.freeFunds.toFixed(2)} zł</span>
            </div>
            <div className="flex justify-between">
              <span>Próg wykorzystania</span>
              <span className="font-medium text-foreground">{budget.summary.progress.toFixed(0)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
