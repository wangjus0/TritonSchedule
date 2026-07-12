import { useEffect, useState } from "react";
import { CalendarEvent, Weekday } from "@/types/calendar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const WEEKDAY_LABELS: Record<Weekday, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
};

function formatTo12Hour(timeStr: string): string {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const normalizedHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${normalizedHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

interface ScheduleEventSheetProps {
  event: CalendarEvent | null;
  relatedEvents: CalendarEvent[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemove: () => void;
}

export function ScheduleEventSheet({
  event,
  relatedEvents,
  open,
  onOpenChange,
  onRemove,
}: ScheduleEventSheetProps) {
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setConfirmRemoveOpen(false);
    }
  }, [open]);

  if (!event) {
    return null;
  }

  const isCourse = event.isCourse && event.courseId;
  const displayTitle = isCourse
    ? relatedEvents.find((item) => item.eventType === "Lecture")?.title ??
      relatedEvents[0]?.title.replace(/\s*\([^)]+\)$/, "") ??
      event.title
    : event.title;

  const handleConfirmRemove = () => {
    onRemove();
    setConfirmRemoveOpen(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="max-h-[70vh] overflow-hidden rounded-t-2xl p-0 sm:mx-auto sm:max-w-lg"
          aria-describedby="schedule-event-description"
        >
          <div className="h-1 w-full" style={{ backgroundColor: event.color }} aria-hidden />
        <div className="max-h-[calc(70vh-0.25rem)] overflow-y-auto px-5 pb-8 pt-5">
        <SheetHeader className="space-y-1 text-left">
            <SheetTitle className="text-[20px] font-semibold leading-tight">
              {displayTitle}
            </SheetTitle>
            <SheetDescription id="schedule-event-description" className="text-[15px]">
              {isCourse ? "Course on your schedule" : "Event on your schedule"}
            </SheetDescription>
          </SheetHeader>

          <ul className="mt-6 space-y-3" aria-label="Scheduled times">
            {relatedEvents
              .slice()
              .sort((a, b) => a.dayOfWeek.localeCompare(b.dayOfWeek))
              .map((relatedEvent) => (
                <li
                  key={relatedEvent.id}
                  className="flex items-center gap-3 rounded-lg bg-[var(--aqua-bg)] px-3.5 py-3 transition-all duration-300 hover:translate-x-0.5 hover:bg-[var(--design-paper)] motion-reduce:hover:translate-x-0"
                >
                  <div
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: relatedEvent.color }}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1 text-sm">
                    {relatedEvent.eventType && (
                      <p className="font-medium text-foreground">{relatedEvent.eventType}</p>
                    )}
                    <p className="tnum text-muted-foreground">
                      {WEEKDAY_LABELS[relatedEvent.dayOfWeek]}{" "}
                      {formatTo12Hour(relatedEvent.startTime)} -{" "}
                      {formatTo12Hour(relatedEvent.endTime)}
                    </p>
                  </div>
                </li>
              ))}
          </ul>

          <Button
            type="button"
            variant="destructive"
            className="mt-8 min-h-11 w-full"
            onClick={() => setConfirmRemoveOpen(true)}
          >
            {isCourse ? "Remove from schedule" : "Remove event"}
        </Button>
        </div>
      </SheetContent>
      </Sheet>

      <AlertDialog open={confirmRemoveOpen} onOpenChange={setConfirmRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isCourse ? "Remove course?" : "Remove event?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isCourse
                ? `${displayTitle} and all of its sections will be removed from your schedule.`
                : `${displayTitle} will be removed from your schedule.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmRemove}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
