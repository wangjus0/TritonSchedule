import cliProgress from "cli-progress";
import {
  searchSchool,
  getProfessorRatingAtSchoolId,
} from "ratemyprofessor-api";
import type { RMP } from "../models/RMP.js";
import { normalizeTeacherKey } from "../utils/normalizeTeacherKey.js";
import {
  findCoursesByTerm,
  updateCoursesRmpByNameKey,
  upsertProfessorRows,
} from "../services/supabaseRepository.js";

const schoolName = "University of California San Diego";

export async function rmpUpdate(curTerm: string) {

  const searched = new Set<string>();
  const docs = await findCoursesByTerm(curTerm);

  const school = await searchSchool(schoolName);

  // Add items to searched set 
  for (const doc of docs) {

    const normalized = normalizeTeacherKey(doc.Teacher);

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

  if (rmpDataMap.size > 0) {
    await upsertProfessorRows(Array.from(rmpDataMap.values()));
    const modifiedCount = await updateCoursesRmpByNameKey(rmpDataMap);
    console.log(`Bulk updated ${modifiedCount} courses with RMP data`);
  } else {
    console.log("No RMP data to update");
  }

  return;
}
