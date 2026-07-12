import { describe, expect, it, jest, beforeEach } from "@jest/globals";

const upsertActiveTerm = jest.fn<(term: string) => Promise<void>>();

async function loadCreateTerm() {
  jest.unstable_mockModule("../services/supabaseStore.js", () => ({ upsertActiveTerm }));

  return import("../ingestion/createTerm.js");
}

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
});

describe("createTerm", () => {
  it("upserts the term as active", async () => {
    const { createTerm } = await loadCreateTerm();

    await createTerm("spring 2026");

    expect(upsertActiveTerm).toHaveBeenCalledWith("spring 2026");
  });
});
