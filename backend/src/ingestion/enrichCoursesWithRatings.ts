import cliProgress from "cli-progress";
import {
  searchSchool,
  getProfessorRatingAtSchoolId,
} from "ratemyprofessor-api";
import type { Course } from "../models/Course.js";
import type { RMP } from "../models/RMP.js";
import { normalizeTeacherKey } from "../utils/normalizeTeacherKey.js";

const schoolName = "University of California San Diego";

export function normalizePercentage(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.trunc(value)));
}

/**
 * Contains courses and professor ratings.
 */
export type CourseRatingEnrichment = Readonly<{
  courses: Course[];
  professors: RMP[];
}>;

/**
 * Adds professor ratings to courses.
 *
 * @param courses Courses to enrich.
 * @returns New courses and their professor ratings.
 */
export async function enrichCoursesWithRatings(
  courses: readonly Course[],
): Promise<CourseRatingEnrichment> {
  const searched = new Set<string>();
  const school = await searchSchool(schoolName);

  for (const course of courses) {
    const normalized = normalizeTeacherKey(course.Teacher);

    if (normalized.length > 0) {
      searched.add(normalized);
    }
  }

  const rmpBar = new cliProgress.SingleBar(
    {
      format: "RMP Progress |{bar}| {value}/{total} | Current Teacher: {name}",
      clearOnComplete: true,
    },
    cliProgress.Presets.shades_classic,
  );

  rmpBar.start(searched.size, 0, { name: "" });
  const rmpDataMap = new Map<string, RMP>();

  try {
    for (const teacher of searched) {
      rmpBar.update({ name: teacher.trim() });

      if (school?.[0]) {
        const search = await getProfessorRatingAtSchoolId(
          teacher,
          school[0].node.id,
        );
        const item: RMP = {
          avgRating: search.avgRating,
          avgDiff: search.avgDifficulty,
          takeAgainPercent: normalizePercentage(search.wouldTakeAgainPercent),
          name: search.formattedName.toLowerCase(),
          nameKey: teacher.toLowerCase(),
          profileUrl: search.link,
        };

        rmpDataMap.set(teacher.toLowerCase(), item);
      }

      rmpBar.increment();
    }
  } finally {
    rmpBar.stop();
  }

  const enrichedCourses = courses.map((course) => ({
    ...course,
    rmp: rmpDataMap.get(course.nameKey.toLowerCase()) ?? null,
  }));

  return {
    courses: enrichedCourses,
    professors: Array.from(rmpDataMap.values()),
  };
}
