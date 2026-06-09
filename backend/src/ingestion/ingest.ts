import { detectCurrentTerm } from "./detectCurrentTerm.js";
import { startSearch } from "./startSearch.js";
import type { Course } from "../models/Course.js";
import type { RMP } from "../models/RMP.js";

export type IngestResult = {
  term: string;
  courses: Course[];
  professors: RMP[];
};

export async function ingest(): Promise<IngestResult> {
  const detectedTerm = await detectCurrentTerm(); // Determine new term
  const result = await startSearch(detectedTerm);

  return {
    term: detectedTerm,
    courses: result.courses,
    professors: result.professors,
  };
}
