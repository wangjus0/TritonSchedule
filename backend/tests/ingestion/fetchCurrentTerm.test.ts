import { describe, expect, it, jest } from "@jest/globals";
import type { Page } from "puppeteer";
import { fetchCurrentTerm } from "../../src/ingestion/fetchCurrentTerm.js";

describe("fetchCurrentTerm", () => {
  it("reads the canonical term from an already-loaded browser page", async () => {
    const waitForSelector = jest.fn(async () => null);
    const evaluate = jest.fn(async () => " sa26 ");
    const page = {
      evaluate,
      waitForSelector,
    } as unknown as Page;

    await expect(fetchCurrentTerm(page)).resolves.toBe("SA26");
    expect(waitForSelector).toHaveBeenCalledWith("#selectedTerm option");
    expect(evaluate).toHaveBeenCalledWith(
      expect.any(Function),
      "#selectedTerm option",
    );
  });

  it("rejects a page without a term value", async () => {
    const page = {
      evaluate: jest.fn(async () => null),
      waitForSelector: jest.fn(async () => null),
    } as unknown as Page;

    await expect(fetchCurrentTerm(page)).rejects.toThrow(
      "Current term was not present in the schedule page",
    );
  });
});
