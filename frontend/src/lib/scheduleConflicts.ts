import { CalendarEvent } from "@/types/calendar";

type ScheduledInterval = Pick<CalendarEvent, "dayOfWeek" | "startTime" | "endTime">;

export function eventsOverlap(first: ScheduledInterval, second: ScheduledInterval): boolean {
  if (first.dayOfWeek !== second.dayOfWeek) {
    return false;
  }

  const firstStart = timeToMinutes(first.startTime);
  const firstEnd = timeToMinutes(first.endTime);
  const secondStart = timeToMinutes(second.startTime);
  const secondEnd = timeToMinutes(second.endTime);

  if ([firstStart, firstEnd, secondStart, secondEnd].some((value) => value === null)) {
    return false;
  }

  return firstStart < secondEnd && secondStart < firstEnd;
}

export function findConflictingEvents(
  candidateEvents: ScheduledInterval[],
  scheduledEvents: CalendarEvent[]
): CalendarEvent[] {
  return scheduledEvents.filter((scheduledEvent) =>
    candidateEvents.some((candidateEvent) => eventsOverlap(candidateEvent, scheduledEvent))
  );
}

export function hasScheduleConflict(
  candidateEvents: ScheduledInterval[],
  scheduledEvents: ScheduledInterval[]
): boolean {
  return candidateEvents.some((candidateEvent) =>
    scheduledEvents.some((scheduledEvent) => eventsOverlap(candidateEvent, scheduledEvent))
  );
}

function timeToMinutes(value: string): number | null {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}
