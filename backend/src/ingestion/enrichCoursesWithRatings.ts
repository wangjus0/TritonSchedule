import type { Course } from "../models/Course.js";
import type { RMP } from "../models/RMP.js";
import { normalizeTeacherKey } from "../utils/normalizeTeacherKey.js";

const RMP_API_URL = "https://www.ratemyprofessors.com/graphql";
const SCHOOL_NAME = "University of California San Diego";
const REQUEST_CONCURRENCY = 4;
const MAX_REQUEST_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_WARNING_DETAILS = 20;

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

export type ProfessorEnrichmentCounts = Readonly<{
  requested: number;
  matched: number;
  unmatched: number;
  failed: number;
  successfulRequests: number;
}>;

export type CourseRatingEnrichment = Readonly<{
  courses: Course[];
  professors: RMP[];
  counts: ProfessorEnrichmentCounts;
  warnings: string[];
}>;

export type EnrichCoursesWithRatingsDependencies = Readonly<{
  fetch: RmpFetch;
}>;

const productionDependencies: EnrichCoursesWithRatingsDependencies = {
  fetch: globalThis.fetch,
};

export class ProfessorEnrichmentUnavailableError extends Error {
  readonly counts: ProfessorEnrichmentCounts;

  constructor(message: string, counts: ProfessorEnrichmentCounts) {
    super(message);
    this.name = "ProfessorEnrichmentUnavailableError";
    this.counts = counts;
  }
}

export function normalizePercentage(value: number | null): number {
  if (value === null || !Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.trunc(value)));
}

export async function enrichCoursesWithRatings(
  courses: readonly Course[],
  dependencies: EnrichCoursesWithRatingsDependencies = productionDependencies,
): Promise<CourseRatingEnrichment> {
  const teacherKeys = Array.from(new Set(
    courses
      .map(({ Teacher }) => normalizeTeacherKey(Teacher))
      .filter((teacher) => teacher.length > 0),
  ));

  if (teacherKeys.length === 0) {
    return {
      courses: courses.map((course) => ({ ...course })),
      professors: [],
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
      { ...emptyCounts(), requested: teacherKeys.length },
    );
  }

  const results = await parallelMap(
    teacherKeys,
    REQUEST_CONCURRENCY,
    async (teacherKey) => {
      try {
        const professor = await findProfessor(teacherKey, schoolId, dependencies.fetch);
        return { professor, teacherKey } as const;
      } catch (error) {
        return { error: errorMessage(error), teacherKey } as const;
      }
    },
  );
  const professors: RMP[] = [];
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
    }
  }

  const counts: ProfessorEnrichmentCounts = {
    requested: teacherKeys.length,
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
  const node = data.search.teachers.edges[0]?.node;

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
        await waitBeforeRetry(attempt);
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
      await waitBeforeRetry(attempt);
    }
  }

  throw lastError;
}

function isRetryableNetworkError(error: unknown): boolean {
  return error instanceof TypeError ||
    (error instanceof DOMException && error.name === "TimeoutError");
}

async function waitBeforeRetry(attempt: number) {
  const exponentialDelay = 200 * (2 ** (attempt - 1));
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
