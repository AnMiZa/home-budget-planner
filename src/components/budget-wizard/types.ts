import type { BudgetDetailDto, CategoryDto, HouseholdMemberDto } from "@/types";

export interface IncomeFormViewModel {
  readonly householdMemberId: HouseholdMemberDto["id"];
  readonly fullName: HouseholdMemberDto["fullName"];
  readonly originalIncomeId?: string;
  amount: string;
}

export interface PlannedExpenseFormViewModel {
  readonly categoryId: CategoryDto["id"];
  readonly name: CategoryDto["name"];
  readonly originalPlannedExpenseId?: string;
  limitAmount: string;
}

export type BudgetWizardStep = "incomes" | "planned-expenses" | "review";

export interface BudgetWizardViewModel {
  readonly budgetId?: BudgetDetailDto["id"];
  month: string;
  note?: string;
  incomes: IncomeFormViewModel[];
  plannedExpenses: PlannedExpenseFormViewModel[];
  totalIncome: number;
  totalPlanned: number;
  freeFunds: number;
}

export interface WizardStepDefinition {
  readonly id: BudgetWizardStep;
  readonly title: string;
  readonly description?: string;
}
