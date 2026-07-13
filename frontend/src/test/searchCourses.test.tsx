import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SearchCourses, {
	convertTo24Hour,
	extractTimeRange,
	extractWeekdays,
	formatScheduleDisplay,
	mapBackendCourseToCourse,
	normalizeApiBase,
	parseCourseSchedule,
	shouldTryFallback,
} from "@/pages/SearchCourses";
import { CalendarProvider } from "@/context/CalendarContext";

function renderSearch() {
	return render(
		<CalendarProvider>
			<SearchCourses />
		</CalendarProvider>,
	);
}

function jsonResponse(body: unknown, status = 200) {
	return Promise.resolve(
		new Response(JSON.stringify(body), {
			status,
			headers: { "content-type": "application/json" },
		}),
	);
}

describe("course search journey", () => {
	beforeEach(() => {
		sessionStorage.clear();
		const values = new Map<string, string>();
		Object.defineProperty(window, "localStorage", {
			configurable: true,
			value: {
				getItem: (key: string) => values.get(key) ?? null,
				setItem: (key: string, value: string) => values.set(key, value),
				removeItem: (key: string) => values.delete(key),
				clear: () => values.clear(),
			},
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("shows no results separately from a backend failure", async () => {
		vi.spyOn(globalThis, "fetch")
			.mockImplementationOnce(() => jsonResponse({ Term: "FA25" }))
			.mockImplementationOnce(() => jsonResponse({ data: [] }));

		renderSearch();
		fireEvent.change(
			screen.getByPlaceholderText("Search courses by name or number"),
			{
				target: { value: "NOT A COURSE" },
			},
		);

		expect(await screen.findByText("No courses found")).toBeInTheDocument();
		expect(screen.queryByText("Search unavailable")).not.toBeInTheDocument();
	});

	it("offers a retry after backend failure and succeeds", async () => {
		const fetchMock = vi
			.spyOn(globalThis, "fetch")
			.mockImplementationOnce(() => jsonResponse({ Term: "FA25" }))
			.mockImplementationOnce(() =>
				jsonResponse({ code: "CATALOG_UNAVAILABLE" }, 503),
			)
			.mockImplementationOnce(() =>
				jsonResponse({
					data: [{ Name: "CSE 100", Term: "FA25", Teacher: "Ada Lovelace" }],
				}),
			);

		renderSearch();
		fireEvent.change(
			screen.getByPlaceholderText("Search courses by name or number"),
			{
				target: { value: "CSE 100" },
			},
		);

		fireEvent.click(
			await screen.findByRole("button", { name: "Retry search" }),
		);
		expect(await screen.findByText("CSE 100")).toBeInTheDocument();
		await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
	});

	it("renders catalog details, selects sections, and adds a course", async () => {
		vi.spyOn(globalThis, "fetch")
			.mockImplementationOnce(() => jsonResponse({ data: { Term: "FA25" } }))
			.mockImplementationOnce(() =>
				jsonResponse([
					{
						Name: "CSE 100",
						Term: "FA25",
						Teacher: "Ada Lovelace",
						Lecture: { Days: "TuTh", Time: "9:00 AM-10:20 AM" },
						rmp: { avgRating: "4.8", avgDiff: 3.2, takeAgainPercent: 95 },
						Discussions: [
							{ Days: "M", Time: "1:00 PM-1:50 PM", Location: "CENTR 101" },
							{ Days: "W", Time: "2:00 PM-2:50 PM", Location: "CENTR 102" },
						],
						Labs: [
							{ Days: "F", Time: "10:00 AM-10:50 AM", Location: "EBU3B" },
							{ Days: "F", Time: "11:00 AM-11:50 AM", Location: "EBU3B" },
						],
						Midterms: [
							{ Days: "M", Time: "7:00 PM-8:00 PM", Location: "PCYNH" },
							{},
						],
						Final: { Days: "Sa", Time: "8:00 AM-11:00 AM", Location: "TBA" },
					},
					{ name: "CSE 101", term: "FA25", teacher: "Grace Hopper", rating: "4.1" },
				]),
			);

		renderSearch();
		fireEvent.change(screen.getByPlaceholderText("Search courses by name or number"), {
			target: { value: "CSE" },
		});

		expect(await screen.findByText("2 results")).toBeInTheDocument();
		fireEvent.click(screen.getAllByRole("button", { name: "Details" })[0]);
		expect(screen.getByText("4.8 / 5.0")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: /Discussion 2/ }));
		fireEvent.click(screen.getByRole("button", { name: /Lab 2/ }));
		fireEvent.click(screen.getAllByRole("button", { name: "Add" })[0]);
		expect(await screen.findByRole("button", { name: "Added" })).toBeDisabled();
		fireEvent.click(screen.getAllByRole("button", { name: "Details" })[0]);
	});

	it("clears an empty search and treats client errors as no results", async () => {
		vi.spyOn(globalThis, "fetch")
			.mockImplementationOnce(() => jsonResponse({ Term: "" }))
			.mockImplementationOnce(() => jsonResponse({}, 400));

		renderSearch();
		const input = screen.getByPlaceholderText("Search courses by name or number");
		fireEvent.change(input, { target: { value: "missing" } });
		fireEvent.click(await screen.findByRole("button", { name: "Clear search" }));
		expect(input).toHaveValue("");
		expect(screen.getByText("Search for a course to get started")).toBeInTheDocument();
	});
});

describe("course search data normalization", () => {
	it("normalizes API bases and fallback responses", () => {
		expect(normalizeApiBase(" /api/// ")).toBe("/api");
		expect(normalizeApiBase("https://example.com///")).toBe("https://example.com");
		expect(normalizeApiBase("https://example.com/api///")).toBe("https://example.com/api");
		expect(normalizeApiBase("not a url///")).toBe("not a url");
		expect(normalizeApiBase("   ")).toBe("");
		expect(shouldTryFallback(new Response("", { status: 404 }))).toBe(true);
		expect(shouldTryFallback(new Response("", { status: 500 }))).toBe(false);
		expect(
			shouldTryFallback(
				new Response("<html />", { headers: { "content-type": "text/html" } }),
			),
		).toBe(true);
	});

	it("parses common and edge-case schedule formats", () => {
		expect(convertTo24Hour("12:30 AM")).toBe("00:30");
		expect(convertTo24Hour("12:00 PM")).toBe("12:00");
		expect(convertTo24Hour("1:05 PM")).toBe("13:05");
		expect(convertTo24Hour("TBA")).toBe("09:00");
		expect(extractTimeRange("MWF 9:00-9:50 AM")).toEqual({ start: "09:00", end: "09:50" });
		expect(extractTimeRange("TuTh 9:00 AM-10:20 AM")).toEqual({ start: "09:00", end: "10:20" });
		expect(extractTimeRange("TBA")).toBeNull();
		expect(extractWeekdays("Monday Wednesday Friday")).toEqual(["Mon", "Wed", "Fri"]);
		expect(extractWeekdays("TuTh 9:00 AM")).toEqual(["Tue", "Thu"]);
		expect(extractWeekdays("ARRANGED")).toEqual([]);
		expect(parseCourseSchedule("TuTh 9:00 AM-10:20 AM")).toEqual({
			days: ["Tue", "Thu"],
			startTime: "09:00",
			endTime: "10:20",
		});
		expect(parseCourseSchedule("Schedule TBA")).toBeNull();
		expect(formatScheduleDisplay("Schedule TBA")).toBe("Days and time TBA");
		expect(formatScheduleDisplay("MWF")).toBe("MWF - Time TBA");
		expect(formatScheduleDisplay("MWF 9:00 AM-9:50 AM")).toContain("MWF");
	});

	it("maps sparse and lower-case backend records safely", () => {
		const sparse = mapBackendCourseToCourse({}, 3);
		expect(sparse).toMatchObject({
			id: "Untitled Course-Unknown-3",
			instructor: "Instructor TBA",
			schedule: "Schedule TBA",
			finalSection: null,
		});

		const mapped = mapBackendCourseToCourse(
			{
				name: "MATH 20A",
				term: "WI26",
				teacher: "Noether",
				rating: "4.2",
				lecture: [{ Days: "MWF", Time: "8:00 AM-8:50 AM" }],
				discussions: [{}, { Days: "Tu", Location: "APM" }],
				labs: [{}],
				midterms: [{ Time: "6:00 PM-7:00 PM" }],
				final: { Location: "RCLAS" },
				rmp: { avgRating: 0, avgDiff: 0, takeAgainPercent: 0 },
			},
			0,
		);
		expect(mapped).toMatchObject({
			name: "MATH 20A",
			rmpRating: 4.2,
			rmpTakeAgain: 0,
			rmpAvgDifficulty: undefined,
		});
		expect(mapped.discussionSections).toHaveLength(2);
		expect(mapped.midtermSections).toHaveLength(1);
		expect(mapped.finalSection?.location).toBe("RCLAS");
	});
});
