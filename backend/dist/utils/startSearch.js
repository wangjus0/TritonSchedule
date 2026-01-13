import puppeteer from "puppeteer";
import { scrapeCurrentPage } from "./scrapeCurrentPage.js";
export const SUBJECT_CODES = ["AIP ", "AAS "];
// TODO:
// - Use a single puppeteer page instance and mutate the page
// for each search. I also need to import the models for storing the data
// in a document to store into the DB. Then I reparse the HTML to get all
// the important data
export async function startSearch() {
    // New browser instance
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto("https://act.ucsd.edu/scheduleOfClasses/scheduleOfClassesStudent.htm", { waitUntil: "networkidle2" });
    await page.waitForSelector("#selectedSubjects");
    await page.select("select#selectedSubjects", "MATH");
    await page.click("#socFacSubmit");
    await page.waitForSelector(".tbrdr");
    await scrapeCurrentPage("WI26", page);
    return;
}
await startSearch();
