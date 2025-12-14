import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { BudgetDetailDto, CategoryDto, HouseholdMemberDto } from "@/types";

import type { BudgetWizardStep } from "./types";
import { IncomesForm } from "./IncomesForm";
import { PlannedExpensesForm } from "./PlannedExpensesForm";
import { ReadOnlyBudgetView } from "./ReadOnlyBudgetView";
import { WizardStepper } from "./WizardStepper";
import { useBudgetWizard } from "./useBudgetWizard";
import { useToast } from "@/components/ui/toast";

export interface BudgetWizardViewDependencies {
  fetchHouseholdMembers: ReturnType<typeof useBudgetWizard>["members"] extends infer T
    ? () => Promise<readonly (T extends infer U ? (U extends { id: string } ? U : never) : never)[]>
    : never;
}

interface BudgetWizardViewProps {
  readonly budgetId?: string;
  readonly dependencies?: Parameters<typeof useBudgetWizard>[0]["dependencies"];
}

export const BudgetWizardView = ({ budgetId, dependencies }: BudgetWizardViewProps) => {
  const { ToastPortal } = useToast();
  const {
    wizard,
    steps,
    currentStepIndex,
    isLoading,
    isSaving,
    isEditMode,
    error,
    onStepChange,
    onToggleEditMode,
    onSave,
    onIncomeChange,
    onPlannedExpenseChange,
    onStepValidityChange,
    canGoToNextStep,
    canGoToPreviousStep,
    stepValidity,
    budgetDetail,
    members,
    categories,
  } = useBudgetWizard({ budgetId, dependencies });

  console.log("categories", categories);

  const handleValidityChange = (step: BudgetWizardStep, isValid: boolean) => {
    onStepValidityChange(step, isValid);
  };

  const currentStep = useMemo<BudgetWizardStep>(
    () => steps[currentStepIndex]?.id ?? "incomes",
    [steps, currentStepIndex]
  );

  console.log("currentStep", currentStep);
  const isCurrentStepValid = stepValidity[currentStep];

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
        <div className="space-y-3">
          <div className="h-6 w-40 animate-pulse rounded bg-muted" />
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-[320px] animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/10">
        <CardContent className="flex flex-col gap-2 p-6 text-center">
          <h2 className="text-lg font-semibold text-destructive">Wystąpił błąd</h2>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!isEditMode && budgetDetail) {
    return (
      <ReadOnlyBudgetView
        categories={categories}
        members={members}
        budget={budgetDetail}
        onEditClick={() => onToggleEditMode(true)}
      />
    );
  }

  const handleNext = () => {
    if (canGoToNextStep) {
      onStepChange(currentStepIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (canGoToPreviousStep) {
      onStepChange(currentStepIndex - 1);
    }
  };

  const handleSave = async () => {
    await onSave();
  };

  return (
    <div className="flex flex-col gap-6">
      <ToastPortal />
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Plan budżetu</h1>
        <p className="text-sm text-muted-foreground">
          Krok {currentStepIndex + 1} z {steps.length}
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <WizardStepper steps={steps} currentStepIndex={currentStepIndex} onStepSelect={onStepChange} />

        <Card>
          <CardContent className="p-4">
            {currentStep === "incomes" ? (
              <IncomesForm
                incomes={wizard.incomes}
                onIncomeChange={onIncomeChange}
                onValidityChange={(isValid) => handleValidityChange("incomes", isValid)}
                isDisabled={isSaving}
              />
            ) : null}
            {currentStep === "planned-expenses" ? (
              <PlannedExpensesForm
                plannedExpenses={wizard.plannedExpenses}
                onPlannedExpenseChange={onPlannedExpenseChange}
                onValidityChange={(isValid) => handleValidityChange("planned-expenses", isValid)}
                isDisabled={isSaving}
              />
            ) : null}
            {currentStep === "review" ? (
              <BudgetSummary
                budgetDetail={budgetDetail}
                wizard={wizard}
                members={members}
                categories={categories}
                onEditClick={() => onToggleEditMode(true)}
              />
            ) : null}
          </CardContent>
        </Card>
      </div>

      <footer className="flex flex-col gap-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            Całkowity przychód:{" "}
            <span className="font-semibold text-foreground">{wizard.totalIncome.toFixed(2)} zł</span>
          </div>
          <div>
            Zaplanowane wydatki:{" "}
            <span className="font-semibold text-foreground">{wizard.totalPlanned.toFixed(2)} zł</span>
          </div>
          <div>
            Wolne środki: <span className="font-semibold text-foreground">{wizard.freeFunds.toFixed(2)} zł</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrevious} disabled={!canGoToPreviousStep || isSaving}>
              Wstecz
            </Button>
            <Button onClick={handleNext} disabled={!canGoToNextStep || isSaving}>
              Dalej
            </Button>
          </div>

          <Button variant="default" onClick={handleSave} disabled={isSaving || !isCurrentStepValid}>
            {isSaving ? "Zapisywanie..." : "Zapisz budżet"}
          </Button>
        </div>
      </footer>
    </div>
  );
};

interface BudgetSummarySummaryProps {
  readonly budgetDetail: BudgetDetailDto | null;
  readonly wizard: ReturnType<typeof useBudgetWizard>["wizard"];
  readonly members: readonly HouseholdMemberDto[];
  readonly categories: readonly CategoryDto[];
  readonly onEditClick: () => void;
}

const BudgetSummary = ({ wizard, budgetDetail, members, categories, onEditClick }: BudgetSummarySummaryProps) => {
  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">Podsumowanie</h3>
      <p className="text-sm text-muted-foreground">
        Łączne przychody: <span className="font-semibold">{wizard.totalIncome.toFixed(2)} zł</span>
      </p>
      <p className="text-sm text-muted-foreground">
        Zaplanowane wydatki: <span className="font-semibold">{wizard.totalPlanned.toFixed(2)} zł</span>
      </p>
      <p className="text-sm text-muted-foreground">
        Wolne środki: <span className="font-semibold">{wizard.freeFunds.toFixed(2)} zł</span>
      </p>
      {budgetDetail ? (
        <ReadOnlyBudgetView budget={budgetDetail} members={members} categories={categories} onEditClick={onEditClick} />
      ) : null}
    </div>
  );
};
