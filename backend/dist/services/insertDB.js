import { connectToDB } from "../db/connectToDB.js";
import { searchClass } from "../utils/searchClass.js";
export async function insertDB() {
    const db = await connectToDB();
    const courses = db.collection("courses");
    const classes = await searchClass("math 10a", "WI26");
    await courses.insertMany(classes);
    console.log("Item inserted");
    return;
}
insertDB();
