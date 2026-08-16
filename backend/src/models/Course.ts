import type { Section } from "./Section.js";
import type { RMP } from "../models/RMP.js";

export type Course = {
  Name: string;
  Term: string;
  Teacher: string;
  Lecture: Section | null;
  Lectures?: Section[];
  SectionCode?: string;
  Labs: Section[];
  Discussions: Section[];
  Midterms: Section[];
  Final: Section | null;
  nameKey: string;
  rmp: RMP | null;
};
