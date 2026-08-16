import type { Course } from "../models/Course.js";
import { normalizeTeacherKey } from "../utils/normalizeTeacherKey.js";
import type { RawScheduleRow } from "./extractScheduleRows.js";

/**
 * Creates a location from a building and room.
 *
 * @param building Building name or code.
 * @param room Room name or number.
 * @returns The course location.
 */
function location(building: string, room: string): string {
  return [building, room]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");
}

/**
 * Builds courses from schedule rows.
 *
 * @param subject Course subject code.
 * @param term Course term.
 * @param rows Schedule rows to process.
 * @returns The courses built from the rows.
 */
export function buildCourses(
  subject: string,
  term: string,
  rows: readonly RawScheduleRow[],
): Course[] {
  const courses: Course[] = [];
  let current: Course | null = null;

  /**
   * Adds the current course to the results.
   */
  const finishCurrentCourse = () => {
    if (current !== null) {
      courses.push(current);
    }
  };

  for (const row of rows) {
    if (row.kind === "course-header") {
      finishCurrentCourse();
      current = {
        Name: `${subject} ${row.courseNumber}: ${row.courseTitle}`,
        Term: term,
        Teacher: "",
        Lecture: null,
        Labs: [],
        Discussions: [],
        Midterms: [],
        Final: null,
        nameKey: "",
        rmp: null,
      };
      continue;
    }

    if (current === null || row.kind === "note") {
      continue;
    }

    if (row.kind === "exam") {
      const exam = {
        Days: row.date,
        Time: row.time,
        Location: location(row.building, row.room),
      };

      if (row.examType === "MI") {
        current.Midterms.push(exam);
      } else {
        current.Final = exam;
      }

      continue;
    }

    const supportedMeetingTypes = ["DI", "LE", "SE", "LA", "IT"];

    if (!supportedMeetingTypes.includes(row.meetingType)) {
      continue;
    }

    if (current.Teacher.length === 0) {
      current.Teacher = row.instructor;
      current.nameKey = normalizeTeacherKey(row.instructor);
    }

    const meeting = {
      Days: row.days,
      Time: row.time,
      Location: location(row.building, row.room),
    };

    if (
      row.meetingType === "LE" ||
      row.meetingType === "IT" ||
      row.meetingType === "SE"
    ) {
      current.Lecture ??= meeting;
    } else if (row.meetingType === "DI") {
      current.Discussions.push(meeting);
    } else if (row.meetingType === "LA") {
      current.Labs.push(meeting);
    }
  }

  finishCurrentCourse();
  return courses;
}
