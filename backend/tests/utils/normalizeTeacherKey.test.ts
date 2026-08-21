import { describe, expect, it } from "@jest/globals";
import {
  normalizeTeacherKey,
  teacherNamesMatch,
} from "../../src/utils/normalizeTeacherKey.js";

describe("normalizeTeacherKey", () => {
  it("preserves the historical punctuation-deleting database key format", () => {
    expect(normalizeTeacherKey("  Hsiao-Bing Cheng  ")).toBe("hsiaobing cheng");
  });
});

describe("teacherNamesMatch", () => {
  it.each([
    ["Hsiao-Bing Cheng", "hsiaobing cheng"],
    ["Nayeli Jiménez Cano", "nayeli jimenez cano"],
    ["Massimiliano Di Ventra", "massimiliano diventra"],
    ["Mihir Bellare", "Bellare Mihir"],
    ["J. Silvio Gutkind", "Silvio Gutkind"],
    ["John A Smith", "John Alan Smith"],
  ])("accepts equivalent instructor names %p and %p", (left, right) => {
    expect(teacherNamesMatch(left, right)).toBe(true);
  });

  it.each([
    ["Yousaf Habib", "Yizhuang You"],
    ["Zongxin Yu", "Elaine Yu"],
    ["Michael Sailor", "Michael Overton"],
    ["J. Li", "K. Li"],
    ["J. Silvio Gutkind", "K. Silvio Gutkind"],
    ["John A Smith", "John B Smith"],
    ["John Alan Smith", "John Brian Smith"],
    ["Mayumi Mochizuki McKee", "Mayumi McKee"],
  ])("rejects different instructors %p and %p", (left, right) => {
    expect(teacherNamesMatch(left, right)).toBe(false);
  });
});
