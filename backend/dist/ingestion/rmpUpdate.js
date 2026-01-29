import cliProgress from "cli-progress";
import { connectToDB } from "../db/connectToDB.js";
import { Db } from "mongodb";
import { insertDB } from "../services/insertDB.js";
import { searchSchool, getProfessorRatingAtSchoolId, } from "ratemyprofessor-api";
// TODO:
// - Once i scrape all the contents from the website
// i go through the objects in the mongo database and query the
// teacher names with the API, and then input that information in the
// document folder, and add each teacher to a set to track that it was
// search for
// FIXME: You'll use this independently of the webreg script
const schoolName = "University of California San Diego";
export async function rmpUpdate() {
    let searched = new Set();
    const db = await connectToDB();
    let docs = await db.collection("courses").find({}).toArray();
    const school = await searchSchool(schoolName);
    // Add items to searched set 
    for (const doc of docs) {
        const cleanTeacher = doc.Teacher.replace(/\s+/g, " ")
            .replace(/[^\w\s]/g, "")
            .trim();
        if (cleanTeacher.length > 0 && !searched.has(cleanTeacher)) {
            searched.add(cleanTeacher);
        }
    }
    // Progress bar for visualization
    const rmpBar = new cliProgress.SingleBar({
        format: "RMP Progress |{bar}| {value}/{total} | Current Teacher: {name}",
        clearOnComplete: true,
    }, cliProgress.Presets.shades_classic);
    rmpBar.start(searched.size, 0, { name: "" });
    // Call RMP API
    for (const teacher of searched) {
        rmpBar.update({ name: teacher.trim() });
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
        rmpBar.increment();
    }
    return;
}
await rmpUpdate();
