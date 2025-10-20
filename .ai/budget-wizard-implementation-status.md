# Status implementacji widoku BudgetWizardView

## Zrealizowane kroki

- Utworzenie stron Astro `/new-budget` oraz `/budget/[budgetId]/edit` renderujących `BudgetWizardView` z dyrektywą `client:only="react"`.
- Integracja `useBudgetWizard` z faktycznymi endpointami API (`/api/household-members`, `/api/categories`, `/api/budgets`, `/api/budgets/{id}`, `/api/budgets/{id}/incomes`, `/api/budgets/{id}/planned-expenses`).
- Dodanie systemu powiadomień (toasty) oraz blokad nawigacji między krokami przy błędach walidacji lub zapisu.
- Rozbudowa `BudgetWizardView`, `IncomesForm`, `PlannedExpensesForm` i `ReadOnlyBudgetView` o pełną logikę formularzy oraz tryb odczytu.

## Kolejne kroki

- Sprawdzenie i naprawa błędów występujących po wejściu w `/new-budget`:

NavigationItem.tsx:81 A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up. This can happen if a SSR-ed Client Component used:

- A server/client branch `if (typeof window !== 'undefined')`.
- Variable input such as `Date.now()` or `Math.random()` which changes each time it's called.
- Date formatting in a user's locale which doesn't match the server.
- External changing data without sending a snapshot of it along with the HTML.
- Invalid HTML tag nesting.

It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

https://react.dev/link/hydration-mismatch

oraz

useBudgetWizard.ts:293 Failed to initialize budget wizard ReferenceError: isPositiveMoneyValue is not defined
at useBudgetWizard.ts:268:54
at Array.every (<anonymous>)
at useBudgetWizard.ts:268:36
