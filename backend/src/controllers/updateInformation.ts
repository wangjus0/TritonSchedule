import { ingestCatalog } from "../ingestion/ingestCatalog.js";
import { replaceCatalog } from "../services/supabaseRepository.js";
import type { Request, Response } from "express";

export async function updateInformation(req: Request, res: Response) {
  try {
    const requestedTerm = typeof req.query.term === "string"
      ? req.query.term
      : undefined;
    const result = await ingestCatalog(requestedTerm);
    await replaceCatalog(
      result.term,
      result.professors,
      result.catalog,
    );

    return res.status(200).send({
      message: "Courses updated",
      term: result.term,
      counts: {
        courses: result.catalog.offerings.length,
        sections: result.catalog.sections.length,
        eventPackages: result.catalog.event_packages.length,
      },
    });
  } catch (error) {
    console.error("Error in updateInformation:", error);
    return res.status(500).send({
      error: "Failed to update courses",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
