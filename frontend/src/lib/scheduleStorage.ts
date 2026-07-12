import { CalendarEvent } from "@/types/calendar";
import { supabase } from "@/lib/supabase";

export const GUEST_SCHEDULE_STORAGE_KEY = "calendarEvents_guest";

export function parseStoredEvents(raw: unknown): CalendarEvent[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter((event) => {
    return (
      typeof event?.id === "string" &&
      typeof event?.title === "string" &&
      typeof event?.dayOfWeek === "string" &&
      typeof event?.startTime === "string" &&
      typeof event?.endTime === "string" &&
      typeof event?.color === "string"
    );
  }) as CalendarEvent[];
}

export function loadGuestSchedule(): CalendarEvent[] {
  if (typeof window === "undefined") {
    return [];
  }

  const stored = window.localStorage.getItem(GUEST_SCHEDULE_STORAGE_KEY);
  if (!stored) {
    return [];
  }

  try {
    return parseStoredEvents(JSON.parse(stored));
  } catch {
    return [];
  }
}

export function saveGuestSchedule(events: CalendarEvent[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(GUEST_SCHEDULE_STORAGE_KEY, JSON.stringify(events));
}

export async function loadUserSchedule(userId: string): Promise<CalendarEvent[] | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("user_schedules")
    .select("events")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return parseStoredEvents(data.events);
}

export async function saveUserSchedule(userId: string, events: CalendarEvent[]): Promise<void> {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.from("user_schedules").upsert(
    {
      user_id: userId,
      events,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    throw error;
  }
}
