import type { Page } from "puppeteer";

const CURRENT_TERM_OPTION_SELECTOR = "#selectedTerm option";

/**
 * Reads the current UCSD term from an already-loaded schedule page.
 *
 * UCSD lists the current schedule first and stores its canonical term code in
 * the option value, such as `SA26`. The caller owns browser navigation so the
 * same page and session can be reused for schedule scraping.
 *
 * @param page Browser page displaying the schedule search form.
 * @returns The canonical current term code.
 */
export async function fetchCurrentTerm(page: Page): Promise<string> {
  await page.waitForSelector(CURRENT_TERM_OPTION_SELECTOR);

  const term = await page.evaluate((selector) => {
    const option = document.querySelector<HTMLOptionElement>(selector);

    return option?.getAttribute("value") ?? null;
  }, CURRENT_TERM_OPTION_SELECTOR);
  const normalizedTerm = term?.trim().toUpperCase();

  if (!normalizedTerm) {
    throw new Error("Current term was not present in the schedule page");
  }

  return normalizedTerm;
}
