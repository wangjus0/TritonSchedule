import { useState, useMemo, useEffect } from "react";
import { BookOpen, ChevronDown, ChevronUp, Loader2, Search, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Course, DiscussionSection } from "@/data/sampleCourses";
import { useCalendar } from "@/context/CalendarContext";
import { Weekday } from "@/types/calendar";
import { toast } from "sonner";

export default function SearchCourses() {
  const SEARCH_RESULTS_CACHE_KEY = "searchCourseResultsCache";
  const EXPANDED_COURSES_KEY = "expandedSearchCourseIds";
  const [searchQuery, setSearchQuery] = useState(() =>
    sessionStorage.getItem("searchCoursesQuery") ?? ""
  );
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(() =>
    sessionStorage.getItem("searchCoursesQuery") ?? ""
  );
  const [coursesFromBackend, setCoursesFromBackend] = useState<Course[]>(() => {
    const stored = sessionStorage.getItem(SEARCH_RESULTS_CACHE_KEY);
    if (!stored) return [];

    try {
      const parsed = JSON.parse(stored) as { results?: Course[] };
      return Array.isArray(parsed.results) ? parsed.results : [];
    } catch {
      return [];
    }
  });
  const [isBackendLoading, setIsBackendLoading] = useState(false);
  const [searchState, setSearchState] = useState<"idle" | "loading" | "success" | "not_found" | "error">(() => {
    const stored = sessionStorage.getItem(SEARCH_RESULTS_CACHE_KEY);
    if (!stored) return "idle";

    try {
      const parsed = JSON.parse(stored) as { searchState?: string };
      return parsed.searchState === "success" || parsed.searchState === "not_found"
        ? parsed.searchState
        : "idle";
    } catch {
      return "idle";
    }
  });
  const [activeTerm, setActiveTerm] = useState<string>("");
  const [expandedCourseIds, setExpandedCourseIds] = useState<Set<string>>(() => {
    const stored = sessionStorage.getItem(EXPANDED_COURSES_KEY);
    if (!stored) return new Set();

    try {
      const parsed = JSON.parse(stored) as string[];
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set();
    }
  });
  const [selectedDiscussionIds, setSelectedDiscussionIds] = useState<Record<string, string>>({});
  const [lastFetchedQuery, setLastFetchedQuery] = useState(() => {
    const stored = sessionStorage.getItem(SEARCH_RESULTS_CACHE_KEY);
    if (!stored) return "";

    try {
      const parsed = JSON.parse(stored) as { query?: string };
      return typeof parsed.query === "string" ? parsed.query : "";
    } catch {
      return "";
    }
  });
  const [lastFetchedTerm, setLastFetchedTerm] = useState(() => {
    const stored = sessionStorage.getItem(SEARCH_RESULTS_CACHE_KEY);
    if (!stored) return "";

    try {
      const parsed = JSON.parse(stored) as { term?: string };
      return typeof parsed.term === "string" ? parsed.term : "";
    } catch {
      return "";
    }
  });
  const { events, addEvent } = useCalendar();

  useEffect(() => {
    sessionStorage.setItem("searchCoursesQuery", searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    sessionStorage.setItem(EXPANDED_COURSES_KEY, JSON.stringify(Array.from(expandedCourseIds)));
  }, [expandedCourseIds]);

  useEffect(() => {
    const controller = new AbortController();

    const loadActiveTerm = async () => {
      try {
        const response = await fetch("/api/term", { signal: controller.signal });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          Term?: { Term?: string } | string;
        };

        const resolvedTerm =
          typeof payload.Term === "string"
            ? payload.Term
            : payload.Term?.Term;

        if (typeof resolvedTerm === "string") {
          setActiveTerm(resolvedTerm);
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setActiveTerm("");
        }
      }
    };

    void loadActiveTerm();

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchQuery]);

  useEffect(() => {
    const query = debouncedSearchQuery.trim();
    const normalizedTerm = activeTerm.trim();

    if (!query) {
      setCoursesFromBackend([]);
      setSearchState("idle");
      setIsBackendLoading(false);
      return;
    }

    const hasReusableCache =
      query.toLowerCase() === lastFetchedQuery.trim().toLowerCase() &&
      searchState !== "error" &&
      (lastFetchedTerm.trim() === normalizedTerm ||
        lastFetchedTerm.trim().length === 0 ||
        normalizedTerm.length === 0);

    if (hasReusableCache) {
      setIsBackendLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchCourses = async () => {
      setIsBackendLoading(true);
      setSearchState("loading");
      setCoursesFromBackend([]);
      try {
        const backendCourses = await searchBackendCourses(query, controller.signal, activeTerm);
        const mappedCourses = backendCourses.map(mapBackendCourseToCourse);
        const coursesWithRmp = await hydrateCoursesWithRmp(mappedCourses, controller.signal);
        setCoursesFromBackend(coursesWithRmp);
        const resolvedSearchState = mappedCourses.length > 0 ? "success" : "not_found";
        setSearchState(resolvedSearchState);
        setLastFetchedQuery(query);
        setLastFetchedTerm(normalizedTerm);
        sessionStorage.setItem(
          SEARCH_RESULTS_CACHE_KEY,
          JSON.stringify({
            query,
            term: normalizedTerm,
            results: coursesWithRmp,
            searchState: resolvedSearchState,
          })
        );
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setCoursesFromBackend([]);
          setSearchState("error");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsBackendLoading(false);
        }
      }
    };

    void fetchCourses();

    return () => {
      controller.abort();
    };
  }, [debouncedSearchQuery, activeTerm, lastFetchedQuery, lastFetchedTerm, searchState]);

  const displayedCourses = coursesFromBackend;
  const isDebouncingSearch =
    searchQuery.trim().length > 0 &&
    searchQuery.trim() !== debouncedSearchQuery.trim();

  const addedCourseIds = useMemo(() => {
    return new Set(
      events
        .filter((e) => e.isCourse)
        .map((e) => e.courseId || e.id)
    );
  }, [events]);

  const handleAddToCalendar = (course: Course, selectedDiscussion?: DiscussionSection) => {
    const calendarColor = generateCalendarColor();
    const lectureSchedule = parseCourseSchedule(course.schedule);
    const startTime = lectureSchedule?.startTime ?? "09:00";
    const endTime = lectureSchedule?.endTime ?? "10:30";
    const uniqueDays = lectureSchedule?.days ?? [];

    uniqueDays.forEach((day) => {
      addEvent({
        id: `${course.id}-${day}`,
        title: course.name,
        dayOfWeek: day,
        startTime,
        endTime,
        color: calendarColor,
        isCourse: true,
        courseId: course.id,
        eventType: "Lecture",
      });
    });

    if (selectedDiscussion) {
      const discussionSchedule = parseCourseSchedule(selectedDiscussion.time);
      if (discussionSchedule) {
        discussionSchedule.days.forEach((discussionDay) => {
          addEvent({
            id: `${course.id}-${selectedDiscussion.id}-${discussionDay}`,
            title: `${course.name} (${selectedDiscussion.name})`,
            dayOfWeek: discussionDay,
            startTime: discussionSchedule.startTime,
            endTime: discussionSchedule.endTime,
            color: calendarColor,
            isCourse: true,
            courseId: course.id,
            eventType: "Discussion",
          });
        });
      }
    }

    if (uniqueDays.length === 0 && !selectedDiscussion) {
      toast.error("Could not parse this course schedule for calendar placement.");
      return;
    }

    const discussionInfo = selectedDiscussion ? ` with ${selectedDiscussion.name}` : "";
    toast.success(`${course.name}${discussionInfo} added to your calendar!`);
  };

  const toggleExpandedCourse = (courseId: string) => {
    setExpandedCourseIds((previous) => {
      const next = new Set(previous);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  };

  const getSelectedDiscussion = (course: Course): DiscussionSection | undefined => {
    const selectedId = selectedDiscussionIds[course.id];
    if (!selectedId) {
      return course.discussionSections?.[0];
    }

    return (
      course.discussionSections?.find((section) => section.id === selectedId) ??
      course.discussionSections?.[0]
    );
  };

  const setSelectedDiscussionForCourse = (courseId: string, discussionId: string) => {
    setSelectedDiscussionIds((previous) => ({
      ...previous,
      [courseId]: discussionId,
    }));
  };

  return (
    <div className="h-[calc(100vh-4rem)] overflow-hidden flex justify-center px-6 pt-[10vh]">
      <div className="w-full max-w-4xl">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/80">
            Course Explorer
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Search Courses
          </h1>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Find and add courses to your calendar
          </p>
        </div>

        <div className="mx-auto mt-6 max-w-3xl">
          <div className="overflow-hidden rounded-[1.4rem] border border-border/80 bg-[linear-gradient(160deg,hsl(0_0%_100%_/_0.9),hsl(204_50%_96%_/_0.92))] shadow-[0_24px_50px_hsl(208_45%_58%_/_0.24)] backdrop-blur-xl">
            <div className="flex items-center gap-3 border-b border-border/70 px-4 py-4 transition-all focus-within:border-primary/70 focus-within:bg-background/20 focus-within:shadow-[inset_0_-1px_0_hsl(var(--primary)/0.55),0_0_0_2px_hsl(var(--primary)/0.16)] sm:px-6">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search courses by name, number, or instructor"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-auto min-h-[2.2rem] border-0 bg-transparent p-0 text-[1.05rem] leading-9 text-foreground caret-primary placeholder:text-muted-foreground/85 shadow-none outline-none ring-0 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 sm:text-[1.12rem]"
              />
            </div>

            <div className="p-4 sm:p-5">
              {searchQuery.trim().length === 0 ? (
                <div className="px-3 py-7 text-center sm:px-5 sm:py-8">
                  <p className="text-lg font-semibold text-foreground">Search for a course to get started</p>
                  <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                    Try a course name, number, or instructor.
                  </p>
                </div>
              ) : isBackendLoading || isDebouncingSearch ? (
                <div className="py-10 text-center sm:py-12">
                  <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-background/40">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                  <p className="text-xl font-semibold text-foreground">Searching courses...</p>
                  <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                    {`Looking for matches for "${searchQuery.trim()}".`}
                  </p>
                </div>
              ) : searchState === "error" ? (
                <div className="py-8 text-center sm:py-10">
                  <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-background/40">
                    <BookOpen className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-xl font-semibold text-foreground">Search unavailable</p>
                  <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                    Could not reach the backend server. Please make sure it is running and try again.
                  </p>
                </div>
              ) : displayedCourses.length === 0 ? (
                <div className="py-8 text-center sm:py-10">
                  <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-background/40">
                    <BookOpen className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-xl font-semibold text-foreground">No courses found</p>
                  <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                    Please try again.
                  </p>
                  <button
                    type="button"
                    className="mt-5 rounded-lg border border-border/80 bg-background/55 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                    onClick={() => setSearchQuery("")}
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                <div>
                  <div className="mb-3 flex items-center justify-center">
                    <p className="text-xs text-muted-foreground text-center">
                      {isBackendLoading ? "Loading..." : `${displayedCourses.length} result${displayedCourses.length === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  <div className="max-h-[min(58vh,520px)] space-y-1.5 overflow-y-auto pr-1">
                    {displayedCourses.map((course) => (
                      <div
                        key={course.id}
                        className="rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-border/60 hover:bg-accent/35"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex items-start gap-3">
                            <span className="rounded-md border border-border/65 bg-background/45 p-1.5">
                              <BookOpen className="h-4 w-4 text-muted-foreground" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-[1.02rem] text-foreground">{course.name}</p>
                              <p className="truncate text-sm text-muted-foreground">{course.instructor}</p>
                              <p className="truncate text-xs text-muted-foreground/90">
                                {formatScheduleDisplay(course.schedule)}
                              </p>
                            </div>
                          </div>

                          <div className="w-[220px] shrink-0">
                            <button
                              type="button"
                              disabled={addedCourseIds.has(course.id)}
                              onClick={() => handleAddToCalendar(course, getSelectedDiscussion(course))}
                              className="w-full rounded-md border border-border/70 bg-background/45 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-55"
                            >
                              {addedCourseIds.has(course.id) ? "Added" : "Add"}
                            </button>

                            <div className="mt-2 grid grid-cols-2 gap-2">
                              <span className="inline-flex items-center justify-center gap-1 rounded-md border border-border/70 bg-background/45 px-2 py-1 text-xs text-muted-foreground">
                                <Star className="h-3.5 w-3.5" />
                                {course.rmpRating ? `RMP ${course.rmpRating.toFixed(1)}` : "RMP N/A"}
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleExpandedCourse(course.id)}
                                className="inline-flex items-center justify-center gap-1 rounded-md border border-border/70 bg-background/45 px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                              >
                                {expandedCourseIds.has(course.id) ? (
                                  <ChevronUp className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                )}
                                Details
                              </button>
                            </div>
                          </div>
                        </div>

                        {expandedCourseIds.has(course.id) && (
                          <div className="mt-3 grid gap-2 rounded-lg border border-border/70 bg-background/35 p-3 text-xs text-muted-foreground sm:grid-cols-2">
                            <div>
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">Rate My Professor</p>
                              <div className="mt-1.5 h-24 space-y-1.5 rounded-md border border-border/60 bg-background/40 p-2">
                                <div className="flex items-center justify-between gap-2 text-xs">
                                  <span className="text-muted-foreground">Rating</span>
                                  <span className="font-medium text-foreground">
                                    {course.rmpRating ? `${course.rmpRating.toFixed(1)} / 5.0` : "Unavailable"}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-2 text-xs">
                                  <span className="text-muted-foreground">Take Again</span>
                                  <span className="font-medium text-foreground">
                                    {course.rmpTakeAgain !== undefined ? `${course.rmpTakeAgain}%` : "Unavailable"}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-2 text-xs">
                                  <span className="text-muted-foreground">Difficulty</span>
                                  <span className="font-medium text-foreground">
                                    {course.rmpAvgDifficulty ? course.rmpAvgDifficulty.toFixed(1) : "Unavailable"}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div>
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">Discussion Sections</p>
                              {course.discussionSections && course.discussionSections.length > 0 ? (
                                <div className="mt-1.5 h-24 space-y-1.5 overflow-y-auto rounded-md border border-border/60 bg-background/40 p-2">
                                  {course.discussionSections.map((section) => {
                                    const isSelected = getSelectedDiscussion(course)?.id === section.id;
                                    return (
                                      <button
                                        key={section.id}
                                        type="button"
                                        onClick={() => setSelectedDiscussionForCourse(course.id, section.id)}
                                        className={`w-full rounded-md border px-2 py-1.5 text-left text-xs transition-colors ${
                                          isSelected
                                            ? "border-primary/45 bg-primary/10 text-foreground"
                                            : "border-border/60 bg-background/50 text-muted-foreground hover:bg-accent/45"
                                        }`}
                                      >
                                        <p className="truncate font-medium">{section.name}</p>
                                        <p className="truncate text-[11px] opacity-90">
                                          {section.time} • {section.location}
                                        </p>
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="mt-1 text-xs text-foreground">Unavailable</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function convertTo24Hour(time: string): string {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm]?|[AaPp])?$/);

  if (!match) {
    return "09:00";
  }

  const [, rawHours, rawMinutes, rawPeriod] = match;
  const period = rawPeriod
    ? rawPeriod.toUpperCase().startsWith("P")
      ? "PM"
      : "AM"
    : null;
  const minutes = Number(rawMinutes);
  const parsedHours = Number(rawHours);
  let hours = parsedHours;

  if (period === "PM" && hours !== 12) {
    hours += 12;
  } else if (period === "AM" && hours === 12) {
    hours = 0;
  }

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

function parseCourseSchedule(schedule: string): { days: Weekday[]; startTime: string; endTime: string } | null {
  const days = extractWeekdays(schedule);
  const timeRange = extractTimeRange(schedule);

  if (!timeRange) {
    return null;
  }

  return {
    days,
    startTime: timeRange.start,
    endTime: timeRange.end,
  };
}

function extractTimeRange(schedule: string): { start: string; end: string } | null {
  const match = schedule.match(
    /(\d{1,2}:\d{2})\s*([AaPp][Mm]?|[AaPp])?\s*-\s*(\d{1,2}:\d{2})\s*([AaPp][Mm]?|[AaPp])?/i
  );

  if (!match) {
    return null;
  }

  const [, startBase, startPeriodRaw, endBase, endPeriodRaw] = match;
  const inferredPeriod = endPeriodRaw ?? startPeriodRaw;
  const startPeriod = startPeriodRaw ?? inferredPeriod;
  const endPeriod = endPeriodRaw ?? startPeriodRaw;

  if (!startPeriod || !endPeriod) {
    return null;
  }

  return {
    start: convertTo24Hour(`${startBase} ${startPeriod}`),
    end: convertTo24Hour(`${endBase} ${endPeriod}`),
  };
}

function extractWeekdays(schedule: string): Weekday[] {
  if (/\b(TBA|TBD|ARRANGED|ARR)\b/i.test(schedule)) {
    return [];
  }

  const normalized = schedule
    .replace(/Monday/gi, "Mon")
    .replace(/Tuesday/gi, "Tue")
    .replace(/Wednesday/gi, "Wed")
    .replace(/Thursday/gi, "Thu")
    .replace(/Friday/gi, "Fri");

  const directMatches = normalized.match(/Mon|Tue|Wed|Thu|Fri/gi) ?? [];
  const mapped = directMatches
    .map((value) => toWeekday(value))
    .filter((value): value is Weekday => Boolean(value));

  if (mapped.length > 0) {
    return Array.from(new Set(mapped));
  }

  const compact = normalized.replace(/[^A-Za-z]/g, "");
  const compactDays: Weekday[] = [];

  for (let i = 0; i < compact.length; ) {
    const pair = compact.slice(i, i + 2).toLowerCase();
    if (pair === "th") {
      compactDays.push("Thu");
      i += 2;
      continue;
    }
    if (pair === "tu") {
      compactDays.push("Tue");
      i += 2;
      continue;
    }

    const current = compact[i].toLowerCase();
    if (current === "m") compactDays.push("Mon");
    if (current === "w") compactDays.push("Wed");
    if (current === "f") compactDays.push("Fri");
    if (current === "t") compactDays.push("Tue");

    i += 1;
  }

  return Array.from(new Set(compactDays));
}

function toWeekday(value: string): Weekday | null {
  const normalized = value.slice(0, 3).toLowerCase();
  if (normalized === "mon") return "Mon";
  if (normalized === "tue") return "Tue";
  if (normalized === "wed") return "Wed";
  if (normalized === "thu") return "Thu";
  if (normalized === "fri") return "Fri";
  return null;
}

function formatScheduleDisplay(schedule: string): string {
  const trimmedSchedule = schedule.trim();
  if (!trimmedSchedule || trimmedSchedule.toLowerCase() === "schedule tba") {
    return "Days and time TBA";
  }

  const firstSpaceIndex = trimmedSchedule.indexOf(" ");
  if (firstSpaceIndex === -1) {
    return `${trimmedSchedule} - Time TBA`;
  }

  const days = trimmedSchedule.slice(0, firstSpaceIndex).trim();
  const time = trimmedSchedule.slice(firstSpaceIndex + 1).trim();
  return `${days} - ${time || "Time TBA"}`;
}

function generateCalendarColor(): string {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue} 72% 48%)`;
}

async function searchBackendCourses(query: string, signal: AbortSignal, term: string): Promise<BackendCourse[]> {
  const encodedQuery = encodeURIComponent(query);
  const encodedTerm = encodeURIComponent(term || "");
  const endpoint = `/api/course?course=${encodedQuery}&term=${encodedTerm}`;

  const response = await fetch(endpoint, { signal });

  if (response.status === 404 || response.status === 400) {
    return [];
  }

  if (!response.ok) {
    throw new Error(`Failed with status ${response.status}`);
  }

  const payload = (await response.json()) as BackendResponse;

  return Array.isArray(payload)
    ? payload
    : Array.isArray(payload.data)
      ? payload.data
      : [];
}

async function hydrateCoursesWithRmp(courses: Course[], signal: AbortSignal): Promise<Course[]> {
  const uniqueInstructors = Array.from(
    new Set(
      courses
        .map((course) => course.instructor.trim())
        .filter((name) => name.length > 0 && name.toLowerCase() !== "instructor tba")
    )
  );

  const lookupEntries = await Promise.all(
    uniqueInstructors.map(async (instructor) => {
      try {
        const response = await fetch(`/api/rmp?teacher=${encodeURIComponent(instructor)}`, { signal });
        if (response.status === 404 || response.status === 400) {
          return [instructor, null] as const;
        }

        if (!response.ok) {
          return [instructor, null] as const;
        }

        const payload = (await response.json()) as BackendRmpResponse;
        const stats = Array.isArray(payload.Data) ? payload.Data[0] : undefined;
        return [instructor, stats ?? null] as const;
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          throw error;
        }
        return [instructor, null] as const;
      }
    })
  );

  const rmpLookup = new Map(lookupEntries);

  return courses.map((course) => {
    const stats = rmpLookup.get(course.instructor.trim());
    if (!stats) {
      return course;
    }

    const avgRating = Number(stats.avgRating);
    const avgDiff = Number(stats.avgDiff);
    const takeAgain = Number(stats.takeAgainPercent);

    return {
      ...course,
      rmpRating: Number.isFinite(avgRating) && avgRating > 0 ? avgRating : undefined,
      rmpAvgDifficulty: Number.isFinite(avgDiff) && avgDiff > 0 ? avgDiff : undefined,
      rmpTakeAgain: Number.isFinite(takeAgain) && takeAgain >= 0 ? takeAgain : undefined,
    };
  });
}

type BackendSection = {
  Days?: string;
  Time?: string;
  Location?: string;
};

type BackendCourse = {
  Name?: string;
  Term?: string;
  Teacher?: string;
  Rating?: string;
  name?: string;
  term?: string;
  teacher?: string;
  rating?: string;
  Lecture?: BackendSection | null;
  lecture?: BackendSection | BackendSection[] | null;
  Discussions?: BackendSection[];
  discussions?: BackendSection[];
};

type BackendResponse = BackendCourse[] | { data?: BackendCourse[] };

type BackendRmpRecord = {
  avgRating?: number | string;
  avgDiff?: number | string;
  takeAgainPercent?: number | string;
};

type BackendRmpResponse = {
  Data?: BackendRmpRecord[];
};

function mapBackendCourseToCourse(course: BackendCourse, index: number): Course {
  const lecture = Array.isArray(course.lecture)
    ? course.lecture[0]
    : (course.Lecture ?? course.lecture ?? null);
  const discussions = course.Discussions ?? course.discussions ?? [];
  const lectureDays = lecture?.Days?.trim() ?? "";
  const lectureTime = lecture?.Time?.trim() ?? "";
  const lectureSchedule = `${lectureDays} ${lectureTime}`.trim();
  const name = course.Name ?? course.name ?? "Untitled Course";
  const term = course.Term ?? course.term ?? "Unknown";
  const teacher = course.Teacher ?? course.teacher ?? "Instructor TBA";
  const rating = course.Rating ?? course.rating ?? "";

  return {
    id: `${name}-${term}-${index}`,
    name,
    instructor: teacher,
    schedule: lectureSchedule || "Schedule TBA",
    description: `Term: ${term}`,
    color: "hsl(210, 70%, 52%)",
    rmpRating: Number.parseFloat(rating) || undefined,
    discussionSections: discussions.map((section, sectionIndex) => ({
      id: `${index}-${sectionIndex}`,
      name: `Discussion ${sectionIndex + 1}`,
      time: `${section.Days ?? ""} ${section.Time ?? ""}`.trim() || "TBA",
      location: section.Location ?? "TBA",
    })),
  };
}
