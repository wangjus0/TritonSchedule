import puppeteer from "puppeteer";
const SUBJECT_CODES = ["AIP ", "AAS "];
export async function newSearchSubject() {
    // New browser instance
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto("https://act.ucsd.edu/scheduleOfClasses/scheduleOfClassesStudent.htm", { waitUntil: "networkidle2" });
    await page.waitForSelector("#selectedSubjects");
    await page.select("select#selectedSubjects", "AIP ");
    await page.click("#socFacSubmit");
    console.log(page);
    await page.close();
}
newSearchSubject();
