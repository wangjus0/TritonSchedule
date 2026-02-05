import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { CourseRow } from "@/components/CourseRow";
import { sampleCourses, Course, DiscussionSection } from "@/data/sampleCourses";
import { useCalendar } from "@/context/CalendarContext";
import { Weekday } from "@/types/calendar";
import { toast } from "sonner";

export default function SearchCourses() {
  const [searchQuery, setSearchQuery] = useState(() =>
    sessionStorage.getItem("searchCoursesQuery") ?? ""
  );
  const [expandedCourseIds, setExpandedCourseIds] = useState<string[]>(() => {
    const stored = sessionStorage.getItem("searchCoursesExpanded");
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const { events, addEvent } = useCalendar();

  useEffect(() => {
    sessionStorage.setItem("searchCoursesQuery", searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    sessionStorage.setItem(
      "searchCoursesExpanded",
      JSON.stringify(expandedCourseIds)
    );
  }, [expandedCourseIds]);

  const filteredCourses = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return [];
    
    return sampleCourses.filter(
      (course) =>
        course.name.toLowerCase().includes(query) ||
        course.instructor.toLowerCase().includes(query) ||
        course.description.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const addedCourseIds = useMemo(() => {
    return new Set(
      events
        .filter((e) => e.isCourse)
        .map((e) => e.courseId || e.id)
    );
  }, [events]);

  const handleAddToCalendar = (course: Course, selectedDiscussion?: DiscussionSection) => {
    const timeMatch = course.schedule.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
    let startTime = "09:00";
    let endTime = "10:30";
    
    if (timeMatch) {
      startTime = convertTo24Hour(timeMatch[1]);
      endTime = convertTo24Hour(timeMatch[2]);
    }

    const dayMatches = course.schedule.match(/Mon|Tue|Wed|Thu|Fri/g) || [];
    const weekdayMap: Record<string, Weekday> = {
      Mon: "Mon",
      Tue: "Tue",
      Wed: "Wed",
      Thu: "Thu",
      Fri: "Fri",
    };
    const uniqueDays = Array.from(new Set(dayMatches))
      .map((day) => weekdayMap[day])
      .filter((day): day is Weekday => Boolean(day));

    uniqueDays.forEach((day) => {
      addEvent({
        id: `${course.id}-${day}`,
        title: course.name,
        dayOfWeek: day,
        startTime,
        endTime,
        color: course.color,
        isCourse: true,
        courseId: course.id,
        eventType: "Lecture",
      });
    });

    if (selectedDiscussion) {
      const discussionMatch = selectedDiscussion.time.match(
        /(Mon|Tue|Wed|Thu|Fri)\s+(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i
      );
      if (discussionMatch) {
        const discussionDay = weekdayMap[discussionMatch[1]];
        if (discussionDay) {
          addEvent({
            id: `${course.id}-${selectedDiscussion.id}-${discussionDay}`,
            title: `${course.name} (${selectedDiscussion.name})`,
            dayOfWeek: discussionDay,
            startTime: convertTo24Hour(discussionMatch[2]),
            endTime: convertTo24Hour(discussionMatch[3]),
            color: course.color,
            isCourse: true,
            courseId: course.id,
            eventType: "Discussion",
          });
        }
      }
    }

    const discussionInfo = selectedDiscussion ? ` with ${selectedDiscussion.name}` : "";
    toast.success(`${course.name}${discussionInfo} added to your calendar!`);
  };

  return (
    <div className="min-h-[calc(100vh-6rem)] flex justify-center p-6 pt-[25vh]">
      <div className="w-full max-w-4xl">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground/70">
            Course Explorer
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Search Courses
          </h1>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Find and add courses to your calendar
          </p>
        </div>

        <div className="mt-6 max-w-2xl mx-auto">
          <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-background/90 to-muted/20 p-2 shadow-md">
            <Input
              placeholder="Search by course name, instructor, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 rounded-xl border border-border/60 bg-background/80 shadow-sm focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0"
            />
          </div>
          <p className="mt-6 text-xs text-muted-foreground text-center">
            Try a course name, instructor, or keyword to start.
          </p>
          <div className="mt-3">
            {searchQuery.trim().length === 0 ? (
              <p className="text-center text-muted-foreground">
                Start typing to find courses.
              </p>
            ) : filteredCourses.length === 0 ? (
              <div className="rounded-lg border border-border bg-card/60 px-4 py-3 text-center text-muted-foreground">
                No courses found matching your search.
              </div>
            ) : (
              <div className="space-y-2 max-h-[min(60vh,520px)] overflow-y-auto pr-1">
                {filteredCourses.map((course) => (
                  <CourseRow
                    key={course.id}
                    course={course}
                    isAdded={addedCourseIds.has(course.id)}
                    onAddToCalendar={handleAddToCalendar}
                    isOpen={expandedCourseIds.includes(course.id)}
                    onOpenChange={(open) => {
                      setExpandedCourseIds((prev) => {
                        if (open) {
                          return prev.includes(course.id)
                            ? prev
                            : [...prev, course.id];
                        }
                        return prev.filter((id) => id !== course.id);
                      });
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function convertTo24Hour(time: string): string {
  const [timePart, period] = time.trim().split(/\s+/);
  let [hours, minutes] = timePart.split(":").map(Number);
  
  if (period?.toUpperCase() === "PM" && hours !== 12) {
    hours += 12;
  } else if (period?.toUpperCase() === "AM" && hours === 12) {
    hours = 0;
  }
  
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}
