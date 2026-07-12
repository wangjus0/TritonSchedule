import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { searchCourses } from "../services/supabaseStore.js";

const originalFetch = global.fetch;

beforeEach(() => {
  process.env.SUPABASE_URL = "https://example.supabase.co/";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe("searchCourses", () => {
  it("queries Supabase with service-role auth and flexible course/term filters", async () => {
    const fetchMock = jest.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    global.fetch = fetchMock;

    await searchCourses("CSE 11", "spring 2026");

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("https://example.supabase.co/rest/v1/courses?");
    expect(decodeURIComponent(String(url))).toContain("name=ilike.*CSE*11*");
    expect(decodeURIComponent(String(url))).toContain("term=ilike.*spring*2026*");
    expect((init?.headers as Headers).get("Authorization")).toBe("Bearer service-role");
    expect((init?.headers as Headers).get("apikey")).toBe("service-role");
  });
});
