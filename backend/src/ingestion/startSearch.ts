import cliProgress from "cli-progress";
import { Db } from "mongodb";
import puppeteer from "puppeteer";
import { connectToDB } from "../services/connectToDB.js";
import { insertDB } from "../services/insertDB.js";
import { scrapeCurrentPage } from "./scrapeCurrentPage.js";
import { rmpUpdate } from "./rmpUpdate.js";

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
  // Browser initialization
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

  try {
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

      // Process pages: always scrape the first page, then attempt to navigate to next pages
      let currentPage = 1;
      while (true) {
        const curPageContent = await scrapeCurrentPage(code, term, page);

        if (curPageContent.length > 0) {
          await insertDB(db, curPageContent, "courses");
        }

        // Attempt to go to the next page
        const nextPage = currentPage + 1;
        const didClick = await page.evaluate((targetPage) => {
          const links = Array.from(
            document.querySelectorAll<HTMLAnchorElement>(
              'a[href*="scheduleOfClassesStudentResult.htm?page="]',
            ),
          );

          const nextLink = links.find(
            (a) => a.textContent?.trim() === String(targetPage),
          );

          if (!nextLink) {
            return false;
          }

          nextLink.click();
          return true;
        }, nextPage);

        if (!didClick) {
          break;
        }

        await page.waitForNavigation({ waitUntil: "networkidle0" });
        currentPage = nextPage;
      }

      subjectBar.increment();
    }

    await rmpUpdate(term);
  } finally {
    subjectBar.stop(); // Close TUI
    await browser.close(); // Ensure browser closes even on errors
  }

  return;
}
