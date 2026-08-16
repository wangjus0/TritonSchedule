import { describe, expect, it } from "vitest";
import type { Course, DiscussionSection } from "@/data/sampleCourses";
import { resolveTssBookingUrl } from "@/lib/tssBooking";

const discussion: DiscussionSection = {
  id: "discussion-1",
  name: "001-001-DI",
  time: "Wed 8:00am-8:50am",
  location: "CENTR 220",
  sectionRef: "FA26:E 00001998",
  eventPackageIds: ["156420", "157065"],
};

const course: Course = {
  id: "FA26:E 00001997",
  name: "PHYS 002A: Physics-Mechanics",
  instructor: "Olga Dudko",
  schedule: "TR 11:00am-12:20pm",
  description: "Term: FA26",
  color: "#00629b",
  lectureSectionRef: "FA26:E 00001997",
  lectureEventPackageIds: ["156420", "156421"],
  discussionSections: [discussion],
  tssPackageUrls: {
    "156420": "https://tss.ucsd.edu/fiori#package-156420",
    "156421": "https://tss.ucsd.edu/fiori#package-156421",
  },
};

describe("resolveTssBookingUrl", () => {
  it("returns the event package shared by every selected section", () => {
    expect(resolveTssBookingUrl(course, discussion)).toBe(
      "https://tss.ucsd.edu/fiori#package-156420",
    );
  });

  it("does not open a different package when the combination is invalid", () => {
    expect(resolveTssBookingUrl(course, {
      ...discussion,
      eventPackageIds: ["157065"],
    })).toBeUndefined();
  });

  it("requires a selection for every section type offered by the course", () => {
    expect(resolveTssBookingUrl(course)).toBeUndefined();
  });

  it("uses a module route when Class Planner has no event-package route", () => {
    expect(resolveTssBookingUrl({
      ...course,
      discussionSections: [],
      lectureEventPackageIds: undefined,
      tssFallbackUrl: "https://tss.ucsd.edu/fiori#module-14433",
    })).toBe("https://tss.ucsd.edu/fiori#module-14433");
  });

  it("rejects links outside the official TSS origin", () => {
    expect(resolveTssBookingUrl({
      ...course,
      tssPackageUrls: {
        "156420": "https://example.com/not-tss",
      },
    }, discussion)).toBeUndefined();
  });
});
