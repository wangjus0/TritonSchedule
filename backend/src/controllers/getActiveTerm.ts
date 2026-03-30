import { getActiveTermFromDB } from "../ingestion/getActiveTermFromDB.js";
import type { Request, Response } from "express";

export async function getActiveTerm(req: Request, res: Response) {
  const currentTerm = await getActiveTermFromDB();

  if (!currentTerm) {
    return res.status(404).send({ message: "No active term found" });
  }

  return res.status(200).json({ Term: currentTerm.Term });
}
