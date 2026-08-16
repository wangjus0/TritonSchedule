import { describe, expect, it } from "vitest";
import { eventsOverlap, findConflictingEvents, hasScheduleConflict } from "@/lib/scheduleConflicts";
import { CalendarEvent } from "@/types/calendar";

const scheduledEvent: CalendarEvent = {
  id: "cse-101-mon",
  title: "CSE 101",
  dayOfWeek: "Mon",
  startTime: "10:00",
  endTime: "10:50",
  color: "#2563eb",
};

describe("schedule conflict detection", () => {
  it("detects overlapping events on the same day", () => {
    expect(
      eventsOverlap(scheduledEvent, {
        dayOfWeek: "Mon",
        startTime: "10:30",
        endTime: "11:20",
      })
    ).toBe(true);
  });

  it("allows adjacent events and identical times on different days", () => {
    expect(
      eventsOverlap(scheduledEvent, {
        dayOfWeek: "Mon",
        startTime: "10:50",
        endTime: "11:40",
      })
    ).toBe(false);

    expect(
      eventsOverlap(scheduledEvent, {
        dayOfWeek: "Tue",
        startTime: "10:00",
        endTime: "10:50",
      })
    ).toBe(false);
  });

  it("returns the scheduled events that conflict with a candidate", () => {
    expect(
      findConflictingEvents(
        [{ dayOfWeek: "Mon", startTime: "09:50", endTime: "10:10" }],
        [scheduledEvent]
      )
    ).toEqual([scheduledEvent]);
  });

  it("detects conflicts across a collection of candidate events", () => {
    expect(
      hasScheduleConflict(
        [
          { dayOfWeek: "Wed", startTime: "09:00", endTime: "09:50" },
          { dayOfWeek: "Mon", startTime: "10:15", endTime: "10:45" },
        ],
        [scheduledEvent]
      )
    ).toBe(true);
  });
});
