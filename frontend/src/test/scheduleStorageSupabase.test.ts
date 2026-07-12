import { describe, it, expect, vi, beforeEach } from "vitest";
import { CalendarEvent } from "../types/calendar";

const maybeSingle = vi.fn();
const upsert = vi.fn();

const eq = vi.fn(() => ({ maybeSingle }));
const select = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ select, upsert }));

vi.mock("../lib/supabase", () => ({
  supabase: { from },
  isSupabaseConfigured: true,
}));

const { loadUserSchedule, saveUserSchedule, parseStoredEvents } = await import(
  "../lib/scheduleStorage"
);

const validEvent: CalendarEvent = {
  id: "1",
  title: "CSE 101",
  dayOfWeek: "Mon",
  startTime: "10:00",
  endTime: "10:50",
  color: "#00629b",
};

describe("scheduleStorage with Supabase configured", () => {
  beforeEach(() => {
    maybeSingle.mockReset();
    upsert.mockReset();
  });

  it("loadUserSchedule throws on query error", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: new Error("boom") });
    await expect(loadUserSchedule("user-1")).rejects.toThrow("boom");
  });

  it("loadUserSchedule returns null when no row exists", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(loadUserSchedule("user-1")).resolves.toBeNull();
  });

  it("loadUserSchedule parses stored events", async () => {
    maybeSingle.mockResolvedValue({ data: { events: [validEvent] }, error: null });
    await expect(loadUserSchedule("user-1")).resolves.toEqual([validEvent]);
    expect(from).toHaveBeenCalledWith("user_schedules");
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("saveUserSchedule upserts the events", async () => {
    upsert.mockResolvedValue({ error: null });
    await expect(saveUserSchedule("user-1", [validEvent])).resolves.toBeUndefined();
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-1", events: [validEvent] }),
      { onConflict: "user_id" }
    );
  });

  it("saveUserSchedule throws on upsert error", async () => {
    upsert.mockResolvedValue({ error: new Error("nope") });
    await expect(saveUserSchedule("user-1", [validEvent])).rejects.toThrow("nope");
  });

  it("parseStoredEvents still guards non-array input", () => {
    expect(parseStoredEvents(undefined)).toEqual([]);
  });
});
