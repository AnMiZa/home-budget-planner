/**
 * Database test data fixtures for E2E tests
 *
 * This file defines the test data that will be created in the database
 * during global setup. This ensures all E2E tests have consistent,
 * predictable data to work with.
 */

import type { TestHouseholdMember, TestBudget } from "../helpers/database-setup";

/**
 * Test household members to be created during setup
 * These members can be used in budget income tests
 */
export const testHouseholdMembers: TestHouseholdMember[] = [
  {
    fullName: "Jan Kowalski",
  },
  {
    fullName: "Anna Kowalska",
  },
];

/**
 * Test budgets to be created during setup
 * Note: These will be created with incomes from the household members above
 */
export function createTestBudgets(
  members: { id: string; fullName: string }[],
  categories: { id: string; name: string }[]
): TestBudget[] {
  const currentDate = new Date();
  // Format as YYYY-MM-01 (first day of month) for date type in database
  const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-01`;
  const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  const nextMonthStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`;

  // Find specific categories for planned expenses
  const foodCategory = categories.find((c) => c.name === "Żywność");
  const transportCategory = categories.find((c) => c.name === "Transport");
  const housingCategory = categories.find((c) => c.name === "Mieszkanie");

  const budgets: TestBudget[] = [
    {
      month: currentMonth,
      note: "Test budget for current month",
      incomes:
        members.length >= 2
          ? [
              {
                householdMemberId: members[0].id,
                amount: 5000,
              },
              {
                householdMemberId: members[1].id,
                amount: 4500,
              },
            ]
          : [],
      plannedExpenses: [
        foodCategory && {
          categoryId: foodCategory.id,
          limitAmount: 1500,
        },
        transportCategory && {
          categoryId: transportCategory.id,
          limitAmount: 800,
        },
        housingCategory && {
          categoryId: housingCategory.id,
          limitAmount: 2000,
        },
      ].filter((expense): expense is NonNullable<typeof expense> => expense !== undefined && expense !== null),
    },
    {
      month: nextMonthStr,
      note: "Test budget for next month",
      incomes:
        members.length >= 2
          ? [
              {
                householdMemberId: members[0].id,
                amount: 5200,
              },
              {
                householdMemberId: members[1].id,
                amount: 4700,
              },
            ]
          : [],
      plannedExpenses: [
        foodCategory && {
          categoryId: foodCategory.id,
          limitAmount: 1600,
        },
        transportCategory && {
          categoryId: transportCategory.id,
          limitAmount: 850,
        },
      ].filter((expense): expense is NonNullable<typeof expense> => expense !== undefined && expense !== null),
    },
  ];

  return budgets;
}

/**
 * Additional test categories (beyond the default ones)
 * These can be used for specific test scenarios
 */
export const additionalTestCategories = [
  {
    name: "Test Category 1",
  },
  {
    name: "Test Category 2",
  },
];
