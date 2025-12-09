import { vi } from "vitest";

/**
 * Mock Supabase client for unit tests
 * Usage: vi.mock('@/db/supabase.client', () => ({ createClient: vi.fn(() => mockSupabaseClient) }))
 */
export const mockSupabaseClient = {
  auth: {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    getUser: vi.fn(),
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
  })),
  rpc: vi.fn(),
};

/**
 * Reset all Supabase mocks
 */
export function resetSupabaseMocks() {
  mockSupabaseClient.auth.signUp.mockReset();
  mockSupabaseClient.auth.signInWithPassword.mockReset();
  mockSupabaseClient.auth.signOut.mockReset();
  mockSupabaseClient.auth.resetPasswordForEmail.mockReset();
  mockSupabaseClient.auth.updateUser.mockReset();
  mockSupabaseClient.auth.getUser.mockReset();
  mockSupabaseClient.auth.getSession.mockReset();
  mockSupabaseClient.from.mockClear();
  mockSupabaseClient.rpc.mockClear();
}
