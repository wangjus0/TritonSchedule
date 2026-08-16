import puppeteer, { type Page, type Browser } from "puppeteer";
import {
  extractScheduleRows,
  type RawScheduleRow,
} from "./extractScheduleRows.js";
import { fetchCurrentTerm } from "./fetchCurrentTerm.js";
import { SUBJECT_CODES } from "./subjectCodes.js";

const SCHEDULE_SEARCH_URL =
  "https://act.ucsd.edu/scheduleOfClasses/scheduleOfClassesStudent.htm";
const SCHEDULE_RESULTS_URL =
  "https://act.ucsd.edu/scheduleOfClasses/scheduleOfClassesStudentResult.htm";
const SCHEDULE_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/140.0.0.0 Safari/537.36";
const MAX_NAVIGATION_ATTEMPTS = 3;

/**
 * Groups schedule rows by subject.
 */
export type SubjectScheduleRows = Readonly<{
  subject: string;
  rows: readonly RawScheduleRow[];
}>;

/**
 * Contains the term and schedule rows collected in one browser session.
 */
export type ScrapedSchedule = Readonly<{
  term: string;
  rowsBySubject: SubjectScheduleRows[];
}>;

/**
 * Fetches schedule rows for one subject.
 */
type FetchRows = (
  page: Page,
  term: string,
  subject: string,
) => Promise<readonly RawScheduleRow[]>;

/**
 * Defines the operations needed to scrape the schedule.
 */
export type ScrapeScheduleDependencies = Readonly<{
  launchBrowser: () => Promise<Browser>;
  fetchCurrentTerm: typeof fetchCurrentTerm;
  fetchRows: FetchRows;
  subjects: readonly string[];
}>;

const productionDependencies: ScrapeScheduleDependencies = {
  launchBrowser,
  fetchCurrentTerm,
  fetchRows,
  subjects: SUBJECT_CODES,
};

/**
 * Fetches schedule rows for every supported subject.
 *
 * @param dependencies Browser and subject-fetching boundaries.
 * @returns Schedule rows grouped by subject.
 */
export async function scrapeSchedule(
  dependencies: ScrapeScheduleDependencies = productionDependencies,
): Promise<ScrapedSchedule> {
  const browser = await dependencies.launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setUserAgent(SCHEDULE_USER_AGENT);
    await openScheduleSearch(page);
    const term = await dependencies.fetchCurrentTerm(page);

    const rowsBySubject: SubjectScheduleRows[] = [];
    for (const subject of dependencies.subjects) {
      const rows = await dependencies.fetchRows(page, term, subject);
      rowsBySubject.push({ subject, rows });
    }

    return { term, rowsBySubject };
  } finally {
    await browser.close();
  }
}

/**
 * Launches a headless browser.
 *
 * @returns The browser instance.
 */
async function launchBrowser(): Promise<Browser> {
  return puppeteer.launch({
    headless: true,
  });
}

/**
 * Opens the schedule search form in the current browser session.
 *
 * @param page Browser page used for ingestion.
 */
async function openScheduleSearch(page: Page): Promise<void> {
  await navigate(page, SCHEDULE_SEARCH_URL);
  await page.waitForSelector("#selectedSubjects");
}

/**
 * Creates the schedule results URL for one term and subject.
 *
 * @param term UCSD term code.
 * @param subjectCode UCSD subject code.
 * @returns The schedule results URL.
 */
function scheduleResultsUrl(term: string, subjectCode: string): string {
  const url = new URL(SCHEDULE_RESULTS_URL);
  url.searchParams.set("selectedTerm", term.trim());
  url.searchParams.set("selectedSubjects", subjectCode.trim());

  return url.toString();
}

/**
 * Opens a page, retrying transient navigation failures.
 *
 * @param page Browser page used for ingestion.
 * @param url URL to open.
 */
async function navigate(page: Page, url: string): Promise<void> {
  for (let attempt = 1; attempt <= MAX_NAVIGATION_ATTEMPTS; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      return;
    } catch (error) {
      if (attempt === MAX_NAVIGATION_ATTEMPTS) {
        throw error;
      }
    }
  }
}

/**
 * Fetches all schedule rows for a subject.
 *
 * @param page Browser page used for the search.
 * @param subjectCode Subject to search for.
 * @param extractRows Function that extracts rows from a page.
 * @returns The subject's schedule rows.
 */
export async function fetchRows(
  page: Page,
  term: string,
  subjectCode: string,
  extractRows: (
    page: Page,
  ) => Promise<readonly RawScheduleRow[]> = extractScheduleRows,
): Promise<readonly RawScheduleRow[]> {
  await navigate(page, scheduleResultsUrl(term, subjectCode));
  await page.waitForSelector("#socDisplayCVO");
  const rows: RawScheduleRow[] = [];
  let pageNumber = 1;

  while (true) {
    const currentRows = await extractRows(page);

    if (currentRows.length === 0) {
      return rows;
    }

    rows.push(...currentRows);

    const nextPageNumber = pageNumber + 1;
    const nextPageUrl = await page.evaluate((nextPage) => {
      const links = Array.from(
        document.querySelectorAll<HTMLAnchorElement>(
          'a[href*="scheduleOfClassesStudentResult.htm?page="]',
        ),
      );

      return (
        links.find(
          (link) => link.textContent?.trim() === String(nextPage),
        )?.href ?? null
      );
    }, nextPageNumber);

    if (nextPageUrl === null) {
      return rows;
    }

    await navigate(page, nextPageUrl);
    await page.waitForSelector("#socDisplayCVO");
    pageNumber = nextPageNumber;
  }
}
