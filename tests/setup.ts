import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  root: Element | null = null;
  rootMargin = "";
  thresholds: readonly number[] = [];

  disconnect(): void {
    // Mock implementation
  }
  observe(): void {
    // Mock implementation
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  unobserve(): void {
    // Mock implementation
  }
} as unknown as typeof IntersectionObserver;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  disconnect(): void {
    // Mock implementation
  }
  observe(): void {
    // Mock implementation
  }
  unobserve(): void {
    // Mock implementation
  }
} as unknown as typeof ResizeObserver;

// Suppress console errors in tests (optional)
// Uncomment if you want to suppress noise in test output
// vi.spyOn(console, 'error').mockImplementation(() => {});
