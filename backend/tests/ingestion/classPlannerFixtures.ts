import type {
  ClassPlannerCourse,
  ClassPlannerMeeting,
} from "../../src/models/ClassPlannerCatalog.js";

export const classMeeting: ClassPlannerMeeting = {
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

export function classPlannerCourse(
  index = 1,
  overrides: Partial<ClassPlannerCourse> = {},
): ClassPlannerCourse {
  const paddedIndex = String(index).padStart(8, "0");

  return {
    term_code: "FA26",
    subject_code: "CSE",
    course_code: String(index),
    module_code: `CSE-${index}`,
    module_name: `Course ${index}`,
    course_title: null,
    section_count: 1,
    open_section_count: 1,
    open_seat_count: 10,
    waitlist_available_count: 0,
    instruction_types: ["lecture"],
    instructors: ["Ada Lovelace"],
    availability_refresh_pending: false,
    is_topic_course: false,
    section_family: null,
    subject_name: "Computer Science and Engineering",
    academic_level: "UD",
    matching_section_count: 1,
    units_display: "4 units",
    prerequisites: [],
    restrictions: [],
    metadata_source: "UC San Diego course catalog",
    sections: [
      {
        section_id: `E ${paddedIndex}`,
        section_ref: `FA26:E ${paddedIndex}`,
        section_code: "001-000-LE",
        instruction_type_name: "lecture",
        event_package_ids: [`15${paddedIndex}`],
        capacity: 100,
        enrolled: 90,
        seats_available: 10,
        waitlist_capacity: null,
        waitlist_enrolled: 0,
        waitlist_available: null,
        status: "AC",
        instructors: ["Ada Lovelace"],
        meetings: [classMeeting],
      },
    ],
    ...overrides,
  };
}
