import type { Course } from "../models/Course.js";
import type { Section } from "../models/Section.js";

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

/**
 * Validates a Section object
 */
export function validateSection(section: Section | null, sectionType: string): ValidationResult {
  const errors: string[] = [];

  if (!section) {
    return { valid: true, errors: [] }; // null sections are optional
  }

  if (!section.Days || section.Days.trim().length === 0) {
    errors.push(`Missing days for ${sectionType}`);
  }

  if (!section.Time || section.Time.trim().length === 0) {
    errors.push(`Missing time for ${sectionType}`);
  }

  // Validate Days format (should be Mon/Tue/Wed/Thu/Fri or combinations)
  const validDays = /^(Mon|Tue|Wed|Thu|Fri|)+$/i;
  if (section.Days && !validDays.test(section.Days) && !section.Days.includes("TBA")) {
    errors.push(`Invalid days format for ${sectionType}: ${section.Days}`);
  }

  // Validate Time format
  const validTime = /^\d{1,2}:\d{2}\s*(AM|PM)?-\d{1,2}:\d{2}\s*(AM|PM)?$/i;
  if (section.Time && !validTime.test(section.Time) && !section.Time.includes("TBA")) {
    errors.push(`Invalid time format for ${sectionType}: ${section.Time}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates a Course object
 */
export function validateCourse(course: Course): ValidationResult {
  const errors: string[] = [];

  // Check required fields
  if (!course.Name || course.Name.trim().length === 0) {
    errors.push("Missing course name");
  }

  if (!course.Term || course.Term.trim().length === 0) {
    errors.push("Missing term");
  }

  // Teacher is optional but nameKey should be set if teacher exists
  if (course.Teacher && course.Teacher.trim().length > 0 && !course.nameKey) {
    errors.push("Teacher name without nameKey");
  }

  // Validate lecture
  const lectureResult = validateSection(course.Lecture, "Lecture");
  errors.push(...lectureResult.errors);

  // Validate labs
  course.Labs.forEach((lab, index) => {
    const labResult = validateSection(lab, `Lab ${index + 1}`);
    errors.push(...labResult.errors);
  });

  // Validate discussions
  course.Discussions.forEach((disc, index) => {
    const discResult = validateSection(disc, `Discussion ${index + 1}`);
    errors.push(...discResult.errors);
  });

  // Validate midterms
  course.Midterms.forEach((mid, index) => {
    const midResult = validateSection(mid, `Midterm ${index + 1}`);
    errors.push(...midResult.errors);
  });

  // Validate final
  const finalResult = validateSection(course.Final, "Final");
  errors.push(...finalResult.errors);

  return { valid: errors.length === 0, errors };
}