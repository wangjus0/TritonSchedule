import cliProgress from "cli-progress";
import { connectToSupabase } from "../services/supabase.js";
import {
  searchSchool,
  getProfessorRatingAtSchoolId,
} from "ratemyprofessor-api";
import type { RMP } from "../models/RMP.js";
import { normalizeTeacherKey } from "../utils/normalizeTeacherKey.js";

const schoolName = "University of California San Diego";

export async function rmpUpdate(curTerm: string) {
  const supabase = await connectToSupabase();

  // Fetch all courses for current term
  const { data: courses, error: fetchError } = await supabase
    .from('courses')
    .select('teacher')
    .eq('term', curTerm);

  if (fetchError) {
    console.error('Error fetching courses for RMP update:', fetchError);
    return;
  }

  const searched = new Set<string>();

  for (const doc of courses || []) {
    const normalized = normalizeTeacherKey(doc.teacher);
    if (normalized.length > 0 && !searched.has(normalized)) {
      searched.add(normalized);
    }
  }

  if (searched.size === 0) {
    console.log("No teachers to update RMP for");
    return;
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

  const school = await searchSchool(schoolName);

  // Call RMP API and update each course
  for (const teacher of searched) {
    rmpBar.update({ name: teacher.trim() });

    if (school !== undefined) {
      try {
        const schoolId = school[0].node.id;
        const search = await getProfessorRatingAtSchoolId(teacher, schoolId);
        const item: RMP = {
          avgRating: search.avgRating,
          avgDiff: search.avgDifficulty,
          takeAgainPercent: Math.trunc(search.wouldTakeAgainPercent),
          name: search.formattedName.toLowerCase(),
          nameKey: teacher.toLowerCase(),
        };

        // Update courses with RMP data by teacher name_key and term
        const { error: updateError } = await supabase
          .from('courses')
          .update({
            rmp: {
              avgRating: item.avgRating,
              avgDiff: item.avgDiff,
              takeAgainPercent: item.takeAgainPercent,
              name: item.name,
              nameKey: item.nameKey,
            }
          })
          .eq('name_key', teacher)
          .eq('term', curTerm);

        if (updateError) {
          console.error(`Error updating RMP for ${teacher}:`, updateError);
        }
      } catch (err) {
        console.error(`Error fetching RMP for ${teacher}:`, err);
      }
    }

    rmpBar.increment();
  }

  rmpBar.stop(); // Close TUI

  return;
}
