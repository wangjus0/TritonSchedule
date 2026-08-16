import { describe, expect, it } from "vitest";
import {
  getProfessorProfileUrl,
  normalizeProfessorProfileUrl,
} from "@/lib/professorProfile";

describe("professor profile links", () => {
  it("keeps a direct Rate My Professors profile URL", () => {
    expect(
      normalizeProfessorProfileUrl("https://www.ratemyprofessors.com/professor/12345")
    ).toBe("https://www.ratemyprofessors.com/professor/12345");
  });

  it("removes tracking data from a direct profile URL", () => {
    expect(
      normalizeProfessorProfileUrl("https://ratemyprofessors.com/professor/12345/?utm_source=test#rating")
    ).toBe("https://ratemyprofessors.com/professor/12345/");
  });

  it.each([
    "http://www.ratemyprofessors.com/professor/12345",
    "https://www.ratemyprofessors.com/search/professors/1079?q=Alex",
    "https://example.com/professor/12345",
    "not a URL",
  ])("rejects an unsafe or non-profile URL: %s", (url) => {
    expect(normalizeProfessorProfileUrl(url)).toBeUndefined();
  });

  it("falls back to a UC San Diego professor search for existing records", () => {
    expect(getProfessorProfileUrl(undefined, "Miles Jones")).toBe(
      "https://www.ratemyprofessors.com/search/professors/1079?q=Miles%20Jones"
    );
  });
});
