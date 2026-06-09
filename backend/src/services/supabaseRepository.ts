import type { PostgrestError } from "@supabase/supabase-js";
import type { Course } from "../models/Course.js";
import type { RMP } from "../models/RMP.js";
import type { Term } from "../models/Term.js";
import { connectToDB } from "./connectToDB.js";

type CourseRow = {
  id: string;
  name: string;
  term: string;
  teacher: string;
  name_key: string;
  lecture: unknown | null;
  labs: unknown[];
  discussions: unknown[];
  midterms: unknown[];
  final: unknown | null;
  rmp: RMP | null;
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
const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

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

function toCourseRow(course: Course) {
  return {
    name: course.Name,
    term: course.Term,
    teacher: course.Teacher,
    name_key: course.nameKey,
    lecture: course.Lecture,
    labs: course.Labs,
    discussions: course.Discussions,
    midterms: course.Midterms,
    final: course.Final,
    rmp: course.rmp,
  };
}

function toCourseDocument(row: CourseRow): Course & { id: string } {
  return {
    id: row.id,
    Name: row.name,
    Term: row.term,
    Teacher: row.teacher,
    Lecture: row.lecture as Course["Lecture"],
    Labs: row.labs as Course["Labs"],
    Discussions: row.discussions as Course["Discussions"],
    Midterms: row.midterms as Course["Midterms"],
    Final: row.final as Course["Final"],
    nameKey: row.name_key,
    rmp: row.rmp,
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
  const rows: CourseRow[] = [];
  let offset = 0;

  while (true) {
    let query = supabase
      .from("courses")
      .select("id,name,term,teacher,name_key,lecture,labs,discussions,midterms,final,rmp")
      .order("name", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (course.length > 0) {
      query = query.ilike("name", flexibleLikePattern(course));
    }

    if (term.length > 0) {
      query = query.ilike("term", flexibleLikePattern(term));
    }

    const { data, error } = await query;
    throwIfError(error);

    const page = (data ?? []) as CourseRow[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows.map(toCourseDocument);
}

export async function insertCourses(courses: Course[]) {
  if (courses.length <= 0) return;

  const supabase = connectToDB();
  const { error } = await supabase.from("courses").insert(courses.map(toCourseRow));
  throwIfError(error);
}

export async function deleteAllCourses() {
  const supabase = connectToDB();
  const { error } = await supabase.from("courses").delete().neq("id", ZERO_UUID);
  throwIfError(error);
}

export async function deleteAllProfessor() {
  const supabase = connectToDB();
  const { error } = await supabase.from("professor").delete().neq("id", ZERO_UUID);
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

export async function createTermRow(term: string) {
  const supabase = connectToDB();
  const { data: existing, error: findError } = await supabase
    .from("terms")
    .select("id")
    .eq("term", term)
    .maybeSingle();

  throwIfError(findError);
  if (existing) return;

  const { error } = await supabase.from("terms").insert({
    term,
    is_active: true,
  });

  throwIfError(error);
}

export async function markAllTermRowsInactive() {
  const supabase = connectToDB();
  const { error } = await supabase.from("terms").update({ is_active: false }).neq("id", ZERO_UUID);
  throwIfError(error);
}

export async function findCoursesByTerm(term: string) {
  return searchCourses("", term);
}

export async function upsertProfessorRows(rmpData: RMP[]) {
  if (rmpData.length <= 0) return;

  const rows = rmpData.map((rmp) => ({
    name: rmp.name,
    name_key: rmp.nameKey,
    avg_rating: rmp.avgRating,
    avg_diff: rmp.avgDiff,
    take_again_percent: rmp.takeAgainPercent,
  }));

  const supabase = connectToDB();
  const { error } = await supabase.from("professor").upsert(rows, {
    onConflict: "name_key",
  });

  throwIfError(error);
}

export async function updateCoursesRmpByNameKey(rmpByNameKey: Map<string, RMP>) {
  const supabase = connectToDB();
  let modifiedCount = 0;

  for (const [nameKey, rmp] of rmpByNameKey.entries()) {
    const { count, error } = await supabase
      .from("courses")
      .update({ rmp }, { count: "exact" })
      .eq("name_key", nameKey);

    throwIfError(error);
    modifiedCount += count ?? 0;
  }

  return modifiedCount;
}

export async function searchProfessor(nameKey?: string) {
  const supabase = connectToDB();
  let query = supabase
    .from("professor")
    .select("name,name_key,avg_rating,avg_diff,take_again_percent")
    .order("name", { ascending: true });

  if (nameKey) {
    query = query.eq("name_key", nameKey);
  }

  const { data, error } = await query;
  throwIfError(error);

  return ((data ?? []) as ProfessorRow[]).map(toRmpDocument);
}
