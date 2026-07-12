import { describe, it, expect } from "vitest";
import { cn } from "../lib/utils";
import { formatTermLabel } from "../lib/formatTerm";
import { extractCourseCode } from "../lib/courseDisplay";

describe("cn utility", () => {
  it("should merge class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("should handle conditional classes", () => {
    const isActive = true;
    const result = isActive ? "active" : "";
    expect(cn(result, "static")).toBe("active static");
  });

  it("should handle falsy values", () => {
    expect(cn("foo", "baz")).toBe("foo baz");
  });

  it("should handle empty strings", () => {
    expect(cn("", "foo", "")).toBe("foo");
  });

  it("should handle undefined", () => {
    expect(cn("foo", undefined, "bar")).toBe("foo bar");
  });
});

describe("formatTermLabel", () => {
  it("formats compact UCSD term codes", () => {
    expect(formatTermLabel("SP26")).toBe("Spring 2026");
    expect(formatTermLabel("WI25")).toBe("Winter 2025");
  });

  it("returns unknown terms unchanged", () => {
    expect(formatTermLabel("Spring Quarter 2026")).toBe("Spring Quarter 2026");
  });
});

describe("extractCourseCode", () => {
  it("parses department and number from course titles", () => {
    expect(extractCourseCode("CSE 101 Introduction to Programming")).toBe("CSE 101");
    expect(extractCourseCode("MATH 20A")).toBe("MATH 20A");
  });
});