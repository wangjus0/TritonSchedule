import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { insertDB } from "../services/insertDB.js";

describe("insertDB", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should insert multiple documents into collection", async () => {
    // @ts-ignore - mocking insertMany return type
    const mockInsertMany = jest.fn().mockResolvedValue({ insertedCount: 3 });
    const mockCollection = jest.fn().mockReturnValue({
      insertMany: mockInsertMany,
    });
    const mockDb = {
      collection: mockCollection,
    };

    const courses = [
      { Name: "CSE 101", Term: "Fall 2024" },
      { Name: "CSE 102", Term: "Fall 2024" },
      { Name: "CSE 103", Term: "Fall 2024" },
    ];

    await insertDB(mockDb as any, courses, "courses");

    expect(mockCollection).toHaveBeenCalledWith("courses");
    expect(mockInsertMany).toHaveBeenCalledWith(courses);
  });

  it("should return undefined on success", async () => {
    // @ts-ignore - mocking insertMany return type
    const mockInsertMany = jest.fn().mockResolvedValue({ insertedCount: 1 });
    const mockCollection = jest.fn().mockReturnValue({
      insertMany: mockInsertMany,
    });
    const mockDb = {
      collection: mockCollection,
    };

    const result = await insertDB(mockDb as any, [{ Name: "CSE 101" }], "courses");

    expect(result).toBeUndefined();
  });

  it("should handle empty array", async () => {
    // @ts-ignore - mocking insertMany return type
    const mockInsertMany = jest.fn().mockResolvedValue({ insertedCount: 0 });
    const mockCollection = jest.fn().mockReturnValue({
      insertMany: mockInsertMany,
    });
    const mockDb = {
      collection: mockCollection,
    };

    await insertDB(mockDb as any, [], "courses");

    expect(mockInsertMany).toHaveBeenCalledWith([]);
  });

  it("should work with different collection names", async () => {
    // @ts-ignore - mocking insertMany return type
    const mockInsertMany = jest.fn().mockResolvedValue({ insertedCount: 1 });
    const mockCollection = jest.fn().mockReturnValue({
      insertMany: mockInsertMany,
    });
    const mockDb = {
      collection: mockCollection,
    };

    await insertDB(mockDb as any, [{ Term: "Fall 2024" }], "terms");

    expect(mockCollection).toHaveBeenCalledWith("terms");
  });

  it("should pass through any content object structure", async () => {
    // @ts-ignore - mocking insertMany return type
    const mockInsertMany = jest.fn().mockResolvedValue({ insertedCount: 2 });
    const mockCollection = jest.fn().mockReturnValue({
      insertMany: mockInsertMany,
    });
    const mockDb = {
      collection: mockCollection,
    };

    const complexData = [
      { _id: "1", nested: { data: "value" }, array: [1, 2, 3] },
      { _id: "2", nested: { data: "value2" }, array: [4, 5, 6] },
    ];

    await insertDB(mockDb as any, complexData, "test");

    expect(mockInsertMany).toHaveBeenCalledWith(complexData);
  });
});