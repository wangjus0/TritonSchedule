import { describe, it, expect, beforeEach } from "vitest";
import { generateCalendarColor } from "../lib/calendarColors";
import {
  extractCourseCode,
  getCourseAccentColor,
  SEARCH_SUGGESTIONS,
} from "../lib/courseDisplay";
import { formatScheduleDisplay, formatSectionDetail } from "../lib/courseFormat";
import { formatTermLabel } from "../lib/formatTerm";
import {
  GUEST_SCHEDULE_STORAGE_KEY,
  parseStoredEvents,
  loadGuestSchedule,
  saveGuestSchedule,
  loadUserSchedule,
  saveUserSchedule,
} from "../lib/scheduleStorage";
import { CalendarEvent } from "../types/calendar";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

const PALETTE = [
  "#00629b",
  "#7a48c9",
  "#c4317f",
  "#b8500a",
  "#1f7d7a",
  "#2a8f3f",
  "#2f74b5",
  "#5a3aa8",
];

describe("generateCalendarColor", () => {
  it("returns the first palette color when no courseId is given", () => {
    expect(generateCalendarColor()).toBe(PALETTE[0]);
  });

  it("returns a palette color deterministically for a courseId", () => {
    const first = generateCalendarColor("CSE101");
    expect(PALETTE).toContain(first);
    expect(generateCalendarColor("CSE101")).toBe(first);
  });
});

describe("extractCourseCode", () => {
  it("returns null when no course code is present", () => {
    expect(extractCourseCode("Introduction to things")).toBeNull();
  });
});

describe("getCourseAccentColor", () => {
  it("delegates to the calendar color generator", () => {
    expect(getCourseAccentColor("MATH20A")).toBe(generateCalendarColor("MATH20A"));
  });
});

describe("SEARCH_SUGGESTIONS", () => {
  it("exposes department suggestions", () => {
    expect(SEARCH_SUGGESTIONS).toContain("CSE");
  });
});

describe("formatScheduleDisplay", () => {
  it("returns TBA when schedule is empty", () => {
    expect(formatScheduleDisplay("   ")).toBe("Days and time TBA");
  });

  it("returns TBA for 'Schedule TBA'", () => {
    expect(formatScheduleDisplay("Schedule TBA")).toBe("Days and time TBA");
  });

  it("marks time TBA when only days are provided", () => {
    expect(formatScheduleDisplay("MWF")).toBe("MWF - Time TBA");
  });

  it("splits days and time", () => {
    expect(formatScheduleDisplay("MWF 10:00am-10:50am")).toBe("MWF - 10:00am-10:50am");
  });

  it("marks time TBA when time portion is blank", () => {
    expect(formatScheduleDisplay("MWF ")).toBe("MWF - Time TBA");
  });
});

describe("formatSectionDetail", () => {
  it("joins time and location", () => {
    expect(formatSectionDetail({ time: "10am", location: "CENTR 115" })).toBe(
      "10am • CENTR 115"
    );
  });
});

describe("formatTermLabel", () => {
  it("returns an empty string for blank input", () => {
    expect(formatTermLabel("   ")).toBe("");
  });

  it("returns unknown season codes unchanged", () => {
    expect(formatTermLabel("XX26")).toBe("XX26");
  });
});

describe("scheduleStorage", () => {
  const validEvent: CalendarEvent = {
    id: "1",
    title: "CSE 101",
    dayOfWeek: "Mon",
    startTime: "10:00",
    endTime: "10:50",
    color: "#00629b",
  };

  beforeEach(() => {
    window.localStorage.clear();
  });

  it("parseStoredEvents returns [] for non-array input", () => {
    expect(parseStoredEvents(null)).toEqual([]);
    expect(parseStoredEvents("nope")).toEqual([]);
  });

  it("parseStoredEvents filters out malformed events", () => {
    expect(parseStoredEvents([validEvent, { id: 5 }, {}])).toEqual([validEvent]);
  });

  it("loadGuestSchedule returns [] when nothing stored", () => {
    expect(loadGuestSchedule()).toEqual([]);
  });

  it("loadGuestSchedule returns [] on invalid JSON", () => {
    window.localStorage.setItem(GUEST_SCHEDULE_STORAGE_KEY, "{not json");
    expect(loadGuestSchedule()).toEqual([]);
  });

  it("saveGuestSchedule round-trips through loadGuestSchedule", () => {
    saveGuestSchedule([validEvent]);
    expect(loadGuestSchedule()).toEqual([validEvent]);
  });

  it("loadUserSchedule returns null when Supabase is not configured", async () => {
    await expect(loadUserSchedule("user-1")).resolves.toBeNull();
  });

  it("saveUserSchedule is a no-op when Supabase is not configured", async () => {
    await expect(saveUserSchedule("user-1", [validEvent])).resolves.toBeUndefined();
  });
});
