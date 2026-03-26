import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CourseRow } from "../components/CourseRow";
import { Course } from "../data/sampleCourses";

const mockCourse: Course = {
  id: "CS101",
  name: "Intro to Computer Science",
  instructor: "Dr. Smith",
  description: "Introduction to programming",
  color: "#ff0000",
  discussionSections: [
    { id: "D1", section: "A", time: "MWF 10am", location: "Room 101" },
    { id: "D2", section: "B", time: "MWF 11am", location: "Room 102" },
  ],
  examSections: [],
  rmpRating: 4.5,
  rmpTakeAgain: 80,
  rmpAvgDifficulty: 3.0,
  schedule: "MWF 9am-10am",
  midterm: "Oct 15",
  final: "Dec 10",
};

describe("CourseRow", () => {
  it("should render course name", () => {
    render(
      <CourseRow
        course={mockCourse}
        isAdded={false}
        onAddToCalendar={() => {}}
      />
    );
    
    expect(screen.getByText("Intro to Computer Science")).toBeInTheDocument();
  });

  it("should render instructor name", () => {
    render(
      <CourseRow
        course={mockCourse}
        isAdded={false}
        onAddToCalendar={() => {}}
      />
    );
    
    expect(screen.getByText("Dr. Smith")).toBeInTheDocument();
  });

  it("should display course description when expanded", async () => {
    render(
      <CourseRow
        course={mockCourse}
        isAdded={false}
        onAddToCalendar={() => {}}
        isOpen={true}
      />
    );
    
    expect(screen.getByText("Introduction to programming")).toBeInTheDocument();
  });

  it("should render RMP rating when available", () => {
    render(
      <CourseRow
        course={mockCourse}
        isAdded={false}
        onAddToCalendar={() => {}}
      />
    );
    
    expect(screen.getByText(/RMP/)).toBeInTheDocument();
  });

  it("should render schedule information", () => {
    render(
      <CourseRow
        course={mockCourse}
        isAdded={false}
        onAddToCalendar={() => {}}
        isOpen={true}
      />
    );
    
    expect(screen.getByText("MWF 9am-10am")).toBeInTheDocument();
  });

  it("should render midterm info when present", () => {
    render(
      <CourseRow
        course={mockCourse}
        isAdded={false}
        onAddToCalendar={() => {}}
        isOpen={true}
      />
    );
    
    expect(screen.getByText("Midterm")).toBeInTheDocument();
    expect(screen.getByText("Oct 15")).toBeInTheDocument();
  });

  it("should render final info when present", () => {
    render(
      <CourseRow
        course={mockCourse}
        isAdded={false}
        onAddToCalendar={() => {}}
        isOpen={true}
      />
    );
    
    expect(screen.getByText("Final")).toBeInTheDocument();
    expect(screen.getByText("Dec 10")).toBeInTheDocument();
  });

  it("should show 'Added to Calendar' when isAdded is true", () => {
    render(
      <CourseRow
        course={mockCourse}
        isAdded={true}
        onAddToCalendar={() => {}}
        isOpen={true}
      />
    );
    
    expect(screen.getByText("Added to Calendar")).toBeInTheDocument();
  });

  it("should render without discussion sections", () => {
    const courseNoDiscussions: Course = {
      id: "CS201",
      name: "Data Structures",
      instructor: "Dr. Johnson",
      description: "Advanced data structures",
      color: "#00ff00",
      discussionSections: [],
      examSections: [],
    };

    render(
      <CourseRow
        course={courseNoDiscussions}
        isAdded={false}
        onAddToCalendar={() => {}}
        isOpen={true}
      />
    );
    
    expect(screen.getByText("Data Structures")).toBeInTheDocument();
  });

  it("should handle course without RMP rating", () => {
    const courseNoRmp: Course = {
      id: "CS300",
      name: "Algorithms",
      instructor: "Dr. Williams",
      description: "Algorithm design and analysis",
      color: "#0000ff",
      discussionSections: [],
      examSections: [],
    };

    render(
      <CourseRow
        course={courseNoRmp}
        isAdded={false}
        onAddToCalendar={() => {}}
        isOpen={true}
      />
    );
    
    // Should display RMP N/A when no rating
    expect(screen.getByText(/RMP.*N\/A/)).toBeInTheDocument();
  });

  it("should handle default isOpen when not provided", () => {
    render(
      <CourseRow
        course={mockCourse}
        isAdded={false}
        onAddToCalendar={() => {}}
      />
    );
    
    // Component should render without crashing
    expect(screen.getByText("Intro to Computer Science")).toBeInTheDocument();
  });
});