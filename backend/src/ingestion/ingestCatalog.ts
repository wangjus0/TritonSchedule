import {
  buildClassPlannerCatalog,
  buildLegacyCourses,
} from "./buildClassPlannerCatalog.js";
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
}>;

const productionDependencies: IngestCatalogDependencies = {
  scrapeClassPlanner,
};

/**
 * Runs the full catalog ingestion process.
 *
 * @param requestedTerm Optional Class Planner term code.
 * @param dependencies Operations used during ingestion.
 * @returns The catalog snapshot, legacy courses, and resolved term.
 */
export async function ingestCatalog(
  requestedTerm?: string,
  dependencies: IngestCatalogDependencies = productionDependencies,
): Promise<IngestResult> {
  const scraped = await dependencies.scrapeClassPlanner(requestedTerm);
  const courses = buildLegacyCourses(scraped.term, scraped.courses);
  const catalog = buildClassPlannerCatalog(
    scraped.term,
    scraped.courses,
    scraped.routes,
  );

  return {
    term: scraped.term,
    courses,
    catalog,
  };
}
