import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";
import {
  enrichCoursesWithRatings,
  ProfessorEnrichmentUnavailableError,
  type ProfessorEnrichmentCounts,
} from "./enrichCoursesWithRatings.js";
import { ingestCatalog } from "./ingestCatalog.js";
import {
  beginCatalogIngestionRun,
  completeCatalogIngestionRun,
  failCatalogIngestionRun,
  replaceCatalog,
  shouldRetryProfessorRefresh,
  upsertProfessors,
} from "../services/supabaseRepository.js";
import type { ClassPlannerCatalogSnapshot } from "../models/ClassPlannerCatalog.js";

if (process.env.NODE_ENV !== "production") {
  dotenv.config({ quiet: true });
}

export type ProfessorMode = "auto" | "always" | "never";

export type CatalogIngestionOptions = Readonly<{
  requestedTerm?: string;
  professorMode: ProfessorMode;
  trigger: string;
  workflowUrl?: string;
  now?: Date;
}>;

export type CatalogIngestionDependencies = Readonly<{
  beginRun: typeof beginCatalogIngestionRun;
  completeRun: typeof completeCatalogIngestionRun;
  enrichProfessors: typeof enrichCoursesWithRatings;
  failRun: typeof failCatalogIngestionRun;
  ingest: typeof ingestCatalog;
  publishCatalog: typeof replaceCatalog;
  shouldRetryProfessors: typeof shouldRetryProfessorRefresh;
  upsertProfessors: typeof upsertProfessors;
}>;

const productionDependencies: CatalogIngestionDependencies = {
  beginRun: beginCatalogIngestionRun,
  completeRun: completeCatalogIngestionRun,
  enrichProfessors: enrichCoursesWithRatings,
  failRun: failCatalogIngestionRun,
  ingest: ingestCatalog,
  publishCatalog: replaceCatalog,
  shouldRetryProfessors: shouldRetryProfessorRefresh,
  upsertProfessors,
};

export async function runCatalogIngestion(
  options: CatalogIngestionOptions,
  dependencies: CatalogIngestionDependencies = productionDependencies,
) {
  const runId = randomUUID();
  const professorsRequested = await resolveProfessorRefresh(
    options.professorMode,
    options.now ?? new Date(),
    dependencies.shouldRetryProfessors,
  );
  let resolvedTerm: string | undefined;
  let catalogPublished = false;
  let catalogCounts: Record<string, number> = {};
  let professorCounts: object = emptyProfessorCounts();
  const warnings: string[] = [];

  await dependencies.beginRun({
    id: runId,
    professorsRequested,
    requestedTerm: options.requestedTerm,
    trigger: options.trigger,
    workflowUrl: options.workflowUrl,
  });

  try {
    const result = await dependencies.ingest(options.requestedTerm);
    resolvedTerm = result.term;
    catalogCounts = countCatalog(result.catalog);

    await dependencies.publishCatalog(result.term, result.catalog);
    catalogPublished = true;

    if (professorsRequested) {
      try {
        const enrichment = await dependencies.enrichProfessors(result.courses);
        professorCounts = enrichment.counts;
        warnings.push(...enrichment.warnings);
        await dependencies.upsertProfessors(enrichment.professors);
      } catch (error) {
        if (error instanceof ProfessorEnrichmentUnavailableError) {
          professorCounts = error.counts;
          warnings.push(error.message);
        }
        throw error;
      }
    }

    await dependencies.completeRun({
      catalogCounts,
      catalogPublished,
      id: runId,
      professorCounts,
      resolvedTerm,
      warnings,
    });

    for (const warning of warnings) {
      emitWorkflowWarning(warning);
    }

    return {
      catalogCounts,
      catalogPublished,
      professorCounts,
      professorsRequested,
      resolvedTerm,
      runId,
      warnings,
    };
  } catch (error) {
    const message = errorMessage(error);

    try {
      await dependencies.failRun({
        catalogCounts,
        catalogPublished,
        error: message,
        id: runId,
        professorCounts,
        resolvedTerm,
        warnings,
      });
    } catch (auditError) {
      console.error("Failed to record catalog ingestion failure:", auditError);
    }

    throw error;
  }
}

export async function resolveProfessorRefresh(
  mode: ProfessorMode,
  now: Date,
  shouldRetry: () => Promise<boolean>,
): Promise<boolean> {
  if (mode === "always") {
    return true;
  }

  if (mode === "never") {
    return false;
  }

  return isSundayInCentralTime(now) || await shouldRetry();
}

export function isSundayInCentralTime(date: Date): boolean {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
  }).format(date) === "Sun";
}

function countCatalog(
  catalog: ClassPlannerCatalogSnapshot,
): Record<string, number> {
  return {
    eventPackages: catalog.event_packages.length,
    meetings: catalog.meetings.length,
    moduleRoutes: catalog.module_routes.length,
    offerings: catalog.offerings.length,
    packageSections: catalog.package_sections.length,
    sections: catalog.sections.length,
  };
}

function emptyProfessorCounts(): ProfessorEnrichmentCounts {
  const counts: ProfessorEnrichmentCounts = {
    failed: 0,
    matched: 0,
    requested: 0,
    successfulRequests: 0,
    unmatched: 0,
  };
  return counts;
}

function emitWorkflowWarning(message: string) {
  const escaped = message
    .replace(/%/g, "%25")
    .replace(/\r/g, "%0D")
    .replace(/\n/g, "%0A");
  console.warn(`::warning title=Professor enrichment::${escaped}`);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function parseOptions(argv: readonly string[]): CatalogIngestionOptions {
  let requestedTerm: string | undefined;
  let professorMode: ProfessorMode = "auto";

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]!;
    const [flag, inlineValue] = argument.split("=", 2);
    const value = inlineValue ?? argv[index + 1];

    if (flag === "--term") {
      if (inlineValue === undefined) index += 1;
      requestedTerm = value?.trim() || undefined;
    } else if (flag === "--professors") {
      if (inlineValue === undefined) index += 1;
      if (value !== "auto" && value !== "always" && value !== "never") {
        throw new Error("--professors must be auto, always, or never");
      }
      professorMode = value;
    } else {
      throw new Error(`Unknown ingestion option: ${flag}`);
    }
  }

  return {
    professorMode,
    requestedTerm,
    trigger: process.env.GITHUB_EVENT_NAME ?? "manual",
    workflowUrl: githubWorkflowUrl(),
  };
}

function githubWorkflowUrl(): string | undefined {
  const server = process.env.GITHUB_SERVER_URL;
  const repository = process.env.GITHUB_REPOSITORY;
  const runId = process.env.GITHUB_RUN_ID;
  return server && repository && runId
    ? `${server}/${repository}/actions/runs/${runId}`
    : undefined;
}

async function main() {
  const result = await runCatalogIngestion(parseOptions(process.argv.slice(2)));
  console.log(JSON.stringify(result, null, 2));
}

const entrypoint = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : undefined;

if (entrypoint === import.meta.url) {
  main().catch((error) => {
    console.error("Catalog ingestion failed:", error);
    process.exitCode = 1;
  });
}
