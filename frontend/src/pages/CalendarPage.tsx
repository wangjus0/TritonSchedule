import { useState, useMemo } from "react";
import {
  format,
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isSameDay,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventModal } from "@/components/EventModal";
import { useCalendar } from "@/context/CalendarContext";
import { CalendarEvent } from "@/types/calendar";
import { cn } from "@/lib/utils";

const HOUR_HEIGHT = 60; // pixels per hour
const START_HOUR = 7; // 7 AM
const END_HOUR = 22; // 10 PM
const TOTAL_HOURS = END_HOUR - START_HOUR;

function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours + minutes / 60;
}

function getEventStyle(event: CalendarEvent, overlappingEvents: CalendarEvent[], index: number) {
  const startTime = parseTime(event.startTime);
  const endTime = parseTime(event.endTime);
  const duration = endTime - startTime;
  
  const top = (startTime - START_HOUR) * HOUR_HEIGHT;
  const height = duration * HOUR_HEIGHT;
  
  const totalOverlapping = overlappingEvents.length;
  const width = totalOverlapping > 1 ? `${100 / totalOverlapping}%` : "100%";
  const left = totalOverlapping > 1 ? `${(index * 100) / totalOverlapping}%` : "0";
  
  return { top, height, width, left };
}

function findOverlappingEvents(event: CalendarEvent, allEvents: CalendarEvent[]): CalendarEvent[] {
  const eventStart = parseTime(event.startTime);
  const eventEnd = parseTime(event.endTime);
  
  return allEvents.filter((other) => {
    if (!isSameDay(new Date(other.date), new Date(event.date))) return false;
    const otherStart = parseTime(other.startTime);
    const otherEnd = parseTime(other.endTime);
    return eventStart < otherEnd && eventEnd > otherStart;
  });
}

export default function CalendarPage() {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("09:00");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const { events, addEvent, updateEvent, deleteEvent } = useCalendar();

  const weekDays = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const timeSlots = useMemo(() => {
    return Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i);
  }, []);

  const getEventsForDay = (day: Date) => {
    return events.filter((event) => isSameDay(new Date(event.date), day));
  };

  const handlePrevWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const handleNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const handleToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const handleTimeSlotClick = (day: Date, hour: number) => {
    setSelectedDate(day);
    setSelectedTime(`${hour.toString().padStart(2, "0")}:00`);
    setEditingEvent(null);
    setModalOpen(true);
  };

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEvent(event);
    setSelectedDate(new Date(event.date));
    setSelectedTime(event.startTime);
    setModalOpen(true);
  };

  const handleAddEvent = () => {
    setSelectedDate(new Date());
    setSelectedTime("09:00");
    setEditingEvent(null);
    setModalOpen(true);
  };

  const handleSaveEvent = (eventData: Omit<CalendarEvent, "id"> & { id?: string }) => {
    if (eventData.id) {
      updateEvent(eventData.id, eventData);
    } else {
      addEvent({
        ...eventData,
        id: crypto.randomUUID(),
      });
    }
  };

  const weekRangeText = `${format(weekDays[0], "MMM d")} - ${format(weekDays[4], "MMM d, yyyy")}`;

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{weekRangeText}</h1>
          <p className="text-muted-foreground">Weekly Schedule</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={handlePrevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button onClick={handleAddEvent} className="ml-2">
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        </div>
      </div>

      <div className="flex-1 border border-border rounded-lg overflow-hidden bg-card flex flex-col">
        {/* Day headers */}
        <div className="grid grid-cols-[60px_repeat(5,1fr)] border-b border-border bg-muted/50">
          <div className="px-2 py-3 text-center text-sm font-medium text-muted-foreground border-r border-border">
            Time
          </div>
          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                "px-2 py-3 text-center border-r border-border last:border-r-0",
                isSameDay(day, new Date()) && "bg-primary/10"
              )}
            >
              <div className="text-sm font-medium text-muted-foreground">
                {format(day, "EEE")}
              </div>
              <div
                className={cn(
                  "text-lg font-semibold",
                  isSameDay(day, new Date())
                    ? "text-primary"
                    : "text-foreground"
                )}
              >
                {format(day, "d")}
              </div>
            </div>
          ))}
        </div>

        {/* Time grid */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="grid grid-cols-[60px_repeat(5,1fr)]">
            {/* Time labels column */}
            <div className="border-r border-border">
              {timeSlots.map((hour, idx) => (
                <div
                  key={hour}
                  className="h-[60px] relative border-b border-border"
                >
                  {idx > 0 && (
                    <span className="absolute -top-2.5 right-2 text-xs text-muted-foreground bg-card px-1">
                      {format(new Date().setHours(hour, 0), "h a")}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map((day) => {
              const dayEvents = getEventsForDay(day);
              
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "relative border-r border-border last:border-r-0",
                    isSameDay(day, new Date()) && "bg-primary/5"
                  )}
                >
                  {/* Hour slots for clicking */}
                  {timeSlots.map((hour) => (
                    <div
                      key={hour}
                      onClick={() => handleTimeSlotClick(day, hour)}
                      className="h-[60px] border-b border-border cursor-pointer hover:bg-accent/30 transition-colors"
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
                          onClick={(e) => handleEventClick(event, e)}
                          className="absolute px-0.5 py-0.5 pointer-events-auto cursor-pointer group"
                          style={{
                            top: `${style.top}px`,
                            height: `${style.height}px`,
                            width: style.width,
                            left: style.left,
                          }}
                        >
                          <div
                            className="h-full w-full rounded-md px-2 py-1 overflow-hidden text-white text-xs shadow-sm group-hover:opacity-90 transition-opacity"
                            style={{ backgroundColor: event.color }}
                          >
                            <div className="font-medium truncate">{event.title}</div>
                            <div className="opacity-90 truncate">
                              {event.startTime} - {event.endTime}
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

      <EventModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        event={editingEvent}
        selectedDate={selectedDate || undefined}
        defaultStartTime={selectedTime}
        onSave={handleSaveEvent}
        onDelete={deleteEvent}
      />
    </div>
  );
}
