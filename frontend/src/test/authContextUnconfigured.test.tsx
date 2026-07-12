import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("../lib/supabase", () => ({
  isSupabaseConfigured: false,
  supabase: null,
}));

const { AuthProvider, useAuth } = await import("../context/AuthContext");

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe("AuthContext without Supabase configured", () => {
  it("stops loading immediately and reports the error messages", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isConfigured).toBe(false);

    const signInResult = await result.current.signIn("a@b.com", "pw");
    expect(signInResult.error).toMatch(/not configured/);

    const signUpResult = await result.current.signUp("a@b.com", "pw");
    expect(signUpResult.error).toMatch(/not configured/);

    await expect(result.current.signOut()).resolves.toBeUndefined();
  });
});
