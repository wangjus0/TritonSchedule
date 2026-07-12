import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import request from "supertest";

const getActiveTermFromDB = jest.fn<() => Promise<{ Term: string } | null>>();

async function loadApp() {
  jest.unstable_mockModule("../ingestion/getActiveTermFromDB.js", () => ({ getActiveTermFromDB }));
  // Avoid loading the cheerio-backed scraper chain that the admin router pulls in.
  jest.unstable_mockModule("../ingestion/detectCurrentTerm.js", () => ({
    detectCurrentTerm: jest.fn(),
  }));
  const mod = await import("../app.js");
  return mod.default;
}

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  process.env.API_KEY = "test-key";
});

describe("GET /term/active", () => {
  it("resolves the active term at the path the frontend requests", async () => {
    getActiveTermFromDB.mockResolvedValue({ Term: "spring 2026" });
    const app = await loadApp();

    const res = await request(app).get("/term/active").set("x-api-key", "test-key");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ Term: "spring 2026" });
  });

  it("returns 404 for the old /term path (regression guard for the route fix)", async () => {
    const app = await loadApp();

    const res = await request(app).get("/term").set("x-api-key", "test-key");

    expect(res.status).toBe(404);
  });
});
