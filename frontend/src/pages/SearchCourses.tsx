import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CourseRow } from "@/components/CourseRow";
import { sampleCourses, Course, DiscussionSection } from "@/data/sampleCourses";
import { useCalendar } from "@/context/CalendarContext";
import { toast } from "sonner";

export default function SearchCourses() {
  const [searchQuery, setSearchQuery] = useState("");
  const { events, addEvent } = useCalendar();

  const filteredCourses = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return sampleCourses;
    
    return sampleCourses.filter(
      (course) =>
        course.name.toLowerCase().includes(query) ||
        course.instructor.toLowerCase().includes(query) ||
        course.description.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const addedCourseIds = useMemo(() => {
    return new Set(events.filter((e) => e.isCourse).map((e) => e.id));
  }, [events]);

  const handleAddToCalendar = (course: Course, selectedDiscussion?: DiscussionSection) => {
    const today = new Date();
    
    const timeMatch = course.schedule.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
    let startTime = "09:00";
    let endTime = "10:30";
    
    if (timeMatch) {
      startTime = convertTo24Hour(timeMatch[1]);
      endTime = convertTo24Hour(timeMatch[2]);
    }

    addEvent({
      id: course.id,
      title: course.name,
      date: today,
      startTime,
      endTime,
      color: course.color,
      isCourse: true,
    });

    const discussionInfo = selectedDiscussion ? ` with ${selectedDiscussion.name}` : "";
    toast.success(`${course.name}${discussionInfo} added to your calendar!`);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Search Courses</h1>
        <p className="text-muted-foreground">
          Find and add courses to your calendar
        </p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by course name, instructor, or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredCourses.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No courses found matching your search.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredCourses.map((course) => (
            <CourseRow
              key={course.id}
              course={course}
              isAdded={addedCourseIds.has(course.id)}
              onAddToCalendar={handleAddToCalendar}
            />
          ))}
        </div>
      )}
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
