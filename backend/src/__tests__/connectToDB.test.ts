import { describe, it, expect, afterEach } from '@jest/globals';
import { connectToDB, getSupabaseConfig } from "../services/connectToDB.js";

describe("connectToDB helpers", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("getSupabaseConfig", () => {
    it("should throw when SUPABASE_URL is missing", () => {
      process.env = { ...originalEnv };
      delete process.env.SUPABASE_URL;

      expect(() => getSupabaseConfig()).toThrow("Missing SUPABASE_URL");
    });

    it("should throw when SUPABASE_SERVICE_ROLE_KEY is missing", () => {
      process.env = { ...originalEnv, SUPABASE_URL: "https://example.supabase.co" };
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      expect(() => getSupabaseConfig()).toThrow("Missing SUPABASE_SERVICE_ROLE_KEY");
    });

    it("should return config when both vars are present", () => {
      process.env = {
        ...originalEnv,
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service-key",
      };

      expect(getSupabaseConfig()).toEqual({
        serviceRoleKey: "service-key",
        url: "https://example.supabase.co",
      });
    });
  });

  it("should create a Supabase client without connecting eagerly", () => {
    process.env = {
      ...originalEnv,
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-key",
    };

    const client = connectToDB();

    expect(typeof client.from).toBe("function");
  });
});
