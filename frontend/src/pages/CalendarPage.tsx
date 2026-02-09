import { useMemo, useState } from "react";
import { format } from "date-fns";
import { useCalendar } from "@/context/CalendarContext";
import { Button } from "@/components/ui/button";
import { CalendarEvent, Weekday } from "@/types/calendar";
import { cn } from "@/lib/utils";

const HOUR_HEIGHT = 72; // pixels per hour
const START_HOUR = 7; // 7 AM
const END_HOUR = 22; // 10 PM
const TOTAL_HOURS = END_HOUR - START_HOUR;

function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours + minutes / 60;
}

function formatTo12Hour(timeStr: string): string {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const normalizedHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${normalizedHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

function getEventStyle(event: CalendarEvent, overlappingEvents: CalendarEvent[], index: number) {
  const startTime = parseTime(event.startTime);
  const endTime = parseTime(event.endTime);
  const duration = endTime - startTime;
  
  const top = (startTime - START_HOUR) * HOUR_HEIGHT;
  const height = duration * HOUR_HEIGHT;
  
  const totalOverlapping = overlappingEvents.length;
  const offset = 36;
  const totalOffset = Math.max(0, (totalOverlapping - 1) * offset);
  const width = totalOverlapping > 1 ? `calc(100% - ${totalOffset}px)` : "100%";
  const left = totalOverlapping > 1 ? `${index * offset}px` : "0";

  return { top, height, width, left };
}

function findOverlappingEvents(event: CalendarEvent, allEvents: CalendarEvent[]): CalendarEvent[] {
  const eventStart = parseTime(event.startTime);
  const eventEnd = parseTime(event.endTime);
  
  return allEvents.filter((other) => {
    if (other.dayOfWeek !== event.dayOfWeek) return false;
    const otherStart = parseTime(other.startTime);
    const otherEnd = parseTime(other.endTime);
    return eventStart < otherEnd && eventEnd > otherStart;
  });
}

export default function CalendarPage() {
  const { events, deleteEventsByCourseId, deleteEvent } = useCalendar();
  const [focusedEventId, setFocusedEventId] = useState<string | null>(null);
  const [hoveredDeleteCourseId, setHoveredDeleteCourseId] = useState<string | null>(null);
  const [hoveredDeleteEventId, setHoveredDeleteEventId] = useState<string | null>(null);

  const weekDays: { key: Weekday; label: string }[] = [
    { key: "Mon", label: "Monday" },
    { key: "Tue", label: "Tuesday" },
    { key: "Wed", label: "Wednesday" },
    { key: "Thu", label: "Thursday" },
    { key: "Fri", label: "Friday" },
  ];

  const timeSlots = useMemo(() => {
    return Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i);
  }, []);

  const getEventsForDay = (day: Weekday) => {
    return events.filter((event) => event.dayOfWeek === day);
  };

  const isDeletePreviewActiveForEvent = (event: CalendarEvent) => {
    if (hoveredDeleteCourseId) {
      return event.courseId === hoveredDeleteCourseId;
    }

    if (hoveredDeleteEventId) {
      return event.id === hoveredDeleteEventId;
    }

    return false;
  };

  return (
    <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center p-6">
      <div className="w-full max-w-[92rem]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Weekly Schedule</h1>
            <p className="text-muted-foreground">Monday through Friday</p>
          </div>
        </div>

        <div className="glass-panel overflow-hidden rounded-2xl flex flex-col">
        {/* Day headers */}
        <div className="grid grid-cols-[60px_repeat(5,1fr)] border-b border-border/80 bg-muted/50">
          <div className="px-2 py-3 text-center text-sm font-medium text-muted-foreground border-r border-border/80">
            Time
          </div>
          {weekDays.map((day) => (
            <div
              key={day.key}
              className={cn("border-r border-border/80 px-2 py-3 text-center last:border-r-0")}
            >
              <div className="text-sm font-medium text-foreground/90">
                {day.label}
              </div>
            </div>
          ))}
        </div>

        {/* Time grid */}
        <div className="overflow-y-auto">
          <div className="grid grid-cols-[60px_repeat(5,1fr)]">
            {/* Time labels column */}
            <div className="border-r border-border/80">
              {timeSlots.map((hour, idx) => (
                <div
                  key={hour}
                  className="h-[72px] relative border-b border-border/80"
                >
                  {idx > 0 && (
                    <span className="absolute -top-2.5 right-2 bg-card px-1 text-xs text-muted-foreground">
                      {format(new Date().setHours(hour, 0), "h a")}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map((day) => {
              const dayEvents = getEventsForDay(day.key);
              
              return (
                <div
                  key={day.key}
                  className={cn(
                    "relative border-r border-border/80 last:border-r-0"
                  )}
                >
                  {/* Hour slots for clicking */}
                  {timeSlots.map((hour) => (
                    <div
                      key={hour}
                      className="h-[72px] border-b border-border/80"
                    />
                  ))}

                  {/* Events overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    {dayEvents.map((event) => {
                      const overlapping = findOverlappingEvents(event, dayEvents);
                      const index = overlapping.findIndex((e) => e.id === event.id);
                      const style = getEventStyle(event, overlapping, index);

                      return (
                        <div
                          key={event.id}
                          className="absolute px-0.5 py-0.5 pointer-events-auto"
                          style={{
                            top: `${style.top}px`,
                            height: `${style.height}px`,
                            width: style.width,
                            left: style.left,
                            zIndex: event.id === focusedEventId ? 50 : index + 1,
                          }}
                        >
                          <div
                            className={cn(
                              "group relative h-full w-full cursor-pointer rounded-md px-2 py-1 overflow-hidden text-white text-xs shadow-sm ring-1 ring-white/40 transition-transform",
                              isDeletePreviewActiveForEvent(event) &&
                                "ring-red-200/80 shadow-[0_0_0_1px_rgba(239,68,68,0.55),0_12px_24px_rgba(127,29,29,0.35)]"
                            )}
                            style={{
                              backgroundColor: isDeletePreviewActiveForEvent(event)
                                ? "hsl(0 68% 52%)"
                                : event.color,
                            }}
                            onClick={() => setFocusedEventId(event.id)}
                          >
                            <Button
                              type="button"
                              size="icon"
                              variant="secondary"
                              className="absolute right-1 top-1 z-10 h-5 w-5 rounded-full border border-white/20 bg-black/35 text-white hover:bg-black/55 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onMouseEnter={() => {
                                if (event.isCourse && event.courseId) {
                                  setHoveredDeleteCourseId(event.courseId);
                                  setHoveredDeleteEventId(null);
                                  return;
                                }

                                setHoveredDeleteEventId(event.id);
                                setHoveredDeleteCourseId(null);
                              }}
                              onMouseLeave={() => {
                                setHoveredDeleteCourseId(null);
                                setHoveredDeleteEventId(null);
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setHoveredDeleteCourseId(null);
                                setHoveredDeleteEventId(null);
                                deleteEvent(event.id);
                                if (event.isCourse && event.courseId) {
                                  deleteEventsByCourseId(event.courseId);
                                }
                              }}
                              aria-label="Remove event"
                            >
                              ×
                            </Button>
                            {event.eventType && (
                              <div className="text-[10px] font-semibold uppercase tracking-wide opacity-90">
                                {event.eventType}
                              </div>
                            )}
                            <div className="font-medium truncate">{event.title}</div>
                            <div className="opacity-90 truncate">
                              {formatTo12Hour(event.startTime)} - {formatTo12Hour(event.endTime)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
