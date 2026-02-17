export function normalizeTeacherKey(name: string) {

  const normalized = name
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "")
    .trim()
    .toLowerCase();

  return normalized;

}
