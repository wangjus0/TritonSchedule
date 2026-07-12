import { generateCalendarColor } from "@/lib/calendarColors";

export function extractCourseCode(name: string): string | null {
  const match = name.match(/\b([A-Z]{2,8})\s*(\d+[A-Z]?)\b/);
  if (!match) {
    return null;
  }

  return `${match[1]} ${match[2]}`;
}

export function getCourseAccentColor(courseId: string): string {
  return generateCalendarColor(courseId);
}

export const SEARCH_SUGGESTIONS = ["CSE", "MATH", "BILD", "ECON", "POLI"];
