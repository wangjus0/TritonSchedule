import cliProgress from "cli-progress";
import {
  searchSchool,
  getProfessorRatingAtSchoolId,
} from "ratemyprofessor-api";
import type { Course } from "../models/Course.js";
import type { RMP } from "../models/RMP.js";
import { normalizeTeacherKey } from "../utils/normalizeTeacherKey.js";

const schoolName = "University of California San Diego";

export async function rmpUpdate(courses: Course[]) {

  const searched = new Set<string>();

  const school = await searchSchool(schoolName);

  // Add items to searched set 
  for (const course of courses) {

    const normalized = normalizeTeacherKey(course.Teacher);

    if (normalized.length > 0 && !searched.has(normalized)) {
      searched.add(normalized);
    }
  }

  // Progress bar for visualization
  const rmpBar = new cliProgress.SingleBar(
    {
      format: "RMP Progress |{bar}| {value}/{total} | Current Teacher: {name}",
      clearOnComplete: true,
    },
    cliProgress.Presets.shades_classic,
  );

  rmpBar.start(searched.size, 0, { name: "" });

  // Collect all RMP data first, then persist it in batches.
  const rmpDataMap = new Map<string, RMP>();

  for (const teacher of searched) {

    rmpBar.update({ name: teacher.trim() });

    if (school !== undefined) {
      const schoolId = school[0].node.id;
      const search = await getProfessorRatingAtSchoolId(teacher, schoolId);
      const item: RMP = {
        avgRating: search.avgRating,
        avgDiff: search.avgDifficulty,
        takeAgainPercent: Math.trunc(search.wouldTakeAgainPercent),
        name: search.formattedName.toLowerCase(),
        nameKey: teacher.toLowerCase(),
      };

      rmpDataMap.set(teacher.toLowerCase(), item);
    }

    rmpBar.increment();
  }

  rmpBar.stop(); // Close TUI

  for (const course of courses) {
    course.rmp = rmpDataMap.get(course.nameKey.toLowerCase()) ?? null;
  }

  return Array.from(rmpDataMap.values());
}
