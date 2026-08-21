import { describe, expect, it, jest } from "@jest/globals";
import {
  enrichCoursesWithRatings,
  normalizePercentage,
  ProfessorEnrichmentUnavailableError,
  type RmpFetch,
} from "../../src/ingestion/enrichCoursesWithRatings.js";
import type { Course } from "../../src/models/Course.js";
import { normalizeTeacherKey } from "../../src/utils/normalizeTeacherKey.js";

function course(teacher: string, rmp: Course["rmp"] = null): Course {
  return {
    Discussions: [],
    Final: null,
    Labs: [],
    Lecture: null,
    Midterms: [],
    Name: `Course with ${teacher}`,
    Teacher: teacher,
    Term: "FA26",
    nameKey: normalizeTeacherKey(teacher),
    rmp,
  };
}

function response(data: unknown, status = 200) {
  return {
    json: async () => data,
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
  };
}

function schoolResponse() {
  return response({
    data: {
      newSearch: {
        schools: {
          edges: [{ node: { id: "school-1079", name: "University of California San Diego" } }],
        },
      },
    },
  });
}

function professorResponse(...names: string[]) {
  const professorNames = names.length > 0 ? names : ["Ada Lovelace"];
  return response({
    data: {
      search: {
        teachers: {
          edges: professorNames.map((name, index) => {
            const [firstName, ...lastNameParts] = name.split(" ");
            return {
              node: {
              avgDifficulty: 2.4,
              avgRating: 4.8,
              firstName,
              lastName: lastNameParts.join(" "),
              legacyId: 12345 + index,
              wouldTakeAgainPercent: 91.7,
            },
            };
          }),
        },
      },
    },
  });
}

describe("normalizePercentage", () => {
  it.each([
    [-1, 0],
    [Number.NaN, 0],
    [72.9, 72],
    [101, 100],
    [null, 0],
  ])("normalizes %p to %p", (input, expected) => {
    expect(normalizePercentage(input)).toBe(expected);
  });
});

describe("enrichCoursesWithRatings", () => {
  it("uses JSON variables and maps a professor rating", async () => {
    const bodies: string[] = [];
    const fetcher = jest.fn<RmpFetch>(async (_url, init) => {
      bodies.push(String(init?.body));
      return bodies.length === 1 ? schoolResponse() : professorResponse();
    });

    const result = await enrichCoursesWithRatings(
      [course("Ada Lovelace")],
      { fetch: fetcher },
    );

    expect(JSON.parse(bodies[1]!)).toMatchObject({
      variables: {
        query: { schoolID: "school-1079", text: "ada lovelace" },
        schoolID: "school-1079",
      },
    });
    expect(result.counts).toEqual({
      failed: 0,
      matched: 1,
      requested: 1,
      successfulRequests: 1,
      unmatched: 0,
    });
    expect(result.professors[0]).toEqual({
      avgDiff: 2.4,
      avgRating: 4.8,
      name: "ada lovelace",
      nameKey: "ada lovelace",
      profileUrl: "https://www.ratemyprofessors.com/professor/12345",
      takeAgainPercent: 91,
    });
  });

  it("selects the exact professor when a fuzzy result is ranked first", async () => {
    const fetcher = jest.fn<RmpFetch>(async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { query: string };
      return body.query.includes("SchoolSearch")
        ? schoolResponse()
        : professorResponse("Yousaf Habib", "Yizhuang You");
    });

    const result = await enrichCoursesWithRatings(
      [course("Yizhuang You")],
      { fetch: fetcher },
    );

    expect(result.professors).toEqual([
      expect.objectContaining({
        name: "yizhuang you",
        nameKey: "yizhuang you",
        profileUrl: "https://www.ratemyprofessors.com/professor/12346",
      }),
    ]);
  });

  it("does not attach a fuzzy result for a different professor", async () => {
    const existing = {
      avgDiff: 3,
      avgRating: 4,
      name: "yizhuang you",
      nameKey: "yizhuang you",
      takeAgainPercent: 80,
    };
    const fetcher = jest.fn<RmpFetch>(async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { query: string };
      return body.query.includes("SchoolSearch")
        ? schoolResponse()
        : professorResponse("Yousaf Habib");
    });

    const result = await enrichCoursesWithRatings(
      [course("Yizhuang You", existing)],
      { fetch: fetcher },
    );

    expect(result.counts).toMatchObject({ matched: 0, unmatched: 1 });
    expect(result.professors).toEqual([]);
    expect(result.courses[0]?.rmp).toEqual(existing);
  });

  it("rejects a candidate with a conflicting middle initial", async () => {
    const fetcher = jest.fn<RmpFetch>(async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { query: string };
      return body.query.includes("SchoolSearch")
        ? schoolResponse()
        : professorResponse("John B Smith");
    });

    const result = await enrichCoursesWithRatings(
      [course("John A Smith")],
      { fetch: fetcher },
    );

    expect(result.counts).toMatchObject({ matched: 0, unmatched: 1 });
    expect(result.professors).toEqual([]);
  });

  it("keeps the historical key while matching a hyphenated instructor", async () => {
    const fetcher = jest.fn<RmpFetch>(async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { query: string };
      return body.query.includes("SchoolSearch")
        ? schoolResponse()
        : professorResponse("Hsiao-Bing Cheng");
    });

    const result = await enrichCoursesWithRatings(
      [course("Hsiao-Bing Cheng")],
      { fetch: fetcher },
    );

    expect(result.professors[0]).toEqual(expect.objectContaining({
      nameKey: "hsiaobing cheng",
    }));
  });

  it("retries rate limits up to three total attempts", async () => {
    let professorAttempts = 0;
    const fetcher = jest.fn<RmpFetch>(async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { query: string };
      if (body.query.includes("SchoolSearch")) return schoolResponse();
      professorAttempts += 1;
      return professorAttempts < 3 ? response({}, 429) : professorResponse();
    });

    const result = await enrichCoursesWithRatings(
      [course("Ada Lovelace")],
      { fetch: fetcher },
    );

    expect(professorAttempts).toBe(3);
    expect(result.professors).toHaveLength(1);
  });

  it("keeps successful ratings and existing course data after a partial failure", async () => {
    const existing = {
      avgDiff: 3,
      avgRating: 4,
      name: "grace hopper",
      nameKey: "grace hopper",
      takeAgainPercent: 80,
    };
    const fetcher = jest.fn<RmpFetch>(async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as {
        query: string;
        variables: { query?: { text?: string } };
      };
      if (body.query.includes("SchoolSearch")) return schoolResponse();
      return body.variables.query?.text === "ada lovelace"
        ? professorResponse()
        : response({}, 404);
    });

    const result = await enrichCoursesWithRatings(
      [course("Ada Lovelace"), course("Grace Hopper", existing)],
      { fetch: fetcher },
    );

    expect(result.counts).toMatchObject({ failed: 1, matched: 1 });
    expect(result.warnings).toHaveLength(1);
    expect(result.courses[1]?.rmp).toEqual(existing);
  });

  it("fails the professor phase when no professor request succeeds", async () => {
    const fetcher = jest.fn<RmpFetch>(async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { query: string };
      return body.query.includes("SchoolSearch")
        ? schoolResponse()
        : response({}, 503);
    });

    await expect(enrichCoursesWithRatings(
      [course("Ada Lovelace")],
      { fetch: fetcher },
    )).rejects.toBeInstanceOf(ProfessorEnrichmentUnavailableError);
  });

  it("serializes professor requests to avoid upstream rate limits", async () => {
    let active = 0;
    let maximumActive = 0;
    const fetcher = jest.fn<RmpFetch>(async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { query: string };
      if (body.query.includes("SchoolSearch")) return schoolResponse();
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return professorResponse();
    });
    const courses = Array.from(
      { length: 9 },
      (_, index) => course(`Teacher ${index}`),
    );

    await enrichCoursesWithRatings(courses, { fetch: fetcher });

    expect(maximumActive).toBe(1);
  });
});
