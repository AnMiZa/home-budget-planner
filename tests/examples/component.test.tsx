import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../utils/test-helpers";

/**
 * Example component test file
 * This demonstrates how to test React components using React Testing Library
 */

// Simple example component for demonstration
function ExampleButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} type="button">
      {children}
    </button>
  );
}

describe("ExampleButton Component", () => {
  it("should render with correct text", () => {
    const noop = () => {
      // Intentionally empty for test
    };
    renderWithProviders(<ExampleButton onClick={noop}>Click me</ExampleButton>);

    expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument();
  });

  it("should call onClick when clicked", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    renderWithProviders(<ExampleButton onClick={handleClick}>Click me</ExampleButton>);

    const button = screen.getByRole("button", { name: /click me/i });
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

/**
 * TODO: Replace this with actual component tests
 * Example:
 *
 * import { Button } from '@/components/ui/button';
 *
 * describe('Button', () => {
 *   it('should render with variant prop', () => {
 *     renderWithProviders(<Button variant="destructive">Delete</Button>);
 *     expect(screen.getByRole('button')).toHaveClass('destructive');
 *   });
 * });
 */
