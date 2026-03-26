import { describe, it, expect } from "vitest";
import { cn } from "../lib/utils";

describe("cn utility", () => {
  it("should merge class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("should handle conditional classes", () => {
    const result = true ? "active" : "";
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