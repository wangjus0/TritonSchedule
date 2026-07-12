import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/context/AuthContext";
import {
  loadGuestSchedule,
  loadUserSchedule,
  saveGuestSchedule,
  saveUserSchedule,
} from "@/lib/scheduleStorage";
import { CalendarEvent } from "@/types/calendar";

interface CalendarContextType {
  events: CalendarEvent[];
  isGuest: boolean;
  isSyncing: boolean;
  addEvent: (event: CalendarEvent) => void;
  updateEvent: (id: string, event: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  deleteEventsByCourseId: (courseId: string) => void;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export function CalendarProvider({ children }: { children: ReactNode }) {
  const { user, isConfigured, isLoading: isAuthLoading } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const hasMigratedGuestRef = useRef(false);

  const storageKey = user && isConfigured ? `user:${user.id}` : "guest";

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    let cancelled = false;

    const hydrate = async () => {
      setHydratedKey(null);

      if (user && isConfigured) {
        try {
          const remoteEvents = await loadUserSchedule(user.id);

          if (cancelled) {
            return;
          }

          if (remoteEvents === null) {
            const guestEvents = loadGuestSchedule();
            setEvents(guestEvents);

            if (guestEvents.length > 0 && !hasMigratedGuestRef.current) {
              hasMigratedGuestRef.current = true;
              await saveUserSchedule(user.id, guestEvents);
            }
          } else {
            setEvents(remoteEvents);
          }
        } catch {
          if (!cancelled) {
            setEvents(loadGuestSchedule());
          }
        }
      } else {
        setEvents(loadGuestSchedule());
        hasMigratedGuestRef.current = false;
      }

      if (!cancelled) {
        setHydratedKey(user && isConfigured ? `user:${user.id}` : "guest");
      }
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [user?.id, isConfigured, isAuthLoading]);

  useEffect(() => {
    if (hydratedKey !== storageKey) {
      return;
    }

    if (user && isConfigured) {
      setIsSyncing(true);
      void saveUserSchedule(user.id, events)
        .catch(() => undefined)
        .finally(() => setIsSyncing(false));
      return;
    }

    saveGuestSchedule(events);
  }, [events, user?.id, isConfigured, hydratedKey, storageKey]);

  const addEvent = (event: CalendarEvent) => {
    setEvents((prev) => [...prev, event]);
  };

  const updateEvent = (id: string, updatedFields: Partial<CalendarEvent>) => {
    setEvents((prev) =>
      prev.map((event) => (event.id === id ? { ...event, ...updatedFields } : event))
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
      value={{
        events,
        isGuest: !user,
        isSyncing,
        addEvent,
        updateEvent,
        deleteEvent,
        deleteEventsByCourseId,
      }}
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
