/**
 * Test data fixtures for expense-related tests
 */

export interface ExpenseTestData {
  amount: string;
  categoryId?: string;
  categoryName?: string;
  date?: Date;
  note?: string;
}

/**
 * Valid expense test data
 */
export const validExpenses: Record<string, ExpenseTestData> = {
  basic: {
    amount: "150.50",
    categoryName: "Inne",
    note: "Zakupy w supermarkecie",
  },

  withoutNote: {
    amount: "50.00",
    categoryName: "Transport",
  },

  withCustomDate: {
    amount: "200.00",
    categoryName: "Rozrywka",
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    note: "Kino z rodziną",
  },

  smallAmount: {
    amount: "5.99",
    categoryName: "Transport",
    note: "Bilet autobusowy",
  },

  largeAmount: {
    amount: "1500.00",
    categoryName: "Mieszkanie",
    note: "Czynsz za miesiąc",
  },

  withDecimals: {
    amount: "123.45",
    categoryName: "Inne",
    note: "Test z dwoma miejscami po przecinku",
  },
};

/**
 * Invalid expense test data for validation testing
 */
export const invalidExpenses: Record<string, Partial<ExpenseTestData>> = {
  emptyAmount: {
    amount: "",
    categoryName: "Inne",
    note: "Brak kwoty",
  },

  negativeAmount: {
    amount: "-50.00",
    categoryName: "Transport",
    note: "Ujemna kwota",
  },

  zeroAmount: {
    amount: "0",
    categoryName: "Inne",
    note: "Zerowa kwota",
  },

  invalidAmountFormat: {
    amount: "abc",
    categoryName: "Transport",
    note: "Nieprawidłowy format",
  },

  tooManyDecimals: {
    amount: "50.123",
    categoryName: "Inne",
    note: "Zbyt wiele miejsc po przecinku",
  },

  noCategory: {
    amount: "100.00",
    note: "Brak kategorii",
  },
};

/**
 * Category test data
 */
export const testCategories = {
  food: {
    id: "category-food-id",
    name: "Inne",
  },
  transport: {
    id: "category-transport-id",
    name: "Transport",
  },
  entertainment: {
    id: "category-entertainment-id",
    name: "Rozrywka",
  },
  housing: {
    id: "category-housing-id",
    name: "Mieszkanie",
  },
  utilities: {
    id: "category-utilities-id",
    name: "Media",
  },
};

/**
 * Helper to get today's date
 */
export const getToday = (): Date => new Date();

/**
 * Helper to get yesterday's date
 */
export const getYesterday = (): Date => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date;
};

/**
 * Helper to get date N days ago
 */
export const getDaysAgo = (days: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

/**
 * Helper to format amount for display
 */
export const formatAmount = (amount: string): string => {
  return `${amount} zł`;
};
