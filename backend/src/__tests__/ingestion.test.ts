import { describe, it, expect, jest, beforeEach } from '@jest/globals';

describe("Ingestion Modules", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createTerm", () => {
    it("should export a function", async () => {
      const { createTerm } = await import("../ingestion/createTerm.js");
      expect(typeof createTerm).toBe("function");
    });
  });

  describe("getActiveTermFromDB", () => {
    it("should export a function", async () => {
      const { getActiveTermFromDB } = await import("../ingestion/getActiveTermFromDB.js");
      expect(typeof getActiveTermFromDB).toBe("function");
    });
  });

  describe("markAllTermsInactive", () => {
    it("should export a function", async () => {
      const { markAllTermsInactive } = await import("../ingestion/markAllTermsInactive.js");
      expect(typeof markAllTermsInactive).toBe("function");
    });
  });

  describe("rmpUpdate", () => {
    it("should export a function", async () => {
      const { rmpUpdate } = await import("../ingestion/rmpUpdate.js");
      expect(typeof rmpUpdate).toBe("function");
    });
  });

  describe("detectCurrentTerm", () => {
    it("should export a function", async () => {
      const { detectCurrentTerm } = await import("../ingestion/detectCurrentTerm.js");
      expect(typeof detectCurrentTerm).toBe("function");
    });
  });

  describe("ingest", () => {
    it("should export a function", async () => {
      const { ingest } = await import("../ingestion/ingest.js");
      expect(typeof ingest).toBe("function");
    });
  });

  describe("startSearch", () => {
    it("should export a function", async () => {
      const { startSearch } = await import("../ingestion/startSearch.js");
      expect(typeof startSearch).toBe("function");
    });
  });
});