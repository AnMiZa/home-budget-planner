import { describe, it, expect } from "vitest";

/**
 * Example unit test file
 * This demonstrates how to write tests using Vitest
 *
 * To run: npm test
 * To run in watch mode: npm run test:watch
 * To run with UI: npm run test:ui
 * To generate coverage: npm run test:coverage
 */

describe("Example Test Suite", () => {
  it("should pass a basic assertion", () => {
    expect(true).toBe(true);
  });

  it("should demonstrate array assertions", () => {
    const numbers = [1, 2, 3, 4, 5];
    expect(numbers).toHaveLength(5);
    expect(numbers).toContain(3);
  });

  it("should demonstrate object assertions", () => {
    const user = {
      name: "John",
      age: 30,
      email: "john@example.com",
    };

    expect(user).toHaveProperty("name", "John");
    expect(user).toMatchObject({ name: "John", age: 30 });
  });
});

/**
 * TODO: Replace this with actual tests for your formatters
 * Example:
 *
 * import { formatCurrency, formatDate } from '@/lib/formatters';
 *
 * describe('formatCurrency', () => {
 *   it('should format currency correctly', () => {
 *     expect(formatCurrency(1000)).toBe('1000.00 PLN');
 *   });
 * });
 */
