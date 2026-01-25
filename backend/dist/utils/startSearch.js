import puppeteer from "puppeteer";
import cliProgress from "cli-progress";
import { Db } from "mongodb";
import { scrapeCurrentPage } from "./scrapeCurrentPage.js";
import { insertDB } from "../services/insertDB.js";
import { connectToDB } from "../db/connectToDB.js";
import { disconnectFromDB } from "../db/disconnectFromDB.js";
/* TODO: Fix the subject codes, for some of them it doesn't work super well
 * - Overscraping for single page content pages (idk why)
 * - Some subject codes are invalid, where it's not clicking on any subject at all (some of them aren't 4 chars long)
 */
// TODO: RMP data for each subject (should be in scrape each page, so when were scraping each prof we use the API to search as well)
const SUBJECT_CODES = [
    "AIP ",
    "AAS ",
    "AWP ",
    "ANES",
    "ANBI",
    "ANAR",
    "ANTH",
    "ANSC",
    "AAPI",
    "ASTR",
    "AUD ",
    "BENG",
    "BNFO",
    "BIEB",
    "BICD",
    "BIPN",
    "BIBC",
    "BGGN",
    "BGJC",
    "BGRD",
    "BGSE",
    "BILD",
    "BIMM",
    "BISP",
    "BIOM",
    "CMM ",
    "CENG",
    "CHEM",
    "CLX ",
    "CHIN",
    "CLAS",
    "CCS ",
    "CLIN",
    "CLRE",
    "COGS",
    "COMM",
    "COGR",
    "CSS ",
    "CSE ",
    "COSE",
    "CCE ",
    "CGS ",
    "CAT ",
    "TDDM",
    "TDHD",
    "TDMV",
    "TDPF",
    "TDTR",
    "DSC ",
    "DSE ",
    "DERM",
    "DSGN",
    "DOC ",
    "DDPM",
    "ECON",
    "EDS ",
    "ERC ",
    "ECE ",
    "EMED",
    "ENG ",
    "ENVR",
    "ESYS",
    "ETIM",
    "ETHN",
    "EXPR",
    "FPM ",
    "FILM",
    "GPCO",
    "GPEC",
    "GPGN",
    "GPIM",
    "GPLA",
    "GPPA",
    "GPPS",
    "GLBH",
    "GSS ",
    "HITO",
    "HIAF",
    "HIEA",
    "HIEU",
    "HILA",
    "HISC",
    "HISA",
    "HINE",
    "HIUS",
    "HIGL",
    "HIGR",
    "HILD",
    "HDS ",
    "HUM ",
    "INTL",
    "JAPN",
    "JWSP",
    "LATI",
    "LISL",
    "LIAB",
    "LIDS",
    "LIFR",
    "LIGN",
    "LIGM",
    "LIHL",
    "LIIT",
    "LIPO",
    "LISP",
    "LTAM",
    "LTAF",
    "LTCO",
    "LTCS",
    "LTEU",
    "LTFR",
    "LTGM",
    "LTGK",
    "LTIT",
    "LTKO",
    "LTLA",
    "LTRU",
    "LTSP",
    "LTTH",
    "LTWR",
    "LTEN",
    "LTWL",
    "LTEA",
    "MMW ",
    "MBC ",
    "MATS",
    "MATH",
    "MSED",
    "MAE ",
    "MED ",
    "MUIR",
    "MCWP",
    "MUS ",
    "NANO",
    "NEU ",
    "NEUG",
    "OBG ",
    "OPTH",
    "ORTH",
    "PATH",
    "PEDS",
    "PHAR",
    "SPPS",
    "PHIL",
    "PAE ",
    "PHYS",
    "PHYA",
    "POLI",
    "PSY ",
    "PSYC",
    "PH  ",
    "PHB ",
    "RMAS",
    "RAD ",
    "MGTF",
    "MGT ",
    "MGTA",
    "MGTP",
    "RELI",
    "RMED",
    "REV ",
    "SPPH",
    "SOMI",
    "SOMC",
    "SIOC",
    "SIOG",
    "SIOB",
    "SIO ",
    "SEV ",
    "SOCG",
    "SOCE",
    "SOCI",
    "SE  ",
    "SURG",
    "SYN ",
    "TDAC",
    "TDDE",
    "TDDR",
    "TDGE",
    "TDGR",
    "TDHT",
    "TDPW",
    "TDPR",
    "TMC ",
    "USP ",
    "UROL",
    "VIS ",
    "WCWP",
    "WES ",
];
export async function startSearch() {
    // Browser intialization
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    const db = await connectToDB();
    const subjectBar = new cliProgress.SingleBar({
        format: "Progress |{bar}| {value}/{total} | Current Subject: {code}",
        clearOnComplete: true,
    }, cliProgress.Presets.shades_classic);
    subjectBar.start(SUBJECT_CODES.length, 0, { code: "" });
    // Scrape all subjects
    for (const code of SUBJECT_CODES) {
        subjectBar.update({ code: code.trim() });
        await page.goto("https://act.ucsd.edu/scheduleOfClasses/scheduleOfClassesStudent.htm", { waitUntil: "networkidle2" });
        await page.waitForSelector("#selectedSubjects");
        await page.select("select#selectedSubjects", code);
        await page.click("#socFacSubmit");
        await page.waitForSelector("#socDisplayCVO");
        // To determine the max # of pages
        const pages = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a[href*="page="]'))
                .map((a) => a.getAttribute("href"))
                .filter((h) => h !== null);
        });
        let lastPage = null;
        if (pages.length > 0) {
            const lastHref = pages[pages.length - 1];
            const pageParam = new URL(lastHref, "https://example.com").searchParams.get("page");
            lastPage = pageParam ? parseInt(pageParam, 10) : null;
        }
        lastPage = lastPage != null ? lastPage + 1 : 0;
        let currentPage = 0;
        while (currentPage < lastPage) {
            // Scrapes contents of current page
            let curPageContent = await scrapeCurrentPage("WI26", page);
            if (curPageContent.length <= 0) {
                break;
            }
            /*
             * Connects, and inserts document to DB
             * Note: Might block if you don't add IP to DB allowed list
             */
            await insertDB(db, curPageContent, "courses");
            currentPage += 1;
            /**
             * Checks if next page button exists
             *
             * @return true if exists, false if doesn't
             */
            let didClick = await page.evaluate((nextPage) => {
                const links = Array.from(document.querySelectorAll('a[href*="scheduleOfClassesStudentResult.htm?page="]'));
                const nextLink = links.find((a) => a.textContent?.trim() === String(nextPage));
                if (!nextLink) {
                    return false;
                }
                nextLink.click();
                return true;
            }, currentPage);
            // Waits for page to load if clicked
            if (didClick) {
                await page.waitForNavigation({ waitUntil: "networkidle0" });
            }
        }
        subjectBar.increment();
    }
    subjectBar.stop(); // Close TUI
    disconnectFromDB(); // Close connect to DB
    browser.close(); // To close the browser instance
    return;
}
await startSearch();
