import { Db } from "mongodb";
import type { Course } from "../models/Course.js";
import { validateCourse } from "../utils/validateCourse.js";

export async function insertDB(
  db: Db,
  content: unknown[],
  collection_name: string,
) {
  const courses = db.collection(collection_name);

  // Validate each course before insertion
  const validCourses: Course[] = [];
  let invalidCount = 0;

  for (const item of content) {
    // Skip items that aren't objects
    if (!item || typeof item !== "object") {
      invalidCount++;
      continue;
    }

    // Try to validate as Course
    const course = item as Course;
    const validation = validateCourse(course);
    
    if (validation.valid) {
      validCourses.push(course);
    } else {
      invalidCount++;
      console.warn(`Skipping invalid course: ${course.Name} - ${validation.errors.join(", ")}`);
    }
  }

  if (validCourses.length > 0) {
    await courses.insertMany(validCourses);
    console.log(`Inserted ${validCourses.length} courses${invalidCount > 0 ? ` (${invalidCount} invalid skipped)` : ''}`);
  } else if (invalidCount > 0) {
    console.log(`No valid courses to insert (${invalidCount} invalid)`);
  }

  return;
}
