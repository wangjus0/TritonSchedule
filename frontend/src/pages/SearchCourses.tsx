import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Loader2, Search, Star, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CourseDetailSheet } from "@/components/CourseDetailSheet";
import { CourseDetailBody } from "@/components/CourseDetailBody";
import { useIsDesktop } from "@/hooks/use-media";
import { Course, CourseExamSection, DiscussionSection } from "@/data/sampleCourses";
import { useCalendar } from "@/context/CalendarContext";
import { generateCalendarColor } from "@/lib/calendarColors";
import { formatScheduleDisplay } from "@/lib/courseFormat";
import { formatTermLabel } from "@/lib/formatTerm";
import {
  extractCourseCode,
  getCourseAccentColor,
  SEARCH_SUGGESTIONS,
} from "@/lib/courseDisplay";
import { cn } from "@/lib/utils";
import { Weekday } from "@/types/calendar";
import { toast } from "sonner";

const API_KEY =
  [import.meta.env.VITE_API_KEY, import.meta.env.API_KEY]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .find((value) => value.length > 0) ?? "";

// Throw a clear error during initialization if the API key is not configured in production
if (!import.meta.env.DEV && !API_KEY) {
  console.error("VITE_API_KEY is not set. Set VITE_API_KEY in your environment variables.");
}
const API_BASE = normalizeApiBase(import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? "/api" : ""));
const API_BASE_FALLBACK = normalizeApiBase(import.meta.env.VITE_API_BASE_FALLBACK_URL ?? "");

function buildApiUrl(path: string, base = API_BASE): string {
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function normalizeApiBase(rawBase: string): string {
  const trimmedBase = rawBase.trim().replace(/\/+$/, "");
  if (!trimmedBase) {
    return "";
  }

  if (trimmedBase.startsWith("/")) {
    return trimmedBase;
  }

  try {
    const url = new URL(trimmedBase);
    const pathname = url.pathname.replace(/\/+$/, "");
    if (!pathname) {
      return url.origin;
    }
    return trimmedBase;
  } catch {
    return trimmedBase;
  }
}

async function fetchApi(path: string, init: RequestInit): Promise<Response> {
  const primaryBase = API_BASE.length > 0 ? API_BASE : API_BASE_FALLBACK;

  if (primaryBase.length === 0) {
    throw new Error("Missing API base URL. Set VITE_API_BASE_URL for production deployments.");
  }

  const primaryResponse = await fetch(buildApiUrl(path, primaryBase), init);

  if (
    !shouldTryFallback(primaryResponse) ||
    API_BASE_FALLBACK.length === 0 ||
    API_BASE_FALLBACK === primaryBase ||
    init.signal?.aborted
  ) {
    return primaryResponse;
  }

  return fetch(buildApiUrl(path, API_BASE_FALLBACK), init);
}

function shouldTryFallback(response: Response): boolean {
  if (response.status === 404 || response.status === 502 || response.status === 503 || response.status === 504) {
    return true;
  }

  const contentType = response.headers.get("content-type") ?? "";
  return contentType.includes("text/html");
}

function createApiRequestInit(signal: AbortSignal): RequestInit {
  if (!API_KEY) {
    // In production without an API key, the request will fail with a clear user-facing error
    return { signal };
  }

  return {
    signal,
    headers: {
      "x-api-key": API_KEY,
    },
  };
}

export default function SearchCourses() {
  const navigate = useNavigate();
  const SEARCH_RESULTS_CACHE_KEY = "searchCourseResultsCache";
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
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedDiscussionIds, setSelectedDiscussionIds] = useState<Record<string, string>>({});
  const [selectedLabIds, setSelectedLabIds] = useState<Record<string, string>>({});
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
  const isDesktop = useIsDesktop();

  useEffect(() => {
    sessionStorage.setItem("searchCoursesQuery", searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const controller = new AbortController();

    const loadActiveTerm = async () => {
      try {
        const response = await fetchApi("/term/active", createApiRequestInit(controller.signal));
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
        setCoursesFromBackend(mappedCourses);
        const resolvedSearchState = mappedCourses.length > 0 ? "success" : "not_found";
        setSearchState(resolvedSearchState);
        setLastFetchedQuery(query);
        setLastFetchedTerm(normalizedTerm);
        sessionStorage.setItem(
          SEARCH_RESULTS_CACHE_KEY,
          JSON.stringify({
            query,
            term: normalizedTerm,
            results: mappedCourses,
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
  }, [debouncedSearchQuery, activeTerm, lastFetchedQuery, lastFetchedTerm]);

  const displayedCourses = coursesFromBackend;
  const isDebouncingSearch =
    searchQuery.trim().length > 0 &&
    searchQuery.trim() !== debouncedSearchQuery.trim();

  // Split-pane: keep a selection in sync with results. On desktop auto-select the
  // first result so the detail panel is never empty; clear selection when results vanish.
  useEffect(() => {
    if (displayedCourses.length === 0) {
      setSelectedCourse(null);
      return;
    }
    if (!isDesktop) {
      return;
    }
    setSelectedCourse((current) =>
      current && displayedCourses.some((course) => course.id === current.id)
        ? current
        : displayedCourses[0]
    );
  }, [isDesktop, displayedCourses]);

  const addedCourseIds = useMemo(() => {
    return new Set(
      events
        .filter((e) => e.isCourse)
        .map((e) => e.courseId || e.id)
    );
  }, [events]);
  const selectedCourseCount = addedCourseIds.size;
  const trimmedSearchQuery = searchQuery.trim();
  const searchModeLabel =
    trimmedSearchQuery.length === 0
      ? "Ready"
      : isBackendLoading || isDebouncingSearch
        ? "Searching"
        : searchState === "error"
          ? "Offline"
          : displayedCourses.length === 0
            ? "No match"
            : "Results";
  const activeTermLabel = activeTerm ? formatTermLabel(activeTerm) : "Term pending";

  const handleAddToCalendar = (
    course: Course,
    selectedDiscussion?: DiscussionSection,
    selectedLab?: DiscussionSection
  ) => {
    const calendarColor = generateCalendarColor(course.id);
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

    if (selectedLab) {
      const labSchedule = parseCourseSchedule(selectedLab.time);
      if (labSchedule) {
        labSchedule.days.forEach((labDay) => {
          addEvent({
            id: `${course.id}-${selectedLab.id}-${labDay}`,
            title: `${course.name} (${selectedLab.name})`,
            dayOfWeek: labDay,
            startTime: labSchedule.startTime,
            endTime: labSchedule.endTime,
            color: calendarColor,
            isCourse: true,
            courseId: course.id,
            eventType: "Lab",
          });
        });
      }
    }

    if (uniqueDays.length === 0 && !selectedDiscussion && !selectedLab) {
      toast.error("Could not parse this course schedule for calendar placement.");
      return;
    }

    const selectedSections = [selectedDiscussion?.name, selectedLab?.name].filter(
      (name): name is string => Boolean(name)
    );
    const sectionInfo = selectedSections.length > 0 ? ` (${selectedSections.join(", ")})` : "";
    toast.success(`${course.name}${sectionInfo} added`, {
      action: {
        label: "View Schedule",
        onClick: () => navigate("/calendar"),
      },
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

  const getSelectedLab = (course: Course): DiscussionSection | undefined => {
    const selectedId = selectedLabIds[course.id];
    if (!selectedId) {
      return course.labSections?.[0];
    }

    return (
      course.labSections?.find((section) => section.id === selectedId) ??
      course.labSections?.[0]
    );
  };

  const setSelectedLabForCourse = (courseId: string, labId: string) => {
    setSelectedLabIds((previous) => ({
      ...previous,
      [courseId]: labId,
    }));
  };

  return (
    <>
      <div className="search-console-page">
        <section className="search-command-rail" aria-label="Course search controls">
          <div className="search-command-head">
            <div className="search-command-copy">
              <p className="app-section-label">Course search</p>
              <h1>Find the right section.</h1>
              <p>
                Query the live catalog, inspect meeting patterns, then send a clean course block to
                your week.
              </p>
            </div>

            <div className="search-command-stats" aria-label="Search status">
              <div>
                <span>Term</span>
                <strong>{activeTermLabel}</strong>
              </div>
              <div>
                <span>State</span>
                <strong>{searchModeLabel}</strong>
              </div>
              <div>
                <span>Scheduled</span>
                <strong>{selectedCourseCount}</strong>
              </div>
            </div>
          </div>

          <div className="aqua-search-field search-command-input">
            <div className="aqua-search-icon">
              <Search className="h-4 w-4" />
            </div>
            <Input
              placeholder="Course, code, professor"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search courses"
              className="h-auto min-h-10 border-0 bg-transparent p-0 text-[17px] text-[var(--design-ink)] shadow-none outline-none ring-0 placeholder:text-[var(--design-faint)] focus-visible:ring-0"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="spring-press flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--design-faint)] hover:bg-[var(--design-paper)] hover:text-[var(--design-ink)]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="search-suggestion-cluster">
            <span>Popular searches</span>
            <div>
              {SEARCH_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="suggestion-chip spring-press"
                  onClick={() => setSearchQuery(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="search-workspace">
          <section className="search-index-area">
            <div className="search-results-panel">
              <div className="search-results-header">
                <div>
                  <p className="app-section-label">Catalog index</p>
                  <h2>Course matches</h2>
                  <p>
                    {trimmedSearchQuery
                      ? `Showing live results for "${trimmedSearchQuery}".`
                      : "Enter a query to search the current course catalog."}
                  </p>
                </div>
                <span className="aqua-pill">
                  {displayedCourses.length} result{displayedCourses.length === 1 ? "" : "s"}
                </span>
              </div>

              {trimmedSearchQuery.length === 0 ? (
                <div className="search-empty-state">
                  <span className="aqua-search-icon h-11 w-11" aria-hidden>
                    <Search className="h-5 w-5" />
                  </span>
                  <p className="mt-4 text-[17px] font-semibold text-[var(--design-ink)]">
                    Start with any course
                  </p>
                  <p className="mt-1.5 text-sm text-[var(--design-muted)]">
                    Search by department, code, title, or professor.
                  </p>
                </div>
              ) : isBackendLoading || isDebouncingSearch ? (
                <div className="search-loading-state">
                  {[0, 1, 2, 3].map((item) => (
                    <div key={item} className="search-result-skeleton">
                      <span />
                      <div>
                        <i />
                        <b />
                        <b />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-center gap-2 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--design-primary)] motion-reduce:animate-none" />
                    <p className="text-sm font-medium text-[var(--design-muted)]">Searching...</p>
                  </div>
                </div>
              ) : searchState === "error" ? (
                <div className="search-message-state">
                  <p className="text-[15px] font-semibold text-foreground">Search unavailable</p>
                  <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
                    Could not reach the server. Check that it is running and try again.
                  </p>
                </div>
              ) : displayedCourses.length === 0 ? (
                <div className="search-message-state">
                  <p className="text-[15px] font-medium text-foreground">
                    No results for &ldquo;{trimmedSearchQuery}&rdquo;
                  </p>
                  <button
                    type="button"
                    className="aqua-btn spring-press mt-5 px-5 py-2.5 text-sm font-semibold"
                    onClick={() => setSearchQuery("")}
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                <div key={debouncedSearchQuery}>
                  <div className="search-results-summary">
                    <span className="tnum">
                      {displayedCourses.length} match{displayedCourses.length === 1 ? "" : "es"}
                    </span>
                    <span>{activeTermLabel}</span>
                    {selectedCourseCount > 0 && (
                      <span>{selectedCourseCount} on schedule</span>
                    )}
                  </div>

                  <div className="search-results-list">
                    {displayedCourses.map((course, index) => {
                      const isAdded = addedCourseIds.has(course.id);
                      const courseCode = extractCourseCode(course.name);
                      const accentColor = getCourseAccentColor(course.id);
                      const isActive = isDesktop && selectedCourse?.id === course.id;

                      return (
                        <button
                          key={course.id}
                          type="button"
                          onClick={() => setSelectedCourse(course)}
                          aria-current={isActive ? "true" : undefined}
                          aria-label={`${course.name}, ${course.instructor}. ${isAdded ? "On schedule." : "View details."}`}
                          className={cn(
                            "search-result-row spring-press group animate-stagger-in",
                            isActive && "is-active"
                          )}
                          style={{
                            borderLeftColor: accentColor,
                            animationDelay: `${Math.min(index, 12) * 40}ms`,
                          }}
                        >
                          <span
                            className="course-code-badge search-result-code"
                            style={{ backgroundColor: accentColor }}
                            aria-hidden
                          >
                            {courseCode ?? "UC"}
                          </span>
                          <div className="search-result-main">
                            {isAdded && <span className="search-result-status">Added</span>}
                            <p className="search-result-title">{course.name}</p>
                            <p className="search-result-meta">{course.instructor}</p>
                          </div>
                          <div className="search-result-schedule">
                            <span className="tnum">{formatScheduleDisplay(course.schedule)}</span>
                          </div>
                          <div className="search-result-rating">
                            <span className="tnum">
                              <Star className="h-3 w-3 fill-[var(--design-action)] text-[var(--design-action)]" />
                              {course.rmpRating ? course.rmpRating.toFixed(1) : "N/A"}
                            </span>
                            <ChevronRight className="h-4 w-4 text-[var(--design-action)]/60 transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--design-action)]" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>

          <aside className="search-inspector-panel" aria-label="Course details">
            {selectedCourse ? (
              <div className="course-detail-panel overflow-hidden">
                <div
                  className="h-1 w-full"
                  style={{ backgroundColor: getCourseAccentColor(selectedCourse.id) }}
                  aria-hidden
                />
                <div className="max-h-[calc(100dvh-3rem)] overflow-y-auto p-5">
                  <CourseDetailBody
                    course={selectedCourse}
                    isAdded={addedCourseIds.has(selectedCourse.id)}
                    selectedDiscussion={getSelectedDiscussion(selectedCourse)}
                    selectedLab={getSelectedLab(selectedCourse)}
                    onSelectDiscussion={(discussionId) =>
                      setSelectedDiscussionForCourse(selectedCourse.id, discussionId)
                    }
                    onSelectLab={(labId) => setSelectedLabForCourse(selectedCourse.id, labId)}
                    onAdd={() =>
                      handleAddToCalendar(
                        selectedCourse,
                        getSelectedDiscussion(selectedCourse),
                        getSelectedLab(selectedCourse)
                      )
                    }
                  />
                </div>
              </div>
            ) : (
              <div className="search-detail-empty">
                <p className="app-section-label">Decision panel</p>
                <p className="mt-3 text-[17px] font-semibold text-[var(--design-ink)]">
                  Pick a course
                </p>
                <p className="mt-1.5 max-w-[16rem] text-sm text-[var(--design-muted)]">
                  Select a result to review section fit, exams, and professor signal.
                </p>
                <div className="search-detail-empty-grid" aria-hidden>
                  <span>Sections</span>
                  <strong>Lecture + discussion</strong>
                  <span>Exam blocks</span>
                  <strong>Midterm + final</strong>
                  <span>Schedule action</span>
                  <strong>Add once</strong>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      <CourseDetailSheet
        course={selectedCourse}
        open={selectedCourse !== null && !isDesktop}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCourse(null);
          }
        }}
        isAdded={selectedCourse ? addedCourseIds.has(selectedCourse.id) : false}
        selectedDiscussion={selectedCourse ? getSelectedDiscussion(selectedCourse) : undefined}
        selectedLab={selectedCourse ? getSelectedLab(selectedCourse) : undefined}
        onSelectDiscussion={(discussionId) => {
          if (selectedCourse) {
            setSelectedDiscussionForCourse(selectedCourse.id, discussionId);
          }
        }}
        onSelectLab={(labId) => {
          if (selectedCourse) {
            setSelectedLabForCourse(selectedCourse.id, labId);
          }
        }}
        onAdd={() => {
          if (!selectedCourse) {
            return;
          }

          handleAddToCalendar(
            selectedCourse,
            getSelectedDiscussion(selectedCourse),
            getSelectedLab(selectedCourse)
          );
        }}
      />
    </>
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

  for (let i = 0; i < compact.length;) {
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


async function searchBackendCourses(query: string, signal: AbortSignal, term: string): Promise<BackendCourse[]> {
  const encodedQuery = encodeURIComponent(query);
  const encodedTerm = encodeURIComponent(term || "");
  const response = await fetchApi(
    `/course?course=${encodedQuery}&term=${encodedTerm}`,
    createApiRequestInit(signal)
  );

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
  rmp?: BackendRmpRecord | null;
  name?: string;
  term?: string;
  teacher?: string;
  rating?: string;
  Lecture?: BackendSection | null;
  lecture?: BackendSection | BackendSection[] | null;
  Discussions?: BackendSection[];
  discussions?: BackendSection[];
  Labs?: BackendSection[];
  labs?: BackendSection[];
  Midterms?: BackendSection[];
  midterms?: BackendSection[];
  Final?: BackendSection | null;
  final?: BackendSection | null;
};

type BackendResponse = BackendCourse[] | { data?: BackendCourse[] };

type BackendRmpRecord = {
  avgRating?: number | string;
  avgDiff?: number | string;
  takeAgainPercent?: number | string;
};

function mapBackendCourseToCourse(course: BackendCourse, index: number): Course {
  const lecture = Array.isArray(course.lecture)
    ? course.lecture[0]
    : (course.Lecture ?? course.lecture ?? null);
  const discussions = course.Discussions ?? course.discussions ?? [];
  const labs = course.Labs ?? course.labs ?? [];
  const midterms = course.Midterms ?? course.midterms ?? [];
  const finalExam = course.Final ?? course.final ?? null;
  const lectureDays = lecture?.Days?.trim() ?? "";
  const lectureTime = lecture?.Time?.trim() ?? "";
  const lectureSchedule = `${lectureDays} ${lectureTime}`.trim();
  const name = course.Name ?? course.name ?? "Untitled Course";
  const term = course.Term ?? course.term ?? "Unknown";
  const teacher = course.Teacher ?? course.teacher ?? "Instructor TBA";
  const rmp = course.rmp ?? null;
  const avgRating = Number(rmp?.avgRating);
  const avgDiff = Number(rmp?.avgDiff);
  const takeAgain = Number(rmp?.takeAgainPercent);
  const fallbackRating = Number(course.Rating ?? course.rating ?? "");

  return {
    id: `${name}-${term}-${index}`,
    name,
    instructor: teacher,
    schedule: lectureSchedule || "Schedule TBA",
    description: `Term: ${term}`,
    color: "hsl(210, 70%, 52%)",
    rmpRating:
      Number.isFinite(avgRating) && avgRating > 0
        ? avgRating
        : Number.isFinite(fallbackRating) && fallbackRating > 0
          ? fallbackRating
          : undefined,
    rmpTakeAgain: Number.isFinite(takeAgain) && takeAgain >= 0 ? takeAgain : undefined,
    rmpAvgDifficulty: Number.isFinite(avgDiff) && avgDiff > 0 ? avgDiff : undefined,
    discussionSections: discussions.map((section, sectionIndex) => ({
      id: `${index}-${sectionIndex}`,
      name: `Discussion ${sectionIndex + 1}`,
      time: `${section.Days ?? ""} ${section.Time ?? ""}`.trim() || "TBA",
      location: section.Location?.trim() || "TBA",
    })),
    labSections: labs.map((section, sectionIndex) => ({
      id: `${index}-lab-${sectionIndex}`,
      name: `Lab ${sectionIndex + 1}`,
      time: `${section.Days ?? ""} ${section.Time ?? ""}`.trim() || "TBA",
      location: section.Location?.trim() || "TBA",
    })),
    midtermSections: midterms
      .filter((midterm) => {
        const days = midterm.Days?.trim() ?? "";
        const time = midterm.Time?.trim() ?? "";
        const location = midterm.Location?.trim() ?? "";
        return days.length > 0 || time.length > 0 || location.length > 0;
      })
      .map((midterm, midtermIndex): CourseExamSection => ({
        id: `${index}-midterm-${midtermIndex}`,
        name: `Midterm ${midtermIndex + 1}`,
        time: `${midterm.Days ?? ""} ${midterm.Time ?? ""}`.trim() || "TBA",
        location: midterm.Location?.trim() || "TBA",
      })),
    finalSection:
      finalExam &&
        ((finalExam.Days?.trim() ?? "").length > 0 ||
          (finalExam.Time?.trim() ?? "").length > 0 ||
          (finalExam.Location?.trim() ?? "").length > 0)
        ? {
          id: `${index}-final`,
          name: "Final Exam",
          time: `${finalExam.Days ?? ""} ${finalExam.Time ?? ""}`.trim() || "TBA",
          location: finalExam.Location?.trim() || "TBA",
        }
        : null,
  };
}
