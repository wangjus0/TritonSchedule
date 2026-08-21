import { describe, expect, it } from "@jest/globals";
import {
  normalizeTeacherKey,
  teacherNamesMatch,
} from "../../src/utils/normalizeTeacherKey.js";

describe("normalizeTeacherKey", () => {
  it("preserves letters while removing accents and punctuation", () => {
    expect(normalizeTeacherKey("  Nayeli Jiménez-Cano  ")).toBe("nayeli jimenez cano");
  });
});

describe("teacherNamesMatch", () => {
  it.each([
    ["Hsiao-Bing Cheng", "hsiaobing cheng"],
    ["Nayeli Jiménez Cano", "nayeli jimenez cano"],
    ["Massimiliano Di Ventra", "massimiliano diventra"],
    ["Mihir Bellare", "Bellare Mihir"],
    ["J. Silvio Gutkind", "Silvio Gutkind"],
    ["Mayumi Mochizuki McKee", "Mayumi McKee"],
  ])("accepts equivalent instructor names %p and %p", (left, right) => {
    expect(teacherNamesMatch(left, right)).toBe(true);
  });

  it.each([
    ["Yousaf Habib", "Yizhuang You"],
    ["Zongxin Yu", "Elaine Yu"],
    ["Michael Sailor", "Michael Overton"],
    ["J. Li", "K. Li"],
  ])("rejects different instructors %p and %p", (left, right) => {
    expect(teacherNamesMatch(left, right)).toBe(false);
  });
});
