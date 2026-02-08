import { connectToDB } from "../services/connectToDB.js";
import { Db } from "mongodb";
import dotenv from "dotenv";
dotenv.config();
export async function scrapeCurrentPage(subject, term, page) {
    const db = await connectToDB();
    const rows = await page.$$("tr");
    const results = [];
    let current = null;
    for (const row of rows) {
        // Gets course number
        const courseNumber = await row.$$eval("td.crsheader", (item) => item[1]?.textContent?.trim());
        // Gets class title
        const courseTitle = await row.$$eval("td.crsheader span.boldtxt", (item) => item[0]?.textContent?.trim());
        let combinedTitle = "";
        // Check if courseNumber or courseTitle is undefined before assigning
        if (courseNumber != undefined && courseTitle != undefined) {
            combinedTitle = `${subject} ${courseNumber}: ${courseTitle}`;
        }
        if (combinedTitle.length > 0) {
            if (current != null) {
                results.push(current);
            }
            current = {
                Name: combinedTitle,
                Term: term,
                Teacher: "",
                Lecture: null,
                Rating: "",
                Discussions: [],
                Midterms: [],
                Final: null,
            };
            continue;
        }
        const nonTestBucket = await row.$$eval("td.brdr", (item) => item[3]?.textContent?.trim());
        const testBucket = await row.$$eval("td.brdr", (item) => item[2]?.textContent?.trim());
        const nestedRows = await row.$$eval("td.brdr", (tds) => {
            const cells = new Array(13).fill("");
            for (let i = 0; i < tds.length; i++) {
                cells[i] = tds[i].textContent?.trim();
            }
            return cells;
        });
        if (current != null) {
            if (nonTestBucket === "DI" ||
                nonTestBucket === "LE" ||
                nonTestBucket == "SE") {
                if (current.Teacher.length <= 0) {
                    current.Teacher = nestedRows[9];
                }
                if (current.Lecture == null && nonTestBucket === "LE") {
                    current.Lecture = {
                        Days: nestedRows[5],
                        Time: nestedRows[6],
                        Location: nestedRows[7] + " " + nestedRows[8],
                    };
                }
                if (nonTestBucket === "DI") {
                    current.Discussions.push({
                        Days: nestedRows[5],
                        Time: nestedRows[6],
                        Location: nestedRows[7] + " " + nestedRows[8],
                    });
                }
            }
            else if (testBucket === "MI" || testBucket === "FI") {
                if (testBucket === "MI") {
                    current.Midterms.push({
                        Days: nestedRows[3],
                        Time: nestedRows[5],
                        Location: nestedRows[6] + " " + nestedRows[7],
                    });
                }
                if (testBucket === "FI") {
                    current.Final = {
                        Days: nestedRows[3],
                        Time: nestedRows[5],
                        Location: nestedRows[6] + " " + nestedRows[7],
                    };
                }
            }
            else if (nonTestBucket === "IT") {
                if (current.Teacher.length <= 0) {
                    current.Teacher = nestedRows[9];
                }
                current.Lecture = {
                    Days: nestedRows[5],
                    Time: nestedRows[5],
                    Location: nestedRows[5],
                };
            }
        }
    }
    return results;
}
