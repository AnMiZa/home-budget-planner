import type { Tables, TablesInsert, TablesUpdate } from "./db/database.types";

/**
 * Shared pagination metadata used by list endpoints.
 */
export interface PaginationMetaDto {
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
}

/**
 * Generic helper for API responses that return paginated collections.
 */
export interface PaginatedDataDto<T> {
  readonly data: readonly T[];
  readonly meta: PaginationMetaDto;
}

/**
 * Standardised error payload returned by API routes.
 */
export interface ApiErrorDto {
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
}

type HouseholdRow = Tables<"households">;
type HouseholdUpdate = TablesUpdate<"households">;

export interface HouseholdDto {
  readonly id: HouseholdRow["id"];
  readonly name: HouseholdRow["name"];
  readonly createdAt: HouseholdRow["created_at"];
  readonly updatedAt: HouseholdRow["updated_at"];
}

export interface UpdateHouseholdCommand {
  readonly name: NonNullable<HouseholdUpdate["name"]>;
}

type HouseholdMemberRow = Tables<"household_members">;
type HouseholdMemberInsert = TablesInsert<"household_members">;
type HouseholdMemberUpdate = TablesUpdate<"household_members">;

export interface HouseholdMemberDto {
  readonly id: HouseholdMemberRow["id"];
  readonly fullName: HouseholdMemberRow["full_name"];
  readonly isActive: HouseholdMemberRow["is_active"];
  readonly createdAt: HouseholdMemberRow["created_at"];
  readonly updatedAt: HouseholdMemberRow["updated_at"];
}

export type HouseholdMembersListResponseDto = PaginatedDataDto<HouseholdMemberDto>;

export interface CreateHouseholdMemberCommand {
  readonly fullName: NonNullable<HouseholdMemberInsert["full_name"]>;
}

export interface UpdateHouseholdMemberCommand {
  readonly fullName?: NonNullable<HouseholdMemberUpdate["full_name"]>;
  readonly isActive?: HouseholdMemberUpdate["is_active"];
}

type CategoryRow = Tables<"categories">;
type CategoryInsert = TablesInsert<"categories">;
type CategoryUpdate = TablesUpdate<"categories">;

export interface CategoryDto {
  readonly id: CategoryRow["id"];
  readonly name: CategoryRow["name"];
  readonly createdAt: CategoryRow["created_at"];
  readonly updatedAt: CategoryRow["updated_at"];
}

export type CategoriesListResponseDto = PaginatedDataDto<CategoryDto>;

export interface CreateCategoryCommand {
  readonly name: NonNullable<CategoryInsert["name"]>;
}

export interface UpdateCategoryCommand {
  readonly name: NonNullable<CategoryUpdate["name"]>;
}

export interface DeleteCategoryCommand {
  /**
   * When true, confirms cascading deletion of dependent entries.
   */
  readonly force?: boolean;
}

type BudgetRow = Tables<"budgets">;
type BudgetInsert = TablesInsert<"budgets">;
type BudgetUpdate = TablesUpdate<"budgets">;

export interface BudgetSummaryTotalsDto {
  readonly totalIncome: number;
  readonly totalPlanned: number;
  readonly totalSpent: number;
  readonly freeFunds: number;
}

export type BudgetListItemDto = BudgetSummaryTotalsDto & {
  readonly id: BudgetRow["id"];
  readonly month: BudgetRow["month"];
  readonly note: BudgetRow["note"];
  readonly createdAt: BudgetRow["created_at"];
  readonly updatedAt: BudgetRow["updated_at"];
  readonly summary?: BudgetSummaryTotalsDto & { readonly progress?: number };
};

export type BudgetsListResponseDto = PaginatedDataDto<BudgetListItemDto>;

type BudgetIncomeRow = Tables<"incomes">;
type BudgetIncomeInsert = TablesInsert<"incomes">;
type BudgetIncomeUpdate = TablesUpdate<"incomes">;

export interface BudgetIncomeDto {
  readonly id: BudgetIncomeRow["id"];
  readonly householdMemberId: BudgetIncomeRow["household_member_id"];
  readonly amount: BudgetIncomeRow["amount"];
  readonly createdAt: BudgetIncomeRow["created_at"];
  readonly updatedAt: BudgetIncomeRow["updated_at"];
}

export interface BudgetIncomeCommandItem {
  readonly householdMemberId: BudgetIncomeInsert["household_member_id"];
  readonly amount: BudgetIncomeInsert["amount"];
}

type BudgetPlannedExpenseRow = Tables<"planned_expenses">;
type BudgetPlannedExpenseInsert = TablesInsert<"planned_expenses">;
type BudgetPlannedExpenseUpdate = TablesUpdate<"planned_expenses">;

export interface BudgetPlannedExpenseDto {
  readonly id: BudgetPlannedExpenseRow["id"];
  readonly categoryId: BudgetPlannedExpenseRow["category_id"];
  readonly limitAmount: BudgetPlannedExpenseRow["limit_amount"];
  readonly createdAt: BudgetPlannedExpenseRow["created_at"];
  readonly updatedAt: BudgetPlannedExpenseRow["updated_at"];
}

export interface BudgetPlannedExpenseCommandItem {
  readonly categoryId: BudgetPlannedExpenseInsert["category_id"];
  readonly limitAmount: BudgetPlannedExpenseInsert["limit_amount"];
}

export type BudgetCategorySummaryStatus = "ok" | "warning" | "over";

export interface BudgetCategorySummaryDto {
  readonly categoryId: BudgetPlannedExpenseDto["categoryId"];
  readonly name: CategoryDto["name"];
  readonly spent: number;
  readonly limitAmount: BudgetPlannedExpenseDto["limitAmount"];
  readonly progress: number;
  readonly status: BudgetCategorySummaryStatus;
}

export type BudgetSummaryDto = BudgetSummaryTotalsDto & {
  readonly progress: number;
  readonly perCategory?: readonly BudgetCategorySummaryDto[];
};

export interface BudgetCreatedDto {
  readonly id: BudgetRow["id"];
  readonly month: BudgetRow["month"];
  readonly createdAt: BudgetRow["created_at"];
}

export interface BudgetDetailDto {
  readonly id: BudgetRow["id"];
  readonly month: BudgetRow["month"];
  readonly note: BudgetRow["note"];
  readonly createdAt: BudgetRow["created_at"];
  readonly updatedAt: BudgetRow["updated_at"];
  readonly incomes: readonly BudgetIncomeDto[];
  readonly plannedExpenses: readonly BudgetPlannedExpenseDto[];
  readonly summary: BudgetSummaryDto;
}

export interface CreateBudgetCommand {
  readonly month: NonNullable<BudgetInsert["month"]>;
  readonly note?: BudgetInsert["note"];
  readonly incomes?: readonly BudgetIncomeCommandItem[];
  readonly plannedExpenses?: readonly BudgetPlannedExpenseCommandItem[];
}

export interface UpdateBudgetCommand {
  readonly note?: BudgetUpdate extends { note?: infer T } ? T : string;
}

export interface BudgetIncomesListResponseDto {
  readonly data: readonly BudgetIncomeDto[];
}

export interface UpsertBudgetIncomesCommand {
  readonly incomes: readonly BudgetIncomeCommandItem[];
}

export interface UpdateBudgetIncomeCommand {
  readonly amount: NonNullable<BudgetIncomeUpdate["amount"]>;
}

export interface PlannedExpensesListResponseDto {
  readonly data: readonly BudgetPlannedExpenseDto[];
}

export interface UpsertPlannedExpensesCommand {
  readonly plannedExpenses: readonly BudgetPlannedExpenseCommandItem[];
}

export interface UpdatePlannedExpenseCommand {
  readonly limitAmount: NonNullable<BudgetPlannedExpenseUpdate["limit_amount"]>;
}

type TransactionRow = Tables<"transactions">;
type TransactionInsert = TablesInsert<"transactions">;
type TransactionUpdate = TablesUpdate<"transactions">;

export interface TransactionDto {
  readonly id: TransactionRow["id"];
  readonly householdId: TransactionRow["household_id"];
  readonly budgetId: TransactionRow["budget_id"];
  readonly categoryId: TransactionRow["category_id"];
  readonly amount: TransactionRow["amount"];
  readonly transactionDate: TransactionRow["transaction_date"];
  readonly note: TransactionRow["note"];
  readonly createdAt: TransactionRow["created_at"];
  readonly updatedAt: TransactionRow["updated_at"];
}

export type TransactionsListResponseDto = PaginatedDataDto<TransactionDto>;

export interface CreateTransactionCommand {
  readonly categoryId: TransactionInsert["category_id"];
  readonly amount: TransactionInsert["amount"];
  readonly transactionDate: TransactionInsert["transaction_date"];
  readonly note?: TransactionInsert["note"] | undefined;
}

export interface UpdateTransactionCommand {
  readonly categoryId?: TransactionUpdate["category_id"];
  readonly amount?: TransactionUpdate["amount"];
  readonly transactionDate?: TransactionUpdate["transaction_date"];
  readonly note?: TransactionUpdate["note"];
}

export interface DashboardSummaryDto {
  readonly currentBudgetId: BudgetRow["id"];
  readonly month: BudgetRow["month"];
  readonly totalIncome: BudgetSummaryDto["totalIncome"];
  readonly totalPlanned: BudgetSummaryDto["totalPlanned"];
  readonly totalSpent: BudgetSummaryDto["totalSpent"];
  readonly freeFunds: BudgetSummaryDto["freeFunds"];
  readonly progress: BudgetSummaryDto["progress"];
  readonly categories: readonly BudgetCategorySummaryDto[];
}

export interface BudgetSummaryResponseDto {
  readonly budgetId: BudgetRow["id"];
  readonly month: BudgetRow["month"];
  readonly summary: BudgetSummaryDto;
}

/**
 * DTO for default category information returned with household data.
 */
export interface DefaultCategoryDto {
  readonly id: CategoryRow["id"];
  readonly name: CategoryRow["name"];
}
