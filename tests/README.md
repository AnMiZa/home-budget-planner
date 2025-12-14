# Unit & Integration Tests

This directory contains unit and integration tests using Vitest and React Testing Library.

## Structure

```
tests/
├── setup.ts            # Global test setup
├── utils/              # Test utilities and helpers
├── mocks/              # Mock implementations
└── examples/           # Example test files
```

## Writing Tests

### Unit Test Example

```typescript
// tests/my-function.test.ts
import { describe, it, expect } from "vitest";
import { myFunction } from "@/lib/my-function";

describe("myFunction", () => {
  it("should return expected result", () => {
    expect(myFunction(input)).toBe(expected);
  });
});
```

### Component Test Example

```typescript
// tests/MyComponent.test.tsx
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from './utils/test-helpers';
import { MyComponent } from '@/components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    renderWithProviders(<MyComponent />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
```

## Test Utilities

### renderWithProviders

Use this instead of render() from RTL:

```typescript
import { renderWithProviders } from './utils/test-helpers';

renderWithProviders(<MyComponent />);
```

### Supabase Mock

Mock Supabase client for tests:

```typescript
import { vi } from "vitest";
import { mockSupabaseClient } from "./mocks/supabase.mock";

vi.mock("@/db/supabase.client", () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));
```

## Running Tests

See main [TESTING.md](../TESTING.md) for all available commands.

Quick reference:

```bash
npm test                  # Run all unit tests
npm run test:watch        # Watch mode
npm run test:coverage     # Generate coverage
```

## Best Practices

1. **Test behavior, not implementation**
2. **Use accessible queries** - getByRole, getByLabel
3. **Mock external dependencies**
4. **Keep tests simple and focused**
5. **Use descriptive test names**
