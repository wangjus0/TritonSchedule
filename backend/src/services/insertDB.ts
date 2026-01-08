import { connectToDB } from "../db/connectToDB.js";
import { searchSubject } from "../utils/searchSubject.js";
import { Db } from "mongodb";
import type { Class } from "../models/Course.js";

export async function insertDB(
  db: Db,
  content: Class[],
  collection_name: string,
) {
  const courses = db.collection(collection_name);

  await courses.insertMany(content);

  console.log("Item inserted");
  return;
}
