import type { Section } from "./Section.js";

export type Course = {
  Name: string;
  Term: string;
  Teacher: string;
  Lecture: Section | null;
  Labs: Section[];
  Discussions: Section[];
  Midterms: Section[];
  Final: Section | null;
};
