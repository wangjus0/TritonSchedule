import type { PostgrestError } from "@supabase/supabase-js";
import type { Course } from "../models/Course.js";
import type {
  ClassPlannerCatalogSnapshot,
  ClassPlannerCourse,
  ClassPlannerMeeting,
  ClassPlannerSection,
} from "../models/ClassPlannerCatalog.js";
import type { RMP } from "../models/RMP.js";
import type { Term } from "../models/Term.js";
import { buildLegacyCourses } from "../ingestion/buildClassPlannerCatalog.js";
import { connectToDB } from "./connectToDB.js";

type MeetingRow = ClassPlannerMeeting & {
  meeting_ordinal: number;
};

type SectionRow = Omit<ClassPlannerSection, "event_package_ids" | "meetings"> & {
  id: number;
  class_planner_section_meetings: MeetingRow[];
};

type OfferingRow = Omit<ClassPlannerCourse, "sections"> & {
  id: number;
  class_planner_sections: SectionRow[];
};

type ProfessorRow = {
  name: string;
  name_key: string;
  avg_rating: number;
  avg_diff: number;
  take_again_percent: number;
};

type TermRow = {
  term: string;
  is_active: boolean;
};

const PAGE_SIZE = 1000;

function throwIfError(error: PostgrestError | null) {
  if (error) throw error;
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

function flexibleLikePattern(value: string) {
  const tokens = value.trim().split(/\s+/).filter(Boolean).map(escapeLike);
  return `%${tokens.join("%")}%`;
}

function quotePostgrestValue(value: string) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function mapOfferingToCourse(
  row: OfferingRow,
  ratingsByNameKey: ReadonlyMap<string, RMP> = new Map(),
): Course & { id: string } {
  const classPlannerCourse: ClassPlannerCourse = {
    ...row,
    sections: row.class_planner_sections
      .map((section): ClassPlannerSection => ({
        ...section,
        event_package_ids: [],
        meetings: section.class_planner_section_meetings
          .slice()
          .sort((left, right) => left.meeting_ordinal - right.meeting_ordinal),
      }))
      .sort((left, right) => left.section_code.localeCompare(right.section_code)),
  };
  const course = buildLegacyCourses(row.term_code, [classPlannerCourse])[0]!;

  return {
    ...course,
    id: String(row.id),
    rmp: ratingsByNameKey.get(course.nameKey) ?? null,
  };
}

function toRmpDocument(row: ProfessorRow): RMP {
  return {
    avgRating: Number(row.avg_rating),
    avgDiff: Number(row.avg_diff),
    takeAgainPercent: Number(row.take_again_percent),
    name: row.name,
    nameKey: row.name_key,
  };
}

function toTermDocument(row: TermRow): Term {
  return {
    Term: row.term,
    IsActive: row.is_active,
  };
}

export async function searchCourses(course: string, term: string) {
  const supabase = connectToDB();
  const rows: OfferingRow[] = [];
  let offset = 0;

  while (true) {
    let query = supabase
      .from("class_planner_course_offerings")
      .select(`
        id,
        term_code,
        subject_code,
        course_code,
        module_code,
        module_name,
        course_title,
        section_count,
        open_section_count,
        open_seat_count,
        waitlist_available_count,
        instruction_types,
        instructors,
        availability_refresh_pending,
        is_topic_course,
        section_family,
        subject_name,
        academic_level,
        matching_section_count,
        units_display,
        prerequisites,
        restrictions,
        metadata_source,
        class_planner_sections (
          id,
          section_id,
          section_ref,
          section_code,
          instruction_type_name,
          capacity,
          enrolled,
          seats_available,
          waitlist_capacity,
          waitlist_enrolled,
          waitlist_available,
          status,
          instructors,
          class_planner_section_meetings (
            meeting_ordinal,
            meeting_kind,
            day_code,
            day_name,
            specific_date,
            start_minutes,
            end_minutes,
            start_time_display,
            end_time_display,
            building_code,
            room_code,
            building_name,
            room_name,
            is_remote,
            is_tba
          )
        )
      `)
      .order("module_code", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (course.length > 0) {
      const pattern = quotePostgrestValue(flexibleLikePattern(course));
      query = query.or([
        `module_code.ilike.${pattern}`,
        `module_name.ilike.${pattern}`,
        `course_title.ilike.${pattern}`,
      ].join(","));
    }

    if (term.length > 0) {
      query = query.eq("term_code", term.toUpperCase());
    }

    const { data, error } = await query;
    throwIfError(error);

    const page = (data ?? []) as unknown as OfferingRow[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  const courses = rows.map((row) => mapOfferingToCourse(row));

  if (courses.length === 0) {
    return courses;
  }

  const nameKeys = Array.from(new Set(
    courses.map(({ nameKey }) => nameKey).filter(Boolean),
  ));
  const ratings = nameKeys.length <= 100
    ? await searchProfessorRows(nameKeys)
    : await searchProfessor();
  const ratingsByNameKey = new Map(
    ratings.map((rating) => [rating.nameKey, rating]),
  );

  return courses.map((courseDocument) => ({
    ...courseDocument,
    rmp: ratingsByNameKey.get(courseDocument.nameKey) ?? null,
  }));
}

async function searchProfessorRows(nameKeys: string[]) {
  if (nameKeys.length === 0) {
    return [];
  }

  const supabase = connectToDB();
  const { data, error } = await supabase
    .from("professor")
    .select("name,name_key,avg_rating,avg_diff,take_again_percent")
    .in("name_key", nameKeys)
    .order("name", { ascending: true });

  throwIfError(error);
  return ((data ?? []) as ProfessorRow[]).map(toRmpDocument);
}

export async function replaceCatalog(
  term: string,
  professors: RMP[],
  catalog: ClassPlannerCatalogSnapshot,
) {
  if (catalog.offerings.length <= 0) {
    throw new Error("Refusing to replace catalog with no offerings");
  }

  const supabase = connectToDB();
  const { error } = await supabase.rpc("replace_class_planner_catalog", {
    p_catalog: catalog,
    p_courses: [],
    p_professors: professors,
    p_term: term,
  });

  throwIfError(error);
}

export async function getActiveTermRow() {
  const supabase = connectToDB();
  const { data, error } = await supabase
    .from("terms")
    .select("term,is_active")
    .eq("is_active", true)
    .maybeSingle();

  throwIfError(error);

  return data ? toTermDocument(data as TermRow) : null;
}

export async function searchProfessor(nameKey?: string) {
  const supabase = connectToDB();

  if (nameKey) {
    const { data, error } = await supabase
      .from("professor")
      .select("name,name_key,avg_rating,avg_diff,take_again_percent")
      .eq("name_key", nameKey)
      .order("name", { ascending: true });

    throwIfError(error);
    return ((data ?? []) as ProfessorRow[]).map(toRmpDocument);
  }

  const rows: ProfessorRow[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("professor")
      .select("name,name_key,avg_rating,avg_diff,take_again_percent")
      .order("name", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    throwIfError(error);

    const page = (data ?? []) as ProfessorRow[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows.map(toRmpDocument);
}
