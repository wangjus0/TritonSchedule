import { getActiveTermFromDB } from "../ingestion/getActiveTermFromDB.js";

export async function getActiveTerm(req: any, res: any) {
  const currentTerm = await getActiveTermFromDB();

  if (!currentTerm) {
    return res.status(404).send({ message: "No active term found" });
  }

  // The term object from Supabase has lowercase 'term' field
  return res.status(200).json({ Term: currentTerm.term });
}
