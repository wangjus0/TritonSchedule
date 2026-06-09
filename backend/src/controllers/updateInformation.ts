import { ingest } from "../ingestion/ingest.js";
import { deleteAllCourses, deleteAllProfessor } from "../services/supabaseRepository.js";
import type { Request, Response } from "express";

export async function updateInformation(req: Request, res: Response) {
  try {
    await deleteAllCourses(); // Delete all existing courses for updates
    await deleteAllProfessor(); // Delete all existing professor data for updates

    await ingest(); // Updates

    return res.status(200).send({ message: "Courses updated" });
  } catch (error) {
    console.error("Error in updateInformation:", error);
    return res.status(500).send({ 
      error: "Failed to update courses", 
      message: error instanceof Error ? error.message : "Unknown error" 
    });
  }
}
