import puppeteer from "puppeteer";
import { closeSearch } from "./closeSearch.js";
export const SUBJECT_CODES = ["AIP ", "AAS "];
export async function startSearch() {
    // New browser instance
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto("https://act.ucsd.edu/scheduleOfClasses/scheduleOfClassesStudent.htm", { waitUntil: "networkidle2" });
    await page.waitForSelector("#selectedSubjects");
    // First item
    await page.select("select#selectedSubjects", "AIP ");
    await page.click("#socFacSubmit");
    return page;
}
const newPage = await startSearch();
closeSearch(newPage);
