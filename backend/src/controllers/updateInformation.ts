import { ingest } from "../ingestion/ingest.js";
import { replaceCatalog } from "../services/supabaseRepository.js";
import type { Request, Response } from "express";

export async function updateInformation(req: Request, res: Response) {
  try {
    const result = await ingest(); // Scrapes updates without mutating the database
    await replaceCatalog(result.term, result.courses, result.professors);

    return res.status(200).send({ message: "Courses updated" });
  } catch (error) {
    console.error("Error in updateInformation:", error);
    return res.status(500).send({ 
      error: "Failed to update courses", 
      message: error instanceof Error ? error.message : "Unknown error" 
    });
  }
}
