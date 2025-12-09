/**
 * Test data fixtures for E2E tests
 *
 * This file contains test data used across E2E tests
 * Update these as needed for your test scenarios
 */

export const testUsers = {
  valid: {
    email: "test@example.com",
    password: "TestPassword123!",
    name: "Test User",
  },
  invalid: {
    email: "invalid@example.com",
    password: "wrongpassword",
  },
};

export const testBudget = {
  name: "Test Budget",
  period: "2024-01",
  note: "Test budget for E2E testing",
  income: 5000,
};

export const testCategory = {
  name: "Groceries",
  plannedAmount: 500,
  color: "#4CAF50",
};

export const testTransaction = {
  description: "Test transaction",
  amount: 50.0,
  date: "2024-01-15",
  note: "Test note",
};

export const testHouseholdMember = {
  name: "Jane Doe",
  income: 3000,
};
