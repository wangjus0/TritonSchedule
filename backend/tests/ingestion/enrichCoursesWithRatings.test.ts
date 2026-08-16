import { describe, expect, it } from "@jest/globals";
import { normalizePercentage } from "../../src/ingestion/enrichCoursesWithRatings.js";

describe("normalizePercentage", () => {
  it.each([
    [-1, 0],
    [Number.NaN, 0],
    [72.9, 72],
    [101, 100],
  ])("normalizes %p to %p", (input, expected) => {
    expect(normalizePercentage(input)).toBe(expected);
  });
});
