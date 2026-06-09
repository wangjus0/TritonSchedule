import type { Course } from "../models/Course.js";
import { insertCourses } from "./supabaseRepository.js";

export async function insertDB(
  content: Course[],
  collection_name: string,
) {
  if (collection_name !== "courses") {
    throw new Error(`Unsupported collection: ${collection_name}`);
  }

  await insertCourses(content);

  return;
}
