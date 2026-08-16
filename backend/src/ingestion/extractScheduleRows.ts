import type { Page } from "puppeteer";

/**
 * Represents a course header row.
 */
export type RawCourseHeaderRow = {
  readonly kind: "course-header";
  readonly rowIndex: number;
  readonly restrictions: string;
  readonly courseNumber: string;
  readonly courseTitle: string;
  readonly details: string;
};

/**
 * Represents a class meeting row.
 */
export type RawMeetingRow = {
  readonly kind: "meeting";
  readonly rowIndex: number;
  readonly sectionId: string;
  readonly meetingType: string;
  readonly sectionCode: string;
  readonly days: string;
  readonly time: string;
  readonly building: string;
  readonly room: string;
  readonly instructor: string;
  readonly availableSeats: string;
  readonly seatLimit: string;
};

/**
 * Represents a midterm or final exam row.
 */
export type RawExamRow = {
  readonly kind: "exam";
  readonly rowIndex: number;
  readonly examType: "MI" | "FI";
  readonly date: string;
  readonly days: string;
  readonly time: string;
  readonly building: string;
  readonly room: string;
};

/**
 * Represents a schedule note row.
 */
export type RawScheduleNoteRow = {
  readonly kind: "note";
  readonly rowIndex: number;
  readonly text: string;
};

/**
 * Represents any supported schedule row.
 */
export type RawScheduleRow =
  | RawCourseHeaderRow
  | RawMeetingRow
  | RawExamRow
  | RawScheduleNoteRow;

/**
 * Extracts rows from the UCSD schedule table.
 *
 * @param page Browser page containing the schedule table.
 * @returns The extracted schedule rows.
 */
export async function extractScheduleRows(
  page: Page,
): Promise<RawScheduleRow[]> {
  return page.$$eval("#socDisplayCVO tr", (rows): RawScheduleRow[] => {
    const extracted: RawScheduleRow[] = [];

    rows.forEach((row, rowIndex) => {
      const headerCells = Array.from(
        row.querySelectorAll<HTMLTableCellElement>("td.crsheader"),
      );
      const titleElement = row.querySelector<HTMLSpanElement>(
        "td.crsheader span.boldtxt",
      );

      if (headerCells.length >= 3 && titleElement) {
        const restrictions = (headerCells[0]?.textContent ?? "")
          .replace(/\s+/g, " ")
          .trim();
        const courseNumber = (headerCells[1]?.textContent ?? "")
          .replace(/\s+/g, " ")
          .trim();
        const courseTitle = (titleElement.textContent ?? "")
          .replace(/\s+/g, " ")
          .trim();
        const details = (headerCells[2]?.textContent ?? "")
          .replace(/\s+/g, " ")
          .trim();

        if (courseNumber && courseTitle) {
          extracted.push({
            kind: "course-header",
            rowIndex,
            restrictions,
            courseNumber,
            courseTitle,
            details,
          });
        }

        return;
      }

      const cells = Array.from(
        row.querySelectorAll<HTMLTableCellElement>("td.brdr"),
        (cell) => (cell.textContent ?? "").replace(/\s+/g, " ").trim(),
      );

      if (cells.length === 0) {
        return;
      }

      const examType = cells[2];

      if (
        cells.length >= 8 &&
        (examType === "MI" || examType === "FI")
      ) {
        extracted.push({
          kind: "exam",
          rowIndex,
          examType,
          date: cells[3] ?? "",
          days: cells[4] ?? "",
          time: cells[5] ?? "",
          building: cells[6] ?? "",
          room: cells[7] ?? "",
        });
        return;
      }

      const meetingType = cells[3];

      if (cells.length >= 13 && meetingType) {
        extracted.push({
          kind: "meeting",
          rowIndex,
          sectionId: cells[2] ?? "",
          meetingType,
          sectionCode: cells[4] ?? "",
          days: cells[5] ?? "",
          time: cells[6] ?? "",
          building: cells[7] ?? "",
          room: cells[8] ?? "",
          instructor: cells[9] ?? "",
          availableSeats: cells[10] ?? "",
          seatLimit: cells[11] ?? "",
        });
        return;
      }

      const note = cells.filter(Boolean).join(" ");

      if (note) {
        extracted.push({
          kind: "note",
          rowIndex,
          text: note,
        });
      }
    });

    return extracted;
  });
}
