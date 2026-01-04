import type { Course } from "./Course.js";

export type Class = {
  Type: string;
  Name: string;
  Term: string;
  Teacher: string;
  Lecture: Course | null;
  Discussions: Course[];
  Midterms: Course[];
  Final: Course | null;
};
