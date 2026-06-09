import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { Course } from "../models/Course.js";

const mockInsertCourses = jest.fn<() => Promise<void>>();

jest.unstable_mockModule("../services/supabaseRepository.js", () => ({
  insertCourses: mockInsertCourses,
}));

const { insertDB } = await import("../services/insertDB.js");

const course: Course = {
  Name: "CSE 101",
  Term: "FA25",
  Teacher: "Jane Doe",
  Lecture: null,
  Labs: [],
  Discussions: [],
  Midterms: [],
  Final: null,
  nameKey: "jane doe",
  rmp: null,
};

describe("insertDB", () => {
  beforeEach(() => {
    mockInsertCourses.mockReset();
    mockInsertCourses.mockResolvedValue(undefined);
  });

  it("should insert course documents", async () => {
    await insertDB([course], "courses");

    expect(mockInsertCourses).toHaveBeenCalledWith([course]);
  });

  it("should return undefined on success", async () => {
    const result = await insertDB([course], "courses");

    expect(result).toBeUndefined();
  });

  it("should reject unsupported collections", async () => {
    await expect(insertDB([course], "terms")).rejects.toThrow("Unsupported collection");
    expect(mockInsertCourses).not.toHaveBeenCalled();
  });
});
