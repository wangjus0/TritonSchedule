import { describe, expect, it, jest, beforeEach } from "@jest/globals";

const detectCurrentTerm = jest.fn<() => Promise<string>>();
const getActiveTermFromDB = jest.fn<() => Promise<{ Term: string } | null>>();
const createTerm = jest.fn<(term: string) => Promise<void>>();
const startSearch = jest.fn<(term: string) => Promise<void>>();
const markAllTermsInactive = jest.fn<() => Promise<void>>();

async function loadIngest() {
  jest.unstable_mockModule("../ingestion/detectCurrentTerm.js", () => ({ detectCurrentTerm }));
  jest.unstable_mockModule("../ingestion/getActiveTermFromDB.js", () => ({ getActiveTermFromDB }));
  jest.unstable_mockModule("../ingestion/createTerm.js", () => ({ createTerm }));
  jest.unstable_mockModule("../ingestion/startSearch.js", () => ({ startSearch }));
  jest.unstable_mockModule("../ingestion/markAllTermsInactive.js", () => ({ markAllTermsInactive }));

  return import("../ingestion/ingest.js");
}

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
});

describe("active term refresh", () => {
  it("does not roll over when the detected term is already active", async () => {
    detectCurrentTerm.mockResolvedValue("spring 2026");
    getActiveTermFromDB.mockResolvedValue({ Term: "spring 2026" });

    const { ingest } = await loadIngest();

    await ingest();

    expect(markAllTermsInactive).not.toHaveBeenCalled();
    expect(createTerm).not.toHaveBeenCalled();
    expect(startSearch).toHaveBeenCalledWith("spring 2026");
  });
});
