import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SearchCourses from "@/pages/SearchCourses";
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
});
