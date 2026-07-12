import type { Course } from "../models/Course.js";
import type { RMP } from "../models/RMP.js";
import type { Term } from "../models/Term.js";

export type CourseDocument = Course & { rmp?: RMP | null };

type CourseRow = {
  payload: CourseDocument;
  rmp: RMP | null;
};

type RmpRow = {
  payload: RMP;
};

const REST_PREFIX = "/rest/v1";

export class SupabaseConfigError extends Error {
  constructor(missing: string[]) {
    super(`Missing Supabase environment variable${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}`);
    this.name = "SupabaseConfigError";
  }
}

export class SupabaseQueryError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "SupabaseQueryError";
  }
}

export function isSupabaseConfigError(error: unknown) {
  return error instanceof SupabaseConfigError;
}

export function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const missing: string[] = [];

  if (!url) missing.push("SUPABASE_URL");
  if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) throw new SupabaseConfigError(missing);

  return { url, serviceRoleKey };
}

async function supabaseRequest<T>(path: string, init: RequestInit = {}) {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const headers = new Headers(init.headers);

  headers.set("apikey", serviceRoleKey);
  headers.set("Authorization", `Bearer ${serviceRoleKey}`);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${url}${REST_PREFIX}/${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new SupabaseQueryError(response.status, body || response.statusText);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}

function courseRow(course: CourseDocument) {
  return {
    name: course.Name,
    term: course.Term,
    teacher: course.Teacher,
    name_key: course.nameKey,
    payload: course,
    rmp: course.rmp ?? null,
  };
}

function withSearchPattern(value: string) {
  const pattern = value.replace(/\*/g, "").trim().replace(/\s+/g, "*");
  return `*${pattern}*`;
}

function mergeCourse(row: CourseRow): CourseDocument {
  return {
    ...row.payload,
    rmp: row.rmp ?? row.payload.rmp ?? null,
  };
}

export async function pingSupabase() {
  await supabaseRequest<unknown[]>("terms?select=term&limit=1");
}

export async function searchCourses(course: string, term: string) {
  const params = new URLSearchParams({
    select: "payload,rmp",
    order: "name.asc",
  });

  if (course.length > 0) {
    params.set("name", `ilike.${withSearchPattern(course)}`);
  }

  if (term.length > 0) {
    params.set("term", `ilike.${withSearchPattern(term)}`);
  }

  const rows = await supabaseRequest<CourseRow[]>(`courses?${params}`);
  return rows.map(mergeCourse);
}

export async function listCoursesByTerm(term: string) {
  const params = new URLSearchParams({
    select: "payload,rmp",
    term: `eq.${term}`,
  });
  const rows = await supabaseRequest<CourseRow[]>(`courses?${params}`);
  return rows.map(mergeCourse);
}

export async function insertCourses(courses: CourseDocument[]) {
  if (courses.length === 0) return;

  await supabaseRequest("courses", {
    method: "POST",
    headers: {
      Prefer: "return=minimal",
    },
    body: JSON.stringify(courses.map(courseRow)),
  });
}

export async function clearCourseCatalog() {
  await supabaseRequest("courses?id=not.is.null", { method: "DELETE" });
  await supabaseRequest("rmp_data?name_key=not.is.null", { method: "DELETE" });
}

export async function getActiveTerm() {
  const rows = await supabaseRequest<Array<{ term: string; is_active: boolean }>>(
    "terms?select=term,is_active&is_active=eq.true&limit=1",
  );
  const term = rows[0];

  return term ? ({ Term: term.term, IsActive: term.is_active } satisfies Term) : null;
}

export async function upsertActiveTerm(term: string) {
  await supabaseRequest("terms?on_conflict=term", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      term,
      is_active: true,
      updated_at: new Date().toISOString(),
    }),
  });
}

export async function markTermsInactive() {
  await supabaseRequest("terms?is_active=eq.true", {
    method: "PATCH",
    headers: {
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      is_active: false,
      updated_at: new Date().toISOString(),
    }),
  });
}

export async function upsertRmpRecords(records: RMP[]) {
  if (records.length === 0) return;

  await supabaseRequest("rmp_data?on_conflict=name_key", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(
      records.map((record) => ({
        name_key: record.nameKey,
        payload: record,
        updated_at: new Date().toISOString(),
      })),
    ),
  });
}

export async function updateCourseRmp(nameKey: string, rmp: RMP) {
  await supabaseRequest(`courses?name_key=eq.${encodeURIComponent(nameKey)}`, {
    method: "PATCH",
    headers: {
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      rmp,
      updated_at: new Date().toISOString(),
    }),
  });
}

export async function searchRmp(nameKey?: string) {
  const params = new URLSearchParams({ select: "payload" });
  if (nameKey) {
    params.set("name_key", `eq.${nameKey}`);
  }

  const rows = await supabaseRequest<RmpRow[]>(`rmp_data?${params}`);
  return rows.map((row) => row.payload);
}
