import { searchSchool, getProfessorRatingAtSchoolId, } from "ratemyprofessor-api";
import { connectToDB } from "../db/connectToDB.js";
import { Db } from "mongodb";
import { insertDB } from "../services/insertDB.js";
let db = await connectToDB();
export async function rmpUpdate(teacher) {
    const school = await searchSchool("University of California, San Diego");
    if (school !== undefined) {
        const schoolId = school[0].node.id;
        const search = await getProfessorRatingAtSchoolId(teacher, schoolId);
        const item = {
            avgRating: search.avgRating,
            avgDiff: search.avgDifficulty,
            takeAgainPercent: search.wouldTakeAgainPercent,
            name: search.formattedName.toLowerCase(),
        };
        await insertDB(db, [item], "rmpData");
    }
    return;
}
// Workflow
// - In scrapeCurrentPage() check if the scraped teacher exists in
// DB, if not, call this function and create a document for this teachers
// rating
