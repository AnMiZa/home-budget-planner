/**
 * SQL utilities for safe query construction.
 */

/**
 * Escapes special characters in a string for use in SQL LIKE patterns.
 * Prevents SQL injection by escaping % and _ characters that have special meaning in LIKE patterns.
 *
 * @param input - The input string to escape
 * @returns The escaped string safe for use in LIKE patterns
 */
export function escapeLikePattern(input: string): string {
  return input
    .replace(/\\/g, "\\\\") // Escape backslashes first
    .replace(/%/g, "\\%") // Escape % wildcards
    .replace(/_/g, "\\_"); // Escape _ wildcards
}

/**
 * Creates a case-insensitive LIKE pattern for partial matching.
 *
 * @param searchTerm - The term to search for
 * @returns A properly escaped LIKE pattern with wildcards
 */
export function createPartialMatchPattern(searchTerm: string): string {
  const escaped = escapeLikePattern(searchTerm.trim());
  return `%${escaped}%`;
}
