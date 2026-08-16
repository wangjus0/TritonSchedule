import { describe, expect, it } from "@jest/globals";
import { buildCourses } from "../../src/ingestion/buildCourses.js";
import type { RawScheduleRow } from "../../src/ingestion/extractScheduleRows.js";

describe("buildCourses", () => {
  it("builds courses and assigns each schedule row to its course", () => {
    const rows: RawScheduleRow[] = [
      {
        kind: "course-header",
        rowIndex: 0,
        restrictions: "",
        courseNumber: "100",
        courseTitle: "Advanced Data Structures",
        details: "",
      },
      {
        kind: "meeting",
        rowIndex: 1,
        sectionId: "123456",
        meetingType: "LE",
        sectionCode: "A00",
        days: "MWF",
        time: "10:00a-10:50a",
        building: "CENTR",
        room: "101",
        instructor: "Ada Lovelace",
        availableSeats: "10",
        seatLimit: "100",
      },
      {
        kind: "meeting",
        rowIndex: 2,
        sectionId: "123457",
        meetingType: "DI",
        sectionCode: "A01",
        days: "Tu",
        time: "2:00p-2:50p",
        building: "CENTR",
        room: "202",
        instructor: "Grace Hopper",
        availableSeats: "5",
        seatLimit: "30",
      },
      {
        kind: "exam",
        rowIndex: 3,
        examType: "MI",
        date: "10/20/2026",
        days: "Tu",
        time: "7:00p-9:00p",
        building: "CENTR",
        room: "101",
      },
      {
        kind: "course-header",
        rowIndex: 4,
        restrictions: "",
        courseNumber: "101",
        courseTitle: "Design and Analysis of Algorithms",
        details: "",
      },
      {
        kind: "meeting",
        rowIndex: 5,
        sectionId: "223456",
        meetingType: "IT",
        sectionCode: "A00",
        days: "TuTh",
        time: "11:00a-12:20p",
        building: "ONLINE",
        room: "",
        instructor: "Alan Turing",
        availableSeats: "2",
        seatLimit: "80",
      },
      {
        kind: "exam",
        rowIndex: 6,
        examType: "FI",
        date: "12/12/2026",
        days: "Sa",
        time: "8:00a-11:00a",
        building: "RCLAS",
        room: "R01",
      },
    ];

    expect(buildCourses("CSE", "FA26", rows)).toEqual([
      {
        Name: "CSE 100: Advanced Data Structures",
        Term: "FA26",
        Teacher: "Ada Lovelace",
        Lecture: {
          Days: "MWF",
          Time: "10:00a-10:50a",
          Location: "CENTR 101",
        },
        Labs: [],
        Discussions: [
          {
            Days: "Tu",
            Time: "2:00p-2:50p",
            Location: "CENTR 202",
          },
        ],
        Midterms: [
          {
            Days: "10/20/2026",
            Time: "7:00p-9:00p",
            Location: "CENTR 101",
          },
        ],
        Final: null,
        nameKey: "ada lovelace",
        rmp: null,
      },
      {
        Name: "CSE 101: Design and Analysis of Algorithms",
        Term: "FA26",
        Teacher: "Alan Turing",
        Lecture: {
          Days: "TuTh",
          Time: "11:00a-12:20p",
          Location: "ONLINE",
        },
        Labs: [],
        Discussions: [],
        Midterms: [],
        Final: {
          Days: "12/12/2026",
          Time: "8:00a-11:00a",
          Location: "RCLAS R01",
        },
        nameKey: "alan turing",
        rmp: null,
      },
    ]);
  });

  it("ignores notes and schedule rows that appear before a course header", () => {
    const rows: RawScheduleRow[] = [
      { kind: "note", rowIndex: 0, text: "Subject to change" },
      {
        kind: "exam",
        rowIndex: 1,
        examType: "FI",
        date: "12/12/2026",
        days: "Sa",
        time: "8:00a-11:00a",
        building: "RCLAS",
        room: "R01",
      },
    ];

    expect(buildCourses("CSE", "FA26", rows)).toEqual([]);
  });

  it("uses a seminar as the primary course meeting", () => {
    const rows: RawScheduleRow[] = [
      {
        kind: "course-header",
        rowIndex: 0,
        restrictions: "",
        courseNumber: "1",
        courseTitle: "Critical Approach to Community Practice",
        details: "",
      },
      {
        kind: "meeting",
        rowIndex: 1,
        sectionId: "42811",
        meetingType: "SE",
        sectionCode: "001",
        days: "MW",
        time: "5:00p-6:20p",
        building: "PODEM",
        room: "0273",
        instructor: "Michael Labat",
        availableSeats: "0",
        seatLimit: "41",
      },
    ];

    expect(buildCourses("CCE", "WI26", rows)[0]).toMatchObject({
      Teacher: "Michael Labat",
      Lecture: {
        Days: "MW",
        Time: "5:00p-6:20p",
        Location: "PODEM 0273",
      },
      nameKey: "michael labat",
    });
  });
});
