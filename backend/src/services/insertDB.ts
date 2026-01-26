import { Db } from "mongodb";
import type { Course } from "../models/Course.js";

export async function insertDB(
  db: Db,
  content: any[],
  collection_name: string,
) {
  const courses = db.collection(collection_name);

  await courses.insertMany(content);

  return;
}
