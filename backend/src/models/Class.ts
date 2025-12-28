import type { Course } from "./Course.js";

export type Class = {
  name: string;
  term: string;
  teacher: string;
  lecture: Course | null;
  discussions: Course[];
  midterms: Course[];
  final: Course | null;
};
