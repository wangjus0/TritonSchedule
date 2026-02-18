import cliProgress from "cli-progress";
import { connectToDB } from "../services/connectToDB.js";
import { Db } from "mongodb";
import {
  searchSchool,
  getProfessorRatingAtSchoolId,
} from "ratemyprofessor-api";
import type { RMP } from "../models/RMP.js";
import { normalizeTeacherKey } from "../utils/normalizeTeacherKey.js";

const schoolName = "University of California San Diego";

export async function rmpUpdate(curTerm: string) {

  let searched = new Set<string>();
  const db: Db = await connectToDB();
  let docs = await db.collection("courses").find({ Term: curTerm }).toArray();

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

  // Call RMP API
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

      // Match course with RMP data
      await db.collection("courses").updateOne(
        { nameKey: teacher },
        { $set: { rmp: item } }
      )

    }

    rmpBar.increment();
  }

  rmpBar.stop(); // Close TUI

  return;
}
