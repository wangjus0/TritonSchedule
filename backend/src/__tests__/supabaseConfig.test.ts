import { afterEach, describe, expect, it } from "@jest/globals";
import { getSupabaseConfig, isSupabaseConfigError } from "../services/supabaseStore.js";

const originalSupabaseUrl = process.env.SUPABASE_URL;
const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

afterEach(() => {
  if (originalSupabaseUrl === undefined) delete process.env.SUPABASE_URL;
  else process.env.SUPABASE_URL = originalSupabaseUrl;

  if (originalServiceRoleKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
});

describe("getSupabaseConfig", () => {
  it("reports every missing Supabase env var", () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    try {
      getSupabaseConfig();
      throw new Error("Expected getSupabaseConfig to throw");
    } catch (error) {
      expect(isSupabaseConfigError(error)).toBe(true);
      expect((error as Error).message).toBe(
        "Missing Supabase environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY",
      );
    }
  });
});
