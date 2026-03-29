import { describe, it, expect } from '@jest/globals';
import type { Course } from "../models/Course.js";
import type { Section } from "../models/Section.js";
import type { RMP } from "../models/RMP.js";

describe("Course model", () => {
  it("should define Course type correctly", () => {
    const course: Course = {
      Name: "CSE 101: Algorithms",
      Term: "Fall 2024",
      Teacher: "John Doe",
      Lecture: {
        Days: "MWF",
        Time: "10:00-10:50",
        Location: "GSN 1200",
      },
      Labs: [
        {
          Days: "F",
          Time: "14:00-15:50",
          Location: "EBU3B 2204",
        },
      ],
      Discussions: [
        {
          Days: "T",
          Time: "11:00-11:50",
          Location: "WLH 2208",
        },
      ],
      Midterms: [
        {
          Days: "10/15",
          Time: "19:00-20:30",
          Location: "TSI 101",
        },
      ],
      Final: {
        Days: "12/12",
        Time: "11:30-14:30",
        Location: "PCOR 102",
      },
      nameKey: "john-doe",
      rmp: {
        avgRating: 4.5,
        avgDiff: 3.2,
        takeAgainPercent: 85,
        name: "John Doe",
        nameKey: "john-doe",
      },
    };

    expect(course.Name).toBe("CSE 101: Algorithms");
    expect(course.Term).toBe("Fall 2024");
    expect(course.Teacher).toBe("John Doe");
    expect(course.Lecture).not.toBeNull();
    expect(course.Labs.length).toBe(1);
    expect(course.Discussions.length).toBe(1);
    expect(course.Midterms.length).toBe(1);
    expect(course.Final).not.toBeNull();
    expect(course.nameKey).toBe("john-doe");
    expect(course.rmp).not.toBeNull();
  });

  it("should allow null Lecture and Final", () => {
    const course: Course = {
      Name: "CSE 101",
      Term: "Fall 2024",
      Teacher: "",
      Lecture: null,
      Labs: [],
      Discussions: [],
      Midterms: [],
      Final: null,
      nameKey: "",
      rmp: null,
    };

    expect(course.Lecture).toBeNull();
    expect(course.Final).toBeNull();
  });

  it("should allow empty arrays for Labs, Discussions, Midterms", () => {
    const course: Course = {
      Name: "CSE 101",
      Term: "Fall 2024",
      Teacher: "Teacher",
      Lecture: null,
      Labs: [],
      Discussions: [],
      Midterms: [],
      Final: null,
      nameKey: "teacher",
      rmp: null,
    };

    expect(course.Labs.length).toBe(0);
    expect(course.Discussions.length).toBe(0);
    expect(course.Midterms.length).toBe(0);
  });
});

describe("Section model", () => {
  it("should define Section type correctly", () => {
    const section: Section = {
      Days: "MWF",
      Time: "10:00-10:50",
      Location: "GSN 1200",
    };

    expect(section.Days).toBe("MWF");
    expect(section.Time).toBe("10:00-10:50");
    expect(section.Location).toBe("GSN 1200");
  });

  it("should allow various Day/Time/Location formats", () => {
    const section1: Section = {
      Days: "TTh",
      Time: "14:00-15:15",
      Location: "EBU3B 2250",
    };

    const section2: Section = {
      Days: "F",
      Time: "TBA",
      Location: "TBA",
    };

    expect(section1.Days).toBe("TTh");
    expect(section2.Time).toBe("TBA");
  });
});

describe("RMP model", () => {
  it("should define RMP type correctly", () => {
    const rmp: RMP = {
      avgRating: 4.2,
      avgDiff: 3.5,
      takeAgainPercent: 75,
      name: "Jane Smith",
      nameKey: "jane-smith",
    };

    expect(rmp.avgRating).toBe(4.2);
    expect(rmp.avgDiff).toBe(3.5);
    expect(rmp.takeAgainPercent).toBe(75);
    expect(rmp.name).toBe("Jane Smith");
    expect(rmp.nameKey).toBe("jane-smith");
  });

  it("should accept edge case values", () => {
    const rmp: RMP = {
      avgRating: 0,
      avgDiff: 0,
      takeAgainPercent: 0,
      name: "New Professor",
      nameKey: "new-professor",
    };

    expect(rmp.avgRating).toBe(0);
    expect(rmp.takeAgainPercent).toBe(0);
  });
});