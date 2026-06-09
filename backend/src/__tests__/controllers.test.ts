import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockSearchCourses = jest.fn<() => Promise<any[]>>();
const mockSearchProfessor = jest.fn<() => Promise<any[]>>();
const mockDeleteAllCourses = jest.fn<() => Promise<void>>();
const mockDeleteAllProfessor = jest.fn<() => Promise<void>>();
const mockIngest = jest.fn<() => Promise<void>>();
const mockGetActiveTermFromDB = jest.fn<() => Promise<any>>();

jest.unstable_mockModule("../services/supabaseRepository.js", () => ({
  searchCourses: mockSearchCourses,
  searchProfessor: mockSearchProfessor,
  deleteAllCourses: mockDeleteAllCourses,
  deleteAllProfessor: mockDeleteAllProfessor,
}));

jest.unstable_mockModule("../ingestion/ingest.js", () => ({
  ingest: mockIngest,
}));

jest.unstable_mockModule("../ingestion/getActiveTermFromDB.js", () => ({
  getActiveTermFromDB: mockGetActiveTermFromDB,
}));

const { searchForClass } = await import("../controllers/searchForClass.js");
const { searchOneRMP } = await import("../controllers/searchOneRMP.js");
const { updateInformation } = await import("../controllers/updateInformation.js");
const { getActiveTerm } = await import("../controllers/getActiveTerm.js");

function mockResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    send: jest.fn(),
  } as any;
}

describe("searchForClass controller", () => {
  beforeEach(() => {
    mockSearchCourses.mockReset();
    mockSearchCourses.mockResolvedValue([]);
  });

  it("should trim query params and return course data", async () => {
    const courses = [{ Name: "CSE 101", Term: "FA25" }];
    mockSearchCourses.mockResolvedValue(courses);
    const res = mockResponse();

    await searchForClass({ query: { course: "  CSE 101  ", term: " FA25 " } }, res);

    expect(mockSearchCourses).toHaveBeenCalledWith("CSE 101", "FA25");
    expect(res.json).toHaveBeenCalledWith({ data: courses });
  });
});

describe("searchOneRMP controller", () => {
  beforeEach(() => {
    mockSearchProfessor.mockReset();
    mockSearchProfessor.mockResolvedValue([]);
  });

  it("should return all professor records when teacher is omitted", async () => {
    const records = [{ name: "jane doe", nameKey: "jane doe" }];
    mockSearchProfessor.mockResolvedValue(records);
    const res = mockResponse();

    await searchOneRMP({ query: {} }, res);

    expect(mockSearchProfessor).toHaveBeenCalledWith();
    expect(res.send).toHaveBeenCalledWith({ Data: records });
  });

  it("should normalize teacher names before lookup", async () => {
    const records = [{ name: "jane doe", nameKey: "jane doe" }];
    mockSearchProfessor.mockResolvedValue(records);
    const res = mockResponse();

    await searchOneRMP({ query: { teacher: "  Jane   Doe! " } }, res);

    expect(mockSearchProfessor).toHaveBeenCalledWith("jane doe");
    expect(res.send).toHaveBeenCalledWith({ Data: records });
  });

  it("should return 404 when a teacher is not found", async () => {
    const res = mockResponse();

    await searchOneRMP({ query: { teacher: "Unknown" } }, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith("Item not found");
  });
});

describe("getActiveTerm controller", () => {
  beforeEach(() => {
    mockGetActiveTermFromDB.mockReset();
  });

  it("should return active term", async () => {
    mockGetActiveTermFromDB.mockResolvedValue({ Term: "FA25", IsActive: true });
    const res = mockResponse();

    await getActiveTerm({} as any, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ Term: "FA25" });
  });

  it("should return 404 when no active term exists", async () => {
    mockGetActiveTermFromDB.mockResolvedValue(null);
    const res = mockResponse();

    await getActiveTerm({} as any, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({ message: "No active term found" });
  });
});

describe("updateInformation controller", () => {
  beforeEach(() => {
    mockDeleteAllCourses.mockReset();
    mockDeleteAllProfessor.mockReset();
    mockIngest.mockReset();
    mockDeleteAllCourses.mockResolvedValue(undefined);
    mockDeleteAllProfessor.mockResolvedValue(undefined);
    mockIngest.mockResolvedValue(undefined);
  });

  it("should clear courses and professor records before ingesting", async () => {
    const res = mockResponse();

    await updateInformation({} as any, res);

    expect(mockDeleteAllCourses).toHaveBeenCalled();
    expect(mockDeleteAllProfessor).toHaveBeenCalled();
    expect(mockIngest).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ message: "Courses updated" });
  });

  it("should return 500 when refresh fails", async () => {
    mockIngest.mockRejectedValue(new Error("refresh failed"));
    const res = mockResponse();

    await updateInformation({} as any, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      error: "Failed to update courses",
      message: "refresh failed",
    });
  });
});
