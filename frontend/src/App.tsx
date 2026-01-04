import { useState } from "react";
import React from "react";
import "./style.css";

type ClassEntry = {
  id: string;
  course: string;
  section: string;
  type: string;
  days: string;
  time: string;
  building: string;
  room: string;
  instructor: string;
  available: string;
};

type ScheduledClass = ClassEntry & {
  startHour: number;
  endHour: number;
  dayIndices: number[];
};

// Parse time string like "8:00a-9:20a" to start and end hours
function parseTime(timeStr: string): { startHour: number; endHour: number } {
  const [start, end] = timeStr.split("-");

  const parseTimePart = (time: string): number => {
    const isPM = time.toLowerCase().includes("p");
    const timeOnly = time.replace(/[ap]/gi, "").trim();
    const [hours, minutes = "0"] = timeOnly.split(":");
    let hour = parseInt(hours, 10);
    const min = parseInt(minutes, 10);

    if (isPM && hour !== 12) hour += 12;
    if (!isPM && hour === 12) hour = 0;

    return hour + min / 60;
  };

  return {
    startHour: parseTimePart(start),
    endHour: parseTimePart(end),
  };
}

// Parse days string like "TuTh", "MWF", "M" to day indices (0=Mon, 1=Tue, etc.)
function parseDays(daysStr: string): number[] {
  const dayMap: Record<string, number> = {
    M: 0,
    Tu: 1,
    T: 1, // Sometimes just T
    W: 2,
    Th: 3,
    F: 4,
  };

  const days: number[] = [];
  let i = 0;

  while (i < daysStr.length) {
    if (daysStr[i] === "T") {
      if (i + 1 < daysStr.length && daysStr[i + 1] === "h") {
        days.push(dayMap["Th"]);
        i += 2;
      } else if (i + 1 < daysStr.length && daysStr[i + 1] === "u") {
        days.push(dayMap["Tu"]);
        i += 2;
      } else {
        days.push(dayMap["T"]);
        i += 1;
      }
    } else {
      const day = daysStr[i];
      if (dayMap[day] !== undefined) {
        days.push(dayMap[day]);
      }
      i += 1;
    }
  }

  return days.sort();
}

// Calculate grid position and span for a class block
function calculateClassPosition(
  startHour: number,
  endHour: number,
  dayIndex: number,
  minHour: number,
): { gridRow: number; gridRowSpan: number; gridColumn: number } {
  // 30-minute increments → 2 rows per hour; header rows offset by 2
  const startRow = Math.floor((startHour - minHour) * 2) + 2;
  const endRow = Math.ceil((endHour - minHour) * 2) + 2;
  const rowSpan = Math.max(1, endRow - startRow);

  return {
    gridRow: startRow,
    gridRowSpan: rowSpan,
    gridColumn: dayIndex + 2, // +2 for time column
  };
}

const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

type TimeSlot = {
  label: string;
  key: string;
};

// Generate time slots dynamically based on scheduled classes (30-minute increments)
function generateTimeSlots(scheduledClasses: ScheduledClass[]): {
  slots: TimeSlot[];
  minHour: number;
} {
  // Default range: 8 AM to 8 PM
  let minHour = 8;
  let maxHour = 20;

  if (scheduledClasses.length > 0) {
    const allStartHours = scheduledClasses.map((cls) => cls.startHour);
    const allEndHours = scheduledClasses.map((cls) => cls.endHour);
    minHour = Math.floor(Math.min(...allStartHours, minHour));
    maxHour = Math.ceil(Math.max(...allEndHours, maxHour));

    // Add padding: start 1 hour earlier, end 1 hour later
    minHour = Math.max(0, minHour - 1);
    maxHour = Math.min(24, maxHour + 1);
  }

  const slots: TimeSlot[] = [];
  for (let hour = minHour; hour <= maxHour; hour++) {
    for (const minute of [0, 30]) {
      const period = hour >= 12 ? "PM" : "AM";
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      // Only show label for hour markers (minute === 0), leave 30-minute slots empty
      const label = minute === 0 ? `${displayHour}:00 ${period}` : "";

      slots.push({
        label,
        key: `${hour}-${minute}`,
      });
    }
  }

  return { slots, minHour };
}

// Generate colors for different courses
const courseColors: Record<string, string> = {};
const colorPalette = [
  "#4A90E2", // Blue
  "#50C878", // Green
  "#FF6B6B", // Red
  "#FFA500", // Orange
  "#9B59B6", // Purple
  "#1ABC9C", // Teal
  "#E74C3C", // Dark Red
  "#3498DB", // Light Blue
];

let colorIndex = 0;
function getCourseColor(course: string): string {
  if (!courseColors[course]) {
    courseColors[course] = colorPalette[colorIndex % colorPalette.length];
    colorIndex++;
  }
  return courseColors[course];
}

// Type definitions for API response
type Course = {
  RestrictionCode: string;
  CourseNumber: string;
  SectionID: string;
  MeetingType: string;
  Section: string;
  Days: string;
  Time: string;
  Location: string;
  AvaliableSeats: string;
  Limit: string;
};

type ApiClass = {
  _id?: string;
  name: string;
  teacher: string;
  lectures: Course[];
  discussions: Course[];
  midterms: Course[];
  final: Course | null;
};

// Transform Course to ClassEntry
function transformCourseToClassEntry(
  course: Course,
  classItem: ApiClass,
  classIndex: number,
  sectionIndex: number,
  type: string,
): ClassEntry {
  // Parse location (format: "BUILDING ROOM" or just "TBA")
  const location = course.Location?.trim() || "TBA";
  const locationParts = location.split(/\s+/);
  const building =
    locationParts.length > 0 && locationParts[0] !== ""
      ? locationParts[0]
      : "TBA";
  const room =
    locationParts.length > 1 ? locationParts.slice(1).join(" ") : "TBA";

  // Extract course code from CourseNumber (e.g., "CSE 11" or "MATH 20A")
  const courseCode =
    course.CourseNumber || classItem.name.split(" ").slice(0, 2).join(" ");

  return {
    id: `${classItem._id || classIndex}-${type}-${course.SectionID || sectionIndex}`,
    course: courseCode || "Unknown",
    section: course.Section || course.SectionID || "Unknown",
    type: course.MeetingType || type,
    days: course.Days || "TBA",
    time: course.Time || "TBA",
    building: building,
    room: room,
    instructor: classItem.teacher || "TBA",
    available: `${course.AvaliableSeats || "0"}/${course.Limit || "0"}`,
  };
}

function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [apiClasses, setApiClasses] = useState<ApiClass[]>([]);
  const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(),
  );
  const [loadingClasses, setLoadingClasses] = useState<Set<string>>(new Set());
  const [classDetails, setClassDetails] = useState<Map<string, ApiClass>>(
    new Map(),
  );

  const handleSearch = async () => {
    // Always call the API endpoint when search button is clicked
    if (!searchQuery.trim()) {
      setApiClasses([]);
      setError("Please enter a search term");
      return;
    }

    setIsLoading(true);
    setError(null);
    // Clear previous results immediately
    setApiClasses([]);
    // Clear expanded sections when starting new search
    setExpandedSections(new Set());

    try {
      const url = `http://localhost:3000/api/courses?search=${encodeURIComponent(searchQuery.trim())}&term=WI26`;
      console.log("Fetching from URL:", url);

      const response = await fetch(url).catch((fetchError) => {
        console.error("Network error:", fetchError);
        throw new Error(
          "Failed to connect to server. Make sure the backend is running on http://localhost:3000",
        );
      });

      console.log("Response status:", response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Error response:", errorData);
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`,
        );
      }

      const data = await response.json();
      console.log("API response data:", data);
      console.log(
        "Number of classes received:",
        Array.isArray(data) ? data.length : "Not an array",
      );

      // Check if data is an array
      if (!Array.isArray(data)) {
        console.error("Expected array but got:", typeof data, data);
        throw new Error("Invalid response format from server");
      }

      // Always update with the API response, even if empty
      setApiClasses(data);

      if (data.length === 0) {
        setError("No courses found. Try a different search term.");
      } else {
        setError(null); // Clear any previous errors
        console.log("Successfully rendered", data.length, "classes");
      }
    } catch (err) {
      console.error("Error fetching courses:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to search courses. Please try again.";
      setError(errorMessage);
      setApiClasses([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddClass = (classEntry: ClassEntry) => {
    const { startHour, endHour } = parseTime(classEntry.time);
    const dayIndices = parseDays(classEntry.days);

    // Check for conflicts
    const hasConflict = scheduledClasses.some((scheduled) => {
      const sameDay = scheduled.dayIndices.some((day) =>
        dayIndices.includes(day),
      );
      if (!sameDay) return false;

      return (
        (startHour >= scheduled.startHour && startHour < scheduled.endHour) ||
        (endHour > scheduled.startHour && endHour <= scheduled.endHour) ||
        (startHour <= scheduled.startHour && endHour >= scheduled.endHour)
      );
    });

    if (hasConflict) {
      alert(`Conflict detected! This class overlaps with an existing class.`);
      return;
    }

    const scheduledClass: ScheduledClass = {
      ...classEntry,
      startHour,
      endHour,
      dayIndices,
    };

    setScheduledClasses([...scheduledClasses, scheduledClass]);
  };

  const handleRemoveClass = (id: string) => {
    setScheduledClasses(scheduledClasses.filter((cls) => cls.id !== id));
  };

  const fetchClassDetails = async (classId: string) => {
    // Check if we already have the details
    if (classDetails.has(classId)) {
      return classDetails.get(classId)!;
    }

    // Check if already loading
    if (loadingClasses.has(classId)) {
      return null;
    }

    setLoadingClasses((prev) => new Set(prev).add(classId));

    try {
      const url = `http://localhost:3000/api/courses/${classId}`;
      console.log("Fetching class details from URL:", url);

      const response = await fetch(url).catch((fetchError) => {
        console.error("Network error:", fetchError);
        throw new Error("Failed to connect to server");
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`,
        );
      }

      const data = await response.json();
      console.log("Class details fetched:", data);

      // Store the fetched class details
      setClassDetails((prev) => {
        const newMap = new Map(prev);
        newMap.set(classId, data);
        return newMap;
      });

      return data;
    } catch (err) {
      console.error("Error fetching class details:", err);
      return null;
    } finally {
      setLoadingClasses((prev) => {
        const newSet = new Set(prev);
        newSet.delete(classId);
        return newSet;
      });
    }
  };

  const toggleClass = async (classId: string) => {
    const key = `${classId}-class`;
    const isExpanding = !expandedSections.has(key);

    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        // Collapsing - remove class and all its sections
        newSet.delete(key);
        newSet.delete(`${classId}-lectures`);
        newSet.delete(`${classId}-discussions`);
      } else {
        // Expanding - add class key and auto-expand all sections
        newSet.add(key);
        newSet.add(`${classId}-lectures`);
        newSet.add(`${classId}-discussions`);
      }
      return newSet;
    });

    // Fetch class details from DB when expanding
    if (isExpanding) {
      await fetchClassDetails(classId);
    }
  };

  const toggleSection = (classId: string, sectionType: string) => {
    const key = `${classId}-${sectionType}`;
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const handleAddCourse = (
    course: Course,
    classItem: ApiClass,
    type: string,
  ) => {
    const classEntry = transformCourseToClassEntry(
      course,
      classItem,
      0,
      0,
      type,
    );
    handleAddClass(classEntry);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">TritonSchedule</h1>
      </header>

      <main className="main-content">
        {/* Search Section */}
        <section className="search-section">
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="Search for classes (e.g., CSE 8A, MATH 20A)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            />
            <button className="search-button" onClick={handleSearch}>
              Search
            </button>
          </div>
        </section>

        {/* Class Results Section */}
        <section className="results-section">
          <div className="results-container">
            <h2 className="results-title">Search Results</h2>
            {isLoading && (
              <p style={{ padding: "1rem", textAlign: "center" }}>Loading...</p>
            )}
            {error && (
              <p style={{ padding: "1rem", color: "red", textAlign: "center" }}>
                {error}
              </p>
            )}
            {!isLoading && !error && apiClasses.length === 0 && (
              <p style={{ padding: "1rem", textAlign: "center" }}>
                No courses found. Try searching for a course.
              </p>
            )}
            <div className="results-hierarchy-wrapper">
              {apiClasses.map((classItem, classIndex) => {
                const classId = classItem._id || `class-${classIndex}`;
                const classKey = `${classId}-class`;
                const lecturesKey = `${classId}-lectures`;
                const discussionsKey = `${classId}-discussions`;
                const classExpanded = expandedSections.has(classKey);
                const lecturesExpanded = expandedSections.has(lecturesKey);
                const discussionsExpanded =
                  expandedSections.has(discussionsKey);

                // Use fetched class details if available, otherwise use the original classItem
                const displayClass = classDetails.get(classId) || classItem;
                const isLoadingClass = loadingClasses.has(classId);

                return (
                  <div key={classId} className="class-group">
                    <div
                      className="class-header"
                      onClick={() => toggleClass(classId)}
                    >
                      <span className="class-chevron">
                        {classExpanded ? "▼" : "▶"}
                      </span>
                      <span className="class-name">{classItem.name}</span>
                      {classItem.teacher && (
                        <span className="class-teacher">
                          by {classItem.teacher}
                        </span>
                      )}
                      <span className="class-metrics">
                        Difficulty: -- • Rating: --
                      </span>
                    </div>
                    {classExpanded && (
                      <div className="class-content">
                        {isLoadingClass && (
                          <div
                            style={{
                              padding: "1rem",
                              textAlign: "center",
                              color: "#5c6470",
                            }}
                          >
                            Loading class details...
                          </div>
                        )}
                        {/* Class Sections (Lectures) */}
                        {displayClass.lectures &&
                          displayClass.lectures.length > 0 && (
                            <div className="class-section-group">
                              <div
                                className="section-header"
                                onClick={() =>
                                  toggleSection(classId, "lectures")
                                }
                              >
                                <span className="section-chevron">
                                  {lecturesExpanded ? "▼" : "▶"}
                                </span>
                                <span className="section-title">
                                  Class Sections
                                </span>
                                <span className="section-count">
                                  ({displayClass.lectures.length})
                                </span>
                              </div>
                              {lecturesExpanded && (
                                <div className="section-content">
                                  <div className="section-item all-sections">
                                    <span className="section-label">
                                      ALL SECTIONS
                                    </span>
                                  </div>
                                  {displayClass.lectures.map((lecture, idx) => {
                                    const entry = transformCourseToClassEntry(
                                      lecture,
                                      displayClass,
                                      classIndex,
                                      idx,
                                      "lecture",
                                    );
                                    const isScheduled = scheduledClasses.some(
                                      (sc) => sc.id === entry.id,
                                    );
                                    return (
                                      <div key={idx} className="section-item">
                                        <div className="section-details">
                                          <span>
                                            {lecture.Section ||
                                              lecture.SectionID}
                                          </span>
                                          <span>
                                            {lecture.Days} {lecture.Time}
                                          </span>
                                          <span>{lecture.Location}</span>
                                          <span>
                                            {lecture.AvaliableSeats}/
                                            {lecture.Limit}
                                          </span>
                                        </div>
                                        {isScheduled ? (
                                          <button
                                            className="action-btn remove-btn"
                                            onClick={() =>
                                              handleRemoveClass(entry.id)
                                            }
                                          >
                                            Remove
                                          </button>
                                        ) : (
                                          <button
                                            className="action-btn"
                                            onClick={() =>
                                              handleAddCourse(
                                                lecture,
                                                displayClass,
                                                "lecture",
                                              )
                                            }
                                          >
                                            Add
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                        {/* Discussions */}
                        {classItem.discussions &&
                          classItem.discussions.length > 0 && (
                            <div className="class-section-group">
                              <div
                                className="section-header"
                                onClick={() =>
                                  toggleSection(classId, "discussions")
                                }
                              >
                                <span className="section-chevron">
                                  {discussionsExpanded ? "▼" : "▶"}
                                </span>
                                <span className="section-title">
                                  Discussions
                                </span>
                                <span className="section-count">
                                  ({displayClass.discussions.length})
                                </span>
                              </div>
                              {discussionsExpanded && (
                                <div className="section-content">
                                  <div className="section-item all-sections">
                                    <span className="section-label">
                                      ALL DISCUSSIONS
                                    </span>
                                  </div>
                                  {displayClass.discussions.map(
                                    (discussion, idx) => {
                                      const entry = transformCourseToClassEntry(
                                        discussion,
                                        displayClass,
                                        classIndex,
                                        idx,
                                        "discussion",
                                      );
                                      const isScheduled = scheduledClasses.some(
                                        (sc) => sc.id === entry.id,
                                      );
                                      return (
                                        <div key={idx} className="section-item">
                                          <div className="section-details">
                                            <span>
                                              {discussion.Section ||
                                                discussion.SectionID}
                                            </span>
                                            <span>
                                              {discussion.Days}{" "}
                                              {discussion.Time}
                                            </span>
                                            <span>{discussion.Location}</span>
                                            <span>
                                              {discussion.AvaliableSeats}/
                                              {discussion.Limit}
                                            </span>
                                          </div>
                                          {isScheduled ? (
                                            <button
                                              className="action-btn remove-btn"
                                              onClick={() =>
                                                handleRemoveClass(entry.id)
                                              }
                                            >
                                              Remove
                                            </button>
                                          ) : (
                                            <button
                                              className="action-btn"
                                              onClick={() =>
                                                handleAddCourse(
                                                  discussion,
                                                  displayClass,
                                                  "discussion",
                                                )
                                              }
                                            >
                                              Add
                                            </button>
                                          )}
                                        </div>
                                      );
                                    },
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                        {/* Midterm */}
                        {displayClass.midterms &&
                          displayClass.midterms.length > 0 && (
                            <div className="class-section-group">
                              <div className="section-header">
                                <span className="section-chevron"></span>
                                <span className="section-title">Midterm</span>
                              </div>
                              <div className="section-content">
                                {displayClass.midterms.map((midterm, idx) => (
                                  <div key={idx} className="section-item">
                                    <div className="section-details">
                                      <span>
                                        {midterm.Days} {midterm.Time}
                                      </span>
                                      <span>{midterm.Location}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        {/* Final */}
                        {displayClass.final && (
                          <div className="class-section-group">
                            <div className="section-header">
                              <span className="section-chevron"></span>
                              <span className="section-title">Final</span>
                            </div>
                            <div className="section-content">
                              <div className="section-item">
                                <div className="section-details">
                                  <span>
                                    {displayClass.final.Days}{" "}
                                    {displayClass.final.Time}
                                  </span>
                                  <span>{displayClass.final.Location}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Calendar Section */}
        <section className="calendar-section">
          <div className="calendar-container">
            <h2 className="calendar-title">Weekly Schedule</h2>
            <div className="calendar-wrapper">
              {(() => {
                const { slots: timeSlots, minHour } =
                  generateTimeSlots(scheduledClasses);
                const numRows = timeSlots.length;

                return (
                  <div
                    className="calendar-grid"
                    style={{
                      gridTemplateRows: `50px repeat(${numRows}, 30px)`,
                    }}
                  >
                    {/* Time header (empty top-left cell) - explicitly positioned */}
                    <div
                      className="time-header"
                      style={{ gridRow: 1, gridColumn: 1 }}
                    ></div>

                    {/* Day headers - explicitly positioned in row 1 */}
                    {weekdays.map((day, index) => (
                      <div
                        key={day}
                        className="day-header"
                        style={{ gridRow: 1, gridColumn: index + 2 }}
                      >
                        {day}
                      </div>
                    ))}

                    {/* Time slots and day cells - explicitly positioned */}
                    {timeSlots.map((slot, slotIndex) => {
                      const row = slotIndex + 2; // +2 because row 1 is header
                      return (
                        <React.Fragment key={slot.key}>
                          {/* Time slot - explicitly positioned */}
                          <div
                            className="time-slot"
                            style={{ gridRow: row, gridColumn: 1 }}
                          >
                            {slot.label}
                          </div>

                          {/* Day cells for this time slot - explicitly positioned */}
                          {weekdays.map((day, dayIndex) => (
                            <div
                              key={`${day}-${slot.key}`}
                              className="day-cell"
                              style={{ gridRow: row, gridColumn: dayIndex + 2 }}
                            ></div>
                          ))}
                        </React.Fragment>
                      );
                    })}

                    {/* Class blocks - rendered as direct children of calendar-grid */}
                    {scheduledClasses.map((cls) => {
                      return cls.dayIndices.map((dayIndex) => {
                        const pos = calculateClassPosition(
                          cls.startHour,
                          cls.endHour,
                          dayIndex,
                          minHour,
                        );
                        return (
                          <div
                            key={`${cls.id}-${dayIndex}`}
                            className="class-block"
                            style={{
                              gridRow: `${pos.gridRow} / span ${pos.gridRowSpan}`,
                              gridColumn: pos.gridColumn,
                              backgroundColor: getCourseColor(cls.course),
                            }}
                            title={`${cls.course} ${cls.section} - ${cls.time} - ${cls.building} ${cls.room}`}
                          >
                            <div className="class-block-content">
                              <div className="class-block-title">
                                {cls.course} {cls.section}
                              </div>
                              <div className="class-block-details">
                                {cls.time} • {cls.building} {cls.room}
                              </div>
                              <div className="class-block-type">{cls.type}</div>
                            </div>
                          </div>
                        );
                      });
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
