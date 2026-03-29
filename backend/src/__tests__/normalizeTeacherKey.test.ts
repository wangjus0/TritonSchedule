import { normalizeTeacherKey } from "../utils/normalizeTeacherKey.js";

describe("normalizeTeacherKey", () => {
  it("should trim whitespace", () => {
    expect(normalizeTeacherKey("  John Smith  ")).toBe("john smith");
  });

  it("should lowercase the name", () => {
    expect(normalizeTeacherKey("JOHN SMITH")).toBe("john smith");
  });

  it("should remove special characters", () => {
    expect(normalizeTeacherKey("John Smith Jr.")).toBe("john smith jr");
  });

  it("should collapse multiple whitespace to single space", () => {
    expect(normalizeTeacherKey("John    Smith")).toBe("john smith");
  });

  it("should handle empty string", () => {
    expect(normalizeTeacherKey("")).toBe("");
  });

  it("should handle names with numbers", () => {
    expect(normalizeTeacherKey("John Smith 123")).toBe("john smith 123");
  });

  it("should handle unicode characters", () => {
    expect(normalizeTeacherKey("José García")).toBe("jos garca");
  });
});