import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCalendar } from "@/context/CalendarContext";
import { ScheduleEventSheet } from "@/components/ScheduleEventSheet";
import { TridentIcon } from "@/components/icons/TridentIcon";
import { extractCourseCode } from "@/lib/courseDisplay";
import { CalendarEvent, Weekday } from "@/types/calendar";
import { cn } from "@/lib/utils";

const HOUR_HEIGHT = 72;
const START_HOUR = 7;
const END_HOUR = 22;
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

function getRelatedEvents(event: CalendarEvent, allEvents: CalendarEvent[]): CalendarEvent[] {
  if (event.isCourse && event.courseId) {
    return allEvents.filter((item) => item.courseId === event.courseId);
  }

  return [event];
}

interface CalendarEventBlockProps {
  event: CalendarEvent;
  overlappingEvents: CalendarEvent[];
  index: number;
  isSelected: boolean;
  onSelect: (event: CalendarEvent) => void;
}

function CalendarEventBlock({
  event,
  overlappingEvents,
  index,
  isSelected,
  onSelect,
}: CalendarEventBlockProps) {
  const style = getEventStyle(event, overlappingEvents, index);

  return (
    <div
      className="pointer-events-auto absolute px-0.5 py-0.5"
      style={{
        top: `${style.top}px`,
        height: `${style.height}px`,
        width: style.width,
        left: style.left,
        zIndex: isSelected ? 50 : index + 1,
      }}
    >
      <button
        type="button"
        className={cn(
          "calendar-event-block animate-stagger-in h-full w-full cursor-pointer overflow-hidden rounded-lg px-2.5 py-1.5 text-left text-xs text-white ring-1 transition-colors active:opacity-90",
          isSelected ? "ring-white/90" : "ring-white/35"
        )}
        style={{
          backgroundColor: event.color,
          animationDelay: `${index * 35}ms`,
        }}
        onClick={() => onSelect(event)}
      >
        {event.eventType && (
          <div className="text-[10px] font-semibold opacity-90">{event.eventType}</div>
        )}
        <div className="truncate font-medium">{event.title}</div>
        <div className="truncate opacity-90">
          {formatTo12Hour(event.startTime)} - {formatTo12Hour(event.endTime)}
        </div>
      </button>
    </div>
  );
}

export default function CalendarPage() {
  const { events, deleteEventsByCourseId, deleteEvent } = useCalendar();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedMobileDay, setSelectedMobileDay] = useState<Weekday>("Mon");

  const weekDays: { key: Weekday; label: string; shortLabel: string }[] = [
    { key: "Mon", label: "Monday", shortLabel: "Mon" },
    { key: "Tue", label: "Tuesday", shortLabel: "Tue" },
    { key: "Wed", label: "Wednesday", shortLabel: "Wed" },
    { key: "Thu", label: "Thursday", shortLabel: "Thu" },
    { key: "Fri", label: "Friday", shortLabel: "Fri" },
  ];

  const timeSlots = useMemo(() => {
    return Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i);
  }, []);

  const getEventsForDay = (day: Weekday) => {
    return events.filter((event) => event.dayOfWeek === day);
  };

  const relatedEvents = useMemo(() => {
    if (!selectedEvent) {
      return [];
    }

    return getRelatedEvents(selectedEvent, events);
  }, [selectedEvent, events]);

  const removeSelected = () => {
    if (!selectedEvent) {
      return;
    }

    if (selectedEvent.isCourse && selectedEvent.courseId) {
      deleteEventsByCourseId(selectedEvent.courseId);
    } else {
      deleteEvent(selectedEvent.id);
    }

    setSelectedEvent(null);
  };

  const mobileDayEvents = useMemo(() => {
    return getEventsForDay(selectedMobileDay).sort(
      (a, b) => parseTime(a.startTime) - parseTime(b.startTime)
    );
  }, [events, selectedMobileDay]);

  const uniqueCourseCount = useMemo(() => {
    return new Set(
      events.filter((event) => event.isCourse && event.courseId).map((event) => event.courseId)
    ).size;
  }, [events]);

  const totalEventCount = events.length;
  const activeDayCount = useMemo(() => {
    return new Set(events.map((event) => event.dayOfWeek)).size;
  }, [events]);
  const timeWindowLabel = useMemo(() => {
    if (events.length === 0) {
      return "No blocks";
    }

    let earliest = events[0].startTime;
    let latest = events[0].endTime;

    events.forEach((event) => {
      if (parseTime(event.startTime) < parseTime(earliest)) {
        earliest = event.startTime;
      }
      if (parseTime(event.endTime) > parseTime(latest)) {
        latest = event.endTime;
      }
    });

    return `${formatTo12Hour(earliest)} - ${formatTo12Hour(latest)}`;
  }, [events]);

  const courseLegend = useMemo(() => {
    const map = new Map<string, { label: string; color: string }>();
    events.forEach((event) => {
      const key = event.courseId || event.id;
      if (!map.has(key)) {
        const base = event.title.replace(/\s*\([^)]+\)$/, "");
        map.set(key, { label: extractCourseCode(base) || base, color: event.color });
      }
    });
    return Array.from(map.values());
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="calendar-planner-page">
        <section className="calendar-hero-band calendar-empty-hero">
          <div className="calendar-hero-copy">
            <div>
              <p className="app-section-label">Schedule planner</p>
              <h1>Build your week.</h1>
              <p>Start from live course blocks, then review conflicts in a focused week board.</p>
            </div>
            <div className="calendar-hero-actions">
              <Button asChild className="btn-secondary px-5 py-2.5 text-sm">
                <Link to="/search">Search courses</Link>
              </Button>
            </div>
          </div>

          <div className="calendar-empty-preview" aria-hidden>
            <div className="calendar-empty-preview-head">
              <span className="landing-logo">
                <TridentIcon className="h-8 w-8" />
              </span>
              <div>
                <span>Preview</span>
                <strong>Week board</strong>
              </div>
            </div>
            <div className="calendar-empty-preview-grid">
              {weekDays.map((day) => (
                <span key={day.key}>{day.shortLabel}</span>
              ))}
              <i className="is-wide" />
              <i />
              <i className="is-mid" />
              <i />
              <i className="is-wide" />
              <i />
              <i className="is-mid" />
              <i />
              <i className="is-wide" />
              <i />
            </div>
          </div>
        </section>

        <section className="calendar-empty-panel">
          <div>
            <p className="text-[22px] font-semibold text-[var(--design-ink)]">No classes yet</p>
            <p className="mt-2 text-[15px] text-[var(--design-muted)]">
              Add courses from search to generate lecture, discussion, lab, and exam blocks.
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <>
      <div className="calendar-planner-page">
        <section className="calendar-hero-band">
          <div className="calendar-hero-copy">
            <div>
              <p className="app-section-label">Schedule planner</p>
              <h1>Schedule</h1>
              <p>
                {uniqueCourseCount} course{uniqueCourseCount === 1 ? "" : "s"} across {totalEventCount} block{totalEventCount === 1 ? "" : "s"}, arranged for conflict review.
              </p>
            </div>
            <div className="calendar-hero-actions">
              <Button asChild className="btn-secondary px-4 py-2 text-sm">
                <Link to="/search">Add course</Link>
              </Button>
            </div>
          </div>

          <div className="calendar-metrics-strip" aria-label="Schedule summary">
            <div>
              <span>Courses</span>
              <strong>{uniqueCourseCount}</strong>
            </div>
            <div>
              <span>Blocks</span>
              <strong>{totalEventCount}</strong>
            </div>
            <div>
              <span>Days used</span>
              <strong>{activeDayCount}</strong>
            </div>
            <div>
              <span>Window</span>
              <strong>{timeWindowLabel}</strong>
            </div>
          </div>
        </section>

        <div className="calendar-planner-layout">
          <section className="calendar-board-panel">
            <div className="calendar-board-header">
              <div>
                <p className="app-section-label">Week board</p>
                <h2>Quarter plan</h2>
                <p className="calendar-board-subtitle">7 AM to 10 PM, Monday through Friday</p>
              </div>
              <span className="aqua-pill">Tap a block for details</span>
            </div>

            <div className="calendar-grid-card flex flex-col overflow-hidden">
              <div className="border-b border-[var(--design-hairline)] bg-[var(--design-surface)] p-3 sm:hidden">
                <div className="grid grid-cols-5 gap-1.5 rounded-xl bg-[var(--design-paper)] p-1.5">
                  {weekDays.map((day) => {
                    const isActive = selectedMobileDay === day.key;

                    return (
                      <button
                        key={day.key}
                        type="button"
                        onClick={() => setSelectedMobileDay(day.key)}
                        className={cn(
                          "spring-press rounded-xl px-2 py-2.5 text-center text-[13px] font-semibold transition-all",
                          isActive ? "day-pill-active" : "text-[var(--design-muted)]"
                        )}
                      >
                        {day.shortLabel}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 overflow-hidden rounded-lg border border-[var(--design-hairline)] bg-white">
                  {mobileDayEvents.length === 0 ? (
                    <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                      No classes on {weekDays.find((day) => day.key === selectedMobileDay)?.label}
                    </div>
                  ) : (
                    <div className="grid grid-cols-[48px_1fr]">
                      <div className="border-r border-border">
                        {timeSlots.map((hour, idx) => (
                          <div key={hour} className="relative h-[72px] border-b border-border">
                            {idx > 0 && (
                              <span className="absolute -top-1.5 right-1.5 rounded-sm bg-white px-1 text-[10px] leading-none text-muted-foreground">
                                {format(new Date().setHours(hour, 0), "h a")}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="relative">
                        {timeSlots.map((hour) => (
                          <div key={hour} className="h-[72px] border-b border-border" />
                        ))}

                        <div className="pointer-events-none absolute inset-0">
                          {mobileDayEvents.map((event) => {
                            const overlapping = findOverlappingEvents(event, mobileDayEvents);
                            const index = overlapping.findIndex((e) => e.id === event.id);

                            return (
                              <CalendarEventBlock
                                key={event.id}
                                event={event}
                                overlappingEvents={overlapping}
                                index={index}
                                isSelected={selectedEvent?.id === event.id}
                                onSelect={setSelectedEvent}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="hidden sm:block">
                <div className="overflow-x-auto">
                  <div className="calendar-grid-head grid min-w-[680px] grid-cols-[48px_repeat(5,minmax(120px,1fr))] border-b border-[var(--design-hairline)] sm:min-w-[760px] sm:grid-cols-[56px_repeat(5,minmax(130px,1fr))] lg:min-w-0 lg:grid-cols-[60px_repeat(5,1fr)]">
                    <div className="border-r border-[var(--design-hairline)] px-1 py-3 text-center text-xs font-semibold uppercase text-[var(--design-muted)] sm:px-2">
                      Time
                    </div>
                    {weekDays.map((day) => (
                      <div
                        key={day.key}
                        className="border-r border-[var(--design-hairline)] px-2 py-3 text-center text-xs font-semibold text-[var(--design-ink)] last:border-r-0 sm:text-sm"
                      >
                        {day.label}
                      </div>
                    ))}
                  </div>

                  <div className="max-h-[calc(100vh-12.5rem)] overflow-y-auto sm:max-h-[calc(100vh-13rem)]">
                    <div className="grid min-w-[680px] grid-cols-[48px_repeat(5,minmax(120px,1fr))] sm:min-w-[760px] sm:grid-cols-[56px_repeat(5,minmax(130px,1fr))] lg:min-w-0 lg:grid-cols-[60px_repeat(5,1fr)]">
                      <div className="border-r border-border">
                        {timeSlots.map((hour, idx) => (
                          <div key={hour} className="relative h-[72px] border-b border-border">
                            {idx > 0 && (
                              <span className="absolute -top-2.5 right-1 bg-white px-1 text-[10px] text-muted-foreground sm:right-2 sm:text-xs">
                                {format(new Date().setHours(hour, 0), "h a")}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      {weekDays.map((day) => {
                        const dayEvents = getEventsForDay(day.key);

                        return (
                          <div key={day.key} className="relative border-r border-border last:border-r-0">
                            {timeSlots.map((hour) => (
                              <div key={hour} className="h-[72px] border-b border-border" />
                            ))}

                            <div className="pointer-events-none absolute inset-0">
                              {dayEvents.map((event) => {
                                const overlapping = findOverlappingEvents(event, dayEvents);
                                const index = overlapping.findIndex((e) => e.id === event.id);

                                return (
                                  <CalendarEventBlock
                                    key={event.id}
                                    event={event}
                                    overlappingEvents={overlapping}
                                    index={index}
                                    isSelected={selectedEvent?.id === event.id}
                                    onSelect={setSelectedEvent}
                                  />
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
          </section>

          <aside className="calendar-course-rail" aria-label="Courses on your schedule">
            <div>
              <p className="app-section-label">Courses</p>
              <h2>On schedule</h2>
              <p className="calendar-rail-note">Color key and high-level week load.</p>
            </div>

            <div className="calendar-course-list">
              {courseLegend.map((course) => (
                <span key={course.label} className="calendar-course-item">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: course.color }}
                    aria-hidden
                  />
                  <span className="tnum">{course.label}</span>
                </span>
              ))}
            </div>

            <div className="calendar-rail-summary">
              <div>
                <span>Active days</span>
                <strong>{activeDayCount}</strong>
              </div>
              <div>
                <span>Time window</span>
                <strong>{timeWindowLabel}</strong>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <ScheduleEventSheet
        event={selectedEvent}
        relatedEvents={relatedEvents}
        open={selectedEvent !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedEvent(null);
          }
        }}
        onRemove={removeSelected}
      />
    </>
  );
}
