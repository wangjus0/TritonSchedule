import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { insertDB } from "../services/insertDB.js";
import type { Course } from "../models/Course.js";

// Helper to create valid Course objects for testing
const createTestCourse = (name: string, term: string): Course => ({
  Name: name,
  Term: term,
  Teacher: "",
  Lecture: { Days: "MonWed", Time: "10:00 AM-11:00 AM" },
  Labs: [],
  Discussions: [],
  Midterms: [],
  Final: null,
  nameKey: "",
  rmp: null,
});

describe("insertDB", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should insert multiple documents into collection", async () => {
    // @ts-expect-error - mocking insertMany return type
    const mockInsertMany = jest.fn().mockResolvedValue({ insertedCount: 3 });
    const mockCollection = jest.fn().mockReturnValue({
      insertMany: mockInsertMany,
    });
    const mockDb = {
      collection: mockCollection,
    };

    const courses = [
      createTestCourse("CSE 101", "Fall 2024"),
      createTestCourse("CSE 102", "Fall 2024"),
      createTestCourse("CSE 103", "Fall 2024"),
    ];

    await insertDB(mockDb as any, courses, "courses");

    expect(mockCollection).toHaveBeenCalledWith("courses");
    expect(mockInsertMany).toHaveBeenCalledWith(courses);
  });

  it("should return undefined on success", async () => {
    // @ts-expect-error - mocking insertMany return type
    const mockInsertMany = jest.fn().mockResolvedValue({ insertedCount: 1 });
    const mockCollection = jest.fn().mockReturnValue({
      insertMany: mockInsertMany,
    });
    const mockDb = {
      collection: mockCollection,
    };

    const result = await insertDB(mockDb as any, [createTestCourse("CSE 101", "Fall 2024")], "courses");

    expect(result).toBeUndefined();
  });

  it("should skip insertion for empty array", async () => {
    // @ts-expect-error - mocking insertMany return type
    const mockInsertMany = jest.fn().mockResolvedValue({ insertedCount: 0 });
    const mockCollection = jest.fn().mockReturnValue({
      insertMany: mockInsertMany,
    });
    const mockDb = {
      collection: mockCollection,
    };

    await insertDB(mockDb as any, [], "courses");

    // Empty array - no insertion should occur (skipped by insertDB logic)
    expect(mockInsertMany).not.toHaveBeenCalled();
  });

  it("should work with different collection names", async () => {
    // @ts-expect-error - mocking insertMany return type
    const mockInsertMany = jest.fn().mockResolvedValue({ insertedCount: 1 });
    const mockCollection = jest.fn().mockReturnValue({
      insertMany: mockInsertMany,
    });
    const mockDb = {
      collection: mockCollection,
    };

    await insertDB(mockDb as any, [createTestCourse("", "Fall 2024")], "terms");

    expect(mockCollection).toHaveBeenCalledWith("terms");
  });

  it("should pass through any valid course structure", async () => {
    // @ts-expect-error - mocking insertMany return type
    const mockInsertMany = jest.fn().mockResolvedValue({ insertedCount: 1 });
    const mockCollection = jest.fn().mockReturnValue({
      insertMany: mockInsertMany,
    });
    const mockDb = {
      collection: mockCollection,
    };

    const complexData = [createTestCourse("CSE 301", "Fall 2024")];
    await insertDB(mockDb as any, complexData, "test");

    expect(mockInsertMany).toHaveBeenCalled();
  });
});