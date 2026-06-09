import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockFrom = jest.fn<(...args: any[]) => any>();
const mockRpc = jest.fn<(...args: any[]) => Promise<any>>();

jest.unstable_mockModule("../services/connectToDB.js", () => ({
  connectToDB: () => ({
    from: mockFrom,
    rpc: mockRpc,
  }),
}));

const { replaceCatalog, searchProfessor } = await import("../services/supabaseRepository.js");

function createProfessorQuery(pages: any[][]) {
  let pageIndex = 0;
  const query: any = {
    eq: jest.fn(() => query),
    order: jest.fn(() => query),
    range: jest.fn(() => query),
    select: jest.fn(() => query),
    then: (resolve: any, reject: any) => {
      const result = { data: pages[pageIndex++] ?? [], error: null };
      return Promise.resolve(result).then(resolve, reject);
    },
  };

  return query;
}

function professorRow(index: number) {
  return {
    name: `professor ${index}`,
    name_key: `professor ${index}`,
    avg_rating: 4,
    avg_diff: 2,
    take_again_percent: 90,
  };
}

describe("supabaseRepository", () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockRpc.mockReset();
  });

  describe("replaceCatalog", () => {
    it("should call the transactional catalog replacement rpc", async () => {
      const courses = [{
        Name: "CSE 101",
        Term: "SP26",
        Teacher: "Jane Doe",
        Lecture: null,
        Labs: [],
        Discussions: [],
        Midterms: [],
        Final: null,
        nameKey: "jane doe",
        rmp: null,
      }];
      const professors = [{
        avgRating: 4,
        avgDiff: 2,
        takeAgainPercent: 90,
        name: "jane doe",
        nameKey: "jane doe",
      }];
      mockRpc.mockResolvedValue({ error: null });

      await replaceCatalog("SP26", courses, professors);

      expect(mockRpc).toHaveBeenCalledWith("replace_catalog", {
        p_courses: courses,
        p_professors: professors,
        p_term: "SP26",
      });
    });

    it("should reject an empty course set before mutating the database", async () => {
      await expect(replaceCatalog("SP26", [], [])).rejects.toThrow(
        "Refusing to replace catalog with no courses",
      );

      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  describe("searchProfessor", () => {
    it("should page through all professor records", async () => {
      const firstPage = Array.from({ length: 1000 }, (_, index) => professorRow(index));
      const secondPage = [professorRow(1000)];
      const query = createProfessorQuery([firstPage, secondPage]);
      mockFrom.mockReturnValue(query);

      const result = await searchProfessor();

      expect(result).toHaveLength(1001);
      expect(query.range).toHaveBeenNthCalledWith(1, 0, 999);
      expect(query.range).toHaveBeenNthCalledWith(2, 1000, 1999);
    });
  });
});
