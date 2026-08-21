import type { Course } from "../models/Course.js";
import type { RMP } from "../models/RMP.js";
import {
  normalizeTeacherKey,
  teacherNamesMatch,
} from "../utils/normalizeTeacherKey.js";

const RMP_API_URL = "https://www.ratemyprofessors.com/graphql";
const SCHOOL_NAME = "University of California San Diego";
const REQUEST_CONCURRENCY = 1;
const MAX_REQUEST_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_WARNING_DETAILS = 20;
const RATE_LIMIT_RETRY_BASE_MS = 2_000;
const TRANSIENT_RETRY_BASE_MS = 200;

const RMP_HEADERS = {
  Accept: "application/json",
  Authorization: "Basic dGVzdDp0ZXN0",
  "Content-Type": "application/json",
  "User-Agent": "TritonSchedule catalog ingestion",
} as const;

const SCHOOL_QUERY = `
  query SchoolSearch($query: SchoolSearchQuery!) {
    newSearch {
      schools(query: $query) {
        edges {
          node {
            id
            name
          }
        }
      }
    }
  }
`;

const PROFESSOR_QUERY = `
  query TeacherSearch(
    $query: TeacherSearchQuery!
    $schoolID: ID
    $includeSchoolFilter: Boolean!
  ) {
    search: newSearch {
      teachers(query: $query, first: 8, after: "") {
        edges {
          node {
            id
            legacyId
            avgRating
            avgDifficulty
            wouldTakeAgainPercent
            firstName
            lastName
          }
        }
      }
    }
    school: node(id: $schoolID) @include(if: $includeSchoolFilter) {
      id
    }
  }
`;

type FetchResponse = Pick<Response, "json" | "ok" | "status" | "statusText">;

/** Fetch-compatible client used for Rate My Professors GraphQL requests. */
export type RmpFetch = (
  input: string,
  init?: RequestInit,
) => Promise<FetchResponse>;

type GraphqlEnvelope<T> = Readonly<{
  data?: T;
  errors?: Array<Readonly<{ message?: string }>>;
}>;

type SchoolSearchData = Readonly<{
  newSearch: Readonly<{
    schools: Readonly<{
      edges: Array<Readonly<{
        node: Readonly<{ id: string; name: string }>;
      }>>;
    }>;
  }>;
}>;

type ProfessorNode = Readonly<{
  legacyId: string | number;
  avgRating: number;
  avgDifficulty: number;
  wouldTakeAgainPercent: number | null;
  firstName: string;
  lastName: string;
}>;

type ProfessorSearchData = Readonly<{
  search: Readonly<{
    teachers: Readonly<{
      edges: Array<Readonly<{ node: ProfessorNode }>>;
    }>;
  }>;
}>;

/** Counts unique instructor lookups and their outcomes. */
export type ProfessorEnrichmentCounts = Readonly<{
  requested: number;
  matched: number;
  unmatched: number;
  failed: number;
  successfulRequests: number;
}>;

/** Contains enriched course copies, successful ratings, counts, and warnings. */
export type CourseRatingEnrichment = Readonly<{
  courses: Course[];
  professors: RMP[];
  unmatchedNameKeys: string[];
  counts: ProfessorEnrichmentCounts;
  warnings: string[];
}>;

/** Defines the injectable operation used by professor enrichment. */
export type EnrichCoursesWithRatingsDependencies = Readonly<{
  fetch: RmpFetch;
}>;

const productionDependencies: EnrichCoursesWithRatingsDependencies = {
  fetch: globalThis.fetch,
};

/** Indicates that the professor phase completed no professor requests. */
export class ProfessorEnrichmentUnavailableError extends Error {
  readonly counts: ProfessorEnrichmentCounts;

  constructor(message: string, counts: ProfessorEnrichmentCounts) {
    super(message);
    this.name = "ProfessorEnrichmentUnavailableError";
    this.counts = counts;
  }
}

/** Converts a nullable percentage to a truncated integer from 0 through 100. */
export function normalizePercentage(value: number | null): number {
  if (value === null || !Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.trunc(value)));
}

/**
 * Fetches ratings for unique course instructors without mutating input courses.
 *
 * Successful lookups are returned even when other lookups fail.
 * Existing course ratings are retained for unmatched or failed lookups.
 *
 * @param courses Courses whose instructors should be looked up.
 * @param dependencies Injectable fetch client used by tests.
 * @returns Enriched course copies, successful ratings, outcome counts, and warnings.
 * @throws ProfessorEnrichmentUnavailableError when the school lookup fails or no professor request succeeds.
 */
export async function enrichCoursesWithRatings(
  courses: readonly Course[],
  dependencies: EnrichCoursesWithRatingsDependencies = productionDependencies,
): Promise<CourseRatingEnrichment> {
  const teachersByKey = new Map<string, string>();
  for (const { Teacher } of courses) {
    const teacherName = Teacher.trim();
    const teacherKey = normalizeTeacherKey(teacherName);
    if (teacherKey && !teachersByKey.has(teacherKey)) {
      teachersByKey.set(teacherKey, teacherName);
    }
  }
  const teachers = Array.from(
    teachersByKey,
    ([teacherKey, teacherName]) => ({ teacherKey, teacherName }),
  );

  if (teachers.length === 0) {
    return {
      courses: courses.map((course) => ({ ...course })),
      professors: [],
      unmatchedNameKeys: [],
      counts: emptyCounts(),
      warnings: [],
    };
  }

  let schoolId: string;

  try {
    schoolId = await findSchoolId(dependencies.fetch);
  } catch (error) {
    throw new ProfessorEnrichmentUnavailableError(
      `Rate My Professors school lookup failed: ${errorMessage(error)}`,
      { ...emptyCounts(), requested: teachers.length },
    );
  }

  const results = await parallelMap(
    teachers,
    REQUEST_CONCURRENCY,
    async ({ teacherKey, teacherName }) => {
      try {
        const professor = await findProfessor(
          teacherName,
          teacherKey,
          schoolId,
          dependencies.fetch,
        );
        return { professor, teacherKey } as const;
      } catch (error) {
        return { error: errorMessage(error), teacherKey } as const;
      }
    },
  );
  const professors: RMP[] = [];
  const unmatchedNameKeys: string[] = [];
  const warnings: string[] = [];
  let failed = 0;
  let successfulRequests = 0;
  let unmatched = 0;

  for (const result of results) {
    if ("error" in result) {
      failed += 1;
      if (warnings.length < MAX_WARNING_DETAILS) {
        warnings.push(`${result.teacherKey}: ${result.error}`);
      }
      continue;
    }

    successfulRequests += 1;
    if (result.professor) {
      professors.push(result.professor);
    } else {
      unmatched += 1;
      unmatchedNameKeys.push(result.teacherKey);
    }
  }

  const counts: ProfessorEnrichmentCounts = {
    requested: teachers.length,
    matched: professors.length,
    unmatched,
    failed,
    successfulRequests,
  };

  if (failed > warnings.length) {
    warnings.push(`${failed - warnings.length} additional professor requests failed`);
  }

  if (successfulRequests === 0) {
    throw new ProfessorEnrichmentUnavailableError(
      "Rate My Professors did not complete any professor requests",
      counts,
    );
  }

  const ratingsByNameKey = new Map(
    professors.map((professor) => [professor.nameKey, professor]),
  );

  return {
    courses: courses.map((course) => ({
      ...course,
      rmp: ratingsByNameKey.get(course.nameKey) ?? course.rmp,
    })),
    professors,
    unmatchedNameKeys,
    counts,
    warnings,
  };
}

async function findSchoolId(fetcher: RmpFetch): Promise<string> {
  const data = await fetchGraphql<SchoolSearchData>(
    SCHOOL_QUERY,
    { query: { text: SCHOOL_NAME } },
    fetcher,
  );
  const schools = data.newSearch.schools.edges.map(({ node }) => node);
  const school = schools.find(
    ({ name }) => name.trim().toLowerCase() === SCHOOL_NAME.toLowerCase(),
  ) ?? schools[0];

  if (!school?.id) {
    throw new Error("UC San Diego was not found");
  }

  return school.id;
}

async function findProfessor(
  teacherName: string,
  teacherKey: string,
  schoolId: string,
  fetcher: RmpFetch,
): Promise<RMP | null> {
  const data = await fetchGraphql<ProfessorSearchData>(
    PROFESSOR_QUERY,
    {
      query: {
        departmentID: null,
        fallback: true,
        schoolID: schoolId,
        text: teacherKey,
      },
      schoolID: schoolId,
      includeSchoolFilter: true,
    },
    fetcher,
  );
  const node = data.search.teachers.edges
    .map(({ node: candidate }) => candidate)
    .find((candidate) =>
      teacherNamesMatch(`${candidate.firstName} ${candidate.lastName}`, teacherName)
    );

  if (!node) {
    return null;
  }

  return {
    avgRating: node.avgRating,
    avgDiff: node.avgDifficulty,
    takeAgainPercent: normalizePercentage(node.wouldTakeAgainPercent),
    name: `${node.firstName} ${node.lastName}`.trim().toLowerCase(),
    nameKey: teacherKey,
    profileUrl: `https://www.ratemyprofessors.com/professor/${node.legacyId}`,
  };
}

async function fetchGraphql<T>(
  query: string,
  variables: Record<string, unknown>,
  fetcher: RmpFetch,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_REQUEST_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetcher(RMP_API_URL, {
        body: JSON.stringify({ query, variables }),
        headers: RMP_HEADERS,
        method: "POST",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        const retryable = response.status === 429 || response.status >= 500;
        const error = new Error(
          `Rate My Professors returned ${response.status} ${response.statusText}`.trim(),
        );

        if (!retryable || attempt === MAX_REQUEST_ATTEMPTS) {
          throw error;
        }

        lastError = error;
        await waitBeforeRetry(
          attempt,
          response.status === 429 ? RATE_LIMIT_RETRY_BASE_MS : TRANSIENT_RETRY_BASE_MS,
        );
        continue;
      }

      const envelope = await response.json() as GraphqlEnvelope<T>;
      if (!envelope.data || envelope.errors?.length) {
        const message = envelope.errors
          ?.map(({ message }) => message)
          .filter(Boolean)
          .join("; ") || "Rate My Professors returned invalid GraphQL data";
        throw new Error(message);
      }

      return envelope.data;
    } catch (error) {
      lastError = error;
      if (attempt === MAX_REQUEST_ATTEMPTS || !isRetryableNetworkError(error)) {
        throw error;
      }
      await waitBeforeRetry(attempt, TRANSIENT_RETRY_BASE_MS);
    }
  }

  throw lastError;
}

function isRetryableNetworkError(error: unknown): boolean {
  return error instanceof TypeError ||
    (error instanceof DOMException && error.name === "TimeoutError");
}

async function waitBeforeRetry(attempt: number, baseDelayMs: number) {
  const exponentialDelay = baseDelayMs * (2 ** (attempt - 1));
  const jitter = Math.floor(Math.random() * 100);
  await new Promise((resolve) => setTimeout(resolve, exponentialDelay + jitter));
}

async function parallelMap<T, R>(
  items: readonly T[],
  concurrency: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await task(items[index]!);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, items.length) },
      () => worker(),
    ),
  );

  return results;
}

function emptyCounts(): ProfessorEnrichmentCounts {
  return {
    requested: 0,
    matched: 0,
    unmatched: 0,
    failed: 0,
    successfulRequests: 0,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
