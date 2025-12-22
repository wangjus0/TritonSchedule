import * as cheerio from "cheerio";
import { extractCookies } from "./extractCookies.js";
const MEETING_TYPES = {
    "LE": "lectures",
    "DI": "discussions",
    "MI": "midterms",
    "FI": "final",
};
export async function searchClass(search, term) {
    // Search page endpoint
    const searchUrl = "https://act.ucsd.edu/scheduleOfClasses/scheduleOfClassesStudent.htm";
    // Result page endpoint
    const resultUrl = "https://act.ucsd.edu/scheduleOfClasses/scheduleOfClassesStudentResult.htm";
    // Fetch session cookies
    const initResp = await fetch(searchUrl);
    // Extract cookies
    const cookies = extractCookies(initResp);
    console.log(`Generating new session cookie...\nScraping contents...`);
    // Request Body
    const body = new URLSearchParams({
        selectedTerm: term,
        courses: search,
        tabNum: "tabs-crs",
    });
    // Creating the initial request to load classes    
    await fetch(resultUrl, {
        method: "POST",
        headers: {
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "Accept-Language": "en-US,en;q=0.9",
            "Cache-Control": "max-age=0",
            "Content-Type": "application/x-www-form-urlencoded",
            Origin: "https://act.ucsd.edu",
            Referer: searchUrl,
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-User": "?1",
            "Upgrade-Insecure-Requests": "1",
            "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36",
            "sec-ch-ua": `"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"`,
            "sec-ch-ua-mobile": "?1",
            "sec-ch-ua-platform": `"Android"`,
            Cookie: cookies,
        },
        body,
    });
    let page = 1;
    let hasMore = true;
    let scrapedClasses = [];
    let currentCourse = null;
    while (hasMore) {
        const url = "https://act.ucsd.edu/scheduleOfClasses/scheduleOfClassesStudentResult.htm";
        const res = await fetch(`${url}?page=${page}`, {
            method: "GET",
            headers: {
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "Accept-Language": "en-US,en;q=0.9",
                "Cache-Control": "max-age=0",
                "Content-Type": "application/x-www-form-urlencoded",
                Origin: "https://act.ucsd.edu",
                Referer: searchUrl,
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "same-origin",
                "Sec-Fetch-User": "?1",
                "Upgrade-Insecure-Requests": "1",
                "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36",
                "sec-ch-ua": `"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"`,
                "sec-ch-ua-mobile": "?1",
                "sec-ch-ua-platform": `"Android"`,
                Cookie: cookies,
            },
        });
        const html = await res.text();
        const $ = cheerio.load(html);
        const classes = $("tr") ?? "";
        // Scrape the classes and sections
        classes.each((_, el) => {
            const row = $(el);
            // Check if the row is a header
            if (row.find("td.crsheader").length > 0) {
                // If the current course is not null, add it to the scraped classes
                if (currentCourse != null) {
                    scrapedClasses.push(currentCourse);
                }
                const title = row.children();
                const classCode = $(title).eq(1).text().replace(/\s+/g, " ").trim();
                const className = $(title)
                    .eq(2)
                    .find(".boldtxt")
                    .text()
                    .replace(/\s+/g, " ")
                    .trim();
                const combinedTitle = `${classCode} ${className}`;
                // Create a new course
                if (className.length > 0) {
                    currentCourse = {
                        name: combinedTitle,
                        teacher: "",
                        lectures: [],
                        discussions: [],
                        midterms: [],
                        final: null,
                    };
                }
                else {
                    currentCourse = null;
                }
            }
            // Handle course sections
            if (row.find(".brdr").length > 0) {
                // Only push if currentCourse exists
                if (currentCourse !== null) {
                    const sectionElements = row.children("td");
                    const course = {
                        RestrictionCode: sectionElements.eq(0).text().trim(),
                        CourseNumber: sectionElements.eq(1).text().trim(),
                        SectionID: sectionElements.eq(2).text().trim(),
                        MeetingType: sectionElements.eq(3).text().trim(),
                        Section: sectionElements.eq(4).text().trim(),
                        Days: sectionElements.eq(5).text().trim(),
                        Time: sectionElements.eq(6).text().trim(),
                        Location: sectionElements.eq(7).text().trim(),
                        AvaliableSeats: sectionElements.eq(10).text().trim(),
                        Limit: sectionElements.eq(11).text().trim(),
                        searchText: "placeholder",
                    };
                    const meetingType = course.MeetingType;
                    const bucket = MEETING_TYPES[meetingType];
                    // To filter sections into distinct categories
                    if (bucket) {
                        if (course.SectionID === "FI") {
                            currentCourse.final = course;
                        }
                        else if (course.SectionID === "MI") {
                            currentCourse.midterms.push(course);
                        }
                        else if (bucket !== "final") {
                            currentCourse[bucket].push(course);
                        }
                    }
                    // To set teacher field in Class obj if empty
                    if (currentCourse.teacher === "") {
                        currentCourse.teacher = sectionElements.eq(9).text().trim();
                    }
                }
            }
            // Handle finals and midterms
            if (row.find(".brdr").length > 0 && row.length == 10) {
                // Only push if currentCourse exists
                if (currentCourse !== null) {
                    const sectionElements = row.children("td");
                    const course = {
                        RestrictionCode: "",
                        CourseNumber: "",
                        SectionID: "",
                        MeetingType: sectionElements.eq(2).text().trim(),
                        Section: "",
                        Days: sectionElements.eq(3).text().trim(),
                        Time: sectionElements.eq(5).text().trim(),
                        Location: sectionElements.eq(6).text().trim() + " "
                            + sectionElements.eq(7).text().trim(),
                        AvaliableSeats: "",
                        Limit: "",
                        searchText: "placeholder",
                    };
                    const meetingType = course.MeetingType;
                    const bucket = MEETING_TYPES[meetingType];
                    if (bucket && bucket !== "final") {
                        currentCourse.final = course;
                    }
                }
            }
        });
        // Push the last course if it exists
        if (currentCourse !== null) {
            scrapedClasses.push(currentCourse);
            currentCourse = null; // Reset for next page iteration
        }
        if (classes.length == 0) {
            hasMore = false;
            break;
        }
        page++;
    }
    console.log("Successfully scraped classes");
    console.log(scrapedClasses);
    return scrapedClasses;
}
searchClass("math 10a", "WI26");
