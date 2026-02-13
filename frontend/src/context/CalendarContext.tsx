import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { CalendarEvent } from "@/types/calendar";

interface CalendarContextType {
  events: CalendarEvent[];
  addEvent: (event: CalendarEvent) => void;
  updateEvent: (id: string, event: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  deleteEventsByCourseId: (courseId: string) => void;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);
const CALENDAR_EVENTS_STORAGE_KEY = "calendarEvents";

function loadStoredEvents(): CalendarEvent[] {
  if (typeof window === "undefined") {
    return [];
  }

  const storedEvents = window.localStorage.getItem(CALENDAR_EVENTS_STORAGE_KEY);
  if (!storedEvents) {
    return [];
  }

  try {
    const parsed = JSON.parse(storedEvents) as CalendarEvent[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((event) => {
      return (
        typeof event?.id === "string" &&
        typeof event?.title === "string" &&
        typeof event?.dayOfWeek === "string" &&
        typeof event?.startTime === "string" &&
        typeof event?.endTime === "string" &&
        typeof event?.color === "string"
      );
    });
  } catch {
    return [];
  }
}

export function CalendarProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<CalendarEvent[]>(() => loadStoredEvents());

  useEffect(() => {
    window.localStorage.setItem(CALENDAR_EVENTS_STORAGE_KEY, JSON.stringify(events));
  }, [events]);

  const addEvent = (event: CalendarEvent) => {
    setEvents((prev) => [...prev, event]);
  };

  const updateEvent = (id: string, updatedFields: Partial<CalendarEvent>) => {
    setEvents((prev) =>
      prev.map((event) =>
        event.id === id ? { ...event, ...updatedFields } : event
      )
    );
  };

  const deleteEvent = (id: string) => {
    setEvents((prev) => prev.filter((event) => event.id !== id));
  };

  const deleteEventsByCourseId = (courseId: string) => {
    setEvents((prev) => prev.filter((event) => event.courseId !== courseId));
  };

  return (
    <CalendarContext.Provider
      value={{ events, addEvent, updateEvent, deleteEvent, deleteEventsByCourseId }}
    >
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar() {
  const context = useContext(CalendarContext);
  if (context === undefined) {
    throw new Error("useCalendar must be used within a CalendarProvider");
  }
  return context;
}
