dotenv.config();

import cliProgress from "cli-progress";
import { Db } from "mongodb";
import puppeteer from "puppeteer";
import { connectToDB } from "../services/connectToDB.js";
import { insertDB } from "../services/insertDB.js";
import { scrapeCurrentPage } from "./scrapeCurrentPage.js";
import { rmpUpdate } from "./rmpUpdate.js";
import dotenv from "dotenv";

const SUBJECT_CODES: string[] = [
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

export async function startSearch(term: string) {
  // Browser intialization
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const db: Db = await connectToDB();
  const subjectBar = new cliProgress.SingleBar(
    {
      format: "Course Progress |{bar}| {value}/{total} | Current Subject: {code}",
      clearOnComplete: true,
    },
    cliProgress.Presets.shades_classic,
  );

  subjectBar.start(SUBJECT_CODES.length, 0, { code: "" });

  // Scrape all subjects
  for (const code of SUBJECT_CODES) {
    subjectBar.update({ code: code.trim() });
    await page.goto(
      "https://act.ucsd.edu/scheduleOfClasses/scheduleOfClassesStudent.htm",
      { waitUntil: "networkidle2" },
    );
    await page.waitForSelector("#selectedSubjects");

    // Skip if subject code DOM item DNE
    const selected = await page.select("select#selectedSubjects", code);
    if (selected.length <= 0) {
      continue;
    }

    await page.click("#socFacSubmit");
    await page.waitForSelector("#socDisplayCVO");

    // To determine the max # of pages
    const pages = await page.evaluate(() => {
      return Array.from(
        document.querySelectorAll<HTMLAnchorElement>('a[href*="page="]'),
      )
        .map((a) => a.getAttribute("href"))
        .filter((h): h is string => h !== null);
    });

    let lastPage: number | null = null;

    if (pages.length > 0) {
      const lastHref = pages[pages.length - 1];
      const pageParam = new URL(
        lastHref,
        "https://example.com",
      ).searchParams.get("page");

      lastPage = pageParam ? parseInt(pageParam, 10) : null;
    }

    lastPage = lastPage != null ? lastPage + 1 : 0;

    let currentPage = 0;

    while (currentPage < lastPage) {
      // Scrapes contents of current page
      let curPageContent = await scrapeCurrentPage(code, term, page);

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
        const links = Array.from(
          document.querySelectorAll<HTMLAnchorElement>(
            'a[href*="scheduleOfClassesStudentResult.htm?page="]',
          ),
        );

        const nextLink = links.find(
          (a) => a.textContent?.trim() === String(nextPage),
        );

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

  await rmpUpdate(term);

  subjectBar.stop(); // Close TUI

  browser.close(); // To close the browser instance

  return;
}

