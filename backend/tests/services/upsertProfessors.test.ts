import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { RMP } from "../../src/models/RMP.js";

const mockUpsert = jest.fn<(
  rows: unknown[],
  options: { onConflict: string },
) => Promise<{ error: null }>>(async () => ({ error: null }));
const mockFrom = jest.fn(() => ({ upsert: mockUpsert }));

jest.unstable_mockModule("../../src/services/connectToDB.js", () => ({
  connectToDB: () => ({ from: mockFrom }),
}));

const { upsertProfessors } = await import("../../src/services/supabaseRepository.js");

describe("upsertProfessors", () => {
  beforeEach(() => {
    mockFrom.mockClear();
    mockUpsert.mockClear();
  });

  it("upserts verified matches in bounded batches without deleting other rows", async () => {
    const professors: RMP[] = Array.from({ length: 251 }, (_, index) => ({
      avgDiff: 2,
      avgRating: 4,
      name: `Professor ${index}`,
      nameKey: `professor ${index}`,
      profileUrl: `https://www.ratemyprofessors.com/professor/${index}`,
      takeAgainPercent: 80,
    }));

    await upsertProfessors(professors);

    expect(mockUpsert).toHaveBeenCalledTimes(2);
    expect(mockUpsert.mock.calls[0]?.[0]).toHaveLength(250);
    expect(mockUpsert.mock.calls[1]?.[0]).toHaveLength(1);
  });
});
