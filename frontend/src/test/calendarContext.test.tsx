import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { AuthProvider } from "../context/AuthContext";
import { CalendarProvider, useCalendar } from "../context/CalendarContext";
import { GUEST_SCHEDULE_STORAGE_KEY } from "../lib/scheduleStorage";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: () => {
      store = {};
    },
    reset: () => {
      store = {};
      localStorageMock.getItem.mockReset();
      localStorageMock.setItem.mockReset();
      localStorageMock.removeItem.mockReset();
      localStorageMock.getItem.mockImplementation((key: string) => store[key] || null);
      localStorageMock.setItem.mockImplementation((key: string, value: string) => {
        store[key] = value;
      });
      localStorageMock.removeItem.mockImplementation((key: string) => {
        delete store[key];
      });
    },
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

function wrapper({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CalendarProvider>{children}</CalendarProvider>
    </AuthProvider>
  );
}

describe("CalendarContext", () => {
  beforeEach(() => {
    localStorageMock.reset();
  });

  it("should provide initial events from localStorage", async () => {
    const mockEvents = [
      {
        id: "1",
        title: "Test Event",
        dayOfWeek: "Mon",
        startTime: "09:00",
        endTime: "10:00",
        color: "#ff0000",
        courseId: "COURSE001",
      },
    ];
    localStorageMock.getItem.mockImplementation((key: string) =>
      key === GUEST_SCHEDULE_STORAGE_KEY ? JSON.stringify(mockEvents) : null
    );

    const { result } = renderHook(() => useCalendar(), { wrapper });

    await vi.waitFor(() => {
      expect(result.current.events).toHaveLength(1);
    });
    expect(result.current.events[0].title).toBe("Test Event");
    expect(result.current.isGuest).toBe(true);
  });

  it("should add an event", async () => {
    const { result } = renderHook(() => useCalendar(), { wrapper });

    await vi.waitFor(() => {
      expect(result.current.events).toEqual([]);
    });

    const newEvent = {
      id: "2",
      title: "New Event",
      dayOfWeek: "Tue" as const,
      startTime: "10:00",
      endTime: "11:00",
      color: "#00ff00",
      courseId: "COURSE002",
    };

    act(() => {
      result.current.addEvent(newEvent);
    });

    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0].title).toBe("New Event");
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it("should update an event", async () => {
    const { result } = renderHook(() => useCalendar(), { wrapper });

    await vi.waitFor(() => {
      expect(result.current.events).toEqual([]);
    });

    const event = {
      id: "3",
      title: "Original Title",
      dayOfWeek: "Wed" as const,
      startTime: "11:00",
      endTime: "12:00",
      color: "#0000ff",
      courseId: "COURSE003",
    };

    act(() => {
      result.current.addEvent(event);
    });

    act(() => {
      result.current.updateEvent("3", { title: "Updated Title" });
    });

    expect(result.current.events[0].title).toBe("Updated Title");
  });

  it("should delete an event by id", async () => {
    const { result } = renderHook(() => useCalendar(), { wrapper });

    await vi.waitFor(() => {
      expect(result.current.events).toEqual([]);
    });

    const event = {
      id: "4",
      title: "To Delete",
      dayOfWeek: "Thu" as const,
      startTime: "13:00",
      endTime: "14:00",
      color: "#ffff00",
      courseId: "COURSE004",
    };

    act(() => {
      result.current.addEvent(event);
    });

    expect(result.current.events).toHaveLength(1);

    act(() => {
      result.current.deleteEvent("4");
    });

    expect(result.current.events).toHaveLength(0);
  });

  it("should delete events by courseId", async () => {
    const { result } = renderHook(() => useCalendar(), { wrapper });

    await vi.waitFor(() => {
      expect(result.current.events).toEqual([]);
    });

    act(() => {
      result.current.addEvent({
        id: "5",
        title: "Event 1",
        dayOfWeek: "Fri",
        startTime: "14:00",
        endTime: "15:00",
        color: "#ff00ff",
        courseId: "COURSE005",
      });
      result.current.addEvent({
        id: "6",
        title: "Event 2",
        dayOfWeek: "Fri",
        startTime: "15:00",
        endTime: "16:00",
        color: "#00ffff",
        courseId: "COURSE005",
      });
    });

    expect(result.current.events).toHaveLength(2);

    act(() => {
      result.current.deleteEventsByCourseId("COURSE005");
    });

    expect(result.current.events).toHaveLength(0);
  });

  it("should throw error when useCalendar is used outside provider", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      renderHook(() => useCalendar());
    }).toThrow("useCalendar must be used within a CalendarProvider");

    consoleError.mockRestore();
  });
});
