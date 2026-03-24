import dotenv from "dotenv";
import cliProgress from "cli-progress";
import { connectToDB } from "../services/connectToDB.js";
import { Db } from "mongodb";
import { insertDB } from "../services/insertDB.js";
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
  const docs = await db.collection("courses").find({ Term: curTerm }).toArray();

  // Build set of teacher name keys to query
  for (const doc of docs) {
    if (typeof doc.Teacher === 'string' && doc.Teacher.trim() !== '') {
      const normalized = normalizeTeacherKey(doc.Teacher);
      if (normalized.length > 0 && !searched.has(normalized)) {
        searched.add(normalized);
      }
    }
  }

  if (searched.size === 0) {
    return; // No teachers to look up
  }

  const school = await searchSchool(schoolName);

  // If school not found, cannot fetch RMP data; exit early
  if (!school || !Array.isArray(school) || school.length === 0) {
    console.error(`School "${schoolName}" not found for RMP lookup`);
    return;
  }

  const schoolId = school[0].node.id;

  // Progress bar for visualization
  const rmpBar = new cliProgress.SingleBar(
    {
      format: "RMP Progress |{bar}| {value}/{total} | Current Teacher: {name}",
      clearOnComplete: true,
    },
    cliProgress.Presets.shades_classic,
  );

  rmpBar.start(searched.size, 0, { name: "" });

  // Call RMP API for each teacher
  for (const teacher of searched) {
    rmpBar.update({ name: teacher.trim() });

    try {
      const search = await getProfessorRatingAtSchoolId(teacher, schoolId);
      const item: RMP = {
        avgRating: search.avgRating,
        avgDiff: search.avgDifficulty,
        takeAgainPercent: Math.trunc(search.wouldTakeAgainPercent),
        name: search.formattedName.toLowerCase(),
        nameKey: teacher.toLowerCase(),
      };

      // Update all course sections for this teacher
      await db.collection("courses").updateMany(
        { nameKey: teacher },
        { $set: { rmp: item } }
      );
    } catch (error) {
      console.error(`RMP lookup failed for teacher ${teacher}:`, error);
      // Continue with next teacher
    } finally {
      rmpBar.increment();
    }
  }

  rmpBar.stop(); // Close TUI
  return;
}
