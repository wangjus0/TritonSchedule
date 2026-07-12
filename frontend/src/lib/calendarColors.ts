// Decorative sticker palette (per DESIGN.md) — categorical color for course
// blocks / code badges. Tuned darker so white text clears WCAG AA contrast.
const COURSE_COLOR_PALETTE = [
  "#00629b", // triton blue
  "#7a48c9", // purple
  "#c4317f", // pink
  "#b8500a", // orange
  "#1f7d7a", // teal
  "#2a8f3f", // green
  "#2f74b5", // sky
  "#5a3aa8", // deep purple
] as const;

export function generateCalendarColor(courseId?: string): string {
  if (!courseId) {
    return COURSE_COLOR_PALETTE[0];
  }

  let hash = 0;
  for (let i = 0; i < courseId.length; i += 1) {
    hash = (hash + courseId.charCodeAt(i)) % COURSE_COLOR_PALETTE.length;
  }

  return COURSE_COLOR_PALETTE[hash];
}
