import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

const getSession = vi.fn();
const onAuthStateChange = vi.fn();
const signInWithPassword = vi.fn();
const signUp = vi.fn();
const signOut = vi.fn();
const unsubscribe = vi.fn();

vi.mock("../lib/supabase", () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession,
      onAuthStateChange,
      signInWithPassword,
      signUp,
      signOut,
    },
  },
}));

const { AuthProvider, useAuth } = await import("../context/AuthContext");

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe("AuthContext with Supabase configured", () => {
  beforeEach(() => {
    getSession.mockReset();
    onAuthStateChange.mockReset();
    signInWithPassword.mockReset();
    signUp.mockReset();
    signOut.mockReset();
    unsubscribe.mockReset();

    getSession.mockResolvedValue({ data: { session: null } });
    onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe } } });
  });

  it("initializes the session from Supabase and stops loading", async () => {
    const fakeSession = { user: { id: "u1" } };
    getSession.mockResolvedValue({ data: { session: fakeSession } });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.session).toEqual(fakeSession);
    expect(result.current.user).toEqual(fakeSession.user);
    expect(result.current.isConfigured).toBe(true);
  });

  it("reacts to auth state changes", async () => {
    let handler: (event: string, session: unknown) => void = () => {};
    onAuthStateChange.mockImplementation((cb: typeof handler) => {
      handler = cb;
      return { data: { subscription: { unsubscribe } } };
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const nextSession = { user: { id: "u2" } };
    act(() => handler("SIGNED_IN", nextSession));
    expect(result.current.user).toEqual(nextSession.user);
  });

  it("signIn returns Supabase errors", async () => {
    signInWithPassword.mockResolvedValue({ error: { message: "bad creds" } });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const res = await result.current.signIn("a@b.com", "pw");
    expect(res.error).toBe("bad creds");
  });

  it("signUp returns null error on success", async () => {
    signUp.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const res = await result.current.signUp("a@b.com", "pw");
    expect(res.error).toBeNull();
  });

  it("signOut calls Supabase", async () => {
    signOut.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await result.current.signOut();
    expect(signOut).toHaveBeenCalled();
  });

  it("useAuth throws when used outside a provider", () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      "useAuth must be used within an AuthProvider"
    );
  });
});
