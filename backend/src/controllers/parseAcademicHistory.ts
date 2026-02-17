import fs from 'node:fs/promises';
import { PDFParse } from 'pdf-parse';
import path from 'node:path';

type ParsedCourse = {
  term: string;
  subject: string;
  course: string;
  title: string;
  units: number;
  grade?: string;
  points?: number;
  repeat?: string;
};

const COURSE_HEADER = 'Subject Course Course Title Units Grade Points Repeat';

const COURSE_ROW_REGEX =
  /^([A-Z&]+)\s+(\d+[A-Z]?)\s+(.+?)\s+(\d+\.\d{2})(?:\s+([A-Z][+-]?|P|NP|W|I|IP))?(?:\s+(\d+\.\d{2}))?(?:\s+(\w+))?$/;

function cleanLines(rawText: string): string[] {
  return rawText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter(
      (line) =>
        !/^Not an Official Transcript$/i.test(line) &&
        !/^page\s+\d+\s+of\s*\d+$/i.test(line) &&
        !/^--\s+\d+\s+of\s+\d+\s+--$/.test(line)
    );
}

function parseCourses(rawText: string): ParsedCourse[] {
  const lines = cleanLines(rawText);
  const courses: ParsedCourse[] = [];

  let currentTerm = '';
  let inCourseTable = false;

  for (const line of lines) {
    const termMatch = /^Term:\s+(.+)$/.exec(line);
    if (termMatch) {
      currentTerm = termMatch[1];
      inCourseTable = false;
      continue;
    }

    if (line === COURSE_HEADER) {
      inCourseTable = true;
      continue;
    }

    if (/^Term Credits Passed:/.test(line) || /^Entity Name Dates Credit$/.test(line)) {
      inCourseTable = false;
      continue;
    }

    if (!inCourseTable) {
      continue;
    }

    const courseMatch = COURSE_ROW_REGEX.exec(line);
    if (!courseMatch) {
      continue;
    }

    courses.push({
      term: currentTerm,
      subject: courseMatch[1],
      course: courseMatch[2],
      title: courseMatch[3],
      units: Number(courseMatch[4]),
      grade: courseMatch[5],
      points: courseMatch[6] ? Number(courseMatch[6]) : undefined,
      repeat: courseMatch[7]
    });
  }

  return courses;
}

async function parseAcademicHistory() {
  const pdfPath =
    process.argv[2] ??
    '/Users/justinwang/Downloads/academichistoryreviewpdf (2).pdf';
  const resolvedPath = path.resolve(pdfPath);

  const buffer = await fs.readFile(resolvedPath);
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  const courses = parseCourses(result.text);
  await parser.destroy();

  console.log(
    JSON.stringify(
      {
        file: resolvedPath,
        totalCourses: courses.length,
        courses
      },
      null,
      2
    )
  );

}

parseAcademicHistory();

