import { describe, expect, it } from "@jest/globals";
import {
  buildClassPlannerCatalog,
  buildLegacyCourses,
  classPlannerSourceKey,
} from "../../src/ingestion/buildClassPlannerCatalog.js";
import { classMeeting, classPlannerCourse } from "./classPlannerFixtures.js";

describe("buildClassPlannerCatalog", () => {
  it("normalizes packages, memberships, meetings, and TSS URLs", () => {
    const course = classPlannerCourse(10, {
      sections: [
        {
          ...classPlannerCourse(10).sections[0]!,
          event_package_ids: ["150888", "150889"],
          meetings: [classMeeting, { ...classMeeting, day_code: "R", day_name: "Thursday" }],
        },
        {
          ...classPlannerCourse(11).sections[0]!,
          event_package_ids: ["150888"],
          instruction_type_name: "discussion",
          section_code: "001-001-DI",
        },
      ],
    });
    const sourceKey = classPlannerSourceKey(course);
    const catalog = buildClassPlannerCatalog("FA26", [course], [
      {
        source_key: sourceKey,
        module_id: "4",
        representative_event_package_id: "150888",
        tss_url:
          "https://tss.ucsd.edu/fiori#ZUSModule-display?TileType=MYMOD&" +
          "/Detail/EventPackage/SM/4/00000000/0/0/0/" +
          "00000000-0000-0000-0000-000000000000/150888/2026/2/?",
      },
    ]);

    expect(catalog.offerings).toHaveLength(1);
    expect(catalog.sections).toHaveLength(2);
    expect(catalog.meetings).toHaveLength(3);
    expect(catalog.event_packages).toHaveLength(2);
    expect(catalog.package_sections).toHaveLength(3);
    expect(catalog.event_packages).toContainEqual(
      expect.objectContaining({
        event_package_id: "150889",
        tss_booking_url: expect.stringContaining("/150889/2026/2/?"),
      }),
    );
    expect(catalog.module_routes[0]).toMatchObject({
      route_kind: "event_package",
      academic_year: "2026",
      academic_period: "2",
    });
  });

  it("keeps a module fallback and does not invent package deep links", () => {
    const course = classPlannerCourse(290);
    const sourceKey = classPlannerSourceKey(course);
    const catalog = buildClassPlannerCatalog("FA26", [course], [
      {
        source_key: sourceKey,
        module_id: "9876",
        representative_event_package_id: null,
        tss_url:
          "https://tss.ucsd.edu/fiori#YSchedule-view&/" +
          "YUCSD_CON_MODULE(AcademicYear='2026',AcademicPeriod='2',ModuleID='9876')" +
          "?layout=MidColumnFullScreen",
      },
    ]);

    expect(catalog.module_routes[0]?.route_kind).toBe("module");
    expect(catalog.event_packages[0]?.tss_booking_url).toBeNull();
  });
});

describe("buildLegacyCourses", () => {
  it("preserves the existing course search shape", () => {
    const result = buildLegacyCourses("FA26", [classPlannerCourse(100)]);

    expect(result[0]).toMatchObject({
      Name: "CSE 100: Course 100",
      Teacher: "Ada Lovelace",
      Lecture: {
        Days: "Tue",
        Time: "5:00pm-6:20pm",
        Location: "CENTR 101",
        SectionId: "E 00000100",
        SectionRef: "FA26:E 00000100",
        SectionCode: "001-000-LE",
        EventPackageIds: ["1500000100"],
      },
      nameKey: "ada lovelace",
    });
  });
});
