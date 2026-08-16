import { describe, expect, it, jest } from "@jest/globals";
import type { Browser, Page } from "puppeteer";
import type { RawScheduleRow } from "../../src/ingestion/extractScheduleRows.js";
import {
  fetchRows,
  scrapeSchedule,
} from "../../src/ingestion/scrapeSchedule.js";

function courseHeader(rowIndex: number, courseNumber: string): RawScheduleRow {
  return {
    kind: "course-header",
    rowIndex,
    restrictions: "",
    courseNumber,
    courseTitle: `Course ${courseNumber}`,
    details: "",
  };
}

describe("fetchRows", () => {
  it("fetches and concatenates every results page for one subject", async () => {
    const firstPageRows = [courseHeader(0, "100")];
    const secondPageRows = [courseHeader(0, "101")];
    const goto = jest.fn(async () => null);
    const waitForSelector = jest.fn(async () => null);
    const evaluate = jest.fn(async (_callback, nextPage: number) =>
      nextPage === 2 ? "https://act.ucsd.edu/results?page=2" : null,
    );
    const page = {
      evaluate,
      goto,
      waitForSelector,
    } as unknown as Page;
    const extractRows = jest
      .fn<(page: Page) => Promise<readonly RawScheduleRow[]>>()
      .mockResolvedValueOnce(firstPageRows)
      .mockResolvedValueOnce(secondPageRows);

    const rows = await fetchRows(page, "SA26", "CSE ", extractRows);

    expect(rows).toEqual([...firstPageRows, ...secondPageRows]);
    expect(extractRows).toHaveBeenCalledTimes(2);
    expect(goto).toHaveBeenNthCalledWith(
      1,
      "https://act.ucsd.edu/scheduleOfClasses/" +
        "scheduleOfClassesStudentResult.htm?selectedTerm=SA26&selectedSubjects=CSE",
      { waitUntil: "domcontentloaded" },
    );
    expect(goto).toHaveBeenNthCalledWith(
      2,
      "https://act.ucsd.edu/results?page=2",
      { waitUntil: "domcontentloaded" },
    );
    expect(waitForSelector).toHaveBeenCalledTimes(2);
  });

  it("returns no rows when the results page is empty", async () => {
    const page = {
      evaluate: jest.fn(async () => null),
      goto: jest.fn(async () => null),
      waitForSelector: jest.fn(async () => null),
    } as unknown as Page;
    const extractRows = jest.fn<
      (page: Page) => Promise<readonly RawScheduleRow[]>
    >().mockResolvedValue([]);

    await expect(
      fetchRows(page, "SA26", "NOPE", extractRows),
    ).resolves.toEqual([]);
    expect(extractRows).toHaveBeenCalledTimes(1);
  });

  it("retries a transient navigation failure", async () => {
    const goto = jest
      .fn<() => Promise<null>>()
      .mockRejectedValueOnce(new Error("navigation failed"))
      .mockResolvedValue(null);
    const page = {
      evaluate: jest.fn(async () => null),
      goto,
      waitForSelector: jest.fn(async () => null),
    } as unknown as Page;
    const extractRows = jest
      .fn<(page: Page) => Promise<readonly RawScheduleRow[]>>()
      .mockResolvedValue([]);

    await expect(
      fetchRows(page, "SA26", "CSE ", extractRows),
    ).resolves.toEqual([]);
    expect(goto).toHaveBeenCalledTimes(2);
  });
});

describe("scrapeSchedule", () => {
  it("reads the term and rows through one browser page", async () => {
    const goto = jest.fn(async () => null);
    const setUserAgent = jest.fn(async () => undefined);
    const waitForSelector = jest.fn(async () => null);
    const page = {
      goto,
      setUserAgent,
      waitForSelector,
    } as unknown as Page;
    const close = jest.fn(async () => undefined);
    const browser = {
      close,
      newPage: jest.fn(async () => page),
    } as unknown as Browser;
    const fetchCurrentTerm = jest.fn(async () => "SA26");
    const fetchRows = jest.fn(
      async (_page: Page, _term: string, subject: string) => [
        courseHeader(0, subject.trim()),
      ],
    );

    const result = await scrapeSchedule({
      launchBrowser: async () => browser,
      fetchCurrentTerm,
      fetchRows,
      subjects: ["CSE ", "MATH "],
    });

    expect(result).toEqual({
      term: "SA26",
      rowsBySubject: [
        { subject: "CSE ", rows: [courseHeader(0, "CSE")] },
        { subject: "MATH ", rows: [courseHeader(0, "MATH")] },
      ],
    });
    expect(fetchCurrentTerm).toHaveBeenCalledWith(page);
    expect(fetchRows).toHaveBeenNthCalledWith(1, page, "SA26", "CSE ");
    expect(fetchRows).toHaveBeenNthCalledWith(2, page, "SA26", "MATH ");
    expect(setUserAgent).toHaveBeenCalledWith(
      expect.stringContaining("Chrome/140.0.0.0"),
    );
    expect(goto).toHaveBeenCalledTimes(1);
    expect(goto).toHaveBeenCalledWith(
      "https://act.ucsd.edu/scheduleOfClasses/scheduleOfClassesStudent.htm",
      { waitUntil: "domcontentloaded" },
    );
    expect(close).toHaveBeenCalledTimes(1);
  });
});
