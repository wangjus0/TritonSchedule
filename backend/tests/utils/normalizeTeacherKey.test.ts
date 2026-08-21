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
    ["John A Smith", "John Smith"],
    ["Berk Ustun", "Berk Usstun"],
    ["Chung Cheng", "Chung-Kuan Cheng"],
    ["Elizabeth Simon", "Beth Simon"],
    ["Garrison Cottrell", "Gary Cottrell"],
    ["Joe Politz", "Joseph Politz"],
    ["Mia Minnes", "Mia Minnes-Kemp"],
    ["Ndapandula Nakashole", "Ndapa Nakashole"],
    ["Shlomo Dubnov", "Schlomo Dubnov"],
    ["Steven Swanson", "Steve Swanson"],
    ["Virginia De Sa", "Virginia Desa"],
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
    ["Aaron Shalev", "Aaron Schulman"],
    ["Hannah Carter", "Andrea Carter"],
    ["Tzu Mao Li", "Liam Mueller"],
  ])("rejects different instructors %p and %p", (left, right) => {
    expect(teacherNamesMatch(left, right)).toBe(false);
  });
});
