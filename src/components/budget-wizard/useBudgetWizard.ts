import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";

import type {
  BudgetDetailDto,
  BudgetSummaryDto,
  CategoryDto,
  HouseholdMemberDto,
  UpsertBudgetIncomesCommand,
  UpsertPlannedExpensesCommand,
} from "@/types";

import type {
  BudgetWizardStep,
  BudgetWizardViewModel,
  IncomeFormViewModel,
  PlannedExpenseFormViewModel,
  WizardStepDefinition,
} from "./types";

import { showToast } from "@/components/ui/toast";

interface BudgetWizardState {
  readonly isLoading: boolean;
  readonly isSaving: boolean;
  readonly isEditMode: boolean;
  readonly hasLoadedInitialData: boolean;
  readonly currentStepIndex: number;
  readonly wizard: BudgetWizardViewModel;
  readonly members: readonly HouseholdMemberDto[];
  readonly categories: readonly CategoryDto[];
  readonly steps: readonly WizardStepDefinition[];
  readonly stepValidity: Record<BudgetWizardStep, boolean>;
  readonly error: string | null;
  readonly budgetDetail: BudgetDetailDto | null;
}

type BudgetWizardAction =
  | { type: "START_LOADING" }
  | {
      type: "LOAD_SUCCESS";
      payload: {
        wizard: BudgetWizardViewModel;
        members: readonly HouseholdMemberDto[];
        categories: readonly CategoryDto[];
        budgetDetail: BudgetDetailDto | null;
        isEditMode: boolean;
        currentStepIndex: number;
        stepValidity: Record<BudgetWizardStep, boolean>;
      };
    }
  | { type: "LOAD_FAILURE"; payload: { error: string } }
  | { type: "SET_WIZARD"; payload: { wizard: BudgetWizardViewModel } }
  | { type: "SET_STEP"; payload: { index: number } }
  | { type: "SET_EDIT_MODE"; payload: { isEditMode: boolean } }
  | { type: "SET_SAVING"; payload: { isSaving: boolean } }
  | { type: "SET_ERROR"; payload: { error: string | null } }
  | { type: "SET_STEP_VALIDITY"; payload: { step: BudgetWizardStep; isValid: boolean } };

const WIZARD_STEPS: WizardStepDefinition[] = [
  { id: "incomes", title: "Przychody", description: "Dodaj przychody członków gospodarstwa" },
  { id: "planned-expenses", title: "Planowane wydatki", description: "Zaplanuj limity dla kategorii" },
  { id: "review", title: "Podsumowanie", description: "Sprawdź i zapisz budżet" },
];

const initialWizardState: BudgetWizardViewModel = {
  month: new Date().toISOString().slice(0, 7),
  note: "",
  incomes: [],
  plannedExpenses: [],
  totalIncome: 0,
  totalPlanned: 0,
  freeFunds: 0,
};

const initialState: BudgetWizardState = {
  isLoading: true,
  isSaving: false,
  isEditMode: false,
  hasLoadedInitialData: false,
  currentStepIndex: 0,
  wizard: initialWizardState,
  members: [],
  categories: [],
  steps: WIZARD_STEPS,
  stepValidity: {
    incomes: false,
    "planned-expenses": false,
    review: true,
  },
  error: null,
  budgetDetail: null,
};

function budgetWizardReducer(state: BudgetWizardState, action: BudgetWizardAction): BudgetWizardState {
  switch (action.type) {
    case "START_LOADING":
      return { ...state, isLoading: true, error: null };
    case "LOAD_SUCCESS":
      return {
        ...state,
        isLoading: false,
        hasLoadedInitialData: true,
        wizard: action.payload.wizard,
        members: action.payload.members,
        categories: action.payload.categories,
        budgetDetail: action.payload.budgetDetail,
        isEditMode: action.payload.isEditMode,
        stepValidity: action.payload.stepValidity,
        currentStepIndex: action.payload.currentStepIndex,
      };
    case "LOAD_FAILURE":
      return { ...state, isLoading: false, error: action.payload.error };
    case "SET_WIZARD":
      return { ...state, wizard: action.payload.wizard };
    case "SET_STEP":
      return { ...state, currentStepIndex: action.payload.index };
    case "SET_EDIT_MODE":
      return { ...state, isEditMode: action.payload.isEditMode };
    case "SET_SAVING":
      return { ...state, isSaving: action.payload.isSaving };
    case "SET_ERROR":
      return { ...state, error: action.payload.error };
    case "SET_STEP_VALIDITY":
      if (state.stepValidity[action.payload.step] === action.payload.isValid) {
        return state;
      }

      return {
        ...state,
        stepValidity: {
          ...state.stepValidity,
          [action.payload.step]: action.payload.isValid,
        },
      };
    default:
      return state;
  }
}

interface UseBudgetWizardDependencies {
  fetchHouseholdMembers: () => Promise<readonly HouseholdMemberDto[]>;
  fetchCategories: () => Promise<readonly CategoryDto[]>;
  fetchBudgetDetail?: (budgetId: string) => Promise<BudgetDetailDto>;
  createBudget: (payload: {
    wizard: BudgetWizardViewModel;
  }) => Promise<{ budget: BudgetDetailDto; summary: BudgetSummaryDto | null }>;
  replaceBudgetsData?: (payload: { wizard: BudgetWizardViewModel; budgetId: string }) => Promise<BudgetDetailDto>;
}

interface UseBudgetWizardOptions {
  readonly budgetId?: string;
  readonly dependencies?: UseBudgetWizardDependencies;
}

interface UseBudgetWizardResult {
  readonly wizard: BudgetWizardViewModel;
  readonly steps: readonly WizardStepDefinition[];
  readonly currentStepIndex: number;
  readonly members: readonly HouseholdMemberDto[];
  readonly categories: readonly CategoryDto[];
  readonly isLoading: boolean;
  readonly isSaving: boolean;
  readonly isEditMode: boolean;
  readonly error: string | null;
  readonly budgetDetail: BudgetDetailDto | null;
  readonly stepValidity: Record<BudgetWizardStep, boolean>;
  readonly canGoToNextStep: boolean;
  readonly canGoToPreviousStep: boolean;
  readonly onInitialize: () => void;
  readonly onStepChange: (index: number) => void;
  readonly onToggleEditMode: (editMode: boolean) => void;
  readonly onIncomeChange: (memberId: string, amount: string) => void;
  readonly onPlannedExpenseChange: (categoryId: string, amount: string) => void;
  readonly onStepValidityChange: (step: BudgetWizardStep, isValid: boolean) => void;
  readonly onSave: () => Promise<void>;
  readonly onCalculateTotals: () => void;
}

function mapMembersToIncomes(
  members: readonly HouseholdMemberDto[],
  budget?: BudgetDetailDto | null
): IncomeFormViewModel[] {
  const existingIncomesByMember = new Map<string, { id: string; amount: number }>();

  budget?.incomes.forEach((income) => {
    existingIncomesByMember.set(income.householdMemberId, { id: income.id, amount: income.amount });
  });

  return members.map((member) => {
    const existingIncome = existingIncomesByMember.get(member.id);
    return {
      householdMemberId: member.id,
      fullName: member.fullName,
      originalIncomeId: existingIncome?.id,
      amount: existingIncome ? existingIncome.amount.toFixed(2) : "0",
    };
  });
}

function mapCategoriesToPlannedExpenses(
  categories: readonly CategoryDto[],
  budget?: BudgetDetailDto | null
): PlannedExpenseFormViewModel[] {
  const existingPlannedExpensesByCategory = new Map<string, { id: string; limitAmount: number }>();

  budget?.plannedExpenses.forEach((expense) => {
    existingPlannedExpensesByCategory.set(expense.categoryId, { id: expense.id, limitAmount: expense.limitAmount });
  });

  return categories.map((category) => {
    const existingExpense = existingPlannedExpensesByCategory.get(category.id);
    return {
      categoryId: category.id,
      name: category.name,
      originalPlannedExpenseId: existingExpense?.id,
      limitAmount: existingExpense ? existingExpense.limitAmount.toFixed(2) : "0",
    };
  });
}

function calculateTotals(wizard: BudgetWizardViewModel): BudgetWizardViewModel {
  const totalIncome = wizard.incomes.reduce((sum, income) => sum + (Number.parseFloat(income.amount) || 0), 0);
  const totalPlanned = wizard.plannedExpenses.reduce(
    (sum, expense) => sum + (Number.parseFloat(expense.limitAmount) || 0),
    0
  );
  const freeFunds = totalIncome - totalPlanned;

  return {
    ...wizard,
    totalIncome,
    totalPlanned,
    freeFunds,
  };
}

export function useBudgetWizard({ budgetId, dependencies = {} }: UseBudgetWizardOptions): UseBudgetWizardResult {
  const [state, dispatch] = useReducer(budgetWizardReducer, initialState);
  const hasInitiated = useRef(false);

  const api = useMemo(() => createBudgetWizardApi(dependencies), [dependencies]);

  const initialize = useCallback(async () => {
    if (hasInitiated.current) {
      return;
    }

    hasInitiated.current = true;
    dispatch({ type: "START_LOADING" });

    try {
      const [members, categories, budgetDetail] = await Promise.all([
        api.fetchHouseholdMembers(),
        api.fetchCategories(),
        budgetId && api.fetchBudgetDetail ? api.fetchBudgetDetail(budgetId) : Promise.resolve(null),
      ]);

      const incomes = mapMembersToIncomes(members, budgetDetail ?? undefined);
      const plannedExpenses = mapCategoriesToPlannedExpenses(categories, budgetDetail ?? undefined);

      const wizard: BudgetWizardViewModel = calculateTotals({
        budgetId: budgetDetail?.id,
        month: budgetDetail?.month ?? new Date().toISOString().slice(0, 7),
        note: budgetDetail?.note ?? "",
        incomes,
        plannedExpenses,
        totalIncome: 0,
        totalPlanned: 0,
        freeFunds: 0,
      });

      const incomesValid = incomes.every((income) => isPositiveMoneyValue(income.amount));
      const plannedExpensesValid = plannedExpenses.every((expense) => isPositiveMoneyValue(expense.limitAmount));

      const stepValidity: Record<BudgetWizardStep, boolean> = {
        incomes: incomes.length === 0 ? true : incomesValid,
        "planned-expenses": plannedExpenses.length === 0 ? true : plannedExpensesValid,
        review: true,
      };

      const isEditMode = !budgetDetail;
      const currentStepIndex = budgetDetail ? WIZARD_STEPS.length - 1 : 0;

      dispatch({
        type: "LOAD_SUCCESS",
        payload: {
          wizard,
          members,
          categories,
          budgetDetail,
          isEditMode,
          currentStepIndex,
          stepValidity,
        },
      });
    } catch (error) {
      console.error("Failed to initialize budget wizard", error);
      const message = error instanceof Error ? error.message : undefined;
      showToast({
        title: "Nie udało się wczytać danych",
        description: message,
        variant: "destructive",
      });
      dispatch({ type: "LOAD_FAILURE", payload: { error: message ?? "Nie udało się załadować danych kreatora." } });
    }
  }, [api, budgetId]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const onCalculateTotals = useCallback(() => {
    dispatch({ type: "SET_WIZARD", payload: { wizard: calculateTotals(state.wizard) } });
  }, [state.wizard]);

  const onIncomeChange = useCallback(
    (memberId: string, amount: string) => {
      const incomes = state.wizard.incomes.map((income) =>
        income.householdMemberId === memberId ? { ...income, amount } : income
      );

      const wizard = calculateTotals({ ...state.wizard, incomes });
      dispatch({ type: "SET_WIZARD", payload: { wizard } });
    },
    [state.wizard]
  );

  const onPlannedExpenseChange = useCallback(
    (categoryId: string, amount: string) => {
      const plannedExpenses = state.wizard.plannedExpenses.map((expense) =>
        expense.categoryId === categoryId ? { ...expense, limitAmount: amount } : expense
      );

      const wizard = calculateTotals({ ...state.wizard, plannedExpenses });
      dispatch({ type: "SET_WIZARD", payload: { wizard } });
    },
    [state.wizard]
  );

  const onStepChange = useCallback(
    (index: number) => {
      if (index < 0 || index >= state.steps.length) {
        return;
      }

      if (!state.isEditMode) {
        return;
      }

      if (index <= state.currentStepIndex) {
        dispatch({ type: "SET_STEP", payload: { index } });
        return;
      }

      const currentStep = state.steps[state.currentStepIndex]?.id;
      const isCurrentValid = currentStep ? state.stepValidity[currentStep] : false;
      if (!isCurrentValid) {
        return;
      }

      const intermediateSteps = state.steps.slice(state.currentStepIndex + 1, index);
      const hasInvalid = intermediateSteps.some((step) => !state.stepValidity[step.id]);
      if (hasInvalid) {
        return;
      }

      dispatch({ type: "SET_STEP", payload: { index } });
    },
    [state.currentStepIndex, state.isEditMode, state.stepValidity, state.steps]
  );

  const onToggleEditMode = useCallback(
    (editMode: boolean) => {
      dispatch({ type: "SET_EDIT_MODE", payload: { isEditMode: editMode } });
      dispatch({
        type: "SET_STEP",
        payload: { index: editMode ? 0 : state.steps.length - 1 },
      });
    },
    [state.steps.length]
  );

  const onStepValidityChange = useCallback((step: BudgetWizardStep, isValid: boolean) => {
    dispatch({ type: "SET_STEP_VALIDITY", payload: { step, isValid } });
  }, []);

  const saveWizardState = useCallback(async () => {
    dispatch({ type: "SET_SAVING", payload: { isSaving: true } });
    dispatch({ type: "SET_ERROR", payload: { error: null } });

    try {
      const normalizedWizard: BudgetWizardViewModel = {
        ...state.wizard,
        incomes: state.wizard.incomes.map((income) => ({
          ...income,
          amount: normalizeMoneyInput(income.amount),
        })),
        plannedExpenses: state.wizard.plannedExpenses.map((expense) => ({
          ...expense,
          limitAmount: normalizeMoneyInput(expense.limitAmount),
        })),
      };

      let updatedBudgetDetail: BudgetDetailDto;
      if (!state.wizard.budgetId) {
        const result = await api.createBudget({ wizard: normalizedWizard });
        updatedBudgetDetail = result.budget;
      } else if (api.replaceBudgetsData) {
        updatedBudgetDetail = await api.replaceBudgetsData({
          wizard: normalizedWizard,
          budgetId: state.wizard.budgetId,
        });
      } else {
        throw new Error("REPLACE_UNAVAILABLE");
      }

      const wizard: BudgetWizardViewModel = calculateTotals({
        budgetId: updatedBudgetDetail.id,
        month: updatedBudgetDetail.month,
        note: updatedBudgetDetail.note ?? "",
        incomes: mapMembersToIncomes(state.members, updatedBudgetDetail),
        plannedExpenses: mapCategoriesToPlannedExpenses(state.categories, updatedBudgetDetail),
        totalIncome: 0,
        totalPlanned: 0,
        freeFunds: 0,
      });

      dispatch({ type: "SET_WIZARD", payload: { wizard } });
      dispatch({ type: "SET_EDIT_MODE", payload: { isEditMode: true } });
      dispatch({ type: "SET_STEP", payload: { index: state.steps.length - 1 } });
      dispatch({ type: "SET_ERROR", payload: { error: null } });
    } catch (error) {
      console.error("Failed to save budget", error);
      const message = error instanceof Error ? error.message : undefined;
      showToast({
        title: "Nie udało się zapisać budżetu",
        description: message,
        variant: "destructive",
      });
      dispatch({
        type: "SET_ERROR",
        payload: { error: message ?? "Nie udało się zapisać budżetu. Spróbuj ponownie." },
      });
      throw error;
    } finally {
      dispatch({ type: "SET_SAVING", payload: { isSaving: false } });
    }
  }, [api, state.categories, state.members, state.steps.length, state.wizard]);

  const onSave = useCallback(async () => {
    await saveWizardState();
    showToast({
      title: "Budżet zapisany",
      description: "Zmiany zostały zapisane pomyślnie",
    });
  }, [saveWizardState]);

  const currentStepId = state.steps[state.currentStepIndex]?.id;
  const canGoToNextStep = useMemo(() => {
    if (!currentStepId) {
      return false;
    }

    if (!state.isEditMode) {
      return false;
    }

    const isCurrentValid = state.stepValidity[currentStepId];
    return isCurrentValid && state.currentStepIndex < state.steps.length - 1;
  }, [currentStepId, state.currentStepIndex, state.isEditMode, state.stepValidity, state.steps.length]);
  const canGoToPreviousStep = useMemo(
    () => state.isEditMode && state.currentStepIndex > 0,
    [state.currentStepIndex, state.isEditMode]
  );

  return {
    wizard: state.wizard,
    steps: state.steps,
    currentStepIndex: state.currentStepIndex,
    members: state.members,
    categories: state.categories,
    isLoading: state.isLoading,
    isSaving: state.isSaving,
    isEditMode: state.isEditMode,
    error: state.error,
    budgetDetail: state.budgetDetail,
    stepValidity: state.stepValidity,
    canGoToNextStep,
    canGoToPreviousStep,
    onInitialize: initialize,
    onStepChange,
    onToggleEditMode,
    onIncomeChange,
    onPlannedExpenseChange,
    onStepValidityChange,
    onSave,
    onCalculateTotals,
  };
}

function normalizeMoneyInput(value: string): string {
  const normalized = value.replace(/,/g, ".").replace(/[^\d.]/g, "");
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) {
    return "0";
  }

  return parsed.toFixed(2);
}

function isPositiveMoneyValue(value: string): boolean {
  const normalized = value.trim().replace(/,/g, ".");
  if (!normalized) {
    return false;
  }

  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    return false;
  }

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) {
    return false;
  }

  return parsed > 0 && parsed <= 9_999_999.99;
}

export function transformWizardToCreateCommand(wizard: BudgetWizardViewModel): {
  incomes: UpsertBudgetIncomesCommand;
  plannedExpenses: UpsertPlannedExpensesCommand;
} {
  const incomes = wizard.incomes
    .filter((income) => Number.parseFloat(income.amount) > 0)
    .map((income) => ({
      householdMemberId: income.householdMemberId,
      amount: Number.parseFloat(income.amount),
    }));

  const plannedExpenses = wizard.plannedExpenses
    .filter((expense) => Number.parseFloat(expense.limitAmount) > 0)
    .map((expense) => ({
      categoryId: expense.categoryId,
      limitAmount: Number.parseFloat(expense.limitAmount),
    }));

  return {
    incomes: { incomes },
    plannedExpenses: { plannedExpenses },
  };
}

function createBudgetWizardApi(deps: UseBudgetWizardDependencies) {
  const membersEndpoint = "/api/household-members";
  const categoriesEndpoint = "/api/categories";

  const fetchHouseholdMembers =
    deps.fetchHouseholdMembers ??
    (async () => {
      const response = await fetch(membersEndpoint, { method: "GET", headers: { Accept: "application/json" } });
      if (!response.ok) {
        throw await normalizeApiError(response, "Nie udało się pobrać listy członków gospodarstwa.");
      }

      const payload = (await response.json()) as { data: readonly HouseholdMemberDto[] };
      return payload.data;
    });

  const fetchCategories =
    deps.fetchCategories ??
    (async () => {
      const response = await fetch(categoriesEndpoint, { method: "GET", headers: { Accept: "application/json" } });
      if (!response.ok) {
        throw await normalizeApiError(response, "Nie udało się pobrać kategorii budżetowych.");
      }

      const payload = (await response.json()) as { data: readonly CategoryDto[] };
      return payload.data;
    });

  const fetchBudgetDetail =
    deps.fetchBudgetDetail ??
    (async (id: string) => {
      const response = await fetch(`/api/budgets/${id}`, { method: "GET", headers: { Accept: "application/json" } });
      if (!response.ok) {
        throw await normalizeApiError(response, "Nie udało się pobrać szczegółów budżetu.");
      }

      return (await response.json()) as BudgetDetailDto;
    });

  const createBudget =
    deps.createBudget ??
    (async ({ wizard }: { wizard: BudgetWizardViewModel }) => {
      const { incomes, plannedExpenses } = transformWizardToCreateCommand(wizard);

      const response = await fetch("/api/budgets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          month: wizard.month,
          note: wizard.note,
          incomes: incomes.incomes,
          plannedExpenses: plannedExpenses.plannedExpenses,
        }),
      });

      if (!response.ok) {
        throw await normalizeApiError(response, "Nie udało się utworzyć budżetu.");
      }

      const created = (await response.json()) as { id: string };
      const detail = await fetchBudgetDetail(created.id);
      return { budget: detail, summary: detail.summary ?? null };
    });

  const replaceBudgetsData =
    deps.replaceBudgetsData ??
    (async ({ wizard, budgetId }) => {
      const { incomes, plannedExpenses } = transformWizardToCreateCommand(wizard);

      const incomesResponse = await fetch(`/api/budgets/${budgetId}/incomes`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(incomes),
      });

      if (!incomesResponse.ok) {
        throw await normalizeApiError(incomesResponse, "Nie udało się zaktualizować przychodów.");
      }

      const plannedExpensesResponse = await fetch(`/api/budgets/${budgetId}/planned-expenses`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(plannedExpenses),
      });

      if (!plannedExpensesResponse.ok) {
        throw await normalizeApiError(plannedExpensesResponse, "Nie udało się zaktualizować planowanych wydatków.");
      }

      return fetchBudgetDetail(budgetId);
    });

  return {
    fetchHouseholdMembers,
    fetchCategories,
    fetchBudgetDetail,
    createBudget,
    replaceBudgetsData,
  } as const;
}

async function normalizeApiError(response: Response, fallbackMessage: string): Promise<Error> {
  // Redirect to login on 401 error
  if (response.status === 401) {
    window.location.href = "/login";
    return new Error("Twoja sesja wygasła. Zaloguj się ponownie.");
  }

  try {
    const text = await response.text();
    if (!text) {
      return new Error(fallbackMessage);
    }

    const payload = JSON.parse(text) as { error?: { message?: string } };
    return new Error(payload.error?.message ?? fallbackMessage);
  } catch (cause) {
    console.warn("Failed to parse API error response", cause);
    return new Error(fallbackMessage);
  }
}
