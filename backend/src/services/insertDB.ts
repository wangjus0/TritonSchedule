import type { Course } from "../models/Course.js";
import { insertCourses } from "./supabaseStore.js";

export async function insertDB(
  content: Course[],
  collectionName: string,
) {
  if (collectionName !== "courses") {
    throw new Error(`Unsupported Supabase collection: ${collectionName}`);
  }

  await insertCourses(content);
}
