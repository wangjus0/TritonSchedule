import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { CalendarEvent } from "../types/calendar";

const loadUserSchedule = vi.fn();
const saveUserSchedule = vi.fn();
const loadGuestSchedule = vi.fn();
const saveGuestSchedule = vi.fn();

vi.mock("../lib/scheduleStorage", () => ({
  GUEST_SCHEDULE_STORAGE_KEY: "calendarEvents_guest",
  loadUserSchedule: (...args: unknown[]) => loadUserSchedule(...args),
  saveUserSchedule: (...args: unknown[]) => saveUserSchedule(...args),
  loadGuestSchedule: (...args: unknown[]) => loadGuestSchedule(...args),
  saveGuestSchedule: (...args: unknown[]) => saveGuestSchedule(...args),
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
    isConfigured: true,
    isLoading: false,
  }),
}));

const { CalendarProvider, useCalendar } = await import("../context/CalendarContext");

function wrapper({ children }: { children: ReactNode }) {
  return <CalendarProvider>{children}</CalendarProvider>;
}

const remoteEvent: CalendarEvent = {
  id: "r1",
  title: "CSE 101",
  dayOfWeek: "Mon",
  startTime: "10:00",
  endTime: "10:50",
  color: "#00629b",
};

describe("CalendarContext for an authenticated user", () => {
  beforeEach(() => {
    loadUserSchedule.mockReset();
    saveUserSchedule.mockReset();
    loadGuestSchedule.mockReset();
    saveGuestSchedule.mockReset();
    loadGuestSchedule.mockReturnValue([]);
    saveUserSchedule.mockResolvedValue(undefined);
  });

  it("hydrates events from the remote schedule and persists changes", async () => {
    loadUserSchedule.mockResolvedValue([remoteEvent]);

    const { result } = renderHook(() => useCalendar(), { wrapper });

    await waitFor(() => expect(result.current.events).toEqual([remoteEvent]));
    expect(result.current.isGuest).toBe(false);

    const newEvent: CalendarEvent = { ...remoteEvent, id: "r2" };
    act(() => result.current.addEvent(newEvent));

    await waitFor(() =>
      expect(saveUserSchedule).toHaveBeenCalledWith("user-1", [remoteEvent, newEvent])
    );
  });

  it("migrates a guest schedule when the remote row is empty", async () => {
    loadUserSchedule.mockResolvedValue(null);
    loadGuestSchedule.mockReturnValue([remoteEvent]);

    const { result } = renderHook(() => useCalendar(), { wrapper });

    await waitFor(() => expect(result.current.events).toEqual([remoteEvent]));
    await waitFor(() =>
      expect(saveUserSchedule).toHaveBeenCalledWith("user-1", [remoteEvent])
    );
  });

  it("falls back to the guest schedule when the remote load fails", async () => {
    loadUserSchedule.mockRejectedValue(new Error("network"));
    loadGuestSchedule.mockReturnValue([remoteEvent]);

    const { result } = renderHook(() => useCalendar(), { wrapper });

    await waitFor(() => expect(result.current.events).toEqual([remoteEvent]));
  });
});
