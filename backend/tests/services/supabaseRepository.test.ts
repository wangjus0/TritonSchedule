import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockRange = jest.fn<() => Promise<{ data: unknown[]; error: null }>>();

jest.unstable_mockModule("../../src/services/connectToDB.js", () => ({
	connectToDB: () => ({
		from: () => {
			const query = {
				ilike: () => query,
				order: () => query,
				range: mockRange,
				select: () => query,
			};
			return query;
		},
	}),
}));

const { searchCourses } = await import(
	"../../src/services/supabaseRepository.js"
);

describe("supabaseRepository", () => {
	beforeEach(() => {
		mockRange.mockReset();
	});

	it("normalizes malformed nested course sections", async () => {
		mockRange.mockResolvedValue({
			data: [
				{
					id: "course-id",
					name: "CSE 100",
					term: "FA25",
					teacher: "Ada Lovelace",
					name_key: "cse 100",
					lecture: { Days: 123, Time: "10:00", Location: null },
					labs: [null, { Days: "M", Time: false, Location: "CENTR" }],
					discussions: "invalid",
					midterms: [{ Days: "T", Time: "18:00", Location: 42 }],
					final: ["invalid"],
					rmp: null,
				},
			],
			error: null,
		});

		await expect(searchCourses("", "")).resolves.toEqual([
			expect.objectContaining({
				Lecture: { Days: "", Time: "10:00", Location: "" },
				Labs: [{ Days: "M", Time: "", Location: "CENTR" }],
				Discussions: [],
				Midterms: [{ Days: "T", Time: "18:00", Location: "" }],
				Final: null,
			}),
		]);
	});
});
