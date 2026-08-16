import { describe, expect, it } from "@jest/globals";
import { mapOfferingToCourse } from "../../src/services/supabaseRepository.js";

const classMeeting = {
  meeting_ordinal: 0,
  meeting_kind: "class",
  day_code: "T",
  day_name: "Tuesday",
  specific_date: null,
  start_minutes: 1020,
  end_minutes: 1100,
  start_time_display: "5:00pm",
  end_time_display: "6:20pm",
  building_code: "CENTR",
  room_code: "CENTR 101",
  building_name: "Center Hall",
  room_name: "Room 101",
  is_remote: false,
  is_tba: false,
};

describe("mapOfferingToCourse", () => {
  it("maps offering, section, and meeting foreign keys into the course API shape", () => {
    const offering = {
      id: 401,
      term_code: "FA26",
      subject_code: "CSE",
      course_code: "100",
      module_code: "CSE-100",
      module_name: "Advanced Data Structures",
      course_title: null,
      section_count: 2,
      open_section_count: 2,
      open_seat_count: 20,
      waitlist_available_count: 0,
      instruction_types: ["lecture", "discussion"],
      instructors: ["Ada Lovelace"],
      availability_refresh_pending: false,
      is_topic_course: false,
      section_family: null,
      subject_name: "Computer Science and Engineering",
      academic_level: "UD",
      matching_section_count: 2,
      units_display: "4 units",
      prerequisites: [],
      restrictions: [],
      metadata_source: "UC San Diego course catalog",
      class_planner_sections: [
        {
          id: 9001,
          section_id: "E 00000001",
          section_ref: "FA26:E 00000001",
          section_code: "001-000-LE",
          instruction_type_name: "lecture",
          capacity: 100,
          enrolled: 90,
          seats_available: 10,
          waitlist_capacity: null,
          waitlist_enrolled: 0,
          waitlist_available: null,
          status: "AC",
          instructors: ["Ada Lovelace"],
          class_planner_section_meetings: [classMeeting],
        },
        {
          id: 9002,
          section_id: "E 00000002",
          section_ref: "FA26:E 00000002",
          section_code: "001-001-DI",
          instruction_type_name: "discussion",
          capacity: 30,
          enrolled: 25,
          seats_available: 5,
          waitlist_capacity: null,
          waitlist_enrolled: 0,
          waitlist_available: null,
          status: "AC",
          instructors: [],
          class_planner_section_meetings: [
            { ...classMeeting, day_code: "R", day_name: "Thursday" },
          ],
        },
      ],
    };
    const rating = {
      avgRating: 4.8,
      avgDiff: 2.1,
      takeAgainPercent: 91,
      name: "Ada Lovelace",
      nameKey: "ada lovelace",
    };

    const result = mapOfferingToCourse(
      offering as Parameters<typeof mapOfferingToCourse>[0],
      new Map([[rating.nameKey, rating]]),
    );

    expect(result).toMatchObject({
      id: "401",
      Name: "CSE 100: Advanced Data Structures",
      Term: "FA26",
      Teacher: "Ada Lovelace",
      Lecture: {
        Days: "Tue",
        Time: "5:00pm-6:20pm",
        Location: "CENTR 101",
      },
      Discussions: [{ Days: "Thu" }],
      rmp: rating,
    });
  });
});
