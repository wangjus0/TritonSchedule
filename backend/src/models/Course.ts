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
  /** Official TSS booking URLs keyed by event package ID for this primary section. */
  TssPackageUrls?: Record<string, string>;
  /** Official module-level TSS route used when no event-package deep link exists. */
  TssFallbackUrl?: string;
};
