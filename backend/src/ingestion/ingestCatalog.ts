import {
  buildClassPlannerCatalog,
  buildLegacyCourses,
} from "./buildClassPlannerCatalog.js";
import { enrichCoursesWithRatings } from "./enrichCoursesWithRatings.js";
import { scrapeClassPlanner } from "./scrapeClassPlanner.js";
import type { ClassPlannerIngestResult } from "../models/ClassPlannerCatalog.js";

/**
 * Contains the result of catalog ingestion.
 */
export type IngestResult = ClassPlannerIngestResult;

/**
 * Defines the operations needed to ingest the catalog.
 */
export type IngestCatalogDependencies = Readonly<{
  scrapeClassPlanner: typeof scrapeClassPlanner;
  enrichCoursesWithRatings: typeof enrichCoursesWithRatings;
}>;

const productionDependencies: IngestCatalogDependencies = {
  scrapeClassPlanner,
  enrichCoursesWithRatings,
};

/**
 * Runs the full catalog ingestion process.
 *
 * @param dependencies Operations used during ingestion.
 * @returns The ingested courses, professors, and term.
 */
export async function ingestCatalog(
  requestedTerm?: string,
  dependencies: IngestCatalogDependencies = productionDependencies,
): Promise<IngestResult> {
  const scraped = await dependencies.scrapeClassPlanner(requestedTerm);
  const courses = buildLegacyCourses(scraped.term, scraped.courses);
  const enrichment = await dependencies.enrichCoursesWithRatings(courses);
  const catalog = buildClassPlannerCatalog(
    scraped.term,
    scraped.courses,
    scraped.routes,
  );

  return {
    term: scraped.term,
    courses: enrichment.courses,
    professors: enrichment.professors,
    catalog,
  };
}
