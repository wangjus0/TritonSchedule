import { describe, expect, it, jest } from "@jest/globals";
import {
  encodeScheduleRef,
  scrapeClassPlanner,
  type ClassPlannerFetch,
} from "../../src/ingestion/scrapeClassPlanner.js";
import { classPlannerCourse } from "./classPlannerFixtures.js";

function jsonResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => body,
  };
}

describe("encodeScheduleRef", () => {
  it("sorts section IDs before base64url encoding", () => {
    expect(encodeScheduleRef("fa26", ["E 00001998", "E 00001997"]))
      .toBe("CS2eyJzIjpbIkUgMDAwMDE5OTciLCJFIDAwMDAxOTk4Il0sInQiOiJGQTI2In0");
  });
});

describe("scrapeClassPlanner", () => {
  it("discovers the term, paginates courses, and resolves routes in batches", async () => {
    const courses = Array.from({ length: 49 }, (_, index) =>
      classPlannerCourse(index + 1),
    );
    const fetcher = jest.fn<ClassPlannerFetch>(async (input) => {
      const url = new URL(input);

      if (url.pathname.endsWith("/planner/terms")) {
        return jsonResponse({
          terms: [
            {
              term_code: "FA26",
              term_name: "Fall 2026",
              calendar_year: 2026,
              course_count: courses.length,
              section_count: courses.length,
              meeting_count: courses.length,
              last_full_refresh_at: null,
              configured: true,
            },
          ],
        });
      }

      if (url.pathname.endsWith("/catalog/courses")) {
        const offset = Number(url.searchParams.get("offset"));
        return jsonResponse({
          term_code: "FA26",
          total: courses.length,
          offset,
          limit: 48,
          courses: courses.slice(offset, offset + 48),
        });
      }

      const encoded = url.pathname.split("/schedules/")[1]!;
      const schedule = JSON.parse(
        Buffer.from(encoded.slice(3), "base64url").toString("utf8"),
      ) as { s: string[] };
      const courseDetails = Object.fromEntries(
        schedule.s.map((sectionId, index) => [
          `course-${index}`,
          {
            sections: [{ section_id: sectionId }],
            module_id: sectionId.replace(/\D/g, ""),
            event_package_id: null,
            tss_booking_url: `https://tss.ucsd.edu/module/${sectionId}`,
          },
        ]),
      );

      return jsonResponse({ valid: false, course_details: courseDetails });
    });

    const result = await scrapeClassPlanner(undefined, { fetch: fetcher });

    expect(result.term).toBe("FA26");
    expect(result.courses).toHaveLength(49);
    expect(result.routes).toHaveLength(49);
    expect(fetcher).toHaveBeenCalledTimes(8);
  });
});
