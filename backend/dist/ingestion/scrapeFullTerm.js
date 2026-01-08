import * as cheerio from "cheerio";
import { Db } from "mongodb";
import { connectToDB } from "../db/connectToDB.js";
import { disconnectFromDB } from "../db/disconnectFromDB.js";
import { insertDB } from "../services/insertDB.js";
import { searchSubject } from "../utils/searchSubject.js";
const MEETING_TYPES = {
    LE: "Lecture",
    DI: "Discussions",
    MI: "Midterms",
    FI: "Final",
};
const UCSD_SUBJECT_CODES = [
    // Arts & Humanities
    "ANAR",
    "ARBC",
    "ARTE",
    "CGS",
    "CHIN",
    "CLAS",
    "COMM",
    "CSS",
    "DANCE",
    "ETHN",
    "GREE",
    "HIEA",
    "HIEU",
    "HILA",
    "HIUS",
    "HITO",
    "JAPN",
    "JWSP",
    "LATN",
    "LATI",
    "LIT",
    "LTAM",
    "LTCH",
    "LTCO",
    "LTCS",
    "LTEU",
    "LTFG",
    "LTFR",
    "LTGK",
    "LTGM",
    "LTIT",
    "LTKO",
    "LTPR",
    "LTRU",
    "LTSP",
    "LTTH",
    "LTWL",
    "MUS",
    "PHIL",
    "TDAC",
    "TDDE",
    "TDDR",
    "TDGE",
    "TDHD",
    "TDHT",
    "TDMV",
    "TDTR",
    "TDWP",
    "THEA",
    "VIS",
    // Engineering
    "BENG",
    "CENG",
    "CSE",
    "ECE",
    "ENG",
    "MAE",
    "MATS",
    "NANO",
    "SE",
    // Natural Sciences
    "BIOL",
    "CHEM",
    "ESYS",
    "GEOS",
    "MATH",
    "PHYS",
    "SIO",
    // Social Sciences
    "ANSC",
    "COGS",
    "ECON",
    "EDS",
    "GLBH",
    "INTL",
    "LIGN",
    "POLI",
    "PSYC",
    "SOCI",
    "USP",
    // Health Sciences
    "BICD",
    "BIMM",
    "BGGN",
    "CLIN",
    "FMPH",
    "GMED",
    "HDS",
    "MED",
    "MPH",
    "NURS",
    "PHAR",
    // Interdisciplinary / Professional
    "AIP",
    "AWP",
    "CAT",
    "DOC",
    "DSC",
    "GPCO",
    "GPS",
    "HUM",
    "MMW",
    "PHYS",
    "RCLAS",
    "REV",
    "RMAS",
    "SYN",
    "TMC",
    // Business & Management
    "MGT",
    "MGTF",
    "MKTG",
    "OB",
    "OPRS",
    "PSAE",
    // Education & Writing
    "EDS",
    "WCWP",
    "WARR",
    // Special / Research / Misc
    "CCS",
    "IRLA",
    "LAWS",
    "PRIN",
    "SPPS",
    "TDAC",
];
export async function scrapeFullTerm(new_term) {
    // have a list with all the subjects
    // reuse search function for each subject
    // have some function to add to database
    let db = await connectToDB();
    for (const subject of UCSD_SUBJECT_CODES) {
        let currentScraped = await searchSubject(subject, new_term);
        if (currentScraped.length > 0) {
            await insertDB(db, currentScraped, "courses");
        }
    }
    await disconnectFromDB();
    return;
}
scrapeFullTerm("WI26");
