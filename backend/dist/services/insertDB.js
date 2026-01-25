import { connectToDB } from "../db/connectToDB.js";
import { searchSubject } from "../utils/searchSubject.js";
import { Db } from "mongodb";
export async function insertDB(db, content, collection_name) {
    const courses = db.collection(collection_name);
    await courses.insertMany(content);
    return;
}
